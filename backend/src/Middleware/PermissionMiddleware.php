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
        // Super Admin role or wildcard permission bypasses granular permission checks
        $role = strtolower((string) ($claims['role'] ?? ''));
        if ($role === 'super admin' || $role === 'admin' || (int) ($claims['role_id'] ?? 0) === 1 || (int) ($claims['role_id'] ?? 0) === 2) {
            return;
        }

        $permissions = (array) ($claims['permissions'] ?? []);
        if (in_array('*', $permissions, true)) {
            return;
        }

        if (!in_array($permissionCode, $permissions, true)) {
            Response::error("Forbidden: missing permission '{$permissionCode}'", 403);
        }
    }

    /**
     * Checks that AT LEAST ONE of the required permission codes is present.
     *
     * @param array<string, mixed> $claims
     * @param string[] $permissionCodes
     */
    public static function requireAny(array $claims, array $permissionCodes): void
    {
        $role = strtolower((string) ($claims['role'] ?? ''));
        if ($role === 'super admin' || $role === 'admin' || (int) ($claims['role_id'] ?? 0) === 1 || (int) ($claims['role_id'] ?? 0) === 2) {
            return;
        }

        $permissions = (array) ($claims['permissions'] ?? []);
        if (in_array('*', $permissions, true)) {
            return;
        }

        foreach ($permissionCodes as $code) {
            if (in_array($code, $permissions, true)) {
                return;
            }
        }

        $codesStr = implode(', ', $permissionCodes);
        Response::error("Forbidden: missing one of required permissions [{$codesStr}]", 403);
    }

    public static function has(array $claims, string $permissionCode): bool
    {
        $role = strtolower((string) ($claims['role'] ?? ''));
        if ($role === 'super admin' || $role === 'admin' || (int) ($claims['role_id'] ?? 0) === 1 || (int) ($claims['role_id'] ?? 0) === 2) {
            return true;
        }

        $permissions = (array) ($claims['permissions'] ?? []);
        return in_array('*', $permissions, true) || in_array($permissionCode, $permissions, true);
    }

    public static function hasAny(array $claims, array $permissionCodes): bool
    {
        $permissions = (array) ($claims['permissions'] ?? []);
        foreach ($permissionCodes as $code) {
            if (in_array($code, $permissions, true)) {
                return true;
            }
        }
        return false;
    }
}
