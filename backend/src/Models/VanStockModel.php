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

    /**
     * Returns ['issue_id' => int] on success, or ['warning' => 'insufficient_stock',
     * 'shortages' => [...]] when a requested quantity exceeds what's actually
     * on hand at the branch right now — a warning, never a hard block: pass
     * $confirmInsufficient=true (the caller already showed the user the
     * shortages and they chose Continue) to issue anyway. Checked fresh
     * against the locked stock_ledger rows on every call, inside the same
     * transaction as the write, so a stock change between the warning and
     * the confirm click is still caught and the issue still can't race
     * another concurrent issue past the same stock.
     */
    public function issue(
        int $branchId,
        int $employeeId,
        int $issuedBy,
        ?string $notes,
        array $lines,
        bool $confirmInsufficient = false,
        ?int $customerId = null,
        ?int $prebookingId = null
    ): array
    {
        if (empty($lines)) {
            throw new \InvalidArgumentException('At least one item is required for stock issue');
        }

        $mustCommit = false;
        if (!$this->pdo->inTransaction()) {
            $this->pdo->beginTransaction();
            $mustCommit = true;
        }
        try {
            // 1. Group & validate issue quantities per item
            $issueQtyByItem = [];
            foreach ($lines as $line) {
                $itemId = (int) ($line['item_id'] ?? 0);
                $qty = (float) ($line['qty'] ?? 0);
                if ($itemId <= 0 || $qty <= 0) {
                    throw new \InvalidArgumentException('Each issue line must have a valid item_id and quantity greater than zero');
                }
                $issueQtyByItem[$itemId] = ($issueQtyByItem[$itemId] ?? 0.0) + $qty;
            }

            // 2. Lock branch/warehouse stock_ledger rows FOR UPDATE and collect
            // (not throw) any shortages — Stock Warning, not a block.
            $stockStmt = $this->pdo->prepare(
                'SELECT quantity_on_hand FROM stock_ledger
                 WHERE item_id = :item_id AND owner_type = \'branch\' AND owner_id = :branch_id
                 FOR UPDATE'
            );

            $itemStmt = $this->pdo->prepare('SELECT item_name FROM items WHERE id = :id');

            $shortages = [];
            foreach ($issueQtyByItem as $itemId => $requiredQty) {
                $stockStmt->execute(['item_id' => $itemId, 'branch_id' => $branchId]);
                $stockRow = $stockStmt->fetch();
                $available = $stockRow !== false ? (float) $stockRow['quantity_on_hand'] : 0.0;

                if ($available < $requiredQty) {
                    $itemStmt->execute(['id' => $itemId]);
                    $itemName = $itemStmt->fetchColumn() ?: "Item #{$itemId}";
                    $shortages[] = [
                        'item_id' => $itemId,
                        'item_name' => $itemName,
                        'available' => round($available, 3),
                        'requested' => round($requiredQty, 3),
                        'excess' => round($requiredQty - $available, 3),
                    ];
                }
            }

            if (!empty($shortages) && !$confirmInsufficient) {
                if ($mustCommit) {
                    $this->pdo->rollBack();
                }
                return ['warning' => 'insufficient_stock', 'shortages' => $shortages];
            }

            // 3. Create issue note header
            $stmt = $this->pdo->prepare(
                'INSERT INTO stock_issue_notes (branch_id, employee_id, issued_by, notes, customer_id, prebooking_id)
                 VALUES (:branch_id, :employee_id, :issued_by, :notes, :customer_id, :prebooking_id)'
            );
            $stmt->execute([
                'branch_id' => $branchId,
                'employee_id' => $employeeId,
                'issued_by' => $issuedBy,
                'notes' => $notes,
                'customer_id' => $customerId,
                'prebooking_id' => $prebookingId,
            ]);
            $issueId = (int) $this->pdo->lastInsertId();
            $this->pdo->prepare('UPDATE stock_issue_notes SET issue_no = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('ISS', $issueId), 'id' => $issueId]);

            // Link prebooking to this issue if prebookingId was provided
            if ($prebookingId !== null) {
                $upStmt = $this->pdo->prepare(
                    "UPDATE customer_prebookings 
                     SET van_issue_id = :issue_id, status = 'processing', employee_id = :employee_id 
                     WHERE id = :prebooking_id AND van_issue_id IS NULL"
                );
                $upStmt->execute([
                    'issue_id' => $issueId,
                    'employee_id' => $employeeId,
                    'prebooking_id' => $prebookingId,
                ]);
            }

            // 4. Create line items and apply movements
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

            if ($mustCommit) {
                $this->pdo->commit();
            }
            return ['issue_id' => $issueId];
        } catch (\Throwable $e) {
            if ($mustCommit && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function returnStock(int $branchId, int $employeeId, ?int $issueId, int $returnedBy, ?string $notes, array $lines): int
    {
        if (empty($lines)) {
            throw new \InvalidArgumentException('At least one item is required for stock return');
        }

        $this->pdo->beginTransaction();
        try {
            // 1. Group & validate return quantities per item
            $returnQtyByItem = [];
            foreach ($lines as $line) {
                $itemId = (int) ($line['item_id'] ?? 0);
                $qty = (float) ($line['qty'] ?? 0);
                if ($itemId <= 0 || $qty <= 0) {
                    throw new \InvalidArgumentException('Each return line must have a valid item_id and quantity greater than zero');
                }
                $returnQtyByItem[$itemId] = ($returnQtyByItem[$itemId] ?? 0.0) + $qty;
            }

            // 2. Lock & validate van stock_ledger rows FOR UPDATE
            $stockStmt = $this->pdo->prepare(
                'SELECT quantity_on_hand FROM stock_ledger
                 WHERE item_id = :item_id AND owner_type = \'employee\' AND owner_id = :employee_id
                 FOR UPDATE'
            );

            $itemStmt = $this->pdo->prepare('SELECT item_name FROM items WHERE id = :id');

            foreach ($returnQtyByItem as $itemId => $requiredQty) {
                $stockStmt->execute(['item_id' => $itemId, 'employee_id' => $employeeId]);
                $stockRow = $stockStmt->fetch();
                $available = $stockRow !== false ? (float) $stockRow['quantity_on_hand'] : 0.0;

                if ($available < $requiredQty) {
                    $itemStmt->execute(['id' => $itemId]);
                    $itemName = $itemStmt->fetchColumn() ?: "Item #{$itemId}";
                    $availableDisp = round($available, 3);
                    $requiredDisp = round($requiredQty, 3);
                    throw new \RuntimeException(
                        "Cannot return {$requiredDisp} of \"{$itemName}\". Only {$availableDisp} currently in van stock."
                    );
                }
            }

            // 3. Create return note header
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

            // 4. Create line items and apply movements
            $itemInsertStmt = $this->pdo->prepare(
                'INSERT INTO stock_return_items (return_id, item_id, qty) VALUES (:return_id, :item_id, :qty)'
            );
            $stock = new StockLedgerService($this->pdo);
            foreach ($lines as $line) {
                $itemId = (int) $line['item_id'];
                $qty = (float) $line['qty'];
                $itemInsertStmt->execute(['return_id' => $returnId, 'item_id' => $itemId, 'qty' => $qty]);

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
     * Fetch active customer pre-bookings that have not yet been dispatched to a van,
     * along with customer details and line items for auto-population in Van Stock.
     */
    public function getEligibleCustomerOrders(int $branchId): array
    {
        $sql = "SELECT cpb.id, cpb.prebooking_no, cpb.customer_id, cpb.branch_id,
                       cpb.employee_id, cpb.status, cpb.created_at,
                       c.ledger_name AS customer_name, c.phone AS customer_phone,
                       u.name AS employee_name,
                       COUNT(cpi.id) AS item_count,
                       COALESCE(SUM(cpi.qty * cpi.rate), 0) AS estimated_total
                FROM customer_prebookings cpb
                JOIN customers c ON c.id = cpb.customer_id
                LEFT JOIN users u ON u.id = cpb.employee_id
                LEFT JOIN customer_prebooking_items cpi ON cpi.prebooking_id = cpb.id
                WHERE cpb.branch_id = :branch_id
                  AND cpb.van_issue_id IS NULL
                  AND cpb.status IN ('pending', 'confirmed')
                GROUP BY cpb.id
                ORDER BY cpb.id DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['branch_id' => $branchId]);
        $orders = $stmt->fetchAll();

        if (!empty($orders)) {
            $orderIds = array_column($orders, 'id');
            $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
            $itemSql = "SELECT cpi.id, cpi.prebooking_id, cpi.item_id, cpi.qty, cpi.rate,
                               i.item_name, i.item_code, su.short_code AS unit_code,
                               COALESCE(sl.quantity_on_hand, 0) AS available_stock
                        FROM customer_prebooking_items cpi
                        JOIN items i ON i.id = cpi.item_id
                        LEFT JOIN stock_units su ON su.id = i.base_unit_id
                        LEFT JOIN stock_ledger sl ON sl.item_id = i.id AND sl.owner_type = 'branch' AND sl.owner_id = ?
                        WHERE cpi.prebooking_id IN ($placeholders)
                        ORDER BY cpi.id";
            $itemStmt = $this->pdo->prepare($itemSql);
            $itemStmt->execute(array_merge([$branchId], $orderIds));
            $allItems = $itemStmt->fetchAll();

            $itemsByOrder = [];
            foreach ($allItems as $it) {
                $it['qty'] = (float) $it['qty'];
                $it['rate'] = (float) $it['rate'];
                $it['available_stock'] = (float) $it['available_stock'];
                $itemsByOrder[$it['prebooking_id']][] = $it;
            }

            foreach ($orders as &$ord) {
                $ord['items'] = $itemsByOrder[$ord['id']] ?? [];
                $ord['estimated_total'] = (float) round((float) $ord['estimated_total'], 2);
            }
            unset($ord);
        }

        return $orders;
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
                       sin.branch_id, sin.employee_id, u.name AS employee_name,
                       ub.name AS issued_by_name,
                       b.branch_name, b.print_name AS branch_print_name,
                       sin.customer_id, sin.prebooking_id,
                       COALESCE(c.ledger_name, c_pb.ledger_name) AS customer_name,
                       COALESCE(c.phone, c_pb.phone) AS customer_phone,
                       COALESCE(cpb_direct.prebooking_no, cpb.prebooking_no) AS prebooking_no
                FROM stock_issue_notes sin
                LEFT JOIN users u ON u.id = sin.employee_id
                LEFT JOIN users ub ON ub.id = sin.issued_by
                LEFT JOIN branches b ON b.id = sin.branch_id
                LEFT JOIN customers c ON c.id = sin.customer_id
                LEFT JOIN customer_prebookings cpb_direct ON cpb_direct.id = sin.prebooking_id
                LEFT JOIN customer_prebookings cpb ON cpb.van_issue_id = sin.id
                LEFT JOIN customers c_pb ON c_pb.id = COALESCE(cpb_direct.customer_id, cpb.customer_id)
                WHERE sin.branch_id = :branch_id";
        $params = ['branch_id' => $branchId];
        if ($employeeId !== null) {
            $sql .= ' AND sin.employee_id = :employee_id';
            $params['employee_id'] = $employeeId;
        }
        $sql .= ' GROUP BY sin.id, sin.issue_no, sin.issued_at, sin.notes, sin.branch_id, sin.employee_id,
                           u.name, ub.name, b.branch_name, b.print_name, sin.customer_id, sin.prebooking_id,
                           c.ledger_name, c_pb.ledger_name, c.phone, c_pb.phone, cpb_direct.prebooking_no, cpb.prebooking_no
                  ORDER BY sin.id DESC LIMIT 200';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $issues = $stmt->fetchAll();

        if (!empty($issues)) {
            $issueIds = array_column($issues, 'id');
            $placeholders = implode(',', array_fill(0, count($issueIds), '?'));
            $itemSql = "SELECT sii.id, sii.issue_id, sii.item_id, sii.qty,
                               i.item_name, i.item_code, su.short_code AS unit_code,
                               COALESCE(i.net_srate, i.retail_price, 0) AS unit_price,
                               ROUND(sii.qty * COALESCE(i.net_srate, i.retail_price, 0), 2) AS line_amount
                        FROM stock_issue_items sii
                        JOIN items i ON i.id = sii.item_id
                        LEFT JOIN stock_units su ON su.id = i.base_unit_id
                        WHERE sii.issue_id IN ($placeholders)
                        ORDER BY sii.id";
            $itemStmt = $this->pdo->prepare($itemSql);
            $itemStmt->execute($issueIds);
            $allItems = $itemStmt->fetchAll();

            $itemsByIssue = [];
            foreach ($allItems as $item) {
                $item['qty'] = (float) $item['qty'];
                $item['unit_price'] = (float) $item['unit_price'];
                $item['line_amount'] = (float) $item['line_amount'];
                $itemsByIssue[$item['issue_id']][] = $item;
            }

            foreach ($issues as &$iss) {
                $iss['items'] = $itemsByIssue[$iss['id']] ?? [];
                $iss['item_count'] = count($iss['items']);
                $iss['total_qty'] = (float) array_sum(array_column($iss['items'], 'qty'));
                $iss['total_amount'] = (float) round(array_sum(array_column($iss['items'], 'line_amount')), 2);
            }
            unset($iss);
        }

        return $issues;
    }

    /** Item lines of one issue transaction — the "ONE ISSUE TRANSACTION → MANY ITEMS" detail (section 24). */
    public function issueLines(int $issueId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sii.*, i.item_name, i.item_code, su.short_code AS unit_code,
                    COALESCE(i.net_srate, i.retail_price, 0) AS unit_price,
                    ROUND(sii.qty * COALESCE(i.net_srate, i.retail_price, 0), 2) AS line_amount
             FROM stock_issue_items sii
             JOIN items i ON i.id = sii.item_id
             LEFT JOIN stock_units su ON su.id = i.base_unit_id
             WHERE sii.issue_id = :issue_id
             ORDER BY sii.id'
        );
        $stmt->execute(['issue_id' => $issueId]);
        $lines = $stmt->fetchAll();
        foreach ($lines as &$line) {
            $line['qty'] = (float) $line['qty'];
            $line['unit_price'] = (float) $line['unit_price'];
            $line['line_amount'] = (float) $line['line_amount'];
        }
        return $lines;
    }

    public function findIssue(int $issueId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sin.*, u.name AS employee_name, ub.name AS issued_by_name,
                    b.branch_name, b.print_name AS branch_print_name,
                    b.address_line1, b.city, b.state, b.pincode, b.phone AS branch_phone, b.gstin AS branch_gstin,
                    comp.name AS company_name,
                    COALESCE(cust.ledger_name, c_pb.ledger_name) AS customer_name,
                    COALESCE(cust.phone, c_pb.phone) AS customer_phone,
                    COALESCE(cpb_direct.prebooking_no, cpb.prebooking_no) AS prebooking_no
             FROM stock_issue_notes sin
             LEFT JOIN users u ON u.id = sin.employee_id
             LEFT JOIN users ub ON ub.id = sin.issued_by
             LEFT JOIN branches b ON b.id = sin.branch_id
             LEFT JOIN company comp ON comp.id = b.company_id
             LEFT JOIN customers cust ON cust.id = sin.customer_id
             LEFT JOIN customer_prebookings cpb_direct ON cpb_direct.id = sin.prebooking_id
             LEFT JOIN customer_prebookings cpb ON cpb.van_issue_id = sin.id
             LEFT JOIN customers c_pb ON c_pb.id = COALESCE(cpb_direct.customer_id, cpb.customer_id)
             WHERE sin.id = :id'
        );
        $stmt->execute(['id' => $issueId]);
        $issue = $stmt->fetch();
        if (!$issue) {
            return null;
        }
        $issue['items'] = $this->issueLines($issueId);
        $issue['total_qty'] = (float) array_sum(array_column($issue['items'], 'qty'));
        $issue['total_amount'] = (float) round(array_sum(array_column($issue['items'], 'line_amount')), 2);
        return $issue;
    }

    /**
     * Return TRANSACTIONS (headers) for a branch — one row per Return Stock
     * action, however many items it contained. item_count/total_qty are a
     * quick summary for the list view; full lines come from returnLines().
     */
    public function listReturns(int $branchId, ?int $employeeId = null): array
    {
        $sql = "SELECT srn.id, srn.return_no, srn.issue_id, srn.returned_at, srn.notes,
                       srn.branch_id, srn.employee_id, u.name AS employee_name,
                       ub.name AS returned_by_name,
                       sin.issue_no,
                       b.branch_name, b.print_name AS branch_print_name,
                       COUNT(sri.id) AS item_count,
                       COALESCE(SUM(sri.qty), 0) AS total_qty,
                       COALESCE(SUM(sri.qty * COALESCE(i.net_srate, i.retail_price, 0)), 0) AS total_amount
                FROM stock_return_notes srn
                JOIN users u ON u.id = srn.employee_id
                LEFT JOIN users ub ON ub.id = srn.returned_by
                LEFT JOIN branches b ON b.id = srn.branch_id
                LEFT JOIN stock_issue_notes sin ON sin.id = srn.issue_id
                LEFT JOIN stock_return_items sri ON sri.return_id = srn.id
                LEFT JOIN items i ON i.id = sri.item_id
                WHERE srn.branch_id = :branch_id";
        $params = ['branch_id' => $branchId];
        if ($employeeId !== null) {
            $sql .= ' AND srn.employee_id = :employee_id';
            $params['employee_id'] = $employeeId;
        }
        $sql .= ' GROUP BY srn.id ORDER BY srn.id DESC LIMIT 200';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $returns = $stmt->fetchAll();

        if (!empty($returns)) {
            $returnIds = array_column($returns, 'id');
            $placeholders = implode(',', array_fill(0, count($returnIds), '?'));
            $itemSql = "SELECT sri.id, sri.return_id, sri.item_id, sri.qty,
                               i.item_name, i.item_code, su.short_code AS unit_code,
                               COALESCE(i.net_srate, i.retail_price, 0) AS unit_price,
                               ROUND(sri.qty * COALESCE(i.net_srate, i.retail_price, 0), 2) AS line_amount
                        FROM stock_return_items sri
                        JOIN items i ON i.id = sri.item_id
                        LEFT JOIN stock_units su ON su.id = i.base_unit_id
                        WHERE sri.return_id IN ($placeholders)
                        ORDER BY sri.id";
            $itemStmt = $this->pdo->prepare($itemSql);
            $itemStmt->execute($returnIds);
            $allItems = $itemStmt->fetchAll();

            $itemsByReturn = [];
            foreach ($allItems as $item) {
                $item['qty'] = (float) $item['qty'];
                $item['unit_price'] = (float) $item['unit_price'];
                $item['line_amount'] = (float) $item['line_amount'];
                $itemsByReturn[$item['return_id']][] = $item;
            }

            foreach ($returns as &$rtn) {
                $rtn['items'] = $itemsByReturn[$rtn['id']] ?? [];
                $rtn['item_count'] = count($rtn['items']);
                $rtn['total_qty'] = (float) array_sum(array_column($rtn['items'], 'qty'));
                $rtn['total_amount'] = (float) round(array_sum(array_column($rtn['items'], 'line_amount')), 2);
            }
            unset($rtn);
        }

        return $returns;
    }

    /** Item lines of one return transaction. */
    public function returnLines(int $returnId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sri.*, i.item_name, i.item_code, su.short_code AS unit_code,
                    COALESCE(i.net_srate, i.retail_price, 0) AS unit_price,
                    ROUND(sri.qty * COALESCE(i.net_srate, i.retail_price, 0), 2) AS line_amount
             FROM stock_return_items sri
             JOIN items i ON i.id = sri.item_id
             LEFT JOIN stock_units su ON su.id = i.base_unit_id
             WHERE sri.return_id = :return_id
             ORDER BY sri.id'
        );
        $stmt->execute(['return_id' => $returnId]);
        $lines = $stmt->fetchAll();
        foreach ($lines as &$line) {
            $line['qty'] = (float) $line['qty'];
            $line['unit_price'] = (float) $line['unit_price'];
            $line['line_amount'] = (float) $line['line_amount'];
        }
        return $lines;
    }

    public function findReturn(int $returnId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT srn.*, u.name AS employee_name, ub.name AS returned_by_name,
                    sin.issue_no,
                    b.branch_name, b.print_name AS branch_print_name,
                    b.address_line1, b.city, b.state, b.pincode, b.phone AS branch_phone, b.gstin AS branch_gstin,
                    c.name AS company_name
             FROM stock_return_notes srn
             JOIN users u ON u.id = srn.employee_id
             LEFT JOIN users ub ON ub.id = srn.returned_by
             LEFT JOIN branches b ON b.id = srn.branch_id
             LEFT JOIN company c ON c.id = b.company_id
             LEFT JOIN stock_issue_notes sin ON sin.id = srn.issue_id
             WHERE srn.id = :id'
        );
        $stmt->execute(['id' => $returnId]);
        $return = $stmt->fetch();
        if (!$return) {
            return null;
        }
        $return['items'] = $this->returnLines($returnId);
        $return['total_qty'] = (float) array_sum(array_column($return['items'], 'qty'));
        $return['total_amount'] = (float) round(array_sum(array_column($return['items'], 'line_amount')), 2);
        return $return;
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
