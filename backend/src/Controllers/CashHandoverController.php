<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\CashHandoverModel;
use PDO;

class CashHandoverController
{
    private CashHandoverModel $model;

    public function __construct(private PDO $pdo)
    {
        $this->model = new CashHandoverModel($pdo);
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
        Response::json($this->model->all($this->resolveBranchId($claims)));
    }

    public function pending(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        Response::json($this->model->pendingByEmployee($this->resolveBranchId($claims)));
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'handover.submit_cash_handover');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['employee_id']) || !isset($body['submitted_amount'])) {
            Response::error('employee_id and submitted_amount are required', 422);
        }

        try {
            $id = $this->model->submit($this->resolveBranchId($claims), (int) $body['employee_id'], (float) $body['submitted_amount']);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }

        Response::json(['handover_id' => $id], 201);
    }

    public function verify(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'handover.verify_reconcile');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!isset($body['verified_amount'])) {
            Response::error('verified_amount is required', 422);
        }

        try {
            $result = $this->model->verify((int) $id, (float) $body['verified_amount'], (int) $claims['sub']);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }

        Response::json($result);
    }
}
