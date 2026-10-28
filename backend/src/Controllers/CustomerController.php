<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use PDO;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

/**
 * Customer Excel import/export/template — additive to the existing plain
 * BranchScopedCrudController CRUD for /api/customers (create/edit/list/delete
 * are untouched); this only adds the bulk-file flow, mirroring
 * ItemController's import/export pattern (preview-then-commit, row-level
 * errors, never a partial/corrupt write).
 */
class CustomerController
{
    /**
     * Column order for both the import template and the export file. The
     * first ten match the reference format's exact business columns
     * (S.NO is display-only — it's the row's position, never stored or
     * read back); PRICING_TYPE is an addition at the end, same convention
     * ItemController uses for its own legacy-format-plus-additions columns.
     */
    private const EXCEL_COLUMNS = [
        's_no' => 'S.NO',
        'ledger_name' => 'CUSTOMER',
        'credit_limit' => 'CREDIT LIMIT',
        'opening_balance' => 'OPENING',
        'phone' => 'MOBILE',
        'gstin' => 'GST NO',
        'address' => 'ADDRESS',
        'pricing_type' => 'PRICING TYPE',
    ];

    public function __construct(private PDO $pdo)
    {
    }

    private function resolveBranchId(array $claims): int
    {
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if ($canSwitch && isset($_GET['branch_id'])) {
            return (int) $_GET['branch_id'];
        }
        return (int) ($claims['branch_id'] ?? 0);
    }

    // -------------------------------------------------------------
    // Export — current branch's customers, cost/internal columns none
    // (customers have no cost-style restricted fields the way items do).
    // -------------------------------------------------------------
    public function exportExcel(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::requireAny($claims, ['parties.manage_customers', 'reports.export_excel']);
        $branchId = $this->resolveBranchId($claims);

        $stmt = $this->pdo->prepare(
            'SELECT c.*
             FROM customers c
             WHERE c.branch_id = :branch_id
             ORDER BY c.ledger_name'
        );
        $stmt->execute(['branch_id' => $branchId]);
        $rows = $stmt->fetchAll();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Customers');
        $sheet->fromArray(array_values(self::EXCEL_COLUMNS), null, 'A1');

        $rowIndex = 2;
        foreach ($rows as $i => $row) {
            $sheet->fromArray([
                $i + 1,
                $row['ledger_name'],
                (float) $row['credit_limit'],
                (float) $row['opening_balance'],
                $row['phone'],
                $row['gstin'],
                $row['address'],
                $row['pricing_type'],
            ], null, "A{$rowIndex}");
            $rowIndex++;
        }

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="customers_export.xlsx"');
        header('Cache-Control: max-age=0');

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save('php://output');
        exit;
    }

    /** GET /api/customers/import/template — a blank starter workbook with headers + one sample row. */
    public function importTemplate(): void
    {
        JwtAuthMiddleware::authenticate();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Customers');
        $sheet->fromArray(array_values(self::EXCEL_COLUMNS), null, 'A1');
        $sheet->fromArray(
            [1, 'MURUGAN PETIKKADA', 0, 0, '9383555480', '', 'ARIYAPPURAM', 'normal'],
            null,
            'A2'
        );
        $sheet->fromArray(
            [2, 'VASAN MEDICAL', 0, 0, '9944395718', '', 'MAINROAD, AVUDAYANOOR', 'wholesale'],
            null,
            'A3'
        );

        // MOBILE must import as text, not a number (leading zeros/precision) —
        // format the whole column as text so a spreadsheet app doesn't coerce it.
        $sheet->getStyle('E2:E1000')->getNumberFormat()->setFormatCode('@');

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="customers_import_template.xlsx"');
        header('Cache-Control: max-age=0');

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save('php://output');
        exit;
    }

    public function importPreview(): void
    {
        $this->import(false);
    }

    public function importCommit(): void
    {
        $this->import(true);
    }

