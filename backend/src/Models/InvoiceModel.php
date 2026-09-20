<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\Response;
use App\Services\CreditLedgerService;
use App\Services\InvoiceNumberService;
use App\Services\StockLedgerService;
use PDO;

/**
 * Orchestrates the invoice lifecycle: hold -> edit -> complete/discard
 * (amendment 4.8a). A 'held' row never touches stock, credit, or reports.
 * completion is one atomic transaction: invoice + items + payments + stock
 * movement + credit ledger entry, all-or-nothing (rule 3 / section 4.8).
 */
class InvoiceModel
{
    public function __construct(private PDO $pdo)
    {
    }

    // -----------------------------------------------------------------
    // Reads
    // -----------------------------------------------------------------

    public function all(int $branchId, ?string $status = null): array
    {
        $sql = "SELECT i.*, c.ledger_name AS customer_name, u.name AS employee_name
                FROM invoices i
                LEFT JOIN customers c ON c.id = i.customer_id
                JOIN users u ON u.id = i.employee_id
                WHERE i.branch_id = :branch_id";
        $params = ['branch_id' => $branchId];

        if ($status !== null) {
            $sql .= ' AND i.status = :status';
            $params['status'] = $status;
        } else {
            // Default history view never shows held/discardable scratch bills.
            $sql .= " AND i.status <> 'held'";
        }

        $sql .= ' ORDER BY i.id DESC LIMIT 200';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT i.*, c.ledger_name AS customer_name, c.phone AS customer_phone, u.name AS employee_name
             FROM invoices i
             LEFT JOIN customers c ON c.id = i.customer_id
             JOIN users u ON u.id = i.employee_id
             WHERE i.id = :id'
        );
        $stmt->execute(['id' => $id]);
        $invoice = $stmt->fetch();
        if (!$invoice) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT ii.*, su.short_code AS unit_code
             FROM invoice_items ii
             JOIN stock_units su ON su.id = ii.unit_id
             WHERE ii.invoice_id = :id'
        );
        $stmt->execute(['id' => $id]);
        $invoice['items'] = $stmt->fetchAll();

        $stmt = $this->pdo->prepare('SELECT * FROM invoice_payments WHERE invoice_id = :id');
        $stmt->execute(['id' => $id]);
        $invoice['payments'] = $stmt->fetchAll();

        return $invoice;
    }

    // -----------------------------------------------------------------
    // Hold / edit / discard — no stock, credit, or numbering effects.
    // -----------------------------------------------------------------

    public function createHeld(array $header, array $cartLines): int
    {
        $this->pdo->beginTransaction();
        try {
            $totals = $this->computeTotals($cartLines);

            $stmt = $this->pdo->prepare(
                'INSERT INTO invoices
                    (branch_id, customer_id, employee_id, bill_type, invoice_format, invoice_date,
                     subtotal, discount_amount, taxable_value, cgst_amount, sgst_amount, igst_amount,
                     cess_amount, round_off, grand_total, vehicle_no, status)
                 VALUES
                    (:branch_id, :customer_id, :employee_id, :bill_type, :invoice_format, CURDATE(),
                     :subtotal, :discount_amount, :taxable_value, :cgst_amount, :sgst_amount, :igst_amount,
                     :cess_amount, :round_off, :grand_total, :vehicle_no, \'held\')'
            );
            $stmt->execute([
                'branch_id' => $header['branch_id'],
                'customer_id' => $header['customer_id'],
                'employee_id' => $header['employee_id'],
                'bill_type' => $header['bill_type'],
                'invoice_format' => $header['invoice_format'],
                'vehicle_no' => $header['vehicle_no'] ?? null,
                ...$totals,
            ]);
            $invoiceId = (int) $this->pdo->lastInsertId();

            $this->insertLineItems($invoiceId, $cartLines);

            $this->pdo->commit();
            return $invoiceId;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function updateHeld(int $id, array $header, array $cartLines): void
    {
        $this->pdo->beginTransaction();
        try {
            $totals = $this->computeTotals($cartLines);

            $stmt = $this->pdo->prepare(
                'UPDATE invoices SET
                    customer_id = :customer_id, bill_type = :bill_type, invoice_format = :invoice_format,
                    vehicle_no = :vehicle_no, subtotal = :subtotal, discount_amount = :discount_amount,
                    taxable_value = :taxable_value, cgst_amount = :cgst_amount, sgst_amount = :sgst_amount,
                    igst_amount = :igst_amount, cess_amount = :cess_amount, round_off = :round_off,
                    grand_total = :grand_total
                 WHERE id = :id AND status = \'held\''
            );
            $stmt->execute([
                'id' => $id,
                'customer_id' => $header['customer_id'],
                'bill_type' => $header['bill_type'],
                'invoice_format' => $header['invoice_format'],
                'vehicle_no' => $header['vehicle_no'] ?? null,
                ...$totals,
            ]);

            $this->pdo->prepare('DELETE FROM invoice_items WHERE invoice_id = :id')->execute(['id' => $id]);
            $this->insertLineItems($id, $cartLines);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function discardHeld(int $id): void
    {
        // Nothing else references a held row yet, so a hard delete is safe.
        $this->pdo->prepare("DELETE FROM invoices WHERE id = :id AND status = 'held'")->execute(['id' => $id]);
    }

    // -----------------------------------------------------------------
    // Completion — the one atomic transaction (rule 3, section 4.8).
    // -----------------------------------------------------------------

    /**
     * @param array $payments [{payment_method, amount, reference_no}]
     */
    public function complete(int $id, array $payments, int $employeeId): array
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('SELECT * FROM invoices WHERE id = :id FOR UPDATE');
            $stmt->execute(['id' => $id]);
            $invoice = $stmt->fetch();

            if (!$invoice) {
                throw new \RuntimeException('Invoice not found');
            }
            if ($invoice['status'] !== 'held') {
                throw new \RuntimeException('Only a held bill can be completed');
            }

            $stmt = $this->pdo->prepare('SELECT * FROM invoice_items WHERE invoice_id = :id');
            $stmt->execute(['id' => $id]);
            $items = $stmt->fetchAll();
            if (empty($items)) {
                throw new \RuntimeException('Cannot complete an empty bill');
            }

            $grandTotal = (float) $invoice['grand_total'];
            $nonCreditPaid = 0.0;
            $creditPortion = 0.0;
            foreach ($payments as $p) {
                if (($p['payment_method'] ?? '') === 'credit') {
                    $creditPortion += (float) $p['amount'];
                } else {
                    $nonCreditPaid += (float) $p['amount'];
                }
            }
            // Whatever isn't explicitly covered by a payment line is implicitly credit
            // only if a customer is attached; otherwise it must be fully paid.
            $uncovered = round($grandTotal - $nonCreditPaid - $creditPortion, 2);
            if ($uncovered > 0.009) {
                if ($invoice['customer_id'] === null) {
                    throw new \RuntimeException('Walk-in sales cannot be left partially unpaid — attach a customer for credit');
                }
                $creditPortion += $uncovered;
            }

            $paidAmount = min($nonCreditPaid, $grandTotal);
            if ($creditPortion > 0.009 && $invoice['customer_id'] === null) {
                throw new \RuntimeException('Cannot extend credit to a walk-in sale — select a customer first');
            }

            $paymentStatus = 'paid';
            if ($creditPortion > 0.009) {
                $paymentStatus = $paidAmount > 0.009 ? 'partial' : 'credit';
            }

            $series = $invoice['bill_type'] === 'gst' ? 'gst' : 'non_gst';
            $invoiceNo = (new InvoiceNumberService($this->pdo))->next((int) $invoice['branch_id'], $series);

            $stockService = new StockLedgerService($this->pdo);
            foreach ($items as $item) {
                $qtyTotal = (float) $item['qty'] + (float) $item['free_qty'];
                $stockService->applyMovement(
                    (int) $item['item_id'],
                    'branch',
                    (int) $invoice['branch_id'],
                    -$qtyTotal,
                    'sale',
                    'invoices',
                    $id,
                    null,
                    null,
                    $employeeId
                );
            }

            foreach ($payments as $p) {
                if (($p['payment_method'] ?? '') === 'credit') {
                    continue; // credit is tracked via credit_transactions, not a money-received row
                }
                $this->pdo->prepare(
                    'INSERT INTO invoice_payments (invoice_id, payment_method, amount, reference_no)
                     VALUES (:invoice_id, :method, :amount, :reference_no)'
                )->execute([
                    'invoice_id' => $id,
                    'method' => $p['payment_method'],
                    'amount' => $p['amount'],
                    'reference_no' => $p['reference_no'] ?? null,
                ]);
            }

            $customerOutstandingAfter = null;
            if ($creditPortion > 0.009) {
                $credit = new CreditLedgerService($this->pdo);
                $customerOutstandingAfter = $credit->record(
                    (int) $invoice['customer_id'],
                    'sale_credit',
                    $creditPortion,
                    $id,
                    "Invoice {$invoiceNo}",
                    $employeeId
                );
            } elseif ($invoice['customer_id'] !== null) {
                $credit = new CreditLedgerService($this->pdo);
                $customerOutstandingAfter = $credit->currentOutstanding((int) $invoice['customer_id']);
            }

            $this->pdo->prepare(
                'UPDATE invoices SET
                    invoice_no = :invoice_no, status = \'completed\', payment_status = :payment_status,
                    paid_amount = :paid_amount, customer_outstanding_after = :outstanding
                 WHERE id = :id'
            )->execute([
                'invoice_no' => $invoiceNo,
                'payment_status' => $paymentStatus,
                'paid_amount' => $paidAmount,
                'outstanding' => $customerOutstandingAfter,
                'id' => $id,
            ]);

            $this->pdo->commit();
            return $this->find($id);
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // -----------------------------------------------------------------
    // Shared line-item math
    // -----------------------------------------------------------------

    /**
     * Builds one priced cart line from raw POS input + the item's current
     * catalog data. Called by the controller so validation errors (unknown
     * item, etc.) surface before any DB write starts.
     */
    public function priceLine(array $item, array $input): array
    {
        $qty = (float) ($input['qty'] ?? 0);
        $freeQty = (float) ($input['free_qty'] ?? 0);
        $rate = isset($input['rate']) ? (float) $input['rate'] : (float) $item['retail_price'];

        $gross = round($qty * $rate, 2);
        $discountPercent = (float) ($input['discount_percent'] ?? 0);
        $discountAmount = isset($input['discount_amount']) && $input['discount_amount'] !== ''
            ? (float) $input['discount_amount']
            : round($gross * $discountPercent / 100, 2);

        $taxable = round($gross - $discountAmount, 2);
        $taxPercent = (float) ($item['gst_percent'] ?? 0);
        $taxAmount = round($taxable * $taxPercent / 100, 2);
        $cessPercent = (float) ($item['cess_percent'] ?? 0);
        $cessAmount = $cessPercent > 0 ? round($taxable * $cessPercent / 100, 2) : 0;

        return [
            'item_id' => (int) $item['id'],
            'unit_id' => (int) ($input['unit_id'] ?? $item['base_unit_id']),
            'item_name_snapshot' => $item['item_name'],
            'hsn_snapshot' => $item['hsn_code'],
            'qty' => $qty,
            'free_qty' => $freeQty,
            'rate' => $rate,
            'mrp' => $item['mrp'],
            'discount_percent' => $discountPercent,
            'discount_amount' => $discountAmount,
            'tax_percent' => $taxPercent,
            'tax_amount' => $taxAmount,
            'cess_amount' => $cessAmount,
            'line_total' => $taxable,
        ];
    }

    private function insertLineItems(int $invoiceId, array $lines): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO invoice_items
                (invoice_id, item_id, unit_id, item_name_snapshot, hsn_snapshot, qty, free_qty, rate, mrp,
                 discount_percent, discount_amount, tax_percent, tax_amount, cess_amount, line_total)
             VALUES
                (:invoice_id, :item_id, :unit_id, :item_name_snapshot, :hsn_snapshot, :qty, :free_qty, :rate, :mrp,
                 :discount_percent, :discount_amount, :tax_percent, :tax_amount, :cess_amount, :line_total)'
        );
        foreach ($lines as $line) {
            $stmt->execute(['invoice_id' => $invoiceId, ...$line]);
        }
    }

    private function computeTotals(array $lines): array
    {
        $subtotal = 0.0;
        $discountAmount = 0.0;
        $taxableValue = 0.0;
        $taxAmount = 0.0;
        $cessAmount = 0.0;

        foreach ($lines as $line) {
            $subtotal += $line['qty'] * $line['rate'];
            $discountAmount += $line['discount_amount'];
            $taxableValue += $line['line_total'];
            $taxAmount += $line['tax_amount'];
            $cessAmount += $line['cess_amount'];
        }

        // Seeded GST slabs are always an even CGST/SGST split; IGST
        // (interstate) branching is an open item in the spec itself —
        // deferred, see README assumptions.
        $cgst = round($taxAmount / 2, 2);
        $sgst = round($taxAmount - $cgst, 2);

        $rawTotal = $taxableValue + $taxAmount + $cessAmount;
        $grandTotal = round($rawTotal);
        $roundOff = round($grandTotal - $rawTotal, 2);

        return [
            'subtotal' => round($subtotal, 2),
            'discount_amount' => round($discountAmount, 2),
            'taxable_value' => round($taxableValue, 2),
            'cgst_amount' => $cgst,
            'sgst_amount' => $sgst,
            'igst_amount' => 0,
            'cess_amount' => round($cessAmount, 2),
            'round_off' => $roundOff,
            'grand_total' => $grandTotal,
        ];
    }
}
