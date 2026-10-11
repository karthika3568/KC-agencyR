<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use PDO;

class UserController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function index(): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin']);
        Response::json($this->pdo->query('SELECT id, name, username, role, active, created_at FROM users ORDER BY id ASC')->fetchAll());
    }

    public function store(): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (trim((string) ($body['name'] ?? '')) === '' || trim((string) ($body['username'] ?? '')) === '' || trim((string) ($body['password'] ?? '')) === '') {
            Response::error('name, username and password are required', 422);
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO users (name, username, password_hash, pin_hash, role, active)
             VALUES (:name, :username, :password_hash, :pin_hash, :role, 1)'
        );
        $stmt->execute([
            'name' => $body['name'],
            'username' => $body['username'],
            'password_hash' => password_hash($body['password'], PASSWORD_BCRYPT),
            'pin_hash' => !empty($body['pin']) ? password_hash((string) $body['pin'], PASSWORD_BCRYPT) : null,
            'role' => $body['role'] ?? 'staff',
        ]);

        Response::json(['id' => (int) $this->pdo->lastInsertId()], 201);
    }

    public function update(string $id): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $fields = ['name = :name', 'role = :role', 'active = :active'];
        $params = [
            'id' => $id,
            'name' => $body['name'] ?? '',
            'role' => $body['role'] ?? 'staff',
            'active' => array_key_exists('active', $body) ? (int) (bool) $body['active'] : 1,
        ];

        if (!empty($body['password'])) {
            $fields[] = 'password_hash = :password_hash';
            $params['password_hash'] = password_hash($body['password'], PASSWORD_BCRYPT);
        }
        if (isset($body['pin'])) {
            $fields[] = 'pin_hash = :pin_hash';
            $params['pin_hash'] = $body['pin'] !== '' ? password_hash((string) $body['pin'], PASSWORD_BCRYPT) : null;
        }

        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $this->pdo->prepare($sql)->execute($params);

        Response::json(['ok' => true]);
    }
}
