<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\CodeGenerator;
use PDO;

/**
 * Customer pre-booking — a permanent request record, distinct from a POS
 * Hold Bill. Never touches stock, payments, or invoices; only a later,
 * separate POS sale (referencing this booking manually, per current scope)
 * actually bills the customer.
 */
class CustomerPrebookingModel
{
    private const VALID_TRANSITIONS = [
        'pending' => ['confirmed', 'processing', 'ready', 'completed', 'cancelled'],
        'confirmed' => ['processing', 'ready', 'completed', 'cancelled'],
        'processing' => ['ready', 'completed', 'cancelled'],
        'ready' => ['completed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
    ];

    public function __construct(private PDO $pdo)
    {
    }

    public function all(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT cp.*, c.ledger_name AS customer_name, c.phone AS customer_phone,
                    u.name AS created_by_name, e.name AS employee_name,
                    inv.invoice_no, sin.issue_no,
                    (SELECT COUNT(*) FROM customer_prebooking_items cpi WHERE cpi.prebooking_id = cp.id) AS item_count,
                    (SELECT COALESCE(SUM(cpi.qty * cpi.rate * (1 + cpi.tax_percent / 100)), 0)
                       FROM customer_prebooking_items cpi WHERE cpi.prebooking_id = cp.id) AS estimated_total
             FROM customer_prebookings cp
             JOIN customers c ON c.id = cp.customer_id
             LEFT JOIN users e ON e.id = cp.employee_id
             JOIN users u ON u.id = cp.created_by
             LEFT JOIN invoices inv ON inv.id = cp.invoice_id
             LEFT JOIN stock_issue_notes sin ON sin.id = cp.van_issue_id
             WHERE cp.branch_id = :branch_id
             ORDER BY cp.id DESC"
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            "SELECT cp.*, c.ledger_name AS customer_name, c.phone AS customer_phone,
                    u.name AS created_by_name, e.name AS employee_name,
                    inv.invoice_no, sin.issue_no
             FROM customer_prebookings cp
             JOIN customers c ON c.id = cp.customer_id
             LEFT JOIN users e ON e.id = cp.employee_id
             JOIN users u ON u.id = cp.created_by
             LEFT JOIN invoices inv ON inv.id = cp.invoice_id
             LEFT JOIN stock_issue_notes sin ON sin.id = cp.van_issue_id
             WHERE cp.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $booking = $stmt->fetch();
        if (!$booking) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT cpi.*, i.item_name, i.item_code, i.image
             FROM customer_prebooking_items cpi
             JOIN items i ON i.id = cpi.item_id
             WHERE cpi.prebooking_id = :id'
        );
        $stmt->execute(['id' => $id]);
        $booking['items'] = $stmt->fetchAll();

        return $booking;
    }

    public function create(array $header, array $lines): int
    {
        if (empty($lines)) {
            throw new \RuntimeException('At least one item is required');
        }

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO customer_prebookings
                    (customer_id, branch_id, employee_id, booking_source, notes, created_by)
                 VALUES
                    (:customer_id, :branch_id, :employee_id, :booking_source, :notes, :created_by)'
            );
            $stmt->execute([
                'customer_id' => $header['customer_id'],
                'branch_id' => $header['branch_id'],
                'employee_id' => $header['employee_id'] ?? null,
                'booking_source' => $header['booking_source'] ?? 'direct',
                'notes' => $header['notes'] ?? null,
                'created_by' => $header['created_by'],
            ]);
            $id = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('UPDATE customer_prebookings SET prebooking_no = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('PB', $id), 'id' => $id]);

            $this->insertLines($id, $lines);

            $this->pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /** Only while still 'pending' — once a booking is being actioned, item edits go through a fresh booking instead. */
    public function update(int $id, array $header, array $lines): void
    {
        if (empty($lines)) {
            throw new \RuntimeException('At least one item is required');
        }

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('SELECT status FROM customer_prebookings WHERE id = :id FOR UPDATE');
            $stmt->execute(['id' => $id]);
            $status = $stmt->fetchColumn();
            if ($status === false) {
                throw new \RuntimeException('Pre-booking not found');
            }
            if ($status !== 'pending') {
                throw new \RuntimeException("Cannot edit a pre-booking once it is '{$status}' — only a pending booking can be edited");
            }

            $stmt = $this->pdo->prepare(
                'UPDATE customer_prebookings SET
                    customer_id = :customer_id, employee_id = :employee_id,
                    booking_source = :booking_source, notes = :notes
                 WHERE id = :id'
            );
            $stmt->execute([
                'id' => $id,
                'customer_id' => $header['customer_id'],
                'employee_id' => $header['employee_id'] ?? null,
                'booking_source' => $header['booking_source'] ?? 'direct',
                'notes' => $header['notes'] ?? null,
            ]);

            $this->pdo->prepare('DELETE FROM customer_prebooking_items WHERE prebooking_id = :id')->execute(['id' => $id]);
            $this->insertLines($id, $lines);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function updateStatus(int $id, string $newStatus): array
    {
        $stmt = $this->pdo->prepare('SELECT status FROM customer_prebookings WHERE id = :id FOR UPDATE');
        $stmt->execute(['id' => $id]);
        $current = $stmt->fetchColumn();
        if ($current === false) {
            throw new \RuntimeException('Pre-booking not found');
        }
        if (!in_array($newStatus, self::VALID_TRANSITIONS[$current] ?? [], true)) {
            throw new \RuntimeException("Cannot move a '{$current}' pre-booking to '{$newStatus}'");
        }

        $this->pdo->prepare('UPDATE customer_prebookings SET status = :status WHERE id = :id')
            ->execute(['status' => $newStatus, 'id' => $id]);

        return $this->find($id);
    }

    public function linkInvoice(int $id, int $invoiceId): void
    {
        $this->pdo->prepare("UPDATE customer_prebookings SET invoice_id = :inv_id, status = 'completed' WHERE id = :id")
            ->execute(['inv_id' => $invoiceId, 'id' => $id]);
    }

    public function linkVanIssue(int $id, int $vanIssueId, ?int $employeeId = null): void
    {
        $sql = "UPDATE customer_prebookings SET van_issue_id = :issue_id, status = 'processing'";
        $params = ['issue_id' => $vanIssueId, 'id' => $id];
        if ($employeeId !== null) {
            $sql .= ', employee_id = :emp_id';
            $params['emp_id'] = $employeeId;
        }
        $sql .= ' WHERE id = :id';
        $this->pdo->prepare($sql)->execute($params);
    }

    private function insertLines(int $prebookingId, array $lines): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO customer_prebooking_items (prebooking_id, item_id, qty, rate, tax_percent)
             VALUES (:prebooking_id, :item_id, :qty, :rate, :tax_percent)'
        );
        foreach ($lines as $line) {
            $stmt->execute([
                'prebooking_id' => $prebookingId,
                'item_id' => (int) $line['item_id'],
                'qty' => (float) $line['qty'],
                'rate' => (float) ($line['rate'] ?? 0),
                'tax_percent' => (float) ($line['tax_percent'] ?? 0),
            ]);
        }
    }
}
