<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Helpers\JwtHelper;
use App\Helpers\Response;

class JwtAuthMiddleware
{
    /**
     * Validates the Bearer token and returns its claims, or sends a 401 and exits.
     *
     * @return array<string, mixed>
     */
    public static function authenticate(): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (!preg_match('/Bearer\s+(\S+)/', $header, $matches)) {
            Response::error('Missing or malformed Authorization header', 401);
        }

        try {
            $claims = JwtHelper::verify($matches[1]);
        } catch (\Throwable $e) {
            Response::error('Invalid or expired token', 401);
        }

        return $claims;
    }
}
