<?php

declare(strict_types=1);

namespace App\Models;

use PDO;

class UserModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT u.*, r.name AS role_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.email = :email
             LIMIT 1'
        );
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT u.*, r.name AS role_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * Effective permission codes for a user = role_permissions for their role,
     * overridden by any row in user_permissions for that exact user
     * (is_granted=1 forces allow, is_granted=0 forces deny even if the role grants it).
     *
     * @return string[]
     */
    public function getEffectivePermissionCodes(int $userId, int $roleId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.code
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = :role_id'
        );
        $stmt->execute(['role_id' => $roleId]);
        $codes = array_column($stmt->fetchAll(), 'code');
        $granted = array_fill_keys($codes, true);

        $stmt = $this->pdo->prepare(
            'SELECT p.code, up.is_granted
             FROM user_permissions up
             JOIN permissions p ON p.id = up.permission_id
             WHERE up.user_id = :user_id'
        );
        $stmt->execute(['user_id' => $userId]);

        foreach ($stmt->fetchAll() as $override) {
            if ((int) $override['is_granted'] === 1) {
                $granted[$override['code']] = true;
            } else {
                unset($granted[$override['code']]);
            }
        }

        return array_keys($granted);
    }

    public function logLogin(?int $userId, string $emailAttempted, bool $success): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO login_log (user_id, email_attempted, ip_address, user_agent, success)
             VALUES (:user_id, :email, :ip, :ua, :success)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'email' => $emailAttempted,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'success' => $success ? 1 : 0,
        ]);
    }
}
