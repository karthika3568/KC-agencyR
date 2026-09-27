<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Helpers\TableExporter;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use PDO;

/** Combined view of stock across warehouse/branch/employee owners (section 4 "Stock Hub"). */
class StockHubController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function index(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.view_stock');

        $where = [];
        $params = [];
        if (!empty($_GET['owner_type'])) {
            $where[] = 'sl.owner_type = :owner_type';
            $params['owner_type'] = $_GET['owner_type'];
        }
        if (!empty($_GET['item_id'])) {
            $where[] = 'sl.item_id = :item_id';
            $params['item_id'] = (int) $_GET['item_id'];
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $stmt = $this->pdo->prepare(
            "SELECT sl.*, i.item_name, i.item_code, i.min_stock_threshold,
                    su.short_code AS unit_code,
                    CASE sl.owner_type
                        WHEN 'branch' THEN (SELECT branch_name FROM branches WHERE id = sl.owner_id)
                        WHEN 'employee' THEN (SELECT name FROM users WHERE id = sl.owner_id)
                        ELSE 'Warehouse'
                    END AS owner_name
             FROM stock_ledger sl
             JOIN items i ON i.id = sl.item_id
             LEFT JOIN stock_units su ON su.id = i.base_unit_id
             {$whereSql}
             ORDER BY i.item_name"
        );
        $stmt->execute($params);
        Response::json($stmt->fetchAll());
    }

    /** GET /api/stock-hub/low-stock — items at/under their min_stock_threshold across all branch pools. */
    public function lowStock(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.view_stock');

        $stmt = $this->pdo->query(
            "SELECT i.id, i.item_code, i.item_name, i.min_stock_threshold,
                    COALESCE(SUM(CASE WHEN sl.owner_type = 'branch' THEN sl.quantity_on_hand ELSE 0 END), 0) AS branch_qty
             FROM items i
             LEFT JOIN stock_ledger sl ON sl.item_id = i.id
             WHERE i.is_active = 1
             GROUP BY i.id, i.item_code, i.item_name, i.min_stock_threshold
             HAVING branch_qty <= i.min_stock_threshold
             ORDER BY i.item_name"
        );
        $rows = $stmt->fetchAll();

        if (!empty($_GET['export'])) {
            PermissionMiddleware::require($claims, 'reports.export_excel');
            TableExporter::export([
                'item_code' => 'Code', 'item_name' => 'Item', 'branch_qty' => 'Qty on Hand', 'min_stock_threshold' => 'Min Threshold',
            ], $rows, 'low_stock.xlsx');
        }

        Response::json($rows);
    }
}
