<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Services\CreditLedgerService;
use App\Services\SupplierLedgerService;
use PDO;

/** Dashboard KPI cards (section 11). Gated wholesale behind dashboard.view_financial_summary. */
class DashboardController
{
    public function __construct(private PDO $pdo)
    {
    }

    private function resolveBranchId(array $claims): int
    {
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if ($canSwitch && isset($_GET['branch_id'])) {
            return (int) $_GET['branch_id'];
        }
        return (int) $claims['branch_id'];
    }

    public function summary(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'dashboard.view_financial_summary');
        $branchId = $this->resolveBranchId($claims);

        $scalar = function (string $sql, array $params = []) {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchColumn();
        };

        $todaySales = (float) $scalar(
            "SELECT COALESCE(SUM(grand_total),0) FROM invoices
             WHERE branch_id = :b AND status = 'completed' AND invoice_date = CURDATE()",
            ['b' => $branchId]
        );
        $monthSales = (float) $scalar(
            "SELECT COALESCE(SUM(grand_total),0) FROM invoices
             WHERE branch_id = :b AND status = 'completed'
               AND YEAR(invoice_date) = YEAR(CURDATE()) AND MONTH(invoice_date) = MONTH(CURDATE())",
            ['b' => $branchId]
        );
        $todayPurchases = (float) $scalar(
            "SELECT COALESCE(SUM(grand_total),0) FROM purchases
             WHERE branch_id = :b AND status = 'active' AND purchase_date = CURDATE()",
            ['b' => $branchId]
        );
        $monthPurchases = (float) $scalar(
            "SELECT COALESCE(SUM(grand_total),0) FROM purchases
             WHERE branch_id = :b AND status = 'active'
               AND YEAR(purchase_date) = YEAR(CURDATE()) AND MONTH(purchase_date) = MONTH(CURDATE())",
            ['b' => $branchId]
        );
        $inventoryValuation = (float) $scalar(
            "SELECT COALESCE(SUM(sl.quantity_on_hand * i.cost_price),0)
             FROM stock_ledger sl JOIN items i ON i.id = sl.item_id
             WHERE sl.owner_type = 'branch' AND sl.owner_id = :b",
            ['b' => $branchId]
        );
        $customerOutstanding = (float) $scalar(
            "SELECT COALESCE(SUM(balance_due),0) FROM invoices
             WHERE branch_id = :b AND status = 'completed'",
            ['b' => $branchId]
        );
        $supplierOutstanding = (float) $scalar(
            "SELECT COALESCE(SUM(pending_balance),0) FROM purchases
             WHERE branch_id = :b AND status = 'active'",
            ['b' => $branchId]
        );
        $employeeCollectionsToday = (float) $scalar(
            "SELECT COALESCE(SUM(amount),0) FROM customer_collections
             WHERE branch_id = :b AND DATE(collected_at) = CURDATE()",
            ['b' => $branchId]
        );
        $operatingExpensesToday = (float) $scalar(
            "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE branch_id = :b AND expense_date = CURDATE()",
            ['b' => $branchId]
        );
        $extraIncomeToday = (float) $scalar(
            "SELECT COALESCE(SUM(amount),0) FROM other_income WHERE branch_id = :b AND income_date = CURDATE()",
            ['b' => $branchId]
        );
        $lowStockCount = (int) $scalar(
            "SELECT COUNT(*) FROM (
                SELECT i.id
                FROM items i
                LEFT JOIN stock_ledger sl ON sl.item_id = i.id AND sl.owner_type = 'branch' AND sl.owner_id = :b
                WHERE i.is_active = 1
                GROUP BY i.id, i.min_stock_threshold
                HAVING COALESCE(SUM(sl.quantity_on_hand),0) <= i.min_stock_threshold
             ) t",
            ['b' => $branchId]
        );

        Response::json([
            'today_sales_revenue' => round($todaySales, 2),
            'month_sales_total' => round($monthSales, 2),
            'today_purchases' => round($todayPurchases, 2),
            'month_purchases_total' => round($monthPurchases, 2),
            'inventory_valuation' => round($inventoryValuation, 2),
            'customer_net_outstanding' => round($customerOutstanding, 2),
            'supplier_net_outstanding' => round($supplierOutstanding, 2),
            'employee_collections_today' => round($employeeCollectionsToday, 2),
            'operating_expenses_today' => round($operatingExpensesToday, 2),
            'extra_income_today' => round($extraIncomeToday, 2),
            'low_stock_count' => $lowStockCount,
        ]);
    }
}
