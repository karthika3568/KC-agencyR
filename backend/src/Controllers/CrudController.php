<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\CodeGenerator;
use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\SimpleCrudModel;
use PDO;

/**
 * Generic REST CRUD for simple lookup-style entities (categories, tax_codes,
 * stock_units, suppliers, brands). List/show
 * only require login; write actions require the entity's manage permission —
 * catalog data is meant to be readable broadly, editable only by the gated role.
 */
class CrudController
{
    public function __construct(
        private PDO $pdo,
        private string $table,
        private array $columns,
        private string $managePermission,
        private ?string $codePrefix = null,
        private string $orderBy = 'id'
    ) {
    }

    private function model(): SimpleCrudModel
    {
        return new SimpleCrudModel($this->pdo, $this->table, $this->columns, $this->orderBy);
    }

    public function index(): void
    {
        JwtAuthMiddleware::authenticate();
        Response::json($this->model()->all());
    }

    public function show(string $id): void
    {
        JwtAuthMiddleware::authenticate();
        $row = $this->model()->find((int) $id);
        if (!$row) {
            Response::error('Not found', 404);
        }
        Response::json($row);
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, $this->managePermission);

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = $this->model()->create($data);

        if ($this->codePrefix !== null) {
            $this->model()->update($id, ['code' => CodeGenerator::fromId($this->codePrefix, $id)]);
        }

        Response::json($this->model()->find($id), 201);
    }

    public function update(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, $this->managePermission);

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!$this->model()->find((int) $id)) {
            Response::error('Not found', 404);
        }
        $this->model()->update((int) $id, $data);
        Response::json($this->model()->find((int) $id));
    }

    public function destroy(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, $this->managePermission);

        if (!$this->model()->find((int) $id)) {
            Response::error('Not found', 404);
        }
        $this->model()->delete((int) $id);
        Response::json(['deleted' => true]);
    }
}
