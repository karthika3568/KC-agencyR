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
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $monthStart = date('Y-m-01');

        // Today sales
        $todaySales = $this->pdo->prepare(
            "SELECT COALESCE(SUM(items_total - discount_amount), 0) AS v FROM bills
             WHERE bill_date = :d AND bill_type IN ('normal','quick') AND status = 'active'"
        );
        $todaySales->execute(['d' => $today]);
        $todaySalesVal = (float) $todaySales->fetch()['v'];

        // Yesterday sales
        $yesterdaySales = $this->pdo->prepare(
            "SELECT COALESCE(SUM(items_total - discount_amount), 0) AS v FROM bills
             WHERE bill_date = :d AND bill_type IN ('normal','quick') AND status = 'active'"
        );
        $yesterdaySales->execute(['d' => $yesterday]);
        $yesterdaySalesVal = (float) $yesterdaySales->fetch()['v'];

        // Today collection (from direct bill cash/paid + payments receipt table)
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
        $todayCollectionVal = (float) $todayCollectionBills->fetch()['v'] + (float) $todayCollectionReceipts->fetch()['v'];

        // Yesterday collection
        $yesterdayCollectionBills = $this->pdo->prepare(
            "SELECT COALESCE(SUM(paid_amount), 0) AS v FROM bills
             WHERE bill_date = :d AND bill_type IN ('normal','quick') AND status = 'active'"
        );
        $yesterdayCollectionBills->execute(['d' => $yesterday]);

        $yesterdayCollectionReceipts = $this->pdo->prepare(
            "SELECT COALESCE(SUM(amount), 0) AS v FROM payments
             WHERE payment_date = :d AND direction = 'in' AND status = 'active'"
        );
        $yesterdayCollectionReceipts->execute(['d' => $yesterday]);
        $yesterdayCollectionVal = (float) $yesterdayCollectionBills->fetch()['v'] + (float) $yesterdayCollectionReceipts->fetch()['v'];

        // Receivable & pending invoices count
        $receivable = $this->pdo->query(
            "SELECT COALESCE(SUM(bal), 0) AS v FROM (
                SELECT SUM(amount) AS bal FROM ledger_entries GROUP BY party_id HAVING bal > 0
             ) t"
        )->fetch();

        $pendingInvoices = $this->pdo->query(
            "SELECT COUNT(*) AS c FROM bills WHERE status = 'active' AND balance_due > 0"
        )->fetch();

        // Payable & pending bills count
        $payable = $this->pdo->query(
            "SELECT COALESCE(SUM(-bal), 0) AS v FROM (
                SELECT SUM(amount) AS bal FROM ledger_entries GROUP BY party_id HAVING bal < 0
             ) t"
        )->fetch();

        $pendingBills = $this->pdo->query(
            "SELECT COUNT(*) AS c FROM purchases WHERE status = 'active' AND balance_due > 0"
        )->fetch();

        // Top items this month
        $topItems = $this->pdo->prepare(
            "SELECT bl.item_name_ta, bl.item_name_en, SUM(bl.weight) AS total_weight, SUM(bl.amount) AS total_amount
             FROM bill_lines bl
             JOIN bills b ON b.id = bl.bill_id
             WHERE b.bill_date >= :m AND b.status = 'active' AND bl.is_charge_item = 0
             GROUP BY bl.item_name_ta, bl.item_name_en
             ORDER BY total_amount DESC LIMIT 10"
        );
        $topItems->execute(['m' => $monthStart]);

        // Consecutive 7 calendar days
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $days[date('Y-m-d', strtotime("-$i days"))] = 0.0;
        }

        $last7 = $this->pdo->prepare(
            "SELECT bill_date, SUM(items_total - discount_amount) AS total FROM bills
             WHERE bill_date >= :from AND bill_type IN ('normal','quick') AND status = 'active'
             GROUP BY bill_date ORDER BY bill_date ASC"
        );
        $last7->execute(['from' => date('Y-m-d', strtotime('-6 days'))]);
        foreach ($last7->fetchAll() as $row) {
            if (isset($days[$row['bill_date']])) {
                $days[$row['bill_date']] = (float) $row['total'];
            }
        }

        $last7Formatted = [];
        foreach ($days as $date => $total) {
            $last7Formatted[] = [
                'bill_date' => $date,
                'total' => $total,
            ];
        }

        Response::json([
            'today_sales' => $todaySalesVal,
            'yesterday_sales' => $yesterdaySalesVal,
            'today_collection' => $todayCollectionVal,
            'yesterday_collection' => $yesterdayCollectionVal,
            'total_receivable' => (float) $receivable['v'],
            'total_payable' => (float) $payable['v'],
            'pending_invoices_count' => (int) ($pendingInvoices['c'] ?? 0),
            'pending_bills_count' => (int) ($pendingBills['c'] ?? 0),
            'top_items_month' => $topItems->fetchAll(),
            'last_7_days_sales' => $last7Formatted,
        ]);
    }
}
