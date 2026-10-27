<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\StockAdjustmentModel;
use PDO;

class StockAdjustmentController
{
    private StockAdjustmentModel $model;

    public function __construct(private PDO $pdo)
    {
        $this->model = new StockAdjustmentModel($pdo);
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
            'inventory.stock_adjustment',
            'inventory.view_stock',
        ]);
        Response::json($this->model->all($this->resolveBranchId($claims)));
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.stock_adjustment');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        foreach (['item_id', 'adjustment_type', 'qty', 'reason'] as $field) {
            if (empty($body[$field])) {
                Response::error("{$field} is required", 422);
            }
        }
        if (!in_array($body['adjustment_type'], ['addition', 'deduction'], true)) {
            Response::error('adjustment_type must be addition or deduction', 422);
        }

        $id = $this->model->create(
            (int) $body['item_id'],
            'branch',
            $this->resolveBranchId($claims),
            $body['adjustment_type'],
            (float) $body['qty'],
            $body['reason'],
            $body['remarks'] ?? null,
            (int) $claims['sub']
        );

        Response::json(['id' => $id], 201);
    }
}
