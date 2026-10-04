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
 *
 * Deleted-invoice number reuse: before minting a brand-new sequential
 * number, check for a soft-deleted invoice (status='deleted') in this same
 * branch+series+year whose original_invoice_no is free (no live invoice
 * currently holds that exact string) and reuse the smallest one. Cancelled
 * invoices are untouched by this — only InvoiceModel::deleteInvoice() ever
 * writes original_invoice_no, cancel() never does, so a cancelled number
 * can never be offered here. The FOR UPDATE above already serializes every
 * concurrent next() call for this branch+series for the lifetime of the
 * caller's transaction, so this reuse lookup rides that same lock — no new
 * locking mechanism needed.
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

        $year = date('Y');

        $reused = $this->reuseDeletedNumber($branchId, $row['prefix'], $year);
        if ($reused !== null) {
            return $reused;
        }

        $nextNumber = (int) $row['current_number'] + 1;
        $this->pdo->prepare('UPDATE invoice_sequences SET current_number = :n WHERE id = :id')
            ->execute(['n' => $nextNumber, 'id' => $row['id']]);

        return sprintf('%s%s-%06d', $row['prefix'], $year, $nextNumber);
    }

    /**
     * Smallest reusable deleted number in this exact branch+prefix+year
     * scope, or null if none is available (falls through to the normal
     * sequential counter). "Reusable" = original_invoice_no not currently
     * held by any other invoice row — true until some earlier call already
     * reused it, at which point it naturally drops out of this query
     * because that number is live again.
     */
    private function reuseDeletedNumber(int $branchId, string $prefix, string $year): ?string
    {
        $pattern = $prefix . $year . '-%';
        $stmt = $this->pdo->prepare(
            "SELECT d.id, d.original_invoice_no
             FROM invoices d
             WHERE d.branch_id = :branch_id
               AND d.status = 'deleted'
               AND d.original_invoice_no LIKE :pattern
               AND NOT EXISTS (
                   SELECT 1 FROM invoices live
                   WHERE live.branch_id = d.branch_id AND live.invoice_no = d.original_invoice_no
               )
             ORDER BY CAST(SUBSTRING_INDEX(d.original_invoice_no, '-', -1) AS UNSIGNED) ASC
             LIMIT 1
             FOR UPDATE"
        );
        $stmt->execute(['branch_id' => $branchId, 'pattern' => $pattern]);
        $row = $stmt->fetch();

        return $row ? $row['original_invoice_no'] : null;
    }
}
