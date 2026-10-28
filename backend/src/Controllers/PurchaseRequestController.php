<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\PurchaseRequestModel;
use PDO;

class PurchaseRequestController
{
    private PurchaseRequestModel $model;

    public function __construct(private PDO $pdo)
    {
        $this->model = new PurchaseRequestModel($pdo);
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
            'orders.create_purchase_indent',
            'orders.approve_purchase_request',
            'purchases.create_grn',
        ]);
        Response::json($this->model->all($this->resolveBranchId($claims)));
    }

    public function show(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::requireAny($claims, [
            'orders.create_purchase_indent',
            'orders.approve_purchase_request',
            'purchases.create_grn',
        ]);
        $row = $this->model->find((int) $id);
        if (!$row) {
            Response::error('Not found', 404);
        }
        Response::json($row);
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'orders.create_purchase_indent');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['supplier_id']) || empty($body['items'])) {
            Response::error('supplier_id and items are required', 422);
        }

        $header = [
            'supplier_id' => (int) $body['supplier_id'],
            'branch_id' => $this->resolveBranchId($claims),
            'notes' => $body['notes'] ?? null,
            'created_by' => (int) $claims['sub'],
        ];
        $id = $this->model->create($header, $body['items']);
        Response::json($this->model->find($id), 201);
    }

    public function cancel(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'orders.create_purchase_indent');
        try {
            $this->model->cancel((int) $id);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
        Response::json($this->model->find((int) $id));
    }

    /** Admin agrees the request is ready to be purchased — required before a GRN can reference it. */
    public function approve(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'orders.approve_purchase_request');

        try {
            $result = $this->model->approve((int) $id, (int) $claims['sub']);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }
        Response::json($result);
    }
}
