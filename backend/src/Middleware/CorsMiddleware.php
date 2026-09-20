<?php

declare(strict_types=1);

namespace App\Middleware;

class CorsMiddleware
{
    public static function handle(): void
    {
        $config = require __DIR__ . '/../../config/config.php';
        $allowedOrigins = $config['cors']['origins'];
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Vite picks the next free port (5173, 5174, 5175, ...) when the
        // default is already in use, so allow any localhost/127.0.0.1 origin
        // in dev rather than needing .env updated every time that happens.
        $isLocalDevOrigin = (bool) preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin);

        if ($isLocalDevOrigin || in_array($origin, $allowedOrigins, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }

        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
