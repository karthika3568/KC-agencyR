<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use PDO;

class DashboardController
{
    public function __construct(private PDO $pdo)
    {
    }

    public function summary(): void
    {
        AuthMiddleware::authenticate();
        $today = date('Y-m-d');
        $monthStart = date('Y-m-01');

        $todaySales = $this->pdo->prepare(
            "SELECT COALESCE(SUM(items_total - discount_amount), 0) AS v FROM bills
             WHERE bill_date = :d AND bill_type IN ('normal','quick') AND status = 'active'"
        );
        $todaySales->execute(['d' => $today]);

        $todayCollectionBills = $this->pdo->prepare(
            "SELECT COALESCE(SUM(paid_amount), 0) AS v FROM bills
             WHERE bill_date = :d AND bill_type IN ('normal','quick') AND status = 'active'"
        );
        $todayCollectionBills->execute(['d' => $today]);

        $todayCollectionReceipts = $this->pdo->prepare(
            "SELECT COALESCE(SUM(amount), 0) AS v FROM payments
             WHERE payment_date = :d AND direction = 'in' AND status = 'active'"
        );
        $todayCollectionReceipts->execute(['d' => $today]);

        $receivable = $this->pdo->query(
            "SELECT COALESCE(SUM(bal), 0) AS v FROM (
                SELECT SUM(amount) AS bal FROM ledger_entries GROUP BY party_id HAVING bal > 0
             ) t"
        )->fetch();

        $payable = $this->pdo->query(
            "SELECT COALESCE(SUM(-bal), 0) AS v FROM (
                SELECT SUM(amount) AS bal FROM ledger_entries GROUP BY party_id HAVING bal < 0
             ) t"
        )->fetch();

        $topItems = $this->pdo->prepare(
            "SELECT bl.item_name_ta, bl.item_name_en, SUM(bl.weight) AS total_weight, SUM(bl.amount) AS total_amount
             FROM bill_lines bl
             JOIN bills b ON b.id = bl.bill_id
             WHERE b.bill_date >= :m AND b.status = 'active' AND bl.is_charge_item = 0
             GROUP BY bl.item_name_ta, bl.item_name_en
             ORDER BY total_amount DESC LIMIT 5"
        );
        $topItems->execute(['m' => $monthStart]);

        $last7 = $this->pdo->prepare(
            "SELECT bill_date, SUM(items_total - discount_amount) AS total FROM bills
             WHERE bill_date >= :from AND bill_type IN ('normal','quick') AND status = 'active'
             GROUP BY bill_date ORDER BY bill_date ASC"
        );
        $last7->execute(['from' => date('Y-m-d', strtotime('-6 days'))]);

        Response::json([
            'today_sales' => (float) $todaySales->fetch()['v'],
            'today_collection' => (float) $todayCollectionBills->fetch()['v'] + (float) $todayCollectionReceipts->fetch()['v'],
            'total_receivable' => (float) $receivable['v'],
            'total_payable' => (float) $payable['v'],
            'top_items_month' => $topItems->fetchAll(),
            'last_7_days_sales' => $last7->fetchAll(),
        ]);
    }
}
