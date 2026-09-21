<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\CodeGenerator;
use App\Services\SupplierLedgerService;
use PDO;

/**
 * Records a supplier payment and allocates it across one or more unpaid
 * GRNs — FIFO (oldest first) by default, or an explicit manual split
 * (section 4.14). Commits payment + allocations + each GRN's paid_amount +
 * the ledger entry in one transaction.
 */
class SupplierPaymentModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function all(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sp.*, s.name AS supplier_name
             FROM supplier_payments sp JOIN suppliers s ON s.id = sp.supplier_id
             WHERE sp.branch_id = :branch_id ORDER BY sp.id DESC'
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }

    /**
     * @param array|null $manualAllocations [{purchase_id, allocated_amount}] — omit/null for FIFO auto-allocation.
     */
    public function record(
        int $supplierId,
        int $branchId,
        float $amount,
        string $paymentMode,
        ?string $referenceNo,
        ?string $notes,
        int $paidBy,
        ?array $manualAllocations = null
    ): array {
        $this->pdo->beginTransaction();
        try {
            $purchases = new PurchaseModel($this->pdo);
            $unpaid = $purchases->unpaidForSupplier($supplierId);
            $byId = array_column($unpaid, null, 'id');

            // Section 30: same rule applies to supplier payments — never
            // allow paying more than what's actually outstanding.
            $totalOutstanding = round(array_sum(array_column($unpaid, 'pending_balance')), 2);
            if ($amount > $totalOutstanding + 0.009) {
                throw new \RuntimeException(sprintf(
                    'Payment amount (%.2f) exceeds this supplier\'s total pending balance of %.2f',
                    $amount,
                    $totalOutstanding
                ));
            }

            $allocations = [];
            if ($manualAllocations !== null) {
                foreach ($manualAllocations as $a) {
                    $purchaseId = (int) $a['purchase_id'];
                    if (!isset($byId[$purchaseId])) {
                        continue;
                    }
                    $cap = (float) $byId[$purchaseId]['pending_balance'];
                    $allocations[$purchaseId] = min((float) $a['allocated_amount'], $cap);
                }
            } else {
                $remaining = $amount;
                foreach ($unpaid as $grn) {
                    if ($remaining <= 0.009) {
                        break;
                    }
                    $take = min($remaining, (float) $grn['pending_balance']);
                    $allocations[(int) $grn['id']] = $take;
                    $remaining -= $take;
                }
            }

            $allocatedTotal = round(array_sum($allocations), 2);
            if ($allocatedTotal <= 0) {
                throw new \RuntimeException('Nothing to allocate — supplier has no outstanding GRNs matching this payment');
            }

            $stmt = $this->pdo->prepare(
                'INSERT INTO supplier_payments (supplier_id, branch_id, amount, payment_mode, reference_no, notes, paid_by)
                 VALUES (:supplier_id, :branch_id, :amount, :payment_mode, :reference_no, :notes, :paid_by)'
            );
            $stmt->execute([
                'supplier_id' => $supplierId,
                'branch_id' => $branchId,
                'amount' => $allocatedTotal,
                'payment_mode' => $paymentMode,
                'reference_no' => $referenceNo,
                'notes' => $notes,
                'paid_by' => $paidBy,
            ]);
            $paymentId = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('UPDATE supplier_payments SET payment_code = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('PAY', $paymentId), 'id' => $paymentId]);

            $allocStmt = $this->pdo->prepare(
                'INSERT INTO supplier_payment_allocations (supplier_payment_id, purchase_id, allocated_amount)
                 VALUES (:payment_id, :purchase_id, :allocated_amount)'
            );
            $updateStmt = $this->pdo->prepare(
                'UPDATE purchases SET paid_amount = paid_amount + :amount WHERE id = :id'
            );
            foreach ($allocations as $purchaseId => $allocated) {
                if ($allocated <= 0) {
                    continue;
                }
                $allocStmt->execute(['payment_id' => $paymentId, 'purchase_id' => $purchaseId, 'allocated_amount' => $allocated]);
                $updateStmt->execute(['amount' => $allocated, 'id' => $purchaseId]);
            }

            (new SupplierLedgerService($this->pdo))->record(
                $supplierId,
                'payment_made',
                $allocatedTotal,
                null,
                $paymentId,
                "Payment " . CodeGenerator::fromId('PAY', $paymentId),
                $paidBy
            );

            $this->pdo->commit();
            return ['payment_id' => $paymentId, 'allocated_total' => $allocatedTotal, 'allocations' => $allocations];
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
