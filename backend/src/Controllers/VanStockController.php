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

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['employee_id']) || empty($body['items'])) {
            Response::error('employee_id and items are required', 422);
        }

        $id = $this->model->issue(
            $this->resolveBranchId($claims),
            (int) $body['employee_id'],
            !empty($body['route_id']) ? (int) $body['route_id'] : null,
            (int) $claims['sub'],
            $body['notes'] ?? null,
            $body['items']
        );
        Response::json(['issue_id' => $id], 201);
    }

    public function returnStock(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'inventory.issue_van_stock');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['employee_id']) || empty($body['items'])) {
            Response::error('employee_id and items are required', 422);
        }

        $id = $this->model->returnStock(
            $this->resolveBranchId($claims),
            (int) $body['employee_id'],
            !empty($body['issue_id']) ? (int) $body['issue_id'] : null,
            (int) $claims['sub'],
            $body['notes'] ?? null,
            $body['items']
        );
        Response::json(['return_id' => $id], 201);
    }

    /** GET /api/van-stock/{employeeId} — what's currently out with this salesman. */
    public function pending(string $employeeId): void
    {
        JwtAuthMiddleware::authenticate();
        Response::json($this->model->pendingForEmployee((int) $employeeId));
    }
}
