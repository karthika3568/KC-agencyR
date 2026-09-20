<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\CodeGenerator;
use PDO;

/** Purchase requests / indents — a quote to a supplier, no stock effect until converted to a GRN. */
class PurchaseRequestModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function all(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT pr.*, s.name AS supplier_name
             FROM purchase_requests pr JOIN suppliers s ON s.id = pr.supplier_id
             WHERE pr.branch_id = :branch_id ORDER BY pr.id DESC'
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT pr.*, s.name AS supplier_name
             FROM purchase_requests pr JOIN suppliers s ON s.id = pr.supplier_id
             WHERE pr.id = :id'
        );
        $stmt->execute(['id' => $id]);
        $request = $stmt->fetch();
        if (!$request) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT pri.*, i.item_name FROM purchase_request_items pri
             JOIN items i ON i.id = pri.item_id WHERE pri.purchase_request_id = :id'
        );
        $stmt->execute(['id' => $id]);
        $request['items'] = $stmt->fetchAll();

        return $request;
    }

    public function create(array $header, array $lines): int
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO purchase_requests (supplier_id, branch_id, notes, created_by)
                 VALUES (:supplier_id, :branch_id, :notes, :created_by)'
            );
            $stmt->execute([
                'supplier_id' => $header['supplier_id'],
                'branch_id' => $header['branch_id'],
                'notes' => $header['notes'] ?? null,
                'created_by' => $header['created_by'],
            ]);
            $id = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('UPDATE purchase_requests SET request_no = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('PI', $id), 'id' => $id]);

            $this->insertLines($id, $lines);

            $this->pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function cancel(int $id): void
    {
        $this->pdo->prepare("UPDATE purchase_requests SET status = 'cancelled' WHERE id = :id AND status = 'open'")
            ->execute(['id' => $id]);
    }

    private function insertLines(int $requestId, array $lines): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO purchase_request_items (purchase_request_id, item_id, qty, rate)
             VALUES (:purchase_request_id, :item_id, :qty, :rate)'
        );
        foreach ($lines as $line) {
            $stmt->execute([
                'purchase_request_id' => $requestId,
                'item_id' => (int) $line['item_id'],
                'qty' => (float) $line['qty'],
                'rate' => (float) ($line['rate'] ?? 0),
            ]);
        }
    }
}
