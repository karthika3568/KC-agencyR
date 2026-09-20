<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\ItemModel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class ItemController
{
    private ItemModel $items;

    /** Column order for both the import template and the export file. */
    private const EXCEL_COLUMNS = [
        'item_code', 'item_name', 'category', 'brand', 'product_line', 'hsn_code', 'barcode',
        'base_unit', 'purchase_price', 'cost_price', 'wholesale_price', 'retail_price', 'mrp',
        'min_stock_threshold', 'tax_code', 'is_active',
    ];

    /** Columns hidden from anyone lacking purchases.view_purchase_cost. */
    private const COST_COLUMNS = ['purchase_price', 'cost_price'];

    public function __construct(private \PDO $pdo)
    {
        $this->items = new ItemModel($pdo);
    }

    public function index(): void
    {
        JwtAuthMiddleware::authenticate();
        $search = $_GET['search'] ?? null;
        Response::json($this->items->all($search));
    }

    public function show(string $id): void
    {
        JwtAuthMiddleware::authenticate();
        $item = $this->items->find((int) $id);
        if (!$item) {
            Response::error('Not found', 404);
        }
        Response::json($item);
    }

    public function store(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'catalog.manage_items');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $errors = $this->validate($body);
        if (!empty($errors)) {
            Response::json(['errors' => $errors], 422);
        }

        $id = $this->items->create($body, $body['unit_conversions'] ?? []);
        Response::json($this->items->find($id), 201);
    }

    public function update(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'catalog.manage_items');

        if (!$this->items->find((int) $id)) {
            Response::error('Not found', 404);
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $this->items->update((int) $id, $body, $body['unit_conversions'] ?? null);
        Response::json($this->items->find((int) $id));
    }

    public function destroy(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'catalog.manage_items');

        if (!$this->items->find((int) $id)) {
            Response::error('Not found', 404);
        }
        $this->items->delete((int) $id);
        Response::json(['deleted' => true]);
    }

    private function validate(array $body): array
    {
        $errors = [];
        if (trim((string) ($body['item_name'] ?? '')) === '') {
            $errors[] = 'item_name is required';
        }
        if (empty($body['base_unit_id'])) {
            $errors[] = 'base_unit_id is required';
        }
        return $errors;
    }

    // -------------------------------------------------------------
    // Excel export — full catalog, cost columns stripped unless the
    // caller holds purchases.view_purchase_cost (section 9 of spec).
    // -------------------------------------------------------------
    public function exportExcel(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        $canViewCost = in_array('purchases.view_purchase_cost', (array) ($claims['permissions'] ?? []), true);

        $columns = self::EXCEL_COLUMNS;
        if (!$canViewCost) {
            $columns = array_values(array_diff($columns, self::COST_COLUMNS));
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Items');
        $sheet->fromArray($columns, null, 'A1');

        $rows = $this->items->all();
        $rowIndex = 2;
        foreach ($rows as $item) {
            $rowData = [];
            foreach ($columns as $col) {
                $rowData[] = $this->exportValue($item, $col);
            }
            $sheet->fromArray($rowData, null, "A{$rowIndex}");
            $rowIndex++;
        }

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="items_export.xlsx"');
        header('Cache-Control: max-age=0');

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save('php://output');
        exit;
    }

    private function exportValue(array $item, string $col): mixed
    {
        return match ($col) {
            'category' => $item['category_name'],
            'brand' => $item['brand_name'],
            'product_line' => $item['product_line_name'],
            'base_unit' => $item['base_unit_code'],
            'tax_code' => $item['tax_code'],
            default => $item[$col] ?? null,
        };
    }

    // -------------------------------------------------------------
    // Excel import — validate every row first; only ?commit=1 writes.
    // Mirrors the spec: "preview/error report before committing".
    // -------------------------------------------------------------
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
        PermissionMiddleware::require($claims, 'catalog.manage_items');

        if (empty($_FILES['file']['tmp_name'])) {
            Response::error('No file uploaded (expected multipart field "file")', 422);
        }

        $spreadsheet = IOFactory::load($_FILES['file']['tmp_name']);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);

        $header = array_map(fn ($h) => trim((string) $h), array_shift($rows) ?? []);
        $lookups = $this->buildLookups();

        $results = [];
        $toInsert = [];

        foreach ($rows as $rowNumber => $row) {
            if (empty(array_filter($row, fn ($v) => $v !== null && $v !== ''))) {
                continue; // skip blank rows
            }

            $record = array_combine($header, array_pad($row, count($header), null));
            [$mapped, $rowErrors] = $this->mapImportRow($record, $lookups);

            $results[] = [
                'row' => $rowNumber + 2, // +1 for 0-index, +1 for header row
                'item_code' => $record['item_code'] ?? null,
                'item_name' => $record['item_name'] ?? null,
                'errors' => $rowErrors,
            ];

            if (empty($rowErrors)) {
                $toInsert[] = $mapped;
            }
        }

        $inserted = 0;
        if ($commit) {
            foreach ($toInsert as $mapped) {
                $this->items->create($mapped);
                $inserted++;
            }
        }

        Response::json([
            'total_rows' => count($results),
            'valid_rows' => count($toInsert),
            'invalid_rows' => count($results) - count($toInsert),
            'inserted' => $commit ? $inserted : 0,
            'committed' => $commit,
            'rows' => $results,
        ]);
    }

    private function buildLookups(): array
    {
        $index = function (string $table, string $key) {
            $stmt = $this->pdo->query("SELECT id, $key FROM $table");
            $map = [];
            foreach ($stmt->fetchAll() as $row) {
                $map[strtolower((string) $row[$key])] = (int) $row['id'];
            }
            return $map;
        };

        return [
            'category' => $index('categories', 'name'),
            'brand' => $index('brands', 'name'),
            'product_line' => $index('product_lines', 'name'),
            'base_unit' => $index('stock_units', 'short_code'),
            'tax_code' => $index('tax_codes', 'code'),
            'existing_item_code' => array_flip(array_map(
                fn ($r) => strtolower((string) $r['item_code']),
                $this->pdo->query('SELECT item_code FROM items WHERE item_code IS NOT NULL')->fetchAll()
            )),
        ];
    }

    /** @return array{0: array, 1: string[]} */
    private function mapImportRow(array $record, array $lookups): array
    {
        $errors = [];
        $itemName = trim((string) ($record['item_name'] ?? ''));
        if ($itemName === '') {
            $errors[] = 'item_name is required';
        }

        $itemCode = trim((string) ($record['item_code'] ?? ''));
        if ($itemCode !== '' && isset($lookups['existing_item_code'][strtolower($itemCode)])) {
            $errors[] = "duplicate item_code '{$itemCode}'";
        }

        $baseUnitId = $this->resolveLookup($lookups['base_unit'], $record['base_unit'] ?? null);
        if ($baseUnitId === null) {
            $errors[] = "unknown base_unit '" . ($record['base_unit'] ?? '') . "'";
        }

        $categoryId = $this->resolveLookup($lookups['category'], $record['category'] ?? null);
        if (!empty($record['category']) && $categoryId === null) {
            $errors[] = "unknown category '{$record['category']}'";
        }

        $taxCodeId = $this->resolveLookup($lookups['tax_code'], $record['tax_code'] ?? null);
        if (!empty($record['tax_code']) && $taxCodeId === null) {
            $errors[] = "unknown tax_code '{$record['tax_code']}'";
        }

        $mapped = [
            'item_name' => $itemName,
            'category_id' => $categoryId,
            'brand_id' => $this->resolveLookup($lookups['brand'], $record['brand'] ?? null),
            'product_line_id' => $this->resolveLookup($lookups['product_line'], $record['product_line'] ?? null),
            'hsn_code' => $record['hsn_code'] ?? null,
            'barcode' => $record['barcode'] ?: null,
            'base_unit_id' => $baseUnitId,
            'purchase_price' => (float) ($record['purchase_price'] ?? 0),
            'cost_price' => (float) ($record['cost_price'] ?? 0),
            'wholesale_price' => (float) ($record['wholesale_price'] ?? 0),
            'retail_price' => (float) ($record['retail_price'] ?? 0),
            'mrp' => (float) ($record['mrp'] ?? 0),
            'min_stock_threshold' => (float) ($record['min_stock_threshold'] ?? 0),
            'tax_code_id' => $taxCodeId,
            'is_active' => isset($record['is_active']) && in_array(strtolower((string) $record['is_active']), ['0', 'no', 'false'], true) ? 0 : 1,
        ];

        return [$mapped, $errors];
    }

    private function resolveLookup(array $map, mixed $value): ?int
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }
        return $map[strtolower(trim((string) $value))] ?? null;
    }

    /** GET /api/items/import/template — a blank starter workbook with headers. */
    public function importTemplate(): void
    {
        JwtAuthMiddleware::authenticate();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Items');
        $sheet->fromArray(self::EXCEL_COLUMNS, null, 'A1');

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="items_import_template.xlsx"');
        header('Cache-Control: max-age=0');

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save('php://output');
        exit;
    }
}
