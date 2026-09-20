<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\JwtHelper;
use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Models\UserModel;

class AuthController
{
    private UserModel $users;

    public function __construct()
    {
        $this->users = new UserModel(get_pdo());
    }

    public function login(): void
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if ($email === '' || $password === '') {
            Response::error('Email and password are required', 422);
        }

        $user = $this->users->findByEmail($email);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->users->logLogin($user['id'] ?? null, $email, false);
            Response::error('Invalid credentials', 401);
        }

        if ($user['status'] !== 'active') {
            $this->users->logLogin($user['id'], $email, false);
            Response::error('This account is inactive', 403);
        }

        $this->users->logLogin($user['id'], $email, true);

        $permissions = $this->users->getEffectivePermissionCodes((int) $user['id'], (int) $user['role_id']);

        $token = JwtHelper::issue([
            'sub' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role_name'],
            'branch_id' => $user['branch_id'] !== null ? (int) $user['branch_id'] : null,
            'permissions' => $permissions,
        ]);

        Response::json([
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role_name'],
                'branch_id' => $user['branch_id'] !== null ? (int) $user['branch_id'] : null,
                'permissions' => $permissions,
            ],
        ]);
    }

    public function me(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        $user = $this->users->findById((int) $claims['sub']);

        if (!$user) {
            Response::error('User no longer exists', 401);
        }

        // Recompute permissions live (not just trust the token) so a
        // permission change by Admin takes effect without waiting for token expiry.
        $permissions = $this->users->getEffectivePermissionCodes((int) $user['id'], (int) $user['role_id']);

        Response::json([
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role_name'],
            'branch_id' => $user['branch_id'] !== null ? (int) $user['branch_id'] : null,
            'permissions' => $permissions,
        ]);
    }
}
