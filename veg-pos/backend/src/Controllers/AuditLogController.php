<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use PDO;

class AuditLogController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function index(): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin']);

        $stmt = $this->pdo->query('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300');
        Response::json($stmt->fetchAll());
    }
}
