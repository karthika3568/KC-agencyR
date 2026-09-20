<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

/**
 * Atomic per-branch, per-series invoice numbering (section 4.19). Locks the
 * sequence row with SELECT ... FOR UPDATE inside the caller's transaction so
 * two cashiers completing a bill on two terminals at the same instant can
 * never receive the same number. Called at invoice COMPLETION, never at
 * hold/creation time (amendment 4.8a) — a discarded held bill never burns a
 * number.
 */
class InvoiceNumberService
{
    public function __construct(private PDO $pdo)
    {
    }

    public function next(int $branchId, string $series): string
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, prefix, current_number FROM invoice_sequences
             WHERE branch_id = :branch_id AND series = :series
             FOR UPDATE'
        );
        $stmt->execute(['branch_id' => $branchId, 'series' => $series]);
        $row = $stmt->fetch();

        if (!$row) {
            // Self-heal: a branch created after seed_phase3.sql ran won't
            // have sequence rows yet — create them on first use.
            $prefix = $series === 'gst' ? 'INV-' : 'EST-';
            $this->pdo->prepare(
                'INSERT INTO invoice_sequences (branch_id, series, prefix, current_number) VALUES (:b, :s, :p, 0)'
            )->execute(['b' => $branchId, 's' => $series, 'p' => $prefix]);
            $row = ['id' => (int) $this->pdo->lastInsertId(), 'prefix' => $prefix, 'current_number' => 0];
        }

        $nextNumber = (int) $row['current_number'] + 1;
        $this->pdo->prepare('UPDATE invoice_sequences SET current_number = :n WHERE id = :id')
            ->execute(['n' => $nextNumber, 'id' => $row['id']]);

        $year = date('Y');
        return sprintf('%s%s-%06d', $row['prefix'], $year, $nextNumber);
    }
}
