<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\VanStockModel;
use PDO;

class VanStockController
{
    private VanStockModel $model;

    public function __construct(private PDO $pdo)
    {
        $this->model = new VanStockModel($pdo);
    }

    private function isSalesman(array $claims): bool
    {
        $role = trim((string) ($claims['role'] ?? ''));
        return strcasecmp($role, 'Field Sales Executive') === 0
            || stripos($role, 'Field Sales') !== false;
    }

    private function resolveBranchId(array $claims): int
    {
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if ($canSwitch && isset($_GET['branch_id'])) {
            return (int) $_GET['branch_id'];
        }
        return (int) $claims['branch_id'];
    }

    public function issue(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.issue_van_stock');

        if ($this->isSalesman($claims)) {
            Response::error('Forbidden: Field Sales Executives are not authorized to issue warehouse stock', 403);
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['employee_id']) || empty($body['items']) || !is_array($body['items'])) {
            Response::error('employee_id and items are required', 422);
        }

        foreach ($body['items'] as $it) {
            if (empty($it['item_id']) || (float) ($it['qty'] ?? 0) <= 0) {
                Response::error('Each line must have a valid item_id and quantity greater than zero', 422);
            }
        }

        $branchId = $this->resolveBranchId($claims);
        try {
            $id = $this->model->issue(
                $branchId,
                (int) $body['employee_id'],
                (int) $claims['sub'],
                $body['notes'] ?? null,
                $body['items']
            );
            Response::json(['issue_id' => $id], 201);
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    public function returnStock(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.issue_van_stock');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['employee_id']) || empty($body['items']) || !is_array($body['items'])) {
            Response::error('employee_id and items are required', 422);
        }

        if ($this->isSalesman($claims) && (int) $body['employee_id'] !== (int) $claims['sub']) {
            Response::error('Forbidden: Field Sales Executives cannot alter another salesman\'s van stock', 403);
        }

        foreach ($body['items'] as $it) {
            if (empty($it['item_id']) || (float) ($it['qty'] ?? 0) <= 0) {
                Response::error('Each line must have a valid item_id and quantity greater than zero', 422);
            }
        }

        $branchId = $this->resolveBranchId($claims);
        try {
            $id = $this->model->returnStock(
                $branchId,
                (int) $body['employee_id'],
                !empty($body['issue_id']) ? (int) $body['issue_id'] : null,
                (int) $claims['sub'],
                $body['notes'] ?? null,
                $body['items']
            );
            Response::json(['return_id' => $id], 201);
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/van-stock/{employeeId} — what's currently out with this
     * salesman. ?export=1 streams the same, currently-filtered rows as
     * .xlsx instead of JSON; ?item_ids=1,2,3 narrows to just those items
     * (the "Export Selected" case — selection always narrows the same
     * query that's already scoped to this one salesman, never a different
     * salesman's data).
     */
    public function pending(string $employeeId): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.view_stock');

        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if (!$canSwitch) {
            $stmt = $this->pdo->prepare('SELECT branch_id FROM users WHERE id = :id');
            $stmt->execute(['id' => (int) $employeeId]);
            $empBranch = $stmt->fetchColumn();
            if ($empBranch !== false && (int) $empBranch !== (int) $claims['branch_id']) {
                Response::error('Forbidden: cross-branch access', 403);
            }
        }

        $rows = $this->model->pendingForEmployee((int) $employeeId);

        if (!empty($_GET['item_ids'])) {
            $wanted = array_map('intval', explode(',', (string) $_GET['item_ids']));
            $rows = array_values(array_filter($rows, fn ($r) => in_array((int) $r['item_id'], $wanted, true)));
        }

        if (!empty($_GET['export'])) {
            PermissionMiddleware::require($claims, 'reports.export_excel');
            $stmt = $this->pdo->prepare('SELECT name FROM users WHERE id = :id');
            $stmt->execute(['id' => (int) $employeeId]);
            $employeeName = $stmt->fetchColumn() ?: "employee-{$employeeId}";
            $safeName = preg_replace('/[^A-Za-z0-9]+/', '_', $employeeName);
            $suffix = !empty($_GET['item_ids']) ? 'Selected' : 'All';

            \App\Helpers\TableExporter::export([
                'item_id' => 'Item ID', 'item_name' => 'Item Name', 'item_code' => 'SKU', 'barcode' => 'Barcode',
                'unit_code' => 'Unit', 'quantity_on_hand' => 'On-hand Qty', 'cost_price' => 'Purchase/Cost Price',
                'selling_price' => 'Selling Price', 'stock_value' => 'Stock Value',
            ], $rows, "Van_Stock_{$suffix}_{$safeName}_" . date('Y-m-d') . '.xlsx');
        }

        Response::json($rows);
    }

    /**
     * GET /api/van-stock/issues — issue TRANSACTIONS for this branch (one
     * row per Issue Stock action, section 19), not the flattened item
     * balance pending() returns. ?employee_id narrows to one salesman.
     * ?detail=1 returns flattened item-line rows (all lines of every listed
     * transaction) for building a client-side PDF; ?export=1 streams the
     * same flattened rows as .xlsx. ?ids=1,2,3 narrows to specific issue
     * transactions (the "Export Selected" case) — selecting one multi-item
     * transaction still exports every item line it contains together.
     */
    public function issues(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.view_stock');

        $branchId = $this->resolveBranchId($claims);
        $employeeId = !empty($_GET['employee_id']) ? (int) $_GET['employee_id'] : null;
        $rows = $this->model->listIssues($branchId, $employeeId);

        if (!empty($_GET['ids'])) {
            $wanted = array_map('intval', explode(',', (string) $_GET['ids']));
            $rows = array_values(array_filter($rows, fn ($r) => in_array((int) $r['id'], $wanted, true)));
        }

        if (!empty($_GET['detail'])) {
            Response::json($this->flattenedIssueLines($rows));
            return;
        }

        if (!empty($_GET['export'])) {
            PermissionMiddleware::require($claims, 'reports.export_excel');
            $this->exportIssuesExcel($rows, !empty($_GET['ids']));
        }

        Response::json($rows);
    }

    /** GET /api/van-stock/issues/{id} — one issue transaction with all its item lines. */
    public function showIssue(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.view_stock');

        $issue = $this->model->findIssue((int) $id);
        if (!$issue) {
            Response::error('Not found', 404);
        }

        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if (!$canSwitch && (int) $issue['branch_id'] !== (int) $claims['branch_id']) {
            Response::error('Forbidden: cross-branch access', 403);
        }

        $issue['amount_in_words'] = \App\Helpers\NumberToWords::convert((float) ($issue['total_amount'] ?? 0));
        Response::json($issue);
    }

    /** One row per issue-transaction line — header fields repeated per item, same convention as the GRN export. */
    private function flattenedIssueLines(array $issues): array
    {
        $rows = [];
        foreach ($issues as $issue) {
            $lines = !empty($issue['items']) ? $issue['items'] : $this->model->issueLines((int) $issue['id']);
            foreach ($lines as $line) {
                $rows[] = [
                    'issue_no' => $issue['issue_no'],
                    'issued_at' => $issue['issued_at'],
                    'employee_name' => $issue['employee_name'],
                    'issued_by_name' => $issue['issued_by_name'],
                    'branch_name' => $issue['branch_print_name'] ?? $issue['branch_name'] ?? null,
                    'notes' => $issue['notes'],
                    'item_name' => $line['item_name'],
                    'item_code' => $line['item_code'],
                    'qty' => (float) $line['qty'],
                    'unit_code' => $line['unit_code'],
                    'unit_price' => (float) ($line['unit_price'] ?? 0),
                    'line_amount' => (float) ($line['line_amount'] ?? 0),
                ];
            }
        }
        return $rows;
    }

    private function exportIssuesExcel(array $issues, bool $isSelected): void
    {
        $singleIssueNo = (count($issues) === 1) ? $issues[0]['issue_no'] : null;

        if (empty($issues)) {
            \App\Helpers\TableExporter::export(['issue_no' => 'Issue #'], [], 'Van_Stock_Issues_' . ($isSelected ? 'Selected' : 'All') . '_' . date('Y-m-d') . '.xlsx');
            return;
        }

        $rows = $this->flattenedIssueLines($issues);
        $columns = [
            'issue_no' => 'Issue Number', 'issued_at' => 'Issue Date', 'employee_name' => 'Salesman',
            'branch_name' => 'Branch',
            'item_code' => 'SKU', 'item_name' => 'Item Name',
            'qty' => 'Qty', 'unit_code' => 'Unit',
            'unit_price' => 'Unit Price', 'line_amount' => 'Amount',
            'issued_by_name' => 'Issued By', 'notes' => 'Notes',
        ];

        $filename = $singleIssueNo !== null
            ? "{$singleIssueNo}.xlsx"
            : 'Van_Stock_Issues_' . ($isSelected ? 'Selected' : 'All') . '_' . date('Y-m-d') . '.xlsx';
        \App\Helpers\TableExporter::export($columns, $rows, $filename);
    }
}
