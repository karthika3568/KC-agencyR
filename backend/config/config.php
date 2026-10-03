<?php

declare(strict_types=1);

use Dotenv\Dotenv;

require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

return [
    'db' => [
        'host' => $_ENV['DB_HOST'] ?? '127.0.0.1',
        'port' => $_ENV['DB_PORT'] ?? '3306',
        'database' => $_ENV['DB_DATABASE'] ?? 'pos_system',
        'username' => $_ENV['DB_USERNAME'] ?? 'root',
        'password' => $_ENV['DB_PASSWORD'] ?? '',
    ],
    'jwt' => [
        'secret' => $_ENV['JWT_SECRET'] ?? 'insecure-dev-secret-change-me',
        'issuer' => $_ENV['JWT_ISSUER'] ?? 'pos-system',
        'access_ttl' => (int) ($_ENV['JWT_ACCESS_TOKEN_TTL'] ?? 36000),
    ],
    'cors' => [
        'origins' => array_filter(array_map('trim', explode(',', $_ENV['APP_CORS_ORIGINS'] ?? 'http://localhost:5173'))),
    ],
    'app' => [
        'env' => $_ENV['APP_ENV'] ?? 'local',
        'debug' => filter_var($_ENV['APP_DEBUG'] ?? true, FILTER_VALIDATE_BOOLEAN),
    ],
    'gst_api' => [
        'enabled' => filter_var($_ENV['GST_API_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN),
        'env' => $_ENV['GST_API_ENV'] ?? 'sandbox',
        'provider' => $_ENV['GST_API_PROVIDER'] ?? '',
        'base_url' => $_ENV['GST_API_BASE_URL'] ?? '',
        'username' => $_ENV['GST_API_USERNAME'] ?? '',
        'password' => $_ENV['GST_API_PASSWORD'] ?? '',
        'client_id' => $_ENV['GST_API_CLIENT_ID'] ?? '',
        'client_secret' => $_ENV['GST_API_CLIENT_SECRET'] ?? '',
        'seller_gstin' => $_ENV['GST_API_SELLER_GSTIN'] ?? '',
    ],
];
