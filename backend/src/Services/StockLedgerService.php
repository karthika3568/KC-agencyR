<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

/**
 * The one and only way any code path may change quantity_on_hand. Every
 * call writes both the running-balance row (stock_ledger) and a full
 * stock_movements audit row, atomically. Section 4.4 / rule 8 of the spec:
 * "no code path silently updates stock_ledger.quantity_on_hand without a
 * matching movement row."
 *
 * Must be called from within a transaction the caller already started —
 * this service does not begin/commit its own, so it can be composed into
 * the larger invoice-completion transaction.
 */
class StockLedgerService
{
    public function __construct(private PDO $pdo)
    {
    }

    public function applyMovement(
        int $itemId,
        string $ownerType,
        int $ownerId,
        float $qtyChange,
        string $movementType,
        ?string $referenceTable = null,
        ?int $referenceId = null,
        ?string $reason = null,
        ?string $remarks = null,
        ?int $createdBy = null
    ): void {
        $stmt = $this->pdo->prepare(
            'SELECT id, quantity_on_hand FROM stock_ledger
             WHERE item_id = :item_id AND owner_type = :owner_type AND owner_id = :owner_id
             FOR UPDATE'
        );
        $stmt->execute(['item_id' => $itemId, 'owner_type' => $ownerType, 'owner_id' => $ownerId]);
        $row = $stmt->fetch();

        $qtyBefore = $row ? (float) $row['quantity_on_hand'] : 0.0;
        $qtyAfter = $qtyBefore + $qtyChange;

        if ($row) {
            $this->pdo->prepare('UPDATE stock_ledger SET quantity_on_hand = :qty WHERE id = :id')
                ->execute(['qty' => $qtyAfter, 'id' => $row['id']]);
        } else {
            $this->pdo->prepare(
                'INSERT INTO stock_ledger (item_id, owner_type, owner_id, quantity_on_hand)
                 VALUES (:item_id, :owner_type, :owner_id, :qty)'
            )->execute(['item_id' => $itemId, 'owner_type' => $ownerType, 'owner_id' => $ownerId, 'qty' => $qtyAfter]);
        }

        $this->pdo->prepare(
            'INSERT INTO stock_movements
                (item_id, owner_type, owner_id, movement_type, qty_change, qty_before, qty_after,
                 reference_table, reference_id, reason, remarks, created_by)
             VALUES
                (:item_id, :owner_type, :owner_id, :movement_type, :qty_change, :qty_before, :qty_after,
                 :reference_table, :reference_id, :reason, :remarks, :created_by)'
        )->execute([
            'item_id' => $itemId,
            'owner_type' => $ownerType,
            'owner_id' => $ownerId,
            'movement_type' => $movementType,
            'qty_change' => $qtyChange,
            'qty_before' => $qtyBefore,
            'qty_after' => $qtyAfter,
            'reference_table' => $referenceTable,
            'reference_id' => $referenceId,
            'reason' => $reason,
            'remarks' => $remarks,
            'created_by' => $createdBy,
        ]);
    }

    public function quantityOnHand(int $itemId, string $ownerType, int $ownerId): float
    {
        $stmt = $this->pdo->prepare(
            'SELECT quantity_on_hand FROM stock_ledger
             WHERE item_id = :item_id AND owner_type = :owner_type AND owner_id = :owner_id'
        );
        $stmt->execute(['item_id' => $itemId, 'owner_type' => $ownerType, 'owner_id' => $ownerId]);
        $row = $stmt->fetch();
        return $row ? (float) $row['quantity_on_hand'] : 0.0;
    }
}
