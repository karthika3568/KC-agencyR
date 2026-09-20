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
}
