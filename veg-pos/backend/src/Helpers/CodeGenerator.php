<?php

declare(strict_types=1);

namespace App\Helpers;

use PDO;

class CodeGenerator
{
    /**
     * Atomically reserves the next bill number for a series, locked with
     * SELECT ... FOR UPDATE inside the caller's transaction so two billing
     * staff saving at the same instant can never get the same number.
     */
    public static function nextBillNumber(PDO $pdo, string $seriesKey): string
    {
        $stmt = $pdo->prepare('SELECT prefix, next_number FROM bill_sequences WHERE series_key = :k FOR UPDATE');
        $stmt->execute(['k' => $seriesKey]);
        $row = $stmt->fetch();

        if (!$row) {
            $pdo->prepare('INSERT INTO bill_sequences (series_key, prefix, next_number) VALUES (:k, :p, 1)')
                ->execute(['k' => $seriesKey, 'p' => substr($seriesKey, 0, 2) . '-']);
            $row = ['prefix' => substr($seriesKey, 0, 2) . '-', 'next_number' => 1];
        }

        $number = (int) $row['next_number'];
        $pdo->prepare('UPDATE bill_sequences SET next_number = :n WHERE series_key = :k')
            ->execute(['n' => $number + 1, 'k' => $seriesKey]);

        return $row['prefix'] . str_pad((string) $number, 4, '0', STR_PAD_LEFT);
    }

    public static function nextSimpleCode(PDO $pdo, string $table, string $column, string $prefix): string
    {
        $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM {$table}");
        $stmt->execute();
        $count = (int) $stmt->fetch()['c'];

        do {
            $count++;
            $code = $prefix . str_pad((string) $count, 5, '0', STR_PAD_LEFT);
            $check = $pdo->prepare("SELECT COUNT(*) AS c FROM {$table} WHERE {$column} = :code");
            $check->execute(['code' => $code]);
        } while ((int) $check->fetch()['c'] > 0);

        return $code;
    }
}
