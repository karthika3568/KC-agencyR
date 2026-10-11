<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

/**
 * Posts and reverses party ledger entries. amount > 0 = party owes the shop
 * more; amount < 0 = the shop owes the party more. Always call inside the
 * caller's own transaction so a bill/purchase/payment and its ledger effect
 * commit or roll back together.
 */
class LedgerService
{
    public static function post(PDO $pdo, int $partyId, string $date, string $refType, ?int $refId, float $amount, ?string $description = null): void
    {
        if (abs($amount) < 0.0001) {
            return;
        }
        $stmt = $pdo->prepare(
            'INSERT INTO ledger_entries (party_id, entry_date, ref_type, ref_id, amount, description)
             VALUES (:party_id, :date, :ref_type, :ref_id, :amount, :description)'
        );
        $stmt->execute([
            'party_id' => $partyId,
            'date' => $date,
            'ref_type' => $refType,
            'ref_id' => $refId,
            'amount' => $amount,
            'description' => $description,
        ]);
    }

    public static function reverse(PDO $pdo, string $refType, int $refId): void
    {
        $pdo->prepare('DELETE FROM ledger_entries WHERE ref_type = :t AND ref_id = :id')
            ->execute(['t' => $refType, 'id' => $refId]);
    }

    public static function balanceAsOf(PDO $pdo, int $partyId, ?string $beforeDate = null, ?int $excludeBillRefId = null): float
    {
        $sql = 'SELECT COALESCE(SUM(amount), 0) AS bal FROM ledger_entries WHERE party_id = :party_id';
        $params = ['party_id' => $partyId];

        if ($beforeDate !== null) {
            $sql .= ' AND entry_date < :before_date';
            $params['before_date'] = $beforeDate;
        }
        if ($excludeBillRefId !== null) {
            $sql .= ' AND NOT (ref_type = \'bill\' AND ref_id = :exclude_id)';
            $params['exclude_id'] = $excludeBillRefId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (float) $stmt->fetch()['bal'];
    }

    public static function currentBalance(PDO $pdo, int $partyId): float
    {
        $stmt = $pdo->prepare('SELECT COALESCE(SUM(amount), 0) AS bal FROM ledger_entries WHERE party_id = :party_id');
        $stmt->execute(['party_id' => $partyId]);

        return (float) $stmt->fetch()['bal'];
    }
}
