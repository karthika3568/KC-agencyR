<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\StockLedgerService;
use PDO;

class StockAdjustmentModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function all(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT sa.*, i.item_name, u.name AS created_by_name
             FROM stock_adjustments sa
             JOIN items i ON i.id = sa.item_id
             JOIN users u ON u.id = sa.created_by
             WHERE sa.owner_type = 'branch' AND sa.owner_id = :branch_id
             ORDER BY sa.id DESC LIMIT 200"
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }

    public function create(
        int $itemId,
        string $ownerType,
        int $ownerId,
        string $adjustmentType,
        float $qty,
        string $reason,
        ?string $remarks,
        int $createdBy
    ): int {
        $this->pdo->beginTransaction();
        try {
            if ($adjustmentType !== 'addition') {
                $stockStmt = $this->pdo->prepare(
                    'SELECT quantity_on_hand FROM stock_ledger
                     WHERE item_id = :item_id AND owner_type = :owner_type AND owner_id = :owner_id
                     FOR UPDATE'
                );
                $stockStmt->execute(['item_id' => $itemId, 'owner_type' => $ownerType, 'owner_id' => $ownerId]);
                $stockRow = $stockStmt->fetch();
                $available = $stockRow !== false ? (float) $stockRow['quantity_on_hand'] : 0.0;
                if ($available < $qty || $available <= 0) {
                    $itemStmt = $this->pdo->prepare(
                        'SELECT i.item_name, COALESCE(su.short_code, \'PCS\') AS unit_code
                         FROM items i
                         LEFT JOIN stock_units su ON su.id = i.base_unit_id
                         WHERE i.id = :id'
                    );
                    $itemStmt->execute(['id' => $itemId]);
                    $itemInfo = $itemStmt->fetch();
                    $itemName = $itemInfo ? $itemInfo['item_name'] : "Item #{$itemId}";
                    $unit = $itemInfo ? $itemInfo['unit_code'] : 'PCS';
                    $availDisp = round($available, 3);
                    $reqDisp = round($qty, 3);
                    throw new \RuntimeException(
                        "Insufficient stock for \"{$itemName}\". Available: {$availDisp} {$unit}, Requested: {$reqDisp} {$unit}."
                    );
                }
            }

            $stmt = $this->pdo->prepare(
                'INSERT INTO stock_adjustments (item_id, owner_type, owner_id, adjustment_type, qty, reason, remarks, created_by)
                 VALUES (:item_id, :owner_type, :owner_id, :adjustment_type, :qty, :reason, :remarks, :created_by)'
            );
            $stmt->execute([
                'item_id' => $itemId,
                'owner_type' => $ownerType,
                'owner_id' => $ownerId,
                'adjustment_type' => $adjustmentType,
                'qty' => $qty,
                'reason' => $reason,
                'remarks' => $remarks,
                'created_by' => $createdBy,
            ]);
            $id = (int) $this->pdo->lastInsertId();

            $signedQty = $adjustmentType === 'addition' ? $qty : -$qty;
            (new StockLedgerService($this->pdo))->applyMovement(
                $itemId,
                $ownerType,
                $ownerId,
                $signedQty,
                'adjustment',
                'stock_adjustments',
                $id,
                $reason,
                $remarks,
                $createdBy
            );

            $this->pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
