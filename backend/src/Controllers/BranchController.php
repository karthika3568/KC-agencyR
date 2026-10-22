<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Models\BranchModel;
use PDO;

/**
 * Branch directory lookup for top navbar switcher and dropdown selections.
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
        $permissions = (array) ($claims['permissions'] ?? []);
        if (!array_intersect(['branches.switch_context', 'branches.manage', 'staff.manage_permissions', 'catalog.manage_items'], $permissions)) {
            Response::error('Forbidden', 403);
        }
        Response::json($this->model->all());
    }
}
