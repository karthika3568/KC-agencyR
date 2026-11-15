<?php

declare(strict_types=1);

use Dotenv\Dotenv;

$autoload = file_exists(__DIR__ . '/../vendor/autoload.php') ? __DIR__ . '/../vendor/autoload.php' : __DIR__ . '/vendor/autoload.php';
require_once $autoload;

$envDir = file_exists(__DIR__ . '/../.env') ? __DIR__ . '/..' : __DIR__;
$dotenv = Dotenv::createImmutable($envDir);
$dotenv->safeLoad();

// Support DATABASE_URL / MYSQL_URL provided by cloud hosting (e.g. EthioDeploy, Railway, Render)
$databaseUrl = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? (getenv('MYSQL_URL') ?: ($_ENV['MYSQL_URL'] ?? null)));

$dbHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? (getenv('MYSQLHOST') ?: ($_ENV['MYSQLHOST'] ?? '127.0.0.1')));
$dbPort = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? (getenv('MYSQLPORT') ?: ($_ENV['MYSQLPORT'] ?? '3306')));
$dbName = getenv('DB_DATABASE') ?: ($_ENV['DB_DATABASE'] ?? (getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? (getenv('MYSQLDATABASE') ?: ($_ENV['MYSQLDATABASE'] ?? 'pos_system')))));
$dbUser = getenv('DB_USERNAME') ?: ($_ENV['DB_USERNAME'] ?? (getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? (getenv('MYSQLUSER') ?: ($_ENV['MYSQLUSER'] ?? 'root')))));
$dbPass = getenv('DB_PASSWORD') ?: ($_ENV['DB_PASSWORD'] ?? (getenv('DB_PASS') ?: ($_ENV['DB_PASS'] ?? (getenv('MYSQLPASSWORD') ?: ($_ENV['MYSQLPASSWORD'] ?? '')))));
if ($databaseUrl) {
    $parts = parse_url($databaseUrl);
    if ($parts !== false) {
        if (!empty($parts['host'])) {
            $dbHost = $parts['host'];
        }
        if (!empty($parts['port'])) {
            $dbPort = (string) $parts['port'];
        }
        if (!empty($parts['user'])) {
            $dbUser = urldecode($parts['user']);
        }
        if (isset($parts['pass'])) {
            $dbPass = urldecode($parts['pass']);
        }
        if (!empty($parts['path'])) {
            $dbName = ltrim($parts['path'], '/');
        }
    }
}

return [
    'db' => [
        'host' => $dbHost,
        'port' => $dbPort,
        'database' => $dbName,
        'username' => $dbUser,
        'password' => $dbPass,
    ],
    'jwt' => [
        'secret' => (function() {
            $s = getenv('JWT_SECRET') ?: ($_ENV['JWT_SECRET'] ?? '');
            if (empty($s) || strlen($s) < 32) {
                return 'dev-only-secret-h8f3k29dslq0zx71mvbn4pgtwecy6ru5-must-be-at-least-256-bits';
            }
            return $s;
        })(),
        'issuer' => getenv('JWT_ISSUER') ?: ($_ENV['JWT_ISSUER'] ?? 'pos-system'),
        'access_ttl' => (int) (getenv('JWT_ACCESS_TOKEN_TTL') ?: ($_ENV['JWT_ACCESS_TOKEN_TTL'] ?? 36000)),
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
