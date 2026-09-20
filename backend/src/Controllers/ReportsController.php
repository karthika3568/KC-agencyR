<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Helpers\TableExporter;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use PDO;

/**
 * The report catalog (section 10/4.18). Every report takes ?from=&to=
 * (default: current month to today), is gated behind its own permission,
 * and supports &export=1 to stream the same rows as .xlsx instead of JSON
 * (gated additionally behind reports.export_excel).
 */
class ReportsController
{
    /**
     * Safety cap on unbounded list-style reports (one row per invoice/GRN).
     * Load-tested at 5,000 invoices/branch/month; a report with no LIMIT at
     * 10x that volume would ship a multi-MB JSON payload to the browser for
     * a single date range. Narrow the date range for anything past this —
     * a real pagination UI is the proper fix if that becomes routine.
     */
    private const LIST_REPORT_ROW_CAP = 5000;

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

    private function dateRange(): array
    {
        return [$_GET['from'] ?? date('Y-m-01'), $_GET['to'] ?? date('Y-m-d')];
    }

    private function output(array $claims, array $columns, array $rows, string $filename): void
    {
        if (!empty($_GET['export'])) {
            PermissionMiddleware::require($claims, 'reports.export_excel');
            TableExporter::export($columns, $rows, $filename);
        }
        Response::json($rows);
    }

