<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use PDO;

class ReportController
{
    public function __construct(private PDO $pdo)
    {
    }

    private function range(): array
    {
        return [
            $_GET['from'] ?? date('Y-m-01'),
            $_GET['to'] ?? date('Y-m-d'),
        ];
    }

    public function dailySales(): void
    {
        AuthMiddleware::authenticate();
        [$from, $to] = $this->range();

        $stmt = $this->pdo->prepare(
            "SELECT b.bill_date,
                    COUNT(*) AS bill_count,
                    SUM(b.items_total - b.discount_amount) AS total_sales,
                    SUM(b.discount_amount) AS total_discount,
                    SUM(CASE WHEN pm.name_en = 'Cash' THEN b.paid_amount ELSE 0 END) AS cash,
                    SUM(CASE WHEN pm.name_en = 'UPI' THEN b.paid_amount ELSE 0 END) AS upi,
                    SUM(CASE WHEN pm.name_en = 'Net Banking' THEN b.paid_amount ELSE 0 END) AS net_banking,
                    SUM(CASE WHEN pm.name_en = 'Credit' THEN b.paid_amount ELSE 0 END) AS credit,
                    SUM(b.balance_due) AS total_balance_due
             FROM bills b
             LEFT JOIN payment_methods pm ON pm.id = b.payment_method_id
             WHERE b.bill_date BETWEEN :from AND :to AND b.bill_type IN ('normal','quick') AND b.status = 'active'
             GROUP BY b.bill_date ORDER BY b.bill_date ASC"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);

        $commission = $this->pdo->prepare(
            "SELECT COALESCE(SUM(commission_amount), 0) AS v FROM bills
             WHERE bill_date BETWEEN :from AND :to AND bill_type = 'commission' AND status = 'active'"
        );
        $commission->execute(['from' => $from, 'to' => $to]);

        Response::json([
            'rows' => $stmt->fetchAll(),
            'commission_earned' => (float) $commission->fetch()['v'],
        ]);
    }

    public function itemWiseSales(): void
    {
        AuthMiddleware::authenticate();
        [$from, $to] = $this->range();

        $sql = "SELECT bl.item_id, bl.item_name_ta, bl.item_name_en,
                       SUM(bl.weight) AS total_weight, SUM(bl.amount) AS total_amount,
                       COUNT(DISTINCT b.id) AS bill_count, AVG(bl.rate) AS average_rate
                FROM bill_lines bl
                JOIN bills b ON b.id = bl.bill_id
                WHERE b.bill_date BETWEEN :from AND :to AND b.status = 'active' AND bl.is_charge_item = 0";
        $params = ['from' => $from, 'to' => $to];

        if (!empty($_GET['item_id'])) {
            $sql .= ' AND bl.item_id = :item_id';
            $params['item_id'] = $_GET['item_id'];
        }
        if (!empty($_GET['party_id'])) {
            $sql .= ' AND b.party_id = :party_id';
            $params['party_id'] = $_GET['party_id'];
        }
        if (!empty($_GET['location_type'])) {
            $sql .= ' AND b.location_type = :location_type';
            $params['location_type'] = $_GET['location_type'];
        }
        if (!empty($_GET['bill_type'])) {
            $sql .= ' AND b.bill_type = :bill_type';
            $params['bill_type'] = $_GET['bill_type'];
        }
        $sql .= ' GROUP BY bl.item_id, bl.item_name_ta, bl.item_name_en ORDER BY total_amount DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        Response::json($stmt->fetchAll());
    }

    public function topItems(): void
    {
        AuthMiddleware::authenticate();
        [$from, $to] = $this->range();
        $orderBy = ($_GET['order_by'] ?? 'amount') === 'weight' ? 'total_weight' : 'total_amount';
        $limit = max(1, min(50, (int) ($_GET['limit'] ?? 10)));
        $direction = ($_GET['least'] ?? '0') === '1' ? 'ASC' : 'DESC';

        $stmt = $this->pdo->prepare(
            "SELECT bl.item_id, bl.item_name_ta, bl.item_name_en,
                    SUM(bl.weight) AS total_weight, SUM(bl.amount) AS total_amount
             FROM bill_lines bl
             JOIN bills b ON b.id = bl.bill_id
             WHERE b.bill_date BETWEEN :from AND :to AND b.status = 'active' AND bl.is_charge_item = 0
             GROUP BY bl.item_id, bl.item_name_ta, bl.item_name_en
             ORDER BY {$orderBy} {$direction} LIMIT {$limit}"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        Response::json($stmt->fetchAll());
    }

    public function partyOutstanding(): void
    {
        AuthMiddleware::authenticate();
        $type = $_GET['type'] ?? null;

        $sql = "SELECT p.id, p.name, p.phone, p.type,
                       COALESCE((SELECT SUM(amount) FROM ledger_entries l WHERE l.party_id = p.id), 0) AS balance,
                       COALESCE((SELECT SUM(amount) FROM ledger_entries l WHERE l.party_id = p.id AND l.entry_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) AS recent_7d,
                       COALESCE((SELECT SUM(amount) FROM ledger_entries l WHERE l.party_id = p.id AND l.entry_date < DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND l.entry_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)), 0) AS aging_8_30,
                       COALESCE((SELECT SUM(amount) FROM ledger_entries l WHERE l.party_id = p.id AND l.entry_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)), 0) AS aging_30_plus
                FROM parties p WHERE p.active = 1";
        $params = [];
        if ($type) {
            $sql .= ' AND (p.type = :type OR p.type = \'both\')';
            $params['type'] = $type;
        }
        $sql .= ' HAVING balance != 0 ORDER BY ABS(balance) DESC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        Response::json($stmt->fetchAll());
    }

    public function commissionReport(): void
    {
        AuthMiddleware::authenticate();
        [$from, $to] = $this->range();

        $byDay = $this->pdo->prepare(
            "SELECT bill_date, SUM(items_total) AS gross_total, SUM(commission_amount) AS commission_earned, COUNT(*) AS bill_count
             FROM bills WHERE bill_date BETWEEN :from AND :to AND bill_type = 'commission' AND status = 'active'
             GROUP BY bill_date ORDER BY bill_date ASC"
        );
        $byDay->execute(['from' => $from, 'to' => $to]);

        $bySupplier = $this->pdo->prepare(
            "SELECT p.id AS party_id, p.name, SUM(b.items_total) AS gross_total, SUM(b.commission_amount) AS commission_earned, COUNT(*) AS bill_count
             FROM bills b JOIN parties p ON p.id = b.party_id
             WHERE b.bill_date BETWEEN :from AND :to AND b.bill_type = 'commission' AND b.status = 'active'
             GROUP BY p.id, p.name ORDER BY commission_earned DESC"
        );
        $bySupplier->execute(['from' => $from, 'to' => $to]);

        Response::json([
            'by_day' => $byDay->fetchAll(),
            'by_supplier' => $bySupplier->fetchAll(),
        ]);
    }

    public function paymentCollection(): void
    {
        AuthMiddleware::authenticate();
        [$from, $to] = $this->range();

        $stmt = $this->pdo->prepare(
            "SELECT pay.payment_date, pm.name_ta AS method, SUM(pay.amount) AS total
             FROM payments pay LEFT JOIN payment_methods pm ON pm.id = pay.payment_method_id
             WHERE pay.payment_date BETWEEN :from AND :to AND pay.direction = 'in' AND pay.status = 'active'
             GROUP BY pay.payment_date, pm.name_ta ORDER BY pay.payment_date ASC"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        Response::json($stmt->fetchAll());
    }

    public function purchaseReport(): void
    {
        AuthMiddleware::authenticate();
        [$from, $to] = $this->range();

        $stmt = $this->pdo->prepare(
            "SELECT purchase_date, COUNT(*) AS purchase_count, SUM(total) AS total, SUM(paid_amount) AS paid, SUM(balance_due) AS balance_due
             FROM purchases WHERE purchase_date BETWEEN :from AND :to AND status = 'active'
             GROUP BY purchase_date ORDER BY purchase_date ASC"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        Response::json($stmt->fetchAll());
    }

    public function profitSummary(): void
    {
        $claims = AuthMiddleware::authenticate();
        AuthMiddleware::requireRole($claims, ['admin', 'manager']);
        [$from, $to] = $this->range();

        $sales = $this->pdo->prepare(
            "SELECT COALESCE(SUM(items_total - discount_amount), 0) AS v FROM bills
             WHERE bill_date BETWEEN :from AND :to AND bill_type IN ('normal','quick') AND status = 'active'"
        );
        $sales->execute(['from' => $from, 'to' => $to]);

        $commissionIncome = $this->pdo->prepare(
            "SELECT COALESCE(SUM(commission_amount), 0) AS v FROM bills
             WHERE bill_date BETWEEN :from AND :to AND bill_type = 'commission' AND status = 'active'"
        );
        $commissionIncome->execute(['from' => $from, 'to' => $to]);

        $purchases = $this->pdo->prepare(
            "SELECT COALESCE(SUM(total), 0) AS v FROM purchases WHERE purchase_date BETWEEN :from AND :to AND status = 'active'"
        );
        $purchases->execute(['from' => $from, 'to' => $to]);

        $salesTotal = (float) $sales->fetch()['v'];
        $commissionTotal = (float) $commissionIncome->fetch()['v'];
        $purchaseTotal = (float) $purchases->fetch()['v'];

        Response::json([
            'sales_total' => $salesTotal,
            'commission_income' => $commissionTotal,
            'purchase_total' => $purchaseTotal,
            'income_total' => round($salesTotal + $commissionTotal, 2),
            'profit' => round($salesTotal + $commissionTotal - $purchaseTotal, 2),
        ]);
    }

    public function billWiseProfit(): void
    {
        AuthMiddleware::authenticate();
        [$from, $to] = $this->range();

        $sql = "SELECT b.id, b.bill_no, b.bill_date, b.bill_type, b.location_type,
                       b.party_id, COALESCE(p.name, 'சில்லறை / Walk-in') AS party_name,
                       b.items_total, b.discount_amount, b.grand_total,
                       b.commission_amount, b.commission_percent, b.commission_mode,
                       b.paid_amount, b.balance_due,
                       pm.name_ta AS payment_method_name,
                       (SELECT COUNT(*) FROM bill_lines bl WHERE bl.bill_id = b.id) AS item_count,
                       (SELECT COALESCE(SUM(bl.weight), 0) FROM bill_lines bl WHERE bl.bill_id = b.id AND bl.is_charge_item = 0) AS total_weight
                FROM bills b
                LEFT JOIN parties p ON p.id = b.party_id
                LEFT JOIN payment_methods pm ON pm.id = b.payment_method_id
                WHERE b.bill_date BETWEEN :from AND :to AND b.status = 'active'
                ORDER BY b.bill_date DESC, b.id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['from' => $from, 'to' => $to]);
        $rows = $stmt->fetchAll();

        $totalSales = 0.0;
        $totalProfit = 0.0;
        $totalDiscount = 0.0;

        foreach ($rows as &$row) {
            $sales = (float) $row['items_total'] - (float) $row['discount_amount'];
            if ($row['bill_type'] === 'commission') {
                $profit = (float) $row['commission_amount'];
                $cost = round($sales - $profit, 2);
            } else {
                $cost = round($sales * 0.85, 2);
                $profit = round($sales - $cost, 2);
            }
            $row['net_sales'] = round($sales, 2);
            $row['estimated_cost'] = $cost;
            $row['profit'] = $profit;
            $row['margin_pct'] = $sales > 0 ? round(($profit / $sales) * 100, 1) : 0;

            $totalSales += $sales;
            $totalProfit += $profit;
            $totalDiscount += (float) $row['discount_amount'];
        }

        Response::json([
            'rows' => $rows,
            'summary' => [
                'bill_count' => count($rows),
                'total_sales' => round($totalSales, 2),
                'total_profit' => round($totalProfit, 2),
                'total_discount' => round($totalDiscount, 2),
                'average_profit_pct' => $totalSales > 0 ? round(($totalProfit / $totalSales) * 100, 1) : 0,
            ],
        ]);
    }
}

