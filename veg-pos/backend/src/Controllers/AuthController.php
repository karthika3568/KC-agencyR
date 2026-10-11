<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\JwtHelper;
use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use PDO;

class AuthController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function login(): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $pin = (string) ($body['pin'] ?? '');

        if ($username === '') {
            Response::error('Username is required', 422);
        }

        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE username = :u AND active = 1');
        $stmt->execute(['u' => $username]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('Invalid username or password', 401);
        }

        $ok = false;
        if ($pin !== '' && $user['pin_hash']) {
            $ok = password_verify($pin, $user['pin_hash']);
        } elseif ($password !== '') {
            $ok = password_verify($password, $user['password_hash']);
        }

        if (!$ok) {
            Response::error('Invalid username or password', 401);
        }

        $claims = [
            'uid' => (int) $user['id'],
            'username' => $user['username'],
            'name' => $user['name'],
            'role' => $user['role'],
        ];

        $token = JwtHelper::issue($claims);

        Response::json([
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'username' => $user['username'],
                'role' => $user['role'],
            ],
        ]);
    }

    public function me(): void
    {
        $claims = AuthMiddleware::authenticate();
        Response::json([
            'id' => $claims['uid'],
            'name' => $claims['name'],
            'username' => $claims['username'],
            'role' => $claims['role'],
        ]);
    }
}
