<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';

$pdo = get_pdo();
$dbName = $pdo->query('SELECT DATABASE()')->fetchColumn();
echo "Target Database: {$dbName}\n";

function runSqlStatements(PDO $pdo, string $filePath): void
{
    echo "Processing " . basename($filePath) . "...\n";
    $content = file_get_contents($filePath);
    if ($content === false) {
        throw new RuntimeException("Could not read file: {$filePath}");
    }

    // Remove comments
    $lines = explode("\n", $content);
    $cleanLines = [];
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '--') || str_starts_with($trimmed, '/*')) {
            continue;
        }
        $cleanLines[] = $line;
    }
    $cleanSql = implode("\n", $cleanLines);

    // Split on semicolons that are at the end of statements
    $statements = preg_split('/;\s*(\n|$)/', $cleanSql);

    $executed = 0;
    $skipped = 0;

    foreach ($statements as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '') {
            continue;
        }

        try {
            $pdo->exec($stmt);
            $executed++;
        } catch (PDOException $e) {
            // If already exists (1050: table exists, 1060: dup col, 1061: dup key, 1062: dup entry)
            $code = (int) $e->errorInfo[1] ?? 0;
            if (in_array($code, [1050, 1060, 1061, 1062], true)) {
                $skipped++;
            } else {
                echo "Warning on statement: " . substr($stmt, 0, 80) . "...\n";
                echo "  -> Code {$code}: " . $e->getMessage() . "\n";
            }
        }
    }

    echo "Finished " . basename($filePath) . ": {$executed} executed, {$skipped} skipped (already applied).\n";
}

try {
    runSqlStatements($pdo, __DIR__ . '/schema.sql');
    runSqlStatements($pdo, __DIR__ . '/seed.sql');

    $tableCount = count($pdo->query('SHOW TABLES')->fetchAll());
    $userCount = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $roleCount = $pdo->query('SELECT COUNT(*) FROM roles')->fetchColumn();
    $permCount = $pdo->query('SELECT COUNT(*) FROM permissions')->fetchColumn();

    echo "\n=== MIGRATION & SEED COMPLETED ===\n";
    echo "Database: {$dbName}\n";
    echo "Tables: {$tableCount}\n";
    echo "Users: {$userCount}\n";
    echo "Roles: {$roleCount}\n";
    echo "Permissions: {$permCount}\n";

    $users = $pdo->query('SELECT id, name, email, role_id, status FROM users')->fetchAll();
    echo "\nUsers in DB:\n";
    print_r($users);
} catch (Throwable $e) {
    echo "FATAL: " . $e->getMessage() . "\n";
}
