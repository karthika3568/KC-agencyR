<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\CollectionModel;
use PDO;

class CollectionController
{
    private CollectionModel $model;

    public function __construct(private PDO $pdo)
    {
        $this->model = new CollectionModel($pdo);
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

    /** GET /api/collections/pending — Route Pending Credit Balances panel. */
    public function pending(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'credit.view_shopwide_outstanding');
        $routeId = !empty($_GET['route_id']) ? (int) $_GET['route_id'] : null;
        Response::json($this->model->pendingBalancesForBranch($this->resolveBranchId($claims), $routeId));
    }

    /** GET /api/customers/{id}/unpaid-invoices — feeds the FIFO preview in the Collect modal. */
    public function unpaidInvoices(string $customerId): void
    {
        JwtAuthMiddleware::authenticate();
        Response::json($this->model->unpaidInvoicesForCustomer((int) $customerId));
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'collections.field_collection_entry');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['customer_id']) || empty($body['amount']) || empty($body['payment_method'])) {
            Response::error('customer_id, amount and payment_method are required', 422);
        }

        try {
            $result = $this->model->record(
                (int) $body['customer_id'],
                $this->resolveBranchId($claims),
                (float) $body['amount'],
                $body['payment_method'],
                !empty($body['route_id']) ? (int) $body['route_id'] : null,
                (int) $claims['sub'],
                $body['allocations'] ?? null
            );
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }

        Response::json($result, 201);
    }
}
