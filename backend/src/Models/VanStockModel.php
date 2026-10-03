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

    /**
     * Issue TRANSACTIONS (headers) for a branch — one row per Issue Stock
     * action, however many items it contained (section 19/21: the issue
     * reference, not the per-item balance). item_count/total_qty are a
     * quick summary for the list view; full lines come from issueLines().
     */
    public function listIssues(int $branchId, ?int $employeeId = null): array
    {
        $sql = "SELECT sin.id, sin.issue_no, sin.issued_at, sin.notes,
                       sin.employee_id, u.name AS employee_name,
                       sin.route_id, r.name AS route_name,
                       ub.name AS issued_by_name,
                       COUNT(sii.id) AS item_count, SUM(sii.qty) AS total_qty
                FROM stock_issue_notes sin
                JOIN users u ON u.id = sin.employee_id
                LEFT JOIN routes r ON r.id = sin.route_id
                LEFT JOIN users ub ON ub.id = sin.issued_by
                LEFT JOIN stock_issue_items sii ON sii.issue_id = sin.id
                WHERE sin.branch_id = :branch_id";
        $params = ['branch_id' => $branchId];
        if ($employeeId !== null) {
            $sql .= ' AND sin.employee_id = :employee_id';
            $params['employee_id'] = $employeeId;
        }
        $sql .= ' GROUP BY sin.id ORDER BY sin.id DESC LIMIT 200';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /** Item lines of one issue transaction — the "ONE ISSUE TRANSACTION → MANY ITEMS" detail (section 24). */
    public function issueLines(int $issueId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sii.*, i.item_name, i.item_code, su.short_code AS unit_code
             FROM stock_issue_items sii
             JOIN items i ON i.id = sii.item_id
             LEFT JOIN stock_units su ON su.id = i.base_unit_id
             WHERE sii.issue_id = :issue_id
             ORDER BY sii.id'
        );
        $stmt->execute(['issue_id' => $issueId]);
        return $stmt->fetchAll();
    }

    public function findIssue(int $issueId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sin.*, u.name AS employee_name, r.name AS route_name, ub.name AS issued_by_name
             FROM stock_issue_notes sin
             JOIN users u ON u.id = sin.employee_id
             LEFT JOIN routes r ON r.id = sin.route_id
             LEFT JOIN users ub ON ub.id = sin.issued_by
             WHERE sin.id = :id'
        );
        $stmt->execute(['id' => $issueId]);
        $issue = $stmt->fetch();
        if (!$issue) {
            return null;
        }
        $issue['items'] = $this->issueLines($issueId);
        return $issue;
    }

    /**
     * issued - returned per item for one employee, i.e. what's still "out"
     * with them (van pending). Joined to items/stock_units so the UI can
     * show the actual item name/SKU/unit instead of a bare item_id — the
     * balance itself (quantity_on_hand) was already correct; this was only
     * ever missing display data, not a stock-accounting bug (verified: two
     * issues to the same employee/item accumulate via stock_ledger's own
     * unique (item_id, owner_type, owner_id) balance row, never a duplicate
     * row, and a return only ever decrements that same row).
     */
    public function pendingForEmployee(int $employeeId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT sl.item_id, sl.quantity_on_hand,
                    i.item_name, i.item_code, i.barcode,
                    i.cost_price, i.purchase_price,
                    COALESCE(i.net_srate, i.retail_price) AS selling_price,
                    ROUND(sl.quantity_on_hand * i.cost_price, 2) AS stock_value,
                    su.short_code AS unit_code
             FROM stock_ledger sl
             JOIN items i ON i.id = sl.item_id
             LEFT JOIN stock_units su ON su.id = i.base_unit_id
             WHERE sl.owner_type = 'employee' AND sl.owner_id = :employee_id
             ORDER BY i.item_name"
        );
        $stmt->execute(['employee_id' => $employeeId]);
        return $stmt->fetchAll();
    }
}
