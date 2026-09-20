<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\CodeGenerator;
use PDO;

/** Cash handover & reconciliation (section 4.16). */
class CashHandoverModel
{
    public function __construct(private PDO $pdo)
    {
    }

    public function all(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT ch.*, u.name AS employee_name, v.name AS verified_by_name
             FROM cash_handovers ch
             JOIN users u ON u.id = ch.employee_id
             LEFT JOIN users v ON v.id = ch.verified_by
             WHERE ch.branch_id = :branch_id ORDER BY ch.id DESC"
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }

    /** Un-handed-over collections grouped by salesman — "Pending ... Ready for Handover" panel. */
    public function pendingByEmployee(int $branchId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT cc.collected_by AS employee_id, u.name AS employee_name,
                    SUM(CASE WHEN cc.payment_method = 'cash' THEN cc.amount ELSE 0 END) AS cash_amount,
                    SUM(CASE WHEN cc.payment_method <> 'cash' THEN cc.amount ELSE 0 END) AS digital_amount,
                    SUM(cc.amount) AS total_amount,
                    COUNT(*) AS collection_count
             FROM customer_collections cc
             JOIN users u ON u.id = cc.collected_by
             LEFT JOIN cash_handover_items chi ON chi.collection_id = cc.id
             WHERE cc.branch_id = :branch_id AND chi.id IS NULL
             GROUP BY cc.collected_by, u.name"
        );
        $stmt->execute(['branch_id' => $branchId]);
        return $stmt->fetchAll();
    }

    public function submit(int $branchId, int $employeeId, float $submittedAmount): int
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                "SELECT id, amount, payment_method FROM customer_collections cc
                 WHERE cc.branch_id = :branch_id AND cc.collected_by = :employee_id
                   AND NOT EXISTS (SELECT 1 FROM cash_handover_items chi WHERE chi.collection_id = cc.id)
                 FOR UPDATE"
            );
            $stmt->execute(['branch_id' => $branchId, 'employee_id' => $employeeId]);
            $collections = $stmt->fetchAll();

            if (empty($collections)) {
                throw new \RuntimeException('No pending collections for this employee');
            }

            $cashAmount = 0.0;
            $digitalAmount = 0.0;
            foreach ($collections as $c) {
                if ($c['payment_method'] === 'cash') {
                    $cashAmount += (float) $c['amount'];
                } else {
                    $digitalAmount += (float) $c['amount'];
                }
            }

            $stmt = $this->pdo->prepare(
                'INSERT INTO cash_handovers (employee_id, branch_id, handover_date, system_cash_amount, system_digital_amount, submitted_amount)
                 VALUES (:employee_id, :branch_id, CURDATE(), :cash_amount, :digital_amount, :submitted_amount)'
            );
            $stmt->execute([
                'employee_id' => $employeeId, 'branch_id' => $branchId,
                'cash_amount' => round($cashAmount, 2), 'digital_amount' => round($digitalAmount, 2),
                'submitted_amount' => round($submittedAmount, 2),
            ]);
            $handoverId = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('UPDATE cash_handovers SET handover_no = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('HND', $handoverId), 'id' => $handoverId]);

            $linkStmt = $this->pdo->prepare(
                'INSERT INTO cash_handover_items (handover_id, collection_id) VALUES (:handover_id, :collection_id)'
            );
            foreach ($collections as $c) {
                $linkStmt->execute(['handover_id' => $handoverId, 'collection_id' => $c['id']]);
            }

            $this->pdo->commit();
            return $handoverId;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function verify(int $id, float $verifiedAmount, int $verifiedBy): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM cash_handovers WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $handover = $stmt->fetch();
        if (!$handover) {
            throw new \RuntimeException('Handover not found');
        }

        $discrepancy = round($verifiedAmount - (float) $handover['submitted_amount'], 2);
        $status = abs($discrepancy) <= 0.009 ? 'verified' : 'discrepancy_flagged';

        $this->pdo->prepare(
            "UPDATE cash_handovers SET verified_amount = :verified, status = :status, verified_by = :by, verified_at = NOW()
             WHERE id = :id"
        )->execute(['verified' => $verifiedAmount, 'status' => $status, 'by' => $verifiedBy, 'id' => $id]);

        $stmt = $this->pdo->prepare('SELECT * FROM cash_handovers WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }
}
