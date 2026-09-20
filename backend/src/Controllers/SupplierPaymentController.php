<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\PurchaseModel;
use App\Models\SupplierPaymentModel;
use PDO;

class SupplierPaymentController
{
    private SupplierPaymentModel $model;
    private PurchaseModel $purchases;

    public function __construct(private PDO $pdo)
    {
        $this->model = new SupplierPaymentModel($pdo);
        $this->purchases = new PurchaseModel($pdo);
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

    /** GET /api/suppliers/{id}/unpaid-grns — the "Unpaid Purchase GRNs Breakdown" panel. */
    public function unpaidGrns(string $supplierId): void
    {
        JwtAuthMiddleware::authenticate();
        Response::json($this->purchases->unpaidForSupplier((int) $supplierId));
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'purchases.settle_supplier_payment');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['supplier_id']) || empty($body['amount']) || empty($body['payment_mode'])) {
            Response::error('supplier_id, amount and payment_mode are required', 422);
        }

        try {
            $result = $this->model->record(
                (int) $body['supplier_id'],
                $this->resolveBranchId($claims),
                (float) $body['amount'],
                $body['payment_mode'],
                $body['reference_no'] ?? null,
                $body['notes'] ?? null,
                (int) $claims['sub'],
                $body['allocations'] ?? null
            );
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 422);
        }

        Response::json($result, 201);
    }
}
