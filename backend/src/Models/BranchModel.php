<?php

declare(strict_types=1);

namespace App\Models;

use PDO;

/** Branches (section 3.1). Creating one also seeds its invoice-number sequences so numbering starts clean. */
class BranchModel
{
    private const WRITABLE_COLUMNS = [
        'branch_name', 'print_name', 'logo_path', 'gstin', 'pan_number', 'address_line1',
        'city', 'state', 'pincode', 'phone', 'support_email', 'is_main_branch', 'status',
    ];

    public function __construct(private PDO $pdo)
    {
    }

    public function all(): array
    {
        return $this->pdo->query('SELECT * FROM branches ORDER BY is_main_branch DESC, branch_name')->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM branches WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function create(array $data): int
    {
        $this->pdo->beginTransaction();
        try {
            $columns = array_intersect_key($data, array_flip(self::WRITABLE_COLUMNS));
            $columns['company_id'] = $this->defaultCompanyId();
            $cols = array_keys($columns);
            $placeholders = array_map(fn ($c) => ":$c", $cols);

            $stmt = $this->pdo->prepare(
                'INSERT INTO branches (' . implode(',', $cols) . ')
                 VALUES (' . implode(',', $placeholders) . ')'
            );
            $stmt->execute($columns);
            $id = (int) $this->pdo->lastInsertId();

            // Seed this branch's INV-/EST- sequences up front rather than
            // relying on InvoiceNumberService's self-heal-on-first-use path
            // (section 4.19) — a brand new branch should show a clean
            // sequence in Settings immediately, not "nothing yet".
            $this->pdo->prepare(
                "INSERT INTO invoice_sequences (branch_id, series, prefix, current_number) VALUES (:b, 'gst', 'INV-', 0)"
            )->execute(['b' => $id]);
            $this->pdo->prepare(
                "INSERT INTO invoice_sequences (branch_id, series, prefix, current_number) VALUES (:b, 'non_gst', 'EST-', 0)"
            )->execute(['b' => $id]);

            $this->pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function update(int $id, array $data): void
    {
        $columns = array_intersect_key($data, array_flip(self::WRITABLE_COLUMNS));
        if (empty($columns)) {
            return;
        }
        $set = implode(',', array_map(fn ($c) => "$c = :$c", array_keys($columns)));
        $stmt = $this->pdo->prepare("UPDATE branches SET {$set} WHERE id = :id");
        $stmt->execute([...$columns, 'id' => $id]);
    }

    private function defaultCompanyId(): int
    {
        return (int) $this->pdo->query('SELECT id FROM company ORDER BY id LIMIT 1')->fetchColumn();
    }
}
