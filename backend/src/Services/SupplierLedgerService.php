<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

/**
 * Append-only supplier ledger — the accounts-payable mirror of
 * CreditLedgerService. Never mutate a running balance column; current
 * payable is always the latest balance_after row for that supplier.
 */
class SupplierLedgerService
{
    public function __construct(private PDO $pdo)
    {
    }

    public function currentPayable(int $supplierId): float
    {
        $stmt = $this->pdo->prepare(
            'SELECT balance_after FROM supplier_ledger_transactions
             WHERE supplier_id = :supplier_id ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute(['supplier_id' => $supplierId]);
        $row = $stmt->fetch();
        return $row ? (float) $row['balance_after'] : 0.0;
    }

    public function record(
        int $supplierId,
        string $type,
        float $amount,
        ?int $purchaseId,
        ?int $paymentId,
        ?string $notes,
        ?int $createdBy
    ): float {
        $this->pdo->prepare('SELECT id FROM suppliers WHERE id = :id FOR UPDATE')
            ->execute(['id' => $supplierId]);

        $balanceBefore = $this->currentPayable($supplierId);
        $reducesPayable = in_array($type, ['payment_made', 'debit_note_adjustment'], true);
        $signedAmount = $reducesPayable ? -abs($amount) : abs($amount);
        $balanceAfter = round($balanceBefore + $signedAmount, 2);

        $this->pdo->prepare(
            'INSERT INTO supplier_ledger_transactions
                (supplier_id, transaction_type, amount, purchase_id, payment_id, balance_before, balance_after, notes, created_by)
             VALUES
                (:supplier_id, :type, :amount, :purchase_id, :payment_id, :balance_before, :balance_after, :notes, :created_by)'
        )->execute([
            'supplier_id' => $supplierId,
            'type' => $type,
            'amount' => abs($amount),
            'purchase_id' => $purchaseId,
            'payment_id' => $paymentId,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'notes' => $notes,
            'created_by' => $createdBy,
        ]);

        return $balanceAfter;
    }

    /**
     * Per-supplier balance breakdown for a branch — opening balance, total
     * purchases posted, total paid, and the current outstanding (the
     * ledger's own running balance, never re-derived by summing here, so it
     * can never drift from what record() actually wrote).
     */
    public function summaryForBranch(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT s.id, s.name, s.opening_balance, s.status,
                    COALESCE((
                        SELECT slt.balance_after FROM supplier_ledger_transactions slt
                        WHERE slt.supplier_id = s.id ORDER BY slt.id DESC LIMIT 1
                    ), 0) AS current_outstanding,
                    COALESCE((
                        SELECT SUM(slt.amount) FROM supplier_ledger_transactions slt
                        WHERE slt.supplier_id = s.id AND slt.transaction_type = 'purchase_credit'
                    ), 0) AS total_purchases,
                    COALESCE((
                        SELECT SUM(slt.amount) FROM supplier_ledger_transactions slt
                        WHERE slt.supplier_id = s.id AND slt.transaction_type = 'payment_made'
                    ), 0) AS total_paid
             FROM suppliers s
             WHERE s.branch_id = :branch_id
             ORDER BY s.name"
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }
}
