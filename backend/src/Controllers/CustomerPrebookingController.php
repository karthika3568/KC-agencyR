<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\CustomerPrebookingModel;
use PDO;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class CustomerPrebookingController
{
    private CustomerPrebookingModel $model;

    public function __construct(private PDO $pdo)
    {
        $this->model = new CustomerPrebookingModel($pdo);
    }

    private function isSalesman(array $claims): bool
    {
        $role = trim((string) ($claims['role'] ?? ''));
        return strcasecmp($role, 'Field Sales Executive') === 0
            || stripos($role, 'Field Sales') !== false;
    }

    private function assertOrderAccess(array $claims, array $booking): void
    {
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if (!$canSwitch && (int) $booking['branch_id'] !== (int) $claims['branch_id']) {
            Response::error('Forbidden: cross-branch access', 403);
        }

        if ($this->isSalesman($claims)) {
            $salesmanId = (int) $claims['sub'];
            $empId = $booking['employee_id'] !== null ? (int) $booking['employee_id'] : null;
            $creatorId = (int) $booking['created_by'];
            if ($empId !== $salesmanId && $creatorId !== $salesmanId) {
                Response::error('Forbidden: access denied to this order', 403);
            }
        }
    }

    private function resolveBranchId(array $claims): int
    {
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if ($canSwitch && isset($_GET['branch_id'])) {
            return (int) $_GET['branch_id'];
        }
        return (int) $claims['branch_id'];
    }

    public function index(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::requireAny($claims, [
            'orders.view_prebooking',
            'orders.create_prebooking',
            'orders.manage_prebooking_status',
        ]);

        $branchId = $this->resolveBranchId($claims);
        $salesmanId = null;

        if ($this->isSalesman($claims)) {
            $salesmanId = (int) $claims['sub'];
        } elseif (!empty($_GET['employee_id'])) {
            $salesmanId = (int) $_GET['employee_id'];
        }

        Response::json($this->model->all($branchId, $salesmanId));
    }

    public function show(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::requireAny($claims, [
            'orders.view_prebooking',
            'orders.create_prebooking',
            'orders.manage_prebooking_status',
        ]);
        $row = $this->model->find((int) $id);
        if (!$row) {
            Response::error('Not found', 404);
        }

        $this->assertOrderAccess($claims, $row);

        Response::json($row);
    }

    /** @return array{0: array, 1: array, 2: ?string} */
    private function prepare(array $claims, array $body): array
    {
        if (empty($body['customer_id'])) {
            return [[], [], 'customer_id is required'];
        }
        if (empty($body['items'])) {
            return [[], [], 'At least one item is required'];
        }

        $branchId = $this->resolveBranchId($claims);
        $stmt = $this->pdo->prepare('SELECT id FROM customers WHERE id = :id AND branch_id = :branch_id');
        $stmt->execute(['id' => (int) $body['customer_id'], 'branch_id' => $branchId]);
        if (!$stmt->fetch()) {
            return [[], [], 'Customer not found in this branch'];
        }

        $lines = [];
        foreach ($body['items'] as $line) {
            if (empty($line['item_id']) || empty($line['qty'])) {
                return [[], [], 'Each line needs item_id and qty'];
            }
            $stmt = $this->pdo->prepare(
                'SELECT i.*, tc.gst_percent FROM items i
                 LEFT JOIN tax_codes tc ON tc.id = i.tax_code_id WHERE i.id = :id'
            );
            $stmt->execute(['id' => (int) $line['item_id']]);
            $item = $stmt->fetch();
            if (!$item) {
                return [[], [], "Item {$line['item_id']} not found"];
            }
            $unitPricing = \App\Models\ItemModel::resolveUnitPricing($item, !empty($line['unit_id']) ? (int) $line['unit_id'] : null);
            $lines[] = [
                'item_id' => (int) $item['id'],
                'qty' => (float) $line['qty'],
                'rate' => isset($line['rate']) && $line['rate'] !== '' ? (float) $line['rate'] : $unitPricing['net_srate'],
                'tax_percent' => (float) ($item['gst_percent'] ?? 0),
            ];
        }

        $isSalesman = $this->isSalesman($claims);
        $employeeId = $isSalesman
            ? (int) $claims['sub']
            : (!empty($body['employee_id']) ? (int) $body['employee_id'] : null);

        $bookingSource = $body['booking_source'] ?? ($isSalesman ? 'salesman' : 'direct');
        if ($isSalesman && ($bookingSource === 'direct' || empty($bookingSource))) {
            $bookingSource = 'salesman';
        }

        $header = [
            'customer_id' => (int) $body['customer_id'],
            'branch_id' => $branchId,
            'employee_id' => $employeeId,
            'booking_source' => $bookingSource,
            'notes' => $body['notes'] ?? null,
            'created_by' => (int) $claims['sub'],
        ];

        return [$header, $lines, null];
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'orders.create_prebooking');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        [$header, $lines, $error] = $this->prepare($claims, $body);
        if ($error) {
            Response::error($error, 422);
        }

        try {
            $id = $this->model->create($header, $lines);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
        Response::json($this->model->find($id), 201);
    }

    public function update(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'orders.create_prebooking');

        $booking = $this->model->find((int) $id);
        if (!$booking) {
            Response::error('Not found', 404);
        }
        $this->assertOrderAccess($claims, $booking);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        [$header, $lines, $error] = $this->prepare($claims, $body);
        if ($error) {
            Response::error($error, 422);
        }

        try {
            $this->model->update((int) $id, $header, $lines);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
        Response::json($this->model->find((int) $id));
    }

    public function updateStatus(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'orders.manage_prebooking_status');

        $booking = $this->model->find((int) $id);
        if (!$booking) {
            Response::error('Not found', 404);
        }
        $this->assertOrderAccess($claims, $booking);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['status'])) {
            Response::error('status is required', 422);
        }

        try {
            $result = $this->model->updateStatus((int) $id, $body['status']);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
        Response::json($result);
    }

    public function cancel(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'orders.manage_prebooking_status');

        $booking = $this->model->find((int) $id);
        if (!$booking) {
            Response::error('Not found', 404);
        }
        $this->assertOrderAccess($claims, $booking);

        try {
            $result = $this->model->updateStatus((int) $id, 'cancelled');
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
        Response::json($result);
    }

    public function exportExcel(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'orders.view_prebooking');

        $branchId = $this->resolveBranchId($claims);
        $salesmanId = null;

        if ($this->isSalesman($claims)) {
            $salesmanId = (int) $claims['sub'];
        } elseif (!empty($_GET['employee_id'])) {
            $salesmanId = (int) $_GET['employee_id'];
        }

        $rows = $this->model->all($branchId, $salesmanId);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $headers = ['Order No', 'Date', 'Customer', 'Branch', 'Salesman', 'Booking Source', 'Total Items', 'Estimated Total', 'Status'];
        $sheet->fromArray($headers, null, 'A1');

        $rowNum = 2;
        foreach ($rows as $r) {
            $sheet->fromArray([
                $r['prebooking_no'], $r['created_at'], $r['customer_name'],
                $r['branch_id'], $r['employee_name'] ?? '-', $r['booking_source'], $r['item_count'],
                $r['estimated_total'], $r['status'],
            ], null, "A{$rowNum}");
            $rowNum++;
        }

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="customer_prebookings.xlsx"');
        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
        exit;
    }

    public function dispatchVan(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.issue_van_stock');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['employee_id'])) {
            Response::error('employee_id is required', 422);
        }
        $targetEmployeeId = (int) $body['employee_id'];
        $fulfillmentMode = $body['fulfillment_mode'] ?? 'warehouse_dispatch';

        if (!in_array($fulfillmentMode, ['warehouse_dispatch', 'existing_van_stock'], true)) {
            Response::error('Invalid fulfillment_mode (must be warehouse_dispatch or existing_van_stock)', 422);
        }

        $branchId = $this->resolveBranchId($claims);
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);

        // Verify target employee is in the same branch
        if (!$canSwitch) {
            $empStmt = $this->pdo->prepare('SELECT branch_id FROM users WHERE id = :id');
            $empStmt->execute(['id' => $targetEmployeeId]);
            $empBranch = $empStmt->fetchColumn();
            if ($empBranch !== false && (int) $empBranch !== (int) $claims['branch_id']) {
                Response::error('Forbidden: target employee belongs to a different branch', 403);
            }
        }

        $this->pdo->beginTransaction();
        try {
            // 1. Lock customer_prebookings row FOR UPDATE to prevent concurrent/repeated dispatches
            $stmt = $this->pdo->prepare('SELECT * FROM customer_prebookings WHERE id = :id FOR UPDATE');
            $stmt->execute(['id' => (int) $id]);
            $booking = $stmt->fetch();
            if (!$booking) {
                throw new \RuntimeException('Pre-booking not found', 404);
            }

            if (!$canSwitch && (int) $booking['branch_id'] !== (int) $claims['branch_id']) {
                throw new \RuntimeException('Forbidden: cross-branch access', 403);
            }

            if ($this->isSalesman($claims)) {
                $salesmanId = (int) $claims['sub'];
                $empId = $booking['employee_id'] !== null ? (int) $booking['employee_id'] : null;
                $creatorId = (int) $booking['created_by'];
                if ($empId !== $salesmanId && $creatorId !== $salesmanId) {
                    throw new \RuntimeException('Forbidden: access denied to this order', 403);
                }
            }

            // Guard against repeated dispatch
            if (!empty($booking['van_issue_id'])) {
                $sinStmt = $this->pdo->prepare('SELECT issue_no FROM stock_issue_notes WHERE id = :id');
                $sinStmt->execute(['id' => (int) $booking['van_issue_id']]);
                $issueNo = $sinStmt->fetchColumn() ?: "ID #{$booking['van_issue_id']}";
                throw new \RuntimeException("Pre-booking has already been dispatched with Stock Issue Note {$issueNo}", 422);
            }

            if (!in_array($booking['status'], ['pending', 'confirmed'], true)) {
                throw new \RuntimeException("Cannot dispatch a pre-booking in '{$booking['status']}' status", 422);
            }

            // Fetch items
            $itemStmt = $this->pdo->prepare(
                'SELECT cpi.*, i.item_name FROM customer_prebooking_items cpi
                 JOIN items i ON i.id = cpi.item_id
                 WHERE cpi.prebooking_id = :id'
            );
            $itemStmt->execute(['id' => (int) $id]);
            $bookingItems = $itemStmt->fetchAll();

            $items = !empty($body['items']) ? $body['items'] : array_map(function ($it) {
                return [
                    'item_id' => (int) $it['item_id'],
                    'qty' => (float) $it['qty'],
                ];
            }, $bookingItems);

            if (empty($items)) {
                throw new \RuntimeException('No items to dispatch', 422);
            }

            // Validate item lines
            foreach ($items as $line) {
                if (empty($line['item_id']) || (float) ($line['qty'] ?? 0) <= 0) {
                    throw new \RuntimeException('Each line must have a valid item_id and quantity greater than zero', 422);
                }
            }

            if ($fulfillmentMode === 'existing_van_stock') {
                // Validate sufficient stock for every booking line against the employee/van owner
                $stockStmt = $this->pdo->prepare(
                    'SELECT quantity_on_hand FROM stock_ledger
                     WHERE item_id = :item_id AND owner_type = \'employee\' AND owner_id = :employee_id
                     FOR UPDATE'
                );
                $itemNameStmt = $this->pdo->prepare('SELECT item_name FROM items WHERE id = :id');

                $requiredQtyByItem = [];
                foreach ($items as $line) {
                    $itemId = (int) $line['item_id'];
                    $qty = (float) $line['qty'];
                    $requiredQtyByItem[$itemId] = ($requiredQtyByItem[$itemId] ?? 0.0) + $qty;
                }

                foreach ($requiredQtyByItem as $itemId => $requiredQty) {
                    $stockStmt->execute(['item_id' => $itemId, 'employee_id' => $targetEmployeeId]);
                    $stockRow = $stockStmt->fetch();
                    $available = $stockRow !== false ? (float) $stockRow['quantity_on_hand'] : 0.0;

                    if ($available < $requiredQty) {
                        $itemNameStmt->execute(['id' => $itemId]);
                        $itemName = $itemNameStmt->fetchColumn() ?: "Item #{$itemId}";
                        $availableDisp = round($available, 3);
                        $requiredDisp = round($requiredQty, 3);
                        throw new \RuntimeException(
                            "Cannot assign to van. Insufficient van stock for \"{$itemName}\". Required: {$requiredDisp}, Available in van: {$availableDisp}."
                        );
                    }
                }

                // Update booking status to processing and assign employee (NO duplicate stock issue note)
                $upStmt = $this->pdo->prepare(
                    "UPDATE customer_prebookings SET status = 'processing', employee_id = :emp_id WHERE id = :id"
                );
                $upStmt->execute(['emp_id' => $targetEmployeeId, 'id' => (int) $id]);

                $this->pdo->commit();

                Response::json([
                    'message' => 'Assigned to van for fulfillment from existing van stock',
                    'prebooking_id' => (int) $id,
                    'status' => 'processing',
                    'fulfillment_mode' => 'existing_van_stock',
                ], 200);
                return;
            }

            // warehouse_dispatch mode:
            // Issue stock from warehouse to van (validates warehouse stock FOR UPDATE).
            // This dispatch flow has no "shortage warning, continue anyway" UI of its
            // own (unlike the standalone Issue Stock to Van form), so a shortage here
            // is still a hard failure — same as before VanStockModel::issue() was
            // changed to warn instead of throw for that other, separate entry point.
            $vanStockModel = new \App\Models\VanStockModel($this->pdo);
            $result = $vanStockModel->issue(
                $branchId,
                $targetEmployeeId,
                (int) $claims['sub'],
                $body['notes'] ?? ("Dispatched from Pre-booking #" . ($booking['prebooking_no'] ?? $id)),
                $items,
                false,
                (int) $booking['customer_id'],
                (int) $id
            );
            if (isset($result['warning'])) {
                $first = $result['shortages'][0];
                throw new \RuntimeException(
                    "Cannot issue {$first['requested']} of \"{$first['item_name']}\". Only {$first['available']} currently available in warehouse stock."
                );
            }
            $issueId = $result['issue_id'];

            $this->model->linkVanIssue((int) $id, $issueId, $targetEmployeeId);

            $this->pdo->commit();

            Response::json([
                'message' => 'Dispatched to van successfully',
                'issue_id' => $issueId,
                'prebooking_id' => (int) $id,
                'status' => 'processing',
                'fulfillment_mode' => 'warehouse_dispatch',
            ], 201);
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            $code = $e->getCode();
            if (!is_int($code) || $code < 400 || $code > 599) {
                $code = 422;
            }
            Response::error($e->getMessage(), $code);
        }
    }

    public function linkInvoice(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'orders.manage_prebooking_status');

        $booking = $this->model->find((int) $id);
        if (!$booking) {
            Response::error('Pre-booking not found', 404);
        }

        $this->assertOrderAccess($claims, $booking);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['invoice_id'])) {
            Response::error('invoice_id is required', 422);
        }

        $this->model->linkInvoice((int) $id, (int) $body['invoice_id']);

        Response::json(['message' => 'Pre-booking linked to invoice and completed']);
    }
}
