<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';

use App\Controllers\AuthController;
use App\Helpers\Response;
use App\Middleware\CorsMiddleware;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;

CorsMiddleware::handle();

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';

// Strip a /pos-system/backend/public prefix if the app is served from a
// sub-path under XAMPP's htdocs rather than its own vhost root.
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
if ($scriptDir !== '' && str_starts_with($uri, $scriptDir)) {
    $uri = substr($uri, strlen($scriptDir)) ?: '/';
}

try {
    switch (true) {
        case $uri === '/api/auth/login' && $method === 'POST':
            (new AuthController())->login();
            break;

        case $uri === '/api/auth/me' && $method === 'GET':
            (new AuthController())->me();
            break;

        // Phase-1 self-check endpoint only: proves PermissionMiddleware
        // actually returns 403 for a user missing this permission, and 200
        // for one who has it. Real Staff & Permissions CRUD is a later phase.
        case $uri === '/api/staff/accounts' && $method === 'GET':
            $claims = JwtAuthMiddleware::authenticate();
            PermissionMiddleware::require($claims, 'staff.manage_accounts');
            Response::json(['message' => 'You have staff.manage_accounts — this would list staff accounts.']);
            break;

        default:
            Response::error('Not found', 404);
    }
} catch (\Throwable $e) {
    $config = require __DIR__ . '/../config/config.php';
    Response::json([
        'error' => 'Server error',
        'detail' => $config['app']['debug'] ? $e->getMessage() : null,
    ], 500);
}
