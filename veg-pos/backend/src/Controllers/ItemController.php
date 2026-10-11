<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use PDO;

class ItemController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function index(): void
    {
        AuthMiddleware::authenticate();
        $q = trim((string) ($_GET['q'] ?? ''));
        $activeOnly = ($_GET['active_only'] ?? '1') !== '0';

        $sql = 'SELECT * FROM items WHERE 1=1';
        $params = [];

        if ($activeOnly) {
            $sql .= ' AND active = 1';
        }
        if ($q !== '') {
            $sql .= ' AND (code LIKE :q OR name_ta LIKE :q OR name_en LIKE :q)';
            $params['q'] = "%{$q}%";
        }
        $sql .= ' ORDER BY is_charge_item ASC, name_en ASC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        Response::json($stmt->fetchAll());
    }

    public function show(string $id): void
    {
        AuthMiddleware::authenticate();
        $stmt = $this->pdo->prepare('SELECT * FROM items WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $item = $stmt->fetch();
        if (!$item) {
            Response::error('Item not found', 404);
        }
        Response::json($item);
    }

    public function store(): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin', 'manager']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $this->validate($body);

        $stmt = $this->pdo->prepare(
            'INSERT INTO items (name_ta, name_en, code, unit, default_rate, is_charge_item, active)
             VALUES (:name_ta, :name_en, :code, :unit, :default_rate, :is_charge_item, :active)'
        );
        $stmt->execute([
            'name_ta' => $body['name_ta'],
            'name_en' => $body['name_en'],
            'code' => strtoupper(trim($body['code'])),
            'unit' => $body['unit'] ?? 'kg',
            'default_rate' => $body['default_rate'] ?? null,
            'is_charge_item' => !empty($body['is_charge_item']) ? 1 : 0,
            'active' => array_key_exists('active', $body) ? (int) (bool) $body['active'] : 1,
        ]);

        Response::json(['id' => (int) $this->pdo->lastInsertId()], 201);
    }

    public function update(string $id): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin', 'manager']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $this->validate($body);

        $stmt = $this->pdo->prepare(
            'UPDATE items SET name_ta = :name_ta, name_en = :name_en, code = :code, unit = :unit,
             default_rate = :default_rate, is_charge_item = :is_charge_item, active = :active WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'name_ta' => $body['name_ta'],
            'name_en' => $body['name_en'],
            'code' => strtoupper(trim($body['code'])),
            'unit' => $body['unit'] ?? 'kg',
            'default_rate' => $body['default_rate'] ?? null,
            'is_charge_item' => !empty($body['is_charge_item']) ? 1 : 0,
            'active' => array_key_exists('active', $body) ? (int) (bool) $body['active'] : 1,
        ]);

        Response::json(['ok' => true]);
    }

    public function destroy(string $id): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin', 'manager']);

        $this->pdo->prepare('UPDATE items SET active = 0 WHERE id = :id')->execute(['id' => $id]);
        Response::json(['ok' => true]);
    }

    /**
     * @param array<string, mixed> $body
     */
    private function validate(array $body): void
    {
        if (trim((string) ($body['name_ta'] ?? '')) === '' || trim((string) ($body['name_en'] ?? '')) === '' || trim((string) ($body['code'] ?? '')) === '') {
            Response::error('name_ta, name_en and code are required', 422);
        }
    }
}
