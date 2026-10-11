<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use PDO;

class PaymentMethodController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function index(): void
    {
        AuthMiddleware::authenticate();
        $activeOnly = ($_GET['active_only'] ?? '1') !== '0';
        $sql = 'SELECT * FROM payment_methods';
        if ($activeOnly) {
            $sql .= ' WHERE active = 1';
        }
        $sql .= ' ORDER BY sort_order ASC, id ASC';
        Response::json($this->pdo->query($sql)->fetchAll());
    }

    public function store(): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin', 'manager']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (trim((string) ($body['name_ta'] ?? '')) === '') {
            Response::error('name_ta is required', 422);
        }

        if (!empty($body['is_default'])) {
            $this->pdo->exec('UPDATE payment_methods SET is_default = 0');
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO payment_methods (name_ta, name_en, is_default, active, sort_order)
             VALUES (:name_ta, :name_en, :is_default, :active, :sort_order)'
        );
        $stmt->execute([
            'name_ta' => $body['name_ta'],
            'name_en' => $body['name_en'] ?? $body['name_ta'],
            'is_default' => !empty($body['is_default']) ? 1 : 0,
            'active' => array_key_exists('active', $body) ? (int) (bool) $body['active'] : 1,
            'sort_order' => (int) ($body['sort_order'] ?? 99),
        ]);

        Response::json(['id' => (int) $this->pdo->lastInsertId()], 201);
    }

    public function update(string $id): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin', 'manager']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (!empty($body['is_default'])) {
            $this->pdo->exec('UPDATE payment_methods SET is_default = 0');
        }

        $stmt = $this->pdo->prepare(
            'UPDATE payment_methods SET name_ta = :name_ta, name_en = :name_en, is_default = :is_default,
             active = :active, sort_order = :sort_order WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'name_ta' => $body['name_ta'],
            'name_en' => $body['name_en'] ?? $body['name_ta'],
            'is_default' => !empty($body['is_default']) ? 1 : 0,
            'active' => array_key_exists('active', $body) ? (int) (bool) $body['active'] : 1,
            'sort_order' => (int) ($body['sort_order'] ?? 99),
        ]);

        Response::json(['ok' => true]);
    }
}
