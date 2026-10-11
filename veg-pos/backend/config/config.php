<?php

declare(strict_types=1);

$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->safeLoad();
}

return [
    'db' => [
        'host' => $_ENV['DB_HOST'] ?? '127.0.0.1',
        'port' => $_ENV['DB_PORT'] ?? '3306',
        'database' => $_ENV['DB_DATABASE'] ?? 'veg_pos',
        'username' => $_ENV['DB_USERNAME'] ?? 'root',
        'password' => $_ENV['DB_PASSWORD'] ?? '',
    ],
    'jwt' => [
        'secret' => $_ENV['JWT_SECRET'] ?? 'dev-only-secret',
        'issuer' => $_ENV['JWT_ISSUER'] ?? 'veg-pos',
        'access_ttl' => (int) ($_ENV['JWT_ACCESS_TOKEN_TTL'] ?? 43200),
    ],
    'cors' => [
        'origins' => array_filter(array_map('trim', explode(',', $_ENV['APP_CORS_ORIGINS'] ?? ''))),
    ],
    'app' => [
        'env' => $_ENV['APP_ENV'] ?? 'local',
        'debug' => ($_ENV['APP_DEBUG'] ?? 'false') === 'true',
    ],
];
