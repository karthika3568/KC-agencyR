<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\PurchaseModel;
use PDO;

class PurchaseController
{
    private PurchaseModel $model;

    public function __construct(private PDO $pdo)
    {
        $this->model = new PurchaseModel($pdo);
    }

    private function resolveBranchId(array $claims): int
    {
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if ($canSwitch && isset($_GET['branch_id'])) {
            return (int) $_GET['branch_id'];
        }
        return (int) $claims['branch_id'];
    }

    private function stripCostIfUnauthorized(array $claims, array $rows): array
    {
        if (in_array('purchases.view_purchase_cost', (array) ($claims['permissions'] ?? []), true)) {
            return $rows;
        }
        $strip = fn ($row) => array_diff_key($row, array_flip(['subtotal', 'tax_total', 'grand_total', 'paid_amount', 'pending_balance']));
        return isset($rows[0]) || $rows === [] ? array_map($strip, $rows) : $strip($rows);
    }

    public function index(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        $rows = $this->model->all($this->resolveBranchId($claims));
        Response::json($this->stripCostIfUnauthorized($claims, $rows));
    }

    public function show(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        $row = $this->model->find((int) $id);
        if (!$row) {
            Response::error('Not found', 404);
        }
        Response::json($this->stripCostIfUnauthorized($claims, $row));
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'purchases.create_grn');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['supplier_id']) || empty($body['items'])) {
            Response::error('supplier_id and items are required', 422);
        }

        $header = [
            'supplier_id' => (int) $body['supplier_id'],
            'branch_id' => $this->resolveBranchId($claims),
            'purchase_request_id' => $body['purchase_request_id'] ?? null,
            'supplier_invoice_no' => $body['supplier_invoice_no'] ?? null,
            'payment_mode' => $body['payment_mode'] ?? 'credit',
            'paid_amount' => (float) ($body['paid_amount'] ?? 0),
        ];

        try {
            $id = $this->model->create($header, $body['items'], (int) $claims['sub']);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 422);
        }
        Response::json($this->model->find($id), 201);
    }

    public function destroy(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'purchases.delete_grn');

        try {
            $this->model->delete((int) $id, (int) $claims['sub']);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
        Response::json(['deleted' => true]);
    }
}
