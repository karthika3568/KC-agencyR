<?php
/**
 * Phase 7 load-test data generator — NOT part of the app, run manually and
 * clean up afterward (see cleanup command printed at the end).
 *
 * Bulk-inserts thousands of completed invoices + line items directly via
 * SQL (bypassing InvoiceModel's business logic — stock/credit ledger side
 * effects aren't the point here, query performance under realistic volume
 * is). Every row uses an invoice_no starting with "LOAD-" so it's trivial
 * to find and delete afterward without touching real data.
 */

declare(strict_types=1);

$count = (int) ($argv[1] ?? 5000);

$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=pos_system;charset=utf8mb4', 'root', 'root', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$items = $pdo->query('SELECT id, retail_price, tax_code_id FROM items')->fetchAll(PDO::FETCH_ASSOC);
$taxRates = $pdo->query('SELECT id, gst_percent FROM tax_codes')->fetchAll(PDO::FETCH_KEY_PAIR);
$customerIds = array_column($pdo->query('SELECT id FROM customers')->fetchAll(), 'id');
$branchId = 1;
$employeeId = 1;

if (empty($items)) {
    fwrite(STDERR, "No items found — seed the catalog first.\n");
    exit(1);
}

$insertInvoice = $pdo->prepare(
    'INSERT INTO invoices
        (invoice_no, branch_id, customer_id, employee_id, bill_type, invoice_format, invoice_date,
         subtotal, discount_amount, taxable_value, cgst_amount, sgst_amount, igst_amount, cess_amount,
         round_off, grand_total, paid_amount, payment_status, status)
     VALUES
        (:invoice_no, :branch_id, :customer_id, :employee_id, :bill_type, \'local\', :invoice_date,
         :subtotal, 0, :taxable_value, :cgst, :sgst, 0, 0, :round_off, :grand_total, :paid_amount, :payment_status, \'completed\')'
);
$insertItem = $pdo->prepare(
    'INSERT INTO invoice_items
        (invoice_id, item_id, unit_id, item_name_snapshot, qty, free_qty, rate, discount_percent,
         discount_amount, tax_percent, tax_amount, line_total)
     SELECT :invoice_id, i.id, i.base_unit_id, i.item_name, :qty, 0, :rate, 0, 0, :tax_percent, :tax_amount, :line_total
     FROM items i WHERE i.id = :item_id2'
);

$pdo->beginTransaction();
$statuses = ['paid', 'paid', 'paid', 'partial', 'credit'];
$startTime = microtime(true);

for ($n = 1; $n <= $count; $n++) {
    $daysAgo = random_int(0, 89);
    $date = date('Y-m-d', strtotime("-{$daysAgo} days"));
    $billType = random_int(0, 4) === 0 ? 'non_gst' : 'gst';
    $lineCount = random_int(1, 3);

    $subtotal = 0;
    $taxAmount = 0;
    $lines = [];
    for ($l = 0; $l < $lineCount; $l++) {
        $item = $items[array_rand($items)];
        $qty = random_int(1, 5);
        $rate = (float) $item['retail_price'];
        $gross = round($qty * $rate, 2);
        $taxPercent = (float) ($taxRates[$item['tax_code_id']] ?? 0);
        $tax = round($gross * $taxPercent / 100, 2);
        $subtotal += $gross;
        $taxAmount += $tax;
        $lines[] = ['item_id' => $item['id'], 'qty' => $qty, 'rate' => $rate, 'tax_percent' => $taxPercent, 'tax_amount' => $tax, 'line_total' => $gross];
    }

    $rawTotal = $subtotal + $taxAmount;
    $grandTotal = round($rawTotal);
    $roundOff = round($grandTotal - $rawTotal, 2);
    $cgst = round($taxAmount / 2, 2);
    $sgst = round($taxAmount - $cgst, 2);

    $paymentStatus = $statuses[array_rand($statuses)];
    $customerId = (!empty($customerIds) && random_int(0, 2) > 0) ? $customerIds[array_rand($customerIds)] : null;
    if ($paymentStatus !== 'paid' && $customerId === null) {
        $paymentStatus = 'paid'; // walk-ins can't carry credit
    }
    $paidAmount = $paymentStatus === 'paid' ? $grandTotal : ($paymentStatus === 'partial' ? round($grandTotal * 0.4, 2) : 0);

    $insertInvoice->execute([
        'invoice_no' => sprintf('LOAD-%06d', $n),
        'branch_id' => $branchId,
        'customer_id' => $customerId,
        'employee_id' => $employeeId,
        'bill_type' => $billType,
        'invoice_date' => $date,
        'subtotal' => round($subtotal, 2),
        'taxable_value' => round($subtotal, 2),
        'cgst' => $cgst,
        'sgst' => $sgst,
        'round_off' => $roundOff,
        'grand_total' => $grandTotal,
        'paid_amount' => $paidAmount,
        'payment_status' => $paymentStatus,
    ]);
    $invoiceId = (int) $pdo->lastInsertId();

    foreach ($lines as $line) {
        $insertItem->execute([
            'invoice_id' => $invoiceId,
            'qty' => $line['qty'],
            'rate' => $line['rate'],
            'tax_percent' => $line['tax_percent'],
            'tax_amount' => $line['tax_amount'],
            'line_total' => $line['line_total'],
            'item_id2' => $line['item_id'],
        ]);
    }

    if ($n % 500 === 0) {
        $pdo->commit();
        $pdo->beginTransaction();
        fwrite(STDOUT, "  ...{$n}/{$count}\n");
    }
}
$pdo->commit();

$elapsed = round(microtime(true) - $startTime, 2);
fwrite(STDOUT, "Inserted {$count} invoices in {$elapsed}s.\n");
fwrite(STDOUT, "Cleanup when done: DELETE FROM invoices WHERE invoice_no LIKE 'LOAD-%';\n");
