<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\CodeGenerator;
use App\Services\StockLedgerService;
use App\Services\SupplierLedgerService;
use PDO;

/**
 * GRN (goods-received-note) lifecycle. Creating one is the one place in
 * Phase 4 that increases stock — atomically with the supplier ledger entry
 * for whatever isn't paid up front (section 4.13). Deleting a GRN must
 * reverse both, never just delete the row (section 4.13 register note).
 *
 * Simplification: this MVP has no separate central-warehouse entity, so
 * "warehouse" stock and a branch's own floor stock are the same pool —
 * GRN receipts and POS sales both move owner_type='branch' for that branch.
 * See README assumptions.
 */
class PurchaseModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function all(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.*, s.name AS supplier_name
             FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
             WHERE p.branch_id = :branch_id
             ORDER BY p.id DESC LIMIT 200'
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.*, s.name AS supplier_name
             FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
             WHERE p.id = :id'
        );
        $stmt->execute(['id' => $id]);
        $purchase = $stmt->fetch();
        if (!$purchase) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT pi.*, i.item_name, i.item_code
             FROM purchase_items pi JOIN items i ON i.id = pi.item_id
             WHERE pi.purchase_id = :id'
        );
        $stmt->execute(['id' => $id]);
        $purchase['items'] = $stmt->fetchAll();

        return $purchase;
    }

    /** Every unpaid (or partially paid) GRN for a supplier, oldest first — feeds FIFO allocation. */
    public function unpaidForSupplier(int $supplierId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM purchases
             WHERE supplier_id = :supplier_id AND status = 'active' AND pending_balance > 0.009
             ORDER BY purchase_date, id"
        );
        $stmt->execute(['supplier_id' => $supplierId]);
        return $stmt->fetchAll();
    }

    public function create(array $header, array $lines, int $createdBy): int
    {
        $this->pdo->beginTransaction();
        try {
            $subtotal = 0.0;
            $taxTotal = 0.0;
            $priced = [];
            foreach ($lines as $line) {
                $qty = (float) $line['qty'];
                $rate = (float) $line['rate'];
                $taxPercent = (float) ($line['tax_percent'] ?? 0);
                $gross = round($qty * $rate, 2);
                $taxAmount = round($gross * $taxPercent / 100, 2);
                $subtotal += $gross;
                $taxTotal += $taxAmount;
                $priced[] = [
                    'item_id' => (int) $line['item_id'],
                    'qty' => $qty,
                    'free_qty' => (float) ($line['free_qty'] ?? 0),
                    'rate' => $rate,
                    'tax_percent' => $taxPercent,
                    'tax_amount' => $taxAmount,
                    'line_total' => $gross,
                ];
            }
            $grandTotal = round($subtotal + $taxTotal, 2);
            $paidAmount = min((float) ($header['paid_amount'] ?? 0), $grandTotal);

            $stmt = $this->pdo->prepare(
                'INSERT INTO purchases
                    (purchase_request_id, supplier_id, branch_id, supplier_invoice_no, purchase_date,
                     payment_mode, subtotal, tax_total, grand_total, paid_amount, created_by)
                 VALUES
                    (:purchase_request_id, :supplier_id, :branch_id, :supplier_invoice_no, CURDATE(),
                     :payment_mode, :subtotal, :tax_total, :grand_total, :paid_amount, :created_by)'
            );
            $stmt->execute([
                'purchase_request_id' => $header['purchase_request_id'] ?? null,
                'supplier_id' => $header['supplier_id'],
                'branch_id' => $header['branch_id'],
                'supplier_invoice_no' => $header['supplier_invoice_no'] ?? null,
                'payment_mode' => $header['payment_mode'] ?? 'credit',
                'subtotal' => round($subtotal, 2),
                'tax_total' => round($taxTotal, 2),
                'grand_total' => $grandTotal,
                'paid_amount' => $paidAmount,
                'created_by' => $createdBy,
            ]);
            $purchaseId = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('UPDATE purchases SET grn_no = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('GRN', $purchaseId), 'id' => $purchaseId]);

            $itemStmt = $this->pdo->prepare(
                'INSERT INTO purchase_items (purchase_id, item_id, qty, free_qty, rate, tax_percent, tax_amount, line_total)
                 VALUES (:purchase_id, :item_id, :qty, :free_qty, :rate, :tax_percent, :tax_amount, :line_total)'
            );
            $stockService = new StockLedgerService($this->pdo);
            foreach ($priced as $line) {
                $itemStmt->execute(['purchase_id' => $purchaseId, ...$line]);
                $stockService->applyMovement(
                    $line['item_id'],
                    'branch',
                    (int) $header['branch_id'],
                    $line['qty'] + $line['free_qty'],
                    'purchase',
                    'purchases',
                    $purchaseId,
                    null,
                    null,
                    $createdBy
                );
            }

            $pendingBalance = round($grandTotal - $paidAmount, 2);
            if ($pendingBalance > 0.009) {
                (new SupplierLedgerService($this->pdo))->record(
                    (int) $header['supplier_id'],
                    'purchase_credit',
                    $pendingBalance,
                    $purchaseId,
                    null,
                    "GRN " . CodeGenerator::fromId('GRN', $purchaseId),
                    $createdBy
                );
            }

            if (!empty($header['purchase_request_id'])) {
                $this->pdo->prepare("UPDATE purchase_requests SET status = 'converted_to_grn' WHERE id = :id")
                    ->execute(['id' => $header['purchase_request_id']]);
            }

            $this->pdo->commit();
            return $purchaseId;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /** Deletes a GRN, reversing its stock movement and any ledger entry it created — never a bare row delete. */
    public function delete(int $id, int $deletedBy): void
    {
        $this->pdo->beginTransaction();
        try {
            $purchase = $this->find($id);
            if (!$purchase || $purchase['status'] !== 'active') {
                throw new \RuntimeException('GRN not found or already cancelled');
            }

            $stockService = new StockLedgerService($this->pdo);
            foreach ($purchase['items'] as $line) {
                $stockService->applyMovement(
                    (int) $line['item_id'],
                    'branch',
                    (int) $purchase['branch_id'],
                    -((float) $line['qty'] + (float) $line['free_qty']),
                    'purchase_return',
                    'purchases',
                    $id,
                    'GRN deleted',
                    null,
                    $deletedBy
                );
            }

            $originalCredit = round((float) $purchase['grand_total'] - (float) $purchase['paid_amount'], 2);
            if ($originalCredit > 0.009) {
                (new SupplierLedgerService($this->pdo))->record(
                    (int) $purchase['supplier_id'],
                    'debit_note_adjustment',
                    $originalCredit,
                    $id,
                    null,
                    "GRN {$purchase['grn_no']} deleted",
                    $deletedBy
                );
            }

            $this->pdo->prepare("UPDATE purchases SET status = 'cancelled' WHERE id = :id")->execute(['id' => $id]);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
