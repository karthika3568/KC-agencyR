<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\CodeGenerator;
use App\Services\StockLedgerService;
use PDO;

/**
 * Van / salesman stock (section 4.7). Issuing moves stock from the branch's
 * own pool to the employee's; a day-end return reverses it. Both legs of
 * each operation are logged via StockLedgerService so the audit trail always
 * balances back to zero net change across owners.
 */
class VanStockModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function issue(int $branchId, int $employeeId, ?int $routeId, int $issuedBy, ?string $notes, array $lines): int
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO stock_issue_notes (branch_id, employee_id, route_id, issued_by, notes)
                 VALUES (:branch_id, :employee_id, :route_id, :issued_by, :notes)'
            );
            $stmt->execute([
                'branch_id' => $branchId, 'employee_id' => $employeeId,
                'route_id' => $routeId, 'issued_by' => $issuedBy, 'notes' => $notes,
            ]);
            $issueId = (int) $this->pdo->lastInsertId();
            $this->pdo->prepare('UPDATE stock_issue_notes SET issue_no = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('ISS', $issueId), 'id' => $issueId]);

            $itemStmt = $this->pdo->prepare(
                'INSERT INTO stock_issue_items (issue_id, item_id, qty) VALUES (:issue_id, :item_id, :qty)'
            );
            $stock = new StockLedgerService($this->pdo);
            foreach ($lines as $line) {
                $itemId = (int) $line['item_id'];
                $qty = (float) $line['qty'];
                $itemStmt->execute(['issue_id' => $issueId, 'item_id' => $itemId, 'qty' => $qty]);

                $stock->applyMovement($itemId, 'branch', $branchId, -$qty, 'issue_to_salesman', 'stock_issue_notes', $issueId, null, null, $issuedBy);
                $stock->applyMovement($itemId, 'employee', $employeeId, $qty, 'issue_to_salesman', 'stock_issue_notes', $issueId, null, null, $issuedBy);
            }

            $this->pdo->commit();
            return $issueId;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function returnStock(int $branchId, int $employeeId, ?int $issueId, int $returnedBy, ?string $notes, array $lines): int
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO stock_return_notes (issue_id, branch_id, employee_id, returned_by, notes)
                 VALUES (:issue_id, :branch_id, :employee_id, :returned_by, :notes)'
            );
            $stmt->execute([
                'issue_id' => $issueId, 'branch_id' => $branchId,
                'employee_id' => $employeeId, 'returned_by' => $returnedBy, 'notes' => $notes,
            ]);
            $returnId = (int) $this->pdo->lastInsertId();
            $this->pdo->prepare('UPDATE stock_return_notes SET return_no = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('RTN', $returnId), 'id' => $returnId]);

            $itemStmt = $this->pdo->prepare(
                'INSERT INTO stock_return_items (return_id, item_id, qty) VALUES (:return_id, :item_id, :qty)'
            );
            $stock = new StockLedgerService($this->pdo);
            foreach ($lines as $line) {
                $itemId = (int) $line['item_id'];
                $qty = (float) $line['qty'];
                $itemStmt->execute(['return_id' => $returnId, 'item_id' => $itemId, 'qty' => $qty]);

                $stock->applyMovement($itemId, 'employee', $employeeId, -$qty, 'salesman_return', 'stock_return_notes', $returnId, null, null, $returnedBy);
                $stock->applyMovement($itemId, 'branch', $branchId, $qty, 'salesman_return', 'stock_return_notes', $returnId, null, null, $returnedBy);
            }

            $this->pdo->commit();
            return $returnId;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /** issued - returned per item for one employee, i.e. what's still "out" with them (van pending). */
    public function pendingForEmployee(int $employeeId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT item_id, quantity_on_hand FROM stock_ledger WHERE owner_type = 'employee' AND owner_id = :employee_id"
        );
        $stmt->execute(['employee_id' => $employeeId]);
        return $stmt->fetchAll();
    }
}
