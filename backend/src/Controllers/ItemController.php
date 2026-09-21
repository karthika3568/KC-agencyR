<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Models\ItemModel;
use App\Services\StockLedgerService;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class ItemController
{
    private ItemModel $items;

    /** Column order for both the import template and the export file. */
    private const EXCEL_COLUMNS = [
        'item_code', 'item_name', 'category', 'brand', 'product_line', 'supplier', 'hsn_code', 'barcode',
        'base_unit', 'secondary_unit', 'conversion_factor', 'branches', 'purchase_price', 'cost_price',
        'wholesale_price', 'retail_price', 'mrp', 'min_stock_threshold', 'tax_code', 'is_active',
    ];

    /** Columns hidden from anyone lacking purchases.view_purchase_cost. */
    private const COST_COLUMNS = ['purchase_price', 'cost_price'];

    private const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
    private const ALLOWED_IMAGE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    public function __construct(private \PDO $pdo)
    {
        $this->items = new ItemModel($pdo);
    }

    private function resolveBranchId(array $claims): ?int
    {
        $canSwitch = in_array('branches.switch_context', (array) ($claims['permissions'] ?? []), true);
        if (isset($_GET['branch_id'])) {
            return (int) $_GET['branch_id'];
        }
        // A single-branch user only ever sees items sellable at their own
        // branch; a switch_context user with no explicit filter sees the
        // full catalog (the Catalog management screen), not just one branch.
        return $canSwitch ? null : (int) ($claims['branch_id'] ?? 0);
    }

    public function index(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        $search = $_GET['search'] ?? null;
        $branchId = $this->resolveBranchId($claims);
        Response::json($this->items->all($search, $branchId));
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

        $id = $this->items->create($body, $body['unit_conversions'] ?? [], $body['branch_ids'] ?? null);

        // Opening stock — same movement type as an item created before this
        // system existed but already carrying some quantity. Applied once,
        // at creation only, to every branch this item ended up mapped to.
        $openingStock = (float) ($body['opening_stock'] ?? 0);
        if ($openingStock > 0.009) {
            $stock = new StockLedgerService($this->pdo);
            foreach ($this->items->branchIdsFor($id) as $branchId) {
                $stock->applyMovement(
                    $id, 'branch', $branchId, $openingStock, 'opening_stock',
                    'items', $id, null, 'Opening stock at item creation', (int) $claims['sub']
                );
            }
        }

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
        $this->items->update((int) $id, $body, $body['unit_conversions'] ?? null, $body['branch_ids'] ?? null);
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

    /** POST /api/items/{id}/image — multipart upload, replaces any existing image. */
    public function uploadImage(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'catalog.manage_items');

        $item = $this->items->find((int) $id);
        if (!$item) {
            Response::error('Not found', 404);
        }

        if (empty($_FILES['image']['tmp_name'])) {
            Response::error('No file uploaded (expected multipart field "image")', 422);
        }
        $file = $_FILES['image'];
        if ($file['size'] > self::MAX_IMAGE_BYTES) {
            Response::error('Image must be under 3 MB', 422);
        }

        $mime = mime_content_type($file['tmp_name']);
        if (!isset(self::ALLOWED_IMAGE_TYPES[$mime])) {
            Response::error('Only JPG, PNG or WEBP images are allowed', 422);
        }

        $dir = __DIR__ . '/../../public/uploads/items';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        // Remove any previous image for this item so uploads don't accumulate orphans.
        if (!empty($item['image'])) {
            $old = __DIR__ . '/../../public/' . ltrim($item['image'], '/');
            if (is_file($old)) {
                @unlink($old);
            }
        }

        $filename = 'item_' . $id . '_' . bin2hex(random_bytes(4)) . '.' . self::ALLOWED_IMAGE_TYPES[$mime];
        move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

        $relativePath = 'uploads/items/' . $filename;
        $this->items->update((int) $id, ['image' => $relativePath]);

        Response::json($this->items->find((int) $id));
    }

    /** DELETE /api/items/{id}/image */
    public function removeImage(string $id): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'catalog.manage_items');

        $item = $this->items->find((int) $id);
        if (!$item) {
            Response::error('Not found', 404);
        }

        if (!empty($item['image'])) {
            $path = __DIR__ . '/../../public/' . ltrim($item['image'], '/');
            if (is_file($path)) {
                @unlink($path);
            }
        }
        $this->items->update((int) $id, ['image' => null]);
        Response::json($this->items->find((int) $id));
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
            'supplier' => $item['supplier_name'],
            'base_unit' => $item['base_unit_code'],
            'secondary_unit' => $item['secondary_unit_code'],
            'tax_code' => $item['tax_code'],
            'branches' => $this->branchNamesFor((int) $item['id']),
            default => $item[$col] ?? null,
        };
    }

    private function branchNamesFor(int $itemId): string
    {
        $stmt = $this->pdo->prepare(
            'SELECT b.branch_name FROM item_branches ib JOIN branches b ON b.id = ib.branch_id WHERE ib.item_id = :id'
        );
        $stmt->execute(['id' => $itemId]);
        return implode(', ', array_column($stmt->fetchAll(), 'branch_name'));
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
                ['item' => $itemData, 'branch_ids' => $branchIds] = $mapped;
                $this->items->create($itemData, [], $branchIds);
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
            'supplier' => $index('suppliers', 'name'),
            'base_unit' => $index('stock_units', 'short_code'),
            'branch' => $index('branches', 'branch_name'),
            'tax_code' => $index('tax_codes', 'code'),
            'existing_item_code' => array_flip(array_map(
                fn ($r) => strtolower((string) $r['item_code']),
                $this->pdo->query('SELECT item_code FROM items WHERE item_code IS NOT NULL')->fetchAll()
            )),
            'existing_barcode' => array_flip(array_map(
                fn ($r) => strtolower((string) $r['barcode']),
                $this->pdo->query('SELECT barcode FROM items WHERE barcode IS NOT NULL')->fetchAll()
            )),
        ];
    }

    /** @return array{0: array{item: array, branch_ids: array}, 1: string[]} */
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

        $barcode = trim((string) ($record['barcode'] ?? ''));
        if ($barcode !== '' && isset($lookups['existing_barcode'][strtolower($barcode)])) {
            $errors[] = "duplicate barcode '{$barcode}'";
        }

        $baseUnitId = $this->resolveLookup($lookups['base_unit'], $record['base_unit'] ?? null);
        if ($baseUnitId === null) {
            $errors[] = "unknown base_unit '" . ($record['base_unit'] ?? '') . "'";
        }
        $secondaryUnitId = $this->resolveLookup($lookups['base_unit'], $record['secondary_unit'] ?? null);
        if (!empty($record['secondary_unit']) && $secondaryUnitId === null) {
            $errors[] = "unknown secondary_unit '{$record['secondary_unit']}'";
        }

        $categoryId = $this->resolveLookup($lookups['category'], $record['category'] ?? null);
        if (!empty($record['category']) && $categoryId === null) {
            $errors[] = "unknown category '{$record['category']}'";
        }

        $brandId = $this->resolveLookup($lookups['brand'], $record['brand'] ?? null);
        if (!empty($record['brand']) && $brandId === null) {
            $errors[] = "unknown brand '{$record['brand']}'";
        }
        if ($categoryId !== null && $brandId !== null && !$this->categoryAllowsBrand($categoryId, $brandId)) {
            $errors[] = "brand '{$record['brand']}' is not mapped to category '{$record['category']}'";
        }

        $supplierId = $this->resolveLookup($lookups['supplier'], $record['supplier'] ?? null);
        if (!empty($record['supplier']) && $supplierId === null) {
            $errors[] = "unknown supplier '{$record['supplier']}'";
        }

        $taxCodeId = $this->resolveLookup($lookups['tax_code'], $record['tax_code'] ?? null);
        if (!empty($record['tax_code']) && $taxCodeId === null) {
            $errors[] = "unknown tax_code '{$record['tax_code']}'";
        }

        $branchIds = [];
        $branchNames = array_filter(array_map('trim', explode(',', (string) ($record['branches'] ?? ''))));
        foreach ($branchNames as $name) {
            $branchId = $this->resolveLookup($lookups['branch'], $name);
            if ($branchId === null) {
                $errors[] = "unknown branch '{$name}'";
                continue;
            }
            $branchIds[] = $branchId;
        }

        foreach (['purchase_price', 'cost_price', 'wholesale_price', 'retail_price', 'mrp', 'min_stock_threshold'] as $numField) {
            if (isset($record[$numField]) && $record[$numField] !== '' && !is_numeric($record[$numField])) {
                $errors[] = "{$numField} must be numeric";
            }
        }

        $mapped = [
            'item_name' => $itemName,
            'category_id' => $categoryId,
            'brand_id' => $brandId,
            'supplier_id' => $supplierId,
            'hsn_code' => $record['hsn_code'] ?? null,
            'barcode' => $barcode ?: null,
            'base_unit_id' => $baseUnitId,
            'secondary_unit_id' => $secondaryUnitId,
            'purchase_price' => (float) ($record['purchase_price'] ?? 0),
            'cost_price' => (float) ($record['cost_price'] ?? 0),
            'wholesale_price' => (float) ($record['wholesale_price'] ?? 0),
            'retail_price' => (float) ($record['retail_price'] ?? 0),
            'mrp' => (float) ($record['mrp'] ?? 0),
            'min_stock_threshold' => (float) ($record['min_stock_threshold'] ?? 0),
            'tax_code_id' => $taxCodeId,
            'is_active' => isset($record['is_active']) && in_array(strtolower((string) $record['is_active']), ['0', 'no', 'false'], true) ? 0 : 1,
        ];

        return [['item' => $mapped, 'branch_ids' => $branchIds ?: null], $errors];
    }

    private function categoryAllowsBrand(int $categoryId, int $brandId): bool
    {
        // No mappings configured for this category at all = no restriction (opt-in feature).
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM category_brands WHERE category_id = :c');
        $stmt->execute(['c' => $categoryId]);
        if ((int) $stmt->fetchColumn() === 0) {
            return true;
        }
        $stmt = $this->pdo->prepare('SELECT 1 FROM category_brands WHERE category_id = :c AND brand_id = :b');
        $stmt->execute(['c' => $categoryId, 'b' => $brandId]);
        return (bool) $stmt->fetchColumn();
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
        $sheet->fromArray(
            ['', 'Sample Item', 'Beverages', 'Coca-Cola', '', 'ABC Distributors', '22021010', '8901234567890',
             'PCS', 'BOX', '24', 'Main Branch', '9', '10', '11', '12', '15', '0', 'GST18', '1'],
            null,
            'A2'
        );

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="items_import_template.xlsx"');
        header('Cache-Control: max-age=0');

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save('php://output');
        exit;
    }
}
