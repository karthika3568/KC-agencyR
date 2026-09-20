<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\UserModel;
use PDO;

/**
 * Staff accounts + the per-employee permission-override screen (section 2.3/2.4).
 * List is open to any logged-in user (needed for dropdowns like "issue van
 * stock to..."); create/edit accounts and edit permissions are separately
 * gated so a user can be given one without the other.
 */
class UserController
{
    private UserModel $model;

    public function __construct(private PDO $pdo)
    {
        $this->model = new UserModel($pdo);
    }

    private function resolveBranchId(array $claims): ?int
    {
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if ($canSwitch) {
            return isset($_GET['branch_id']) ? (int) $_GET['branch_id'] : null; // null = every branch
        }
        return (int) $claims['branch_id'];
    }

    public function index(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        Response::json($this->model->all($this->resolveBranchId($claims)));
    }

    public function show(string $id): void
    {
        JwtAuthMiddleware::authenticate();
        $user = $this->model->findById((int) $id);
        if (!$user) {
            Response::error('Not found', 404);
        }
        unset($user['password_hash']);
        Response::json($user);
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'staff.manage_accounts');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        foreach (['name', 'email', 'password', 'role_id'] as $field) {
            if (empty($body[$field])) {
                Response::error("{$field} is required", 422);
            }
        }

        // resolveBranchId() returns null for a switch-context user with no
        // ?branch_id= (meaning "show every branch") — that's right for
        // reads, but a new account needs an actual home branch, so fall
        // back to the creator's own branch when none was specified.
        $branchId = $body['branch_id'] ?? $claims['branch_id'] ?? null;
        if ($branchId === null) {
            Response::error('branch_id is required', 422);
        }

        try {
            $id = $this->model->create([...$body, 'branch_id' => $branchId]);
        } catch (\PDOException $e) {
            Response::error('That email is already in use', 422);
        }

        $user = $this->model->findById($id);
        unset($user['password_hash']);
        Response::json($user, 201);
    }

    public function update(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'staff.manage_accounts');

        if (!$this->model->findById((int) $id)) {
            Response::error('Not found', 404);
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $this->model->update((int) $id, $body);

        $user = $this->model->findById((int) $id);
        unset($user['password_hash']);
        Response::json($user);
    }

    /** GET /api/users/{id}/permissions — role defaults + overrides + effective, per permission. */
    public function permissions(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'staff.manage_permissions');

        $user = $this->model->findById((int) $id);
        if (!$user) {
            Response::error('Not found', 404);
        }

        Response::json($this->model->permissionBreakdown((int) $id, (int) $user['role_id']));
    }

    /** PUT /api/users/{id}/permissions — body: {overrides: [{permission_id, is_granted: true|false|null}]} */
    public function setPermissions(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'staff.manage_permissions');

        if (!$this->model->findById((int) $id)) {
            Response::error('Not found', 404);
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $this->model->setPermissionOverrides((int) $id, $body['overrides'] ?? [], (int) $claims['sub']);

        $user = $this->model->findById((int) $id);
        Response::json($this->model->permissionBreakdown((int) $id, (int) $user['role_id']));
    }
}
