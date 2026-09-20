<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Helpers\Response;

class PermissionMiddleware
{
    /**
     * Checks that the required permission code is present in the JWT's
     * permission list. Server-side enforcement — never trust the frontend's
     * hidden/shown menu state as the security boundary.
     *
     * @param array<string, mixed> $claims decoded JWT payload from JwtAuthMiddleware::authenticate()
     */
    public static function require(array $claims, string $permissionCode): void
    {
        $permissions = (array) ($claims['permissions'] ?? []);

        if (!in_array($permissionCode, $permissions, true)) {
            Response::error("Forbidden: missing permission '{$permissionCode}'", 403);
        }
    }
}
