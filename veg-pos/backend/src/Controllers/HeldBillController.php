<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use PDO;

class HeldBillController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function index(): void
    {
        AuthMiddleware::authenticate();
        $stmt = $this->pdo->query(
            'SELECT h.*, p.name AS party_name FROM held_bills h
             LEFT JOIN parties p ON p.id = h.party_id ORDER BY h.created_at DESC'
        );
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['cart'] = json_decode($row['cart_json'], true);
            unset($row['cart_json']);
        }
        Response::json($rows);
    }

    public function store(): void
    {
        $claims = AuthMiddleware::authenticate();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt = $this->pdo->prepare(
            'INSERT INTO held_bills (label, cart_json, location_type, bill_type, party_id, created_by)
             VALUES (:label, :cart_json, :location_type, :bill_type, :party_id, :created_by)'
        );
        $stmt->execute([
            'label' => $body['label'] ?? null,
            'cart_json' => json_encode($body['cart'] ?? [], JSON_UNESCAPED_UNICODE),
            'location_type' => $body['location_type'] ?? 'local',
            'bill_type' => $body['bill_type'] ?? 'normal',
            'party_id' => $body['party_id'] ?? null,
            'created_by' => $claims['uid'],
        ]);

        Response::json(['id' => (int) $this->pdo->lastInsertId()], 201);
    }

    public function destroy(string $id): void
    {
        AuthMiddleware::authenticate();
        $this->pdo->prepare('DELETE FROM held_bills WHERE id = :id')->execute(['id' => $id]);
        Response::json(['ok' => true]);
    }
}
