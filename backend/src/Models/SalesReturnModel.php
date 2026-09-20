<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\CodeGenerator;
use App\Services\CreditLedgerService;
use App\Services\StockLedgerService;
use PDO;

/**
 * Sales returns, with or without the original invoice (section 4.9, rule 4:
 * a returned/cancelled invoice's effects are reversed atomically, the row
 * itself is never deleted). An untraceable return (no invoice_id) needs
 * admin approval before it touches stock or the credit ledger, unless the
 * creator already holds returns.approve_untraceable_return.
 */
class SalesReturnModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function all(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT sr.*, c.ledger_name AS customer_name, i.invoice_no
             FROM sales_returns sr
             LEFT JOIN customers c ON c.id = sr.customer_id
             LEFT JOIN invoices i ON i.id = sr.invoice_id
             WHERE sr.branch_id = :branch_id ORDER BY sr.id DESC"
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            "SELECT sr.*, c.ledger_name AS customer_name, i.invoice_no
             FROM sales_returns sr
             LEFT JOIN customers c ON c.id = sr.customer_id
             LEFT JOIN invoices i ON i.id = sr.invoice_id
             WHERE sr.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $return = $stmt->fetch();
        if (!$return) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT sri.*, it.item_name FROM sales_return_items sri
             JOIN items it ON it.id = sri.item_id WHERE sri.sales_return_id = :id'
        );
        $stmt->execute(['id' => $id]);
        $return['items'] = $stmt->fetchAll();

        return $return;
    }

    public function create(array $header, array $lines, bool $autoApprove): int
    {
        $this->pdo->beginTransaction();
        try {
            $isUntraceable = empty($header['invoice_id']);
            $status = ($isUntraceable && !$autoApprove) ? 'pending_approval' : 'approved';

            $stmt = $this->pdo->prepare(
                'INSERT INTO sales_returns
                    (invoice_id, customer_id, branch_id, reason, refund_action, requires_admin_approval, status, approved_by, created_by)
                 VALUES
                    (:invoice_id, :customer_id, :branch_id, :reason, :refund_action, :requires_approval, :status, :approved_by, :created_by)'
            );
            $stmt->execute([
                'invoice_id' => $header['invoice_id'] ?? null,
                'customer_id' => $header['customer_id'] ?? null,
                'branch_id' => $header['branch_id'],
                'reason' => $header['reason'] ?? null,
                'refund_action' => $header['refund_action'] ?? 'credit_note',
                'requires_approval' => $isUntraceable ? 1 : 0,
                'status' => $status,
                'approved_by' => $status === 'approved' ? $header['created_by'] : null,
                'created_by' => $header['created_by'],
            ]);
            $id = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('UPDATE sales_returns SET return_no = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('SRT', $id), 'id' => $id]);

            $lineStmt = $this->pdo->prepare(
                'INSERT INTO sales_return_items (sales_return_id, item_id, qty, rate, line_total)
                 VALUES (:sales_return_id, :item_id, :qty, :rate, :line_total)'
            );
            foreach ($lines as $line) {
                $lineTotal = round((float) $line['qty'] * (float) $line['rate'], 2);
                $lineStmt->execute([
                    'sales_return_id' => $id,
                    'item_id' => (int) $line['item_id'],
                    'qty' => (float) $line['qty'],
                    'rate' => (float) $line['rate'],
                    'line_total' => $lineTotal,
                ]);
            }

            if ($status === 'approved') {
                $this->applyEffects($id, $header['created_by']);
            }

            $this->pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function approve(int $id, int $approvedBy): void
    {
        $this->pdo->beginTransaction();
        try {
            $return = $this->find($id);
            if (!$return || $return['status'] !== 'pending_approval') {
                throw new \RuntimeException('Return not found or not pending approval');
            }

            $this->pdo->prepare("UPDATE sales_returns SET status = 'approved', approved_by = :by WHERE id = :id")
                ->execute(['by' => $approvedBy, 'id' => $id]);

            $this->applyEffects($id, $approvedBy);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function reject(int $id): void
    {
        $this->pdo->prepare("UPDATE sales_returns SET status = 'rejected' WHERE id = :id AND status = 'pending_approval'")
            ->execute(['id' => $id]);
    }

    /** Adds stock back and, for a credit-note refund on a customer sale, reduces their outstanding. */
    private function applyEffects(int $id, int $actorId): void
    {
        $return = $this->find($id);
        $stock = new StockLedgerService($this->pdo);

        foreach ($return['items'] as $line) {
            $stock->applyMovement(
                (int) $line['item_id'],
                'branch',
                (int) $return['branch_id'],
                (float) $line['qty'],
                'sale_return',
                'sales_returns',
                $id,
                null,
                null,
                $actorId
            );
        }

        if ($return['refund_action'] === 'credit_note' && $return['customer_id'] !== null) {
            $totalValue = array_sum(array_column($return['items'], 'line_total'));
            if ($totalValue > 0) {
                (new CreditLedgerService($this->pdo))->record(
                    (int) $return['customer_id'],
                    'credit_reversal',
                    $totalValue,
                    $return['invoice_id'],
                    "Sales return {$return['return_no']}",
                    $actorId
                );
            }
        }
    }
}