    /** GST Sales Register — hardcoded bill_type='gst' filter, never toggleable (rule 5 / section 5). */
    public function gstRegister(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_gst_register');
        [$from, $to] = $this->dateRange();

        $stmt = $this->pdo->prepare(
            "SELECT i.invoice_no, i.invoice_date, c.ledger_name AS customer_name, i.taxable_value,
                    i.cgst_amount, i.sgst_amount, i.igst_amount, i.grand_total, i.payment_status
             FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
             WHERE i.branch_id = :b AND i.status = 'completed' AND i.bill_type = 'gst'
               AND i.invoice_date BETWEEN :from AND :to
             ORDER BY i.invoice_date, i.id
             LIMIT " . self::LIST_REPORT_ROW_CAP
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims), 'from' => $from, 'to' => $to]);

        $this->output($claims, [
            'invoice_no' => 'Invoice #', 'invoice_date' => 'Date', 'customer_name' => 'Customer',
            'taxable_value' => 'Taxable Value', 'cgst_amount' => 'CGST', 'sgst_amount' => 'SGST',
            'igst_amount' => 'IGST', 'grand_total' => 'Grand Total', 'payment_status' => 'Payment Status',
        ], $stmt->fetchAll(), 'gst_sales_register.xlsx');
    }

    /** Non-GST/estimate register — deliberately separate from the GST register, never merged into it. */
    public function nonGstRegister(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_non_gst_register');
        [$from, $to] = $this->dateRange();

        $stmt = $this->pdo->prepare(
            "SELECT i.invoice_no, i.invoice_date, c.ledger_name AS customer_name, i.grand_total, i.payment_status
             FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
             WHERE i.branch_id = :b AND i.status = 'completed' AND i.bill_type = 'non_gst'
               AND i.invoice_date BETWEEN :from AND :to
             ORDER BY i.invoice_date, i.id
             LIMIT " . self::LIST_REPORT_ROW_CAP
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims), 'from' => $from, 'to' => $to]);

        $this->output($claims, [
            'invoice_no' => 'Estimate #', 'invoice_date' => 'Date', 'customer_name' => 'Customer',
            'grand_total' => 'Grand Total', 'payment_status' => 'Payment Status',
        ], $stmt->fetchAll(), 'non_gst_register.xlsx');
    }

    public function purchaseRegister(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();
        $canViewCost = in_array('purchases.view_purchase_cost', (array) ($claims['permissions'] ?? []), true);

        $stmt = $this->pdo->prepare(
            "SELECT p.grn_no, p.purchase_date, s.name AS supplier_name, p.grand_total, p.paid_amount, p.pending_balance, p.status
             FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
             WHERE p.branch_id = :b AND p.purchase_date BETWEEN :from AND :to
             ORDER BY p.purchase_date, p.id
             LIMIT " . self::LIST_REPORT_ROW_CAP
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims), 'from' => $from, 'to' => $to]);
        $rows = $stmt->fetchAll();

        $columns = ['grn_no' => 'GRN #', 'purchase_date' => 'Date', 'supplier_name' => 'Supplier'];
        if ($canViewCost) {
            $columns += ['grand_total' => 'Grand Total', 'paid_amount' => 'Paid', 'pending_balance' => 'Pending'];
        } else {
            $rows = array_map(fn ($r) => array_diff_key($r, array_flip(['grand_total', 'paid_amount', 'pending_balance'])), $rows);
        }
        $columns['status'] = 'Status';

        $this->output($claims, $columns, $rows, 'purchase_register.xlsx');
    }

    public function itemWiseSales(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();

        $stmt = $this->pdo->prepare(
            "SELECT i.item_name AS item_name, ii.item_id,
                    SUM(ii.qty) AS total_qty, SUM(ii.free_qty) AS total_free_qty,
                    SUM(ii.line_total) AS total_taxable, SUM(ii.tax_amount) AS total_tax
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN items i ON i.id = ii.item_id
             WHERE inv.branch_id = :b AND inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to
             GROUP BY ii.item_id, i.item_name
             ORDER BY total_taxable DESC"
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims), 'from' => $from, 'to' => $to]);

        $this->output($claims, [
            'item_name' => 'Item', 'total_qty' => 'Qty Sold', 'total_free_qty' => 'Free Qty',
            'total_taxable' => 'Taxable Value', 'total_tax' => 'Tax',
        ], $stmt->fetchAll(), 'item_wise_sales.xlsx');
    }

    /** Credit Outstanding & Limit Check — customers over credit_limit, sorted by days overdue. */
    public function creditOutstanding(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'credit.view_shopwide_outstanding');

        $stmt = $this->pdo->prepare(
            "SELECT c.ledger_name AS customer_name, c.phone, c.credit_limit,
                    COALESCE(SUM(i.balance_due), 0) AS total_outstanding,
                    MIN(i.invoice_date) AS oldest_unpaid_date,
                    DATEDIFF(CURDATE(), MIN(i.invoice_date)) AS days_overdue
             FROM customers c
             JOIN invoices i ON i.customer_id = c.id AND i.status = 'completed' AND i.balance_due > 0.009
             WHERE c.branch_id = :b
             GROUP BY c.id, c.ledger_name, c.phone, c.credit_limit
             ORDER BY days_overdue DESC"
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims)]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['over_limit'] = (float) $r['total_outstanding'] > (float) $r['credit_limit'] ? 'Yes' : 'No';
        }

        $this->output($claims, [
            'customer_name' => 'Customer', 'phone' => 'Phone', 'credit_limit' => 'Credit Limit',
            'total_outstanding' => 'Outstanding', 'days_overdue' => 'Days Overdue', 'over_limit' => 'Over Limit?',
        ], $rows, 'credit_outstanding.xlsx');
    }

    public function expenseIncome(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();
        $branchId = $this->resolveBranchId($claims);

        $stmt = $this->pdo->prepare(
            "SELECT 'Expense' AS type, e.expense_no AS ref_no, ec.name AS category, e.amount, e.description, e.expense_date AS ref_date
             FROM expenses e LEFT JOIN expense_categories ec ON ec.id = e.category_id
             WHERE e.branch_id = :b AND e.expense_date BETWEEN :from AND :to
             UNION ALL
             SELECT 'Income' AS type, oi.receipt_no AS ref_no, 'Other Income' AS category, oi.amount, oi.description, oi.income_date AS ref_date
             FROM other_income oi
             WHERE oi.branch_id = :b2 AND oi.income_date BETWEEN :from2 AND :to2
             ORDER BY ref_date
             LIMIT " . self::LIST_REPORT_ROW_CAP
        );
        $stmt->execute(['b' => $branchId, 'from' => $from, 'to' => $to, 'b2' => $branchId, 'from2' => $from, 'to2' => $to]);

        $this->output($claims, [
            'type' => 'Type', 'ref_no' => 'Reference #', 'category' => 'Category',
            'amount' => 'Amount', 'description' => 'Description', 'ref_date' => 'Date',
        ], $stmt->fetchAll(), 'expense_income.xlsx');
    }

    /**
     * Gross Profitability — Revenue (taxable value, tax excluded per rule 5)
     * minus COGS minus Expenses. COGS uses each item's *current* cost_price
     * as an approximation — invoice_items doesn't snapshot cost_price, only
     * the sale rate, so a cost-price change shifts this report retroactively.
     * See README assumptions.
     */
    public function profitReport(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_profit');
        [$from, $to] = $this->dateRange();
        $branchId = $this->resolveBranchId($claims);

        $scalar = function (string $sql, array $params) {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return (float) $stmt->fetchColumn();
        };

        $revenue = $scalar(
            "SELECT COALESCE(SUM(taxable_value),0) FROM invoices
             WHERE branch_id = :b AND status = 'completed' AND invoice_date BETWEEN :from AND :to",
            ['b' => $branchId, 'from' => $from, 'to' => $to]
        );
        $cogs = $scalar(
            "SELECT COALESCE(SUM(ii.qty * i.cost_price),0)
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN items i ON i.id = ii.item_id
             WHERE inv.branch_id = :b AND inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to",
            ['b' => $branchId, 'from' => $from, 'to' => $to]
        );
        $expenses = $scalar(
            "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE branch_id = :b AND expense_date BETWEEN :from AND :to",
            ['b' => $branchId, 'from' => $from, 'to' => $to]
        );

        Response::json([
            'revenue' => round($revenue, 2),
            'cogs' => round($cogs, 2),
            'gross_profit' => round($revenue - $cogs, 2),
            'expenses' => round($expenses, 2),
            'net_profit' => round($revenue - $cogs - $expenses, 2),
            'from' => $from,
            'to' => $to,
        ]);
    }
}
