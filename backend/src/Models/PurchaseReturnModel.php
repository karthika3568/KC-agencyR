<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\CodeGenerator;
use App\Services\StockLedgerService;
use App\Services\SupplierLedgerService;
use PDO;

/** Purchase returns — supplier-side mirror of SalesReturnModel (section 4.9). */
class PurchaseReturnModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function all(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT pr.*, s.name AS supplier_name, p.grn_no
             FROM purchase_returns pr
             JOIN suppliers s ON s.id = pr.supplier_id
             LEFT JOIN purchases p ON p.id = pr.purchase_id
             WHERE pr.branch_id = :branch_id ORDER BY pr.id DESC"
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            "SELECT pr.*, s.name AS supplier_name, p.grn_no
             FROM purchase_returns pr
             JOIN suppliers s ON s.id = pr.supplier_id
             LEFT JOIN purchases p ON p.id = pr.purchase_id
             WHERE pr.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $return = $stmt->fetch();
        if (!$return) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT pri.*, it.item_name FROM purchase_return_items pri
             JOIN items it ON it.id = pri.item_id WHERE pri.purchase_return_id = :id'
        );
        $stmt->execute(['id' => $id]);
        $return['items'] = $stmt->fetchAll();

        return $return;
    }

    public function create(array $header, array $lines, int $createdBy): int
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO purchase_returns (purchase_id, supplier_id, branch_id, reason, created_by)
                 VALUES (:purchase_id, :supplier_id, :branch_id, :reason, :created_by)'
            );
            $stmt->execute([
                'purchase_id' => $header['purchase_id'] ?? null,
                'supplier_id' => $header['supplier_id'],
                'branch_id' => $header['branch_id'],
                'reason' => $header['reason'] ?? null,
                'created_by' => $createdBy,
            ]);
            $id = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('UPDATE purchase_returns SET return_no = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('PRT', $id), 'id' => $id]);

            $lineStmt = $this->pdo->prepare(
                'INSERT INTO purchase_return_items (purchase_return_id, item_id, qty, rate, line_total)
                 VALUES (:purchase_return_id, :item_id, :qty, :rate, :line_total)'
            );
            $stock = new StockLedgerService($this->pdo);
            $totalValue = 0.0;
            foreach ($lines as $line) {
                $qty = (float) $line['qty'];
                $rate = (float) $line['rate'];
                $lineTotal = round($qty * $rate, 2);
                $totalValue += $lineTotal;

                $lineStmt->execute([
                    'purchase_return_id' => $id, 'item_id' => (int) $line['item_id'],
                    'qty' => $qty, 'rate' => $rate, 'line_total' => $lineTotal,
                ]);

                $stock->applyMovement(
                    (int) $line['item_id'],
                    'branch',
                    (int) $header['branch_id'],
                    -$qty,
                    'purchase_return',
                    'purchase_returns',
                    $id,
                    null,
                    null,
                    $createdBy
                );
            }

            if ($totalValue > 0) {
                (new SupplierLedgerService($this->pdo))->record(
                    (int) $header['supplier_id'],
                    'debit_note_adjustment',
                    round($totalValue, 2),
                    $header['purchase_id'] ?? null,
                    null,
                    "Purchase return " . CodeGenerator::fromId('PRT', $id),
                    $createdBy
                );
            }

            $this->pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
