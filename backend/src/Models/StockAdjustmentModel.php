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
