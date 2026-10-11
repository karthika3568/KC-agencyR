<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use PDO;

class SettingsController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function index(): void
    {
        AuthMiddleware::authenticate();
        $rows = $this->pdo->query('SELECT `key`, `value` FROM settings')->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            $out[$row['key']] = $row['value'];
        }
        Response::json($out);
    }

    public function update(): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin', 'manager']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt = $this->pdo->prepare(
            'INSERT INTO settings (`key`, `value`) VALUES (:key, :value)
             ON DUPLICATE KEY UPDATE `value` = :value'
        );
        foreach ($body as $key => $value) {
            $stmt->execute(['key' => $key, 'value' => is_array($value) ? json_encode($value, JSON_UNESCAPED_UNICODE) : (string) $value]);
        }

        Response::json(['ok' => true]);
    }

    public function sequences(): void
    {
        AuthMiddleware::authenticate();
        Response::json($this->pdo->query('SELECT * FROM bill_sequences')->fetchAll());
    }

    public function updateSequence(string $id): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin', 'manager']);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $this->pdo->prepare('UPDATE bill_sequences SET prefix = :prefix WHERE id = :id')
            ->execute(['prefix' => $body['prefix'] ?? '', 'id' => $id]);

        Response::json(['ok' => true]);
    }
}