    private function import(bool $commit): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'parties.manage_customers');
        $branchId = $this->resolveBranchId($claims);

        if (empty($_FILES['file']['tmp_name'])) {
            Response::error('No file uploaded (expected multipart field "file")', 422);
        }

        $spreadsheet = IOFactory::load($_FILES['file']['tmp_name']);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);

        $rawHeader = array_map(fn ($h) => trim((string) $h), array_shift($rows) ?? []);
        $header = array_map(fn ($h) => $this->normalizeHeader($h), $rawHeader);

        // Existing customers in THIS branch, keyed for dedup-on-reimport:
        // phone is the more reliable key when present (mirrors item_code),
        // normalized ledger_name is the fallback (mirrors item_name) so
        // re-importing the same file updates instead of duplicating.
        $existingByPhone = [];
        $existingByName = [];
        $stmt = $this->pdo->prepare('SELECT id, ledger_name, phone FROM customers WHERE branch_id = :b');
        $stmt->execute(['b' => $branchId]);
        foreach ($stmt->fetchAll() as $row) {
            if (!empty($row['phone'])) {
                $existingByPhone[$this->normalizePhone((string) $row['phone'])] = (int) $row['id'];
            }
            $existingByName[$this->normalizeName((string) $row['ledger_name'])] = (int) $row['id'];
        }

        $results = [];
        $toUpsert = [];

        foreach ($rows as $rowNumber => $row) {
            if (empty(array_filter($row, fn ($v) => $v !== null && $v !== ''))) {
                continue; // skip blank rows
            }
            $record = array_combine($header, array_pad($row, count($header), null));
            [$mapped, $rowErrors] = $this->mapImportRow($record, $existingByPhone, $existingByName);

            $results[] = [
                'row' => $rowNumber + 2,
                'customer' => $record['ledger_name'] ?? null,
                'errors' => $rowErrors,
            ];

            if (empty($rowErrors)) {
                $toUpsert[] = $mapped;
            }
        }

        $inserted = 0;
        $updated = 0;
        if ($commit) {
            foreach ($toUpsert as $mapped) {
                ['data' => $data, 'existing_id' => $existingId] = $mapped;
                $data['branch_id'] = $branchId;
                if ($existingId !== null) {
                    $set = implode(',', array_map(fn ($c) => "$c = :$c", array_keys($data)));
                    $this->pdo->prepare("UPDATE customers SET {$set} WHERE id = :id")
                        ->execute([...$data, 'id' => $existingId]);
                    $updated++;
                } else {
                    $cols = array_keys($data);
                    $placeholders = array_map(fn ($c) => ":$c", $cols);
                    $this->pdo->prepare('INSERT INTO customers (' . implode(',', $cols) . ') VALUES (' . implode(',', $placeholders) . ')')
                        ->execute($data);
                    $inserted++;
                }
            }
        }

        Response::json([
            'total_rows' => count($results),
            'valid_rows' => count($toUpsert),
            'invalid_rows' => count($results) - count($toUpsert),
            'inserted' => $commit ? $inserted : 0,
            'updated' => $commit ? $updated : 0,
            'committed' => $commit,
            'rows' => $results,
        ]);
    }

    /** Accepts either the required Excel label (CUSTOMER, GST NO, ...) or the internal key spelling. */
    private function normalizeHeader(string $rawHeader): string
    {
        static $reverse = null;
        if ($reverse === null) {
            $reverse = [];
            foreach (self::EXCEL_COLUMNS as $key => $label) {
                $reverse[strtolower($key)] = $key;
                $reverse[strtolower($label)] = $key;
            }
        }
        $normalized = strtolower(trim($rawHeader));
        return $reverse[$normalized] ?? $rawHeader;
    }

    /** @return array{0: array{data: array, existing_id: int|null}, 1: string[]} */
    private function mapImportRow(
        array $record,
        array &$existingByPhone,
        array &$existingByName
    ): array {
        $errors = [];

        $ledgerName = trim((string) ($record['ledger_name'] ?? ''));
        if ($ledgerName === '') {
            $errors[] = 'CUSTOMER (name) is required';
        }

        // MOBILE: read as text so a leading zero survives; Excel sometimes
        // hands back a plain int/float even for a text-formatted cell.
        $phoneRaw = $record['phone'] ?? '';
        $phone = is_float($phoneRaw) ? number_format($phoneRaw, 0, '', '') : trim((string) $phoneRaw);
        if ($phone !== '' && !preg_match('/^[0-9+\-\s()]{6,20}$/', $phone)) {
            $errors[] = "invalid mobile number '{$phone}'";
        }

        $existingId = null;
        if ($phone !== '' && isset($existingByPhone[$this->normalizePhone($phone)])) {
            $existingId = $existingByPhone[$this->normalizePhone($phone)];
        } elseif ($ledgerName !== '' && isset($existingByName[$this->normalizeName($ledgerName)])) {
            $existingId = $existingByName[$this->normalizeName($ledgerName)];
        }

        foreach (['credit_limit', 'opening_balance'] as $numField) {
            if (isset($record[$numField]) && $record[$numField] !== '' && !is_numeric($record[$numField])) {
                $errors[] = "{$numField} must be numeric";
            }
        }
        $creditLimit = isset($record['credit_limit']) && $record['credit_limit'] !== '' ? (float) $record['credit_limit'] : 0.0;
        $openingBalance = isset($record['opening_balance']) && $record['opening_balance'] !== '' ? (float) $record['opening_balance'] : 0.0;

        // GST NO: the reference data uses "0" as a placeholder for "no
        // GSTIN" (real-world exports also commonly use NA/N/A/-/NIL) —
        // none of those must be stored literally as a GSTIN.
        $gstinRaw = trim((string) ($record['gstin'] ?? ''));
        $gstin = in_array(strtoupper($gstinRaw), ['', '0', 'NA', 'N/A', '-', 'NIL'], true) ? null : $gstinRaw;
        if ($gstin !== null && !preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/', strtoupper($gstin))) {
            $errors[] = "invalid GSTIN format '{$gstin}'";
        }

        $pricingType = strtolower(trim((string) ($record['pricing_type'] ?? '')));
        if ($pricingType !== '' && !in_array($pricingType, ['normal', 'retail', 'wholesale'], true)) {
            $errors[] = "pricing_type must be normal, retail, or wholesale (got '{$pricingType}')";
            $pricingType = 'normal';
        }
        if ($pricingType === '') {
            $pricingType = 'normal';
        }

        $data = [
            'ledger_name' => $ledgerName,
            'phone' => $phone !== '' ? $phone : null,
            'credit_limit' => $creditLimit,
            'opening_balance' => $openingBalance,
            'gstin' => $gstin,
            'address' => ($record['address'] ?? '') !== '' ? trim((string) $record['address']) : null,
            'pricing_type' => $pricingType,
        ];

        return [['data' => $data, 'existing_id' => $existingId], $errors];
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?? '';
    }

    private function normalizeName(string $name): string
    {
        return strtolower(preg_replace('/\s+/', ' ', trim($name)));
    }

    /**
     * Handles both an Excel serial date (numeric cell) and a plain text date
     * in the reference format's own DD-MM-YYYY style, plus a couple of
     * common variants — never guesses ambiguous input, returns null instead.
     */
    private function parseExcelDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject((float) $value);
                return $dt->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }
        $text = trim((string) $value);
        foreach (['d-m-Y', 'd/m/Y', 'Y-m-d', 'd-m-y', 'd/m/y'] as $format) {
            $dt = \DateTime::createFromFormat($format, $text);
            if ($dt !== false && $dt->format($format) === $text) {
                return $dt->format('Y-m-d');
            }
        }
        return null;
    }
}
