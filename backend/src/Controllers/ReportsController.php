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

    /**
     * Aligned to the same gross/discount/gst/net formula every other
     * wise-sales report uses (SALES_AGGREGATE_SQL) instead of its own
     * bespoke total_taxable/total_tax pair — the two were computing
     * overlapping-but-differently-named values, which is exactly the kind
     * of mobile/web drift rule 19 asks not to carry forward uncorrected.
     */
    public function itemWiseSales(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();

        $stmt = $this->pdo->prepare(
            "SELECT i.item_name AS item_name, i.item_code AS item_code, i.barcode AS barcode,
                    COALESCE(b.name, '') AS brand_name, COALESCE(cat.name, '') AS category_name,
                    COALESCE(s.name, '') AS supplier_name,
                    " . self::SALES_AGGREGATE_SQL . "
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN items i ON i.id = ii.item_id
             LEFT JOIN brands b ON b.id = i.brand_id
             LEFT JOIN categories cat ON cat.id = i.category_id
             LEFT JOIN suppliers s ON s.id = i.supplier_id
             WHERE inv.branch_id = :b AND inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to
             GROUP BY ii.item_id, i.item_name, i.item_code, i.barcode, b.name, cat.name, s.name
             ORDER BY net_sales DESC"
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims), 'from' => $from, 'to' => $to]);

        $this->output($claims, [
            'item_name' => 'Item', 'item_code' => 'SKU', 'barcode' => 'Barcode',
            'brand_name' => 'Brand', 'category_name' => 'Category', 'supplier_name' => 'Supplier',
            'quantity' => 'Qty Sold', 'gross_sales' => 'Gross Sales', 'discount' => 'Discount',
            'gst' => 'GST', 'net_sales' => 'Net Sales',
        ], $stmt->fetchAll(), 'item_wise_sales.xlsx');
    }

    /**
     * Shared "gross/discount/gst/net" aggregate columns used by every
     * wise-sales report below. Mirrors InvoiceModel::priceLine()'s own math:
     * gross = qty*rate, net = line_total (already gross-discount) + tax.
     */
    private const SALES_AGGREGATE_SQL =
        "SUM(ii.qty) AS quantity,
         SUM(ii.qty * ii.rate) AS gross_sales,
         SUM(ii.discount_amount) AS discount,
         SUM(ii.tax_amount) AS gst,
         SUM(ii.line_total + ii.tax_amount) AS net_sales";

    /** Cross-branch view for users who can switch branch context; otherwise the caller's own branch only. */
    private function branchScopeSql(array $claims, string $alias = 'inv'): array
    {
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if ($canSwitch && !isset($_GET['branch_id'])) {
            return ['', []];
        }
        return [" AND {$alias}.branch_id = :b", ['b' => $this->resolveBranchId($claims)]];
    }

    public function branchWiseSales(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();
        [$scopeSql, $scopeParams] = $this->branchScopeSql($claims);

        $stmt = $this->pdo->prepare(
            "SELECT br.branch_name AS branch_name,
                    COUNT(DISTINCT inv.id) AS total_bills,
                    COUNT(DISTINCT ii.item_id) AS total_items,
                    " . self::SALES_AGGREGATE_SQL . ",
                    MAX(pay.paid_amount) AS paid_amount, MAX(pay.credit_amount) AS credit_amount
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN branches br ON br.id = inv.branch_id
             LEFT JOIN (
                 SELECT branch_id, SUM(paid_amount) AS paid_amount, SUM(balance_due) AS credit_amount
                 FROM invoices
                 WHERE status = 'completed' AND invoice_date BETWEEN :from2 AND :to2
                 GROUP BY branch_id
             ) pay ON pay.branch_id = inv.branch_id
             WHERE inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to{$scopeSql}
             GROUP BY inv.branch_id, br.branch_name
             ORDER BY net_sales DESC"
        );
        $stmt->execute(['from' => $from, 'to' => $to, 'from2' => $from, 'to2' => $to, ...$scopeParams]);

        $this->output($claims, [
            'branch_name' => 'Branch', 'total_bills' => 'Total Bills', 'total_items' => 'Total Items',
            'quantity' => 'Quantity', 'gross_sales' => 'Gross Sales', 'discount' => 'Discount',
            'gst' => 'GST', 'net_sales' => 'Net Sales', 'paid_amount' => 'Paid Amount', 'credit_amount' => 'Credit Amount',
        ], $stmt->fetchAll(), 'branch_wise_sales.xlsx');
    }

    public function customerWiseSales(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();

        $stmt = $this->pdo->prepare(
            "SELECT c.id AS customer_code, c.ledger_name AS customer_name,
                    br.branch_name AS branch_name,
                    COUNT(DISTINCT inv.id) AS bills,
                    COUNT(DISTINCT ii.item_id) AS items,
                    " . self::SALES_AGGREGATE_SQL . ",
                    MAX(pay.paid_amount) AS paid_amount, MAX(pay.credit_amount) AS credit_amount
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN customers c ON c.id = inv.customer_id
             JOIN branches br ON br.id = c.branch_id
             LEFT JOIN (
                 SELECT customer_id, SUM(paid_amount) AS paid_amount, SUM(balance_due) AS credit_amount
                 FROM invoices
                 WHERE branch_id = :b2 AND status = 'completed' AND invoice_date BETWEEN :from2 AND :to2
                 GROUP BY customer_id
             ) pay ON pay.customer_id = c.id
             WHERE inv.branch_id = :b AND inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to
             GROUP BY c.id, c.ledger_name, br.branch_name
             ORDER BY net_sales DESC"
        );
        $branchId = $this->resolveBranchId($claims);
        $stmt->execute(['b' => $branchId, 'b2' => $branchId, 'from' => $from, 'to' => $to, 'from2' => $from, 'to2' => $to]);

        $this->output($claims, [
            'customer_code' => 'Customer Code', 'customer_name' => 'Customer', 'branch_name' => 'Branch',
            'bills' => 'Bills', 'items' => 'Items',
            'quantity' => 'Quantity', 'gross_sales' => 'Gross Sales', 'discount' => 'Discount',
            'gst' => 'GST', 'net_sales' => 'Net Sales', 'paid_amount' => 'Paid Amount', 'credit_amount' => 'Credit Amount',
        ], $stmt->fetchAll(), 'customer_wise_sales.xlsx');
    }

    public function supplierWiseSales(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();

        $stmt = $this->pdo->prepare(
            "SELECT s.name AS supplier_name,
                    COUNT(DISTINCT ii.item_id) AS items_sold,
                    " . self::SALES_AGGREGATE_SQL . "
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN items i ON i.id = ii.item_id
             JOIN suppliers s ON s.id = i.supplier_id
             WHERE inv.branch_id = :b AND inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to
             GROUP BY s.id, s.name
             ORDER BY net_sales DESC"
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims), 'from' => $from, 'to' => $to]);

        $this->output($claims, [
            'supplier_name' => 'Supplier', 'items_sold' => 'Items Sold', 'quantity' => 'Quantity',
            'gross_sales' => 'Gross Sales', 'discount' => 'Discount', 'gst' => 'GST', 'net_sales' => 'Net Sales',
        ], $stmt->fetchAll(), 'supplier_wise_sales.xlsx');
    }

    public function brandWiseSales(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();

        $stmt = $this->pdo->prepare(
            "SELECT b.name AS brand_name,
                    COUNT(DISTINCT ii.item_id) AS items_sold,
                    " . self::SALES_AGGREGATE_SQL . "
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN items i ON i.id = ii.item_id
             JOIN brands b ON b.id = i.brand_id
             WHERE inv.branch_id = :b AND inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to
             GROUP BY b.id, b.name
             ORDER BY net_sales DESC"
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims), 'from' => $from, 'to' => $to]);

        $this->output($claims, [
            'brand_name' => 'Brand', 'items_sold' => 'Items Sold', 'quantity' => 'Quantity',
            'gross_sales' => 'Gross Sales', 'discount' => 'Discount', 'gst' => 'GST', 'net_sales' => 'Net Sales',
        ], $stmt->fetchAll(), 'brand_wise_sales.xlsx');
    }

    public function categoryWiseSales(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();

        $stmt = $this->pdo->prepare(
            "SELECT cat.name AS category_name,
                    COUNT(DISTINCT ii.item_id) AS items_sold,
                    " . self::SALES_AGGREGATE_SQL . "
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN items i ON i.id = ii.item_id
             JOIN categories cat ON cat.id = i.category_id
             WHERE inv.branch_id = :b AND inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to
             GROUP BY cat.id, cat.name
             ORDER BY net_sales DESC"
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims), 'from' => $from, 'to' => $to]);

        $this->output($claims, [
            'category_name' => 'Category', 'items_sold' => 'Items Sold', 'quantity' => 'Quantity',
            'gross_sales' => 'Gross Sales', 'discount' => 'Discount', 'gst' => 'GST', 'net_sales' => 'Net Sales',
        ], $stmt->fetchAll(), 'category_wise_sales.xlsx');
    }

    public function brandCategoryWiseSales(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_all');
        [$from, $to] = $this->dateRange();

        $stmt = $this->pdo->prepare(
            "SELECT b.name AS brand_name, cat.name AS category_name,
                    COUNT(DISTINCT ii.item_id) AS items_sold,
                    " . self::SALES_AGGREGATE_SQL . "
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN items i ON i.id = ii.item_id
             JOIN brands b ON b.id = i.brand_id
             JOIN categories cat ON cat.id = i.category_id
             WHERE inv.branch_id = :b AND inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to
             GROUP BY b.id, b.name, cat.id, cat.name
             ORDER BY net_sales DESC"
        );
        $stmt->execute(['b' => $this->resolveBranchId($claims), 'from' => $from, 'to' => $to]);

        $this->output($claims, [
            'brand_name' => 'Brand', 'category_name' => 'Category', 'items_sold' => 'Items Sold', 'quantity' => 'Quantity',
            'gross_sales' => 'Gross Sales', 'discount' => 'Discount', 'gst' => 'GST', 'net_sales' => 'Net Sales',
        ], $stmt->fetchAll(), 'brand_category_wise_sales.xlsx');
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

        $result = [
            'revenue' => round($revenue, 2),
            'cogs' => round($cogs, 2),
            'gross_profit' => round($revenue - $cogs, 2),
            'expenses' => round($expenses, 2),
            'net_profit' => round($revenue - $cogs - $expenses, 2),
            'from' => $from,
            'to' => $to,
        ];

        // Single-object response — export wraps it as the one row a P&L
        // summary actually is, without changing the normal JSON shape above.
        if (!empty($_GET['export'])) {
            PermissionMiddleware::require($claims, 'reports.export_excel');
            TableExporter::export([
                'revenue' => 'Revenue (ex-tax)', 'cogs' => 'COGS', 'gross_profit' => 'Gross Profit',
                'expenses' => 'Expenses', 'net_profit' => 'Net Profit', 'from' => 'From', 'to' => 'To',
            ], [$result], 'profit.xlsx');
        }

        Response::json($result);
    }

    /**
     * Invoice-wise Profit/Loss — the "B" mode alongside profitReport()'s
     * date-wise summary ("A" mode), same Reports > Profits section, same
     * reports.view_profit permission. One row per invoice line (item-level
     * detail), invoice-level fields (paid/credit/customer) repeated on every
     * line of that invoice — the standard flattened shape every other report
     * in this file already uses (see SALES_AGGREGATE_SQL), not a nested
     * per-invoice structure.
     *
     * Profit is NOT paid_amount minus cost — a credit invoice's profit is
     * recognized at the completed sale (rule 23/H), same as revenue; later
     * collecting the credit doesn't touch this report at all (collections
     * only move paid_amount/balance_due on the invoice, and this query reads
     * qty/rate/discount/line_total straight from invoice_items, none of
     * which a payment collection ever writes to). GST is excluded from
     * profit (line_total is post-discount, pre-tax) — the same rule 5 basis
     * profitReport() already uses. COGS uses each item's *current*
     * cost_price, the same documented approximation profitReport() uses
     * (invoice_items has no cost snapshot) — see README assumptions.
     */
    public function invoiceWiseProfitReport(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'reports.view_profit');
        [$from, $to] = $this->dateRange();
        $branchId = $this->resolveBranchId($claims);

        $stmt = $this->pdo->prepare(
            "SELECT
                inv.invoice_no, inv.invoice_date, COALESCE(c.ledger_name, 'Walk-in') AS customer_name,
                i.item_name, ii.qty,
                i.cost_price AS cost_price,
                ROUND(ii.qty * i.cost_price, 2) AS cost_amount,
                ii.rate AS selling_price,
                ROUND(ii.qty * ii.rate, 2) AS gross_amount,
                ii.discount_amount AS discount,
                ii.tax_amount AS gst,
                ii.line_total AS taxable_amount,
                ROUND(ii.line_total + ii.tax_amount + ii.cess_amount, 2) AS net_amount,
                inv.paid_amount AS invoice_paid_amount,
                inv.balance_due AS invoice_credit_amount,
                ROUND(ii.line_total - (ii.qty * i.cost_price), 2) AS profit_loss
             FROM invoice_items ii
             JOIN invoices inv ON inv.id = ii.invoice_id
             JOIN items i ON i.id = ii.item_id
             LEFT JOIN customers c ON c.id = inv.customer_id
             WHERE inv.branch_id = :b AND inv.status = 'completed' AND inv.invoice_date BETWEEN :from AND :to
             ORDER BY inv.invoice_date, inv.id, ii.id
             LIMIT " . self::LIST_REPORT_ROW_CAP
        );
        $stmt->execute(['b' => $branchId, 'from' => $from, 'to' => $to]);
        $rows = $stmt->fetchAll();

        $this->output($claims, [
            'invoice_no' => 'Invoice #', 'invoice_date' => 'Date', 'customer_name' => 'Customer',
            'item_name' => 'Item', 'qty' => 'Qty',
            'cost_price' => 'Cost Price', 'cost_amount' => 'Cost Amount',
            'selling_price' => 'Selling Price', 'gross_amount' => 'Gross Amount',
            'discount' => 'Discount', 'gst' => 'GST', 'net_amount' => 'Net Amount',
            'invoice_paid_amount' => 'Paid Amount', 'invoice_credit_amount' => 'Credit Amount',
            'profit_loss' => 'Profit / Loss',
        ], $rows, 'invoice_wise_profit.xlsx');
    }
}
