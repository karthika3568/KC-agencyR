<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\BranchModel;
use PDO;

/**
 * Branch directory + creation (section 3.1). List is open to any logged-in
 * user with branches.switch_context (they need it to populate the header
 * switcher); create/edit is gated behind branches.manage — Super Admin only
 * by default per the seeded role_permissions (section 2.1).
 */
class BranchController
{
    private BranchModel $model;

    public function __construct(private PDO $pdo)
    {
        $this->model = new BranchModel($pdo);
    }

    public function index(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        // A single-branch user has no reason to see the whole branch list —
        // only the switcher (branches.switch_context) or the branch admin
        // screen (branches.manage) needs it.
        $permissions = (array) ($claims['permissions'] ?? []);
        if (!array_intersect(['branches.switch_context', 'branches.manage'], $permissions)) {
            Response::error('Forbidden', 403);
        }
        Response::json($this->model->all());
    }

    public function show(string $id): void
    {
        JwtAuthMiddleware::authenticate();
        $branch = $this->model->find((int) $id);
        if (!$branch) {
            Response::error('Not found', 404);
        }
        Response::json($branch);
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'branches.manage');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        foreach (['branch_name', 'print_name', 'address_line1', 'city', 'state'] as $field) {
            if (empty($body[$field])) {
                Response::error("{$field} is required", 422);
            }
        }

        $id = $this->model->create($body);
        Response::json($this->model->find($id), 201);
    }

    public function update(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'branches.manage');

        if (!$this->model->find((int) $id)) {
            Response::error('Not found', 404);
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $this->model->update((int) $id, $body);
        Response::json($this->model->find((int) $id));
    }
}
