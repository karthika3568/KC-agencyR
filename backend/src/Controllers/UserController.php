<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use PDO;

/**
 * Minimal read-only user directory for dropdowns (e.g. "issue van stock to
 * this salesman"). Full staff account management/permissions CRUD is a
 * later phase (6) — this just lists names+ids, nothing sensitive.
 */
class UserController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function index(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        $branchId = $canSwitch && isset($_GET['branch_id']) ? (int) $_GET['branch_id'] : (int) $claims['branch_id'];

        $stmt = $this->pdo->prepare(
            "SELECT u.id, u.name, r.name AS role_name
             FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.branch_id = :branch_id AND u.status = 'active'
             ORDER BY u.name"
        );
        $stmt->execute(['branch_id' => $branchId]);
        Response::json($stmt->fetchAll());
    }
}
