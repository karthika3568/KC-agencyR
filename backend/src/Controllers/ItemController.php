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

    /**
     * Column order for both the import template and the export file, as
     * internal_key => Excel header label. The header labels for
     * STOCKITEM/UNIT/MRP/NET_SRATE/NET_PURRATE/S-UNIT/S-MRP/S-NET_SRATE/
     * S-NET_PURRATE/GST/HSN are the exact legacy-system terminology this
     * format must stay interoperable with — never rename these labels.
     * Every other existing column (item_code, category, branches, …) is
     * kept as-is alongside them; nothing is removed.
     */
    private const EXCEL_COLUMNS = [
        'item_code' => 'item_code',
        'item_name' => 'STOCKITEM',
        'category' => 'category',
        'brand' => 'brand',
        'product_line' => 'product_line',
        'supplier' => 'supplier',
        'hsn_code' => 'HSN',
        'barcode' => 'barcode',
        'base_unit' => 'UNIT',
        'mrp' => 'MRP',
        'net_srate' => 'NET_SRATE',
        'net_purrate' => 'NET_PURRATE',
        'secondary_unit' => 'S-UNIT',
        'secondary_mrp' => 'S-MRP',
        'secondary_net_srate' => 'S-NET_SRATE',
        'secondary_net_purrate' => 'S-NET_PURRATE',
        'gst' => 'GST',
        'conversion_factor' => 'conversion_factor',
        'branches' => 'branches',
        'purchase_price' => 'purchase_price',
        'cost_price' => 'cost_price',
        'wholesale_price' => 'wholesale_price',
        'min_stock_threshold' => 'min_stock_threshold',
        'tax_code' => 'tax_code',
        'is_active' => 'is_active',
    ];

    /** Columns hidden from anyone lacking purchases.view_purchase_cost. */
    private const COST_COLUMNS = ['purchase_price', 'cost_price', 'net_purrate', 'secondary_net_purrate'];

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

    /**
     * POST /api/items/image-search — best-effort "find this product from a
     * photo": runs OCR on the uploaded image (if the server actually has an
     * OCR engine installed) and text-matches the extracted words against
     * item_name/item_code/barcode. This is deliberately NOT visual object
     * recognition (no such model is available in this stack) — it reads
     * printed text on the pack/label. When no OCR engine is present we say
     * so plainly rather than pretending a match was attempted.
     */
    public function imageSearch(): void
    {
        $claims = JwtAuthMiddleware::authenticate();

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

        $tesseractPath = $this->findTesseractBinary();
        if ($tesseractPath === '') {
            Response::json([
                'engine_available' => false,
                'message' => 'No OCR engine is installed on this server, so a photo cannot be matched to a product automatically yet. Please search by name, code, or barcode instead.',
                'extracted_text' => '',
                'matches' => [],
            ]);
            return;
        }

        $outputBase = sys_get_temp_dir() . '/ocr_' . bin2hex(random_bytes(6));
        $cmd = escapeshellarg($tesseractPath) . ' ' . escapeshellarg($file['tmp_name']) . ' ' . escapeshellarg($outputBase) . ' 2>&1';
        exec($cmd);
        $textFile = $outputBase . '.txt';
        $text = is_file($textFile) ? (string) file_get_contents($textFile) : '';
        if (is_file($textFile)) {
            @unlink($textFile);
        }

        $words = array_unique(array_filter(
            preg_split('/[^A-Za-z0-9]+/', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [],
            fn ($w) => strlen($w) >= 3
        ));

        if (empty($words)) {
            Response::json(['engine_available' => true, 'extracted_text' => trim($text), 'matches' => []]);
            return;
        }

        $branchId = $this->resolveBranchId($claims);
        $candidates = $this->items->all(null, $branchId);
        $scored = [];
        foreach ($candidates as $item) {
            $haystack = strtolower($item['item_name'] . ' ' . ($item['item_code'] ?? '') . ' ' . ($item['barcode'] ?? ''));
            $score = 0;
            foreach ($words as $w) {
                if (str_contains($haystack, strtolower($w))) {
                    $score++;
                }
            }
            if ($score > 0) {
                $scored[] = ['item' => $item, 'score' => $score];
            }
        }
        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);

        Response::json([
            'engine_available' => true,
            'extracted_text' => trim($text),
            'matches' => array_slice(array_map(fn ($s) => $s['item'], $scored), 0, 5),
        ]);
    }

    /**
     * Locates the tesseract binary. `where`/`which` only see PATH, but a
     * Windows install commonly isn't on PATH at all (the installer doesn't
     * always add it, and even when it does, Apache/PHP's own process
     * environment may not pick up a later PATH change without a restart) —
     * so fall back to the well-known default install directories.
     */
    private function findTesseractBinary(): string
    {
        $fromPath = trim((string) (@shell_exec('where tesseract 2>NUL') ?: @shell_exec('command -v tesseract 2>/dev/null') ?: ''));
        if ($fromPath !== '') {
            return strtok($fromPath, "\r\n");
        }

        foreach ([
            'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
            'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
        ] as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        return '';
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
        // MRP, NET_SRATE and NET_PURRATE are independent values (never
        // derived from one another) — each just needs to be non-negative
        // when present, same as the secondary-unit variants.
        foreach ([
            'mrp', 'net_srate', 'net_purrate', 'secondary_mrp', 'secondary_net_srate', 'secondary_net_purrate',
            'retail_selling_price', 'wholesale_selling_price',
        ] as $field) {
            if (isset($body[$field]) && $body[$field] !== '' && $body[$field] !== null && (float) $body[$field] < 0) {
                $errors[] = "{$field} cannot be negative";
            }
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
            $columns = array_diff_key($columns, array_flip(self::COST_COLUMNS));
        }
        $keys = array_keys($columns);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Items');
        $sheet->fromArray(array_values($columns), null, 'A1');

        $rows = $this->items->all();
        $rowIndex = 2;
        foreach ($rows as $item) {
            $rowData = [];
            foreach ($keys as $col) {
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
            'gst' => $item['gst_percent'] ?? null,
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

        $rawHeader = array_map(fn ($h) => trim((string) $h), array_shift($rows) ?? []);
        $header = array_map(fn ($h) => $this->normalizeHeader($h), $rawHeader);
        $lookups = $this->buildLookups();
        $pendingBrands = [];
        $pendingCategories = [];

        $results = [];
        $toInsert = [];

        foreach ($rows as $rowNumber => $row) {
            if (empty(array_filter($row, fn ($v) => $v !== null && $v !== ''))) {
                continue; // skip blank rows
            }

            $record = array_combine($header, array_pad($row, count($header), null));
            [$mapped, $rowErrors] = $this->mapImportRow($record, $lookups, $pendingBrands, $pendingCategories);

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
        $updated = 0;
        if ($commit) {
            // Create each newly-seen Brand/Category exactly once (deduped
            // across every row in this file via $pendingBrands/$pendingCategories),
            // before any item row references its id.
            $createdBrandIds = $this->materializePendingMasters('brands', $pendingBrands);
            $createdCategoryIds = $this->materializePendingMasters('categories', $pendingCategories);

            foreach ($toInsert as $mapped) {
                ['item' => $itemData, 'branch_ids' => $branchIds, 'existing_item_id' => $existingItemId] = $mapped;
                $itemData['brand_id'] = $this->resolvePendingMasterId($itemData['brand_id'], $createdBrandIds);
                $itemData['category_id'] = $this->resolvePendingMasterId($itemData['category_id'], $createdCategoryIds);
                // A blank NET_SRATE/NET_PURRATE/MRP/etc. cell means "leave
                // unchanged" (never "clear this out") on both paths — on
                // create there's nothing to preserve, so the omitted NOT
                // NULL columns (mrp, purchase_price, ...) just take their
                // DB-level DEFAULT 0 instead of failing on a NULL insert.
                $itemData = array_filter($itemData, fn ($v) => $v !== null);
                if ($existingItemId !== null) {
                    $this->items->update($existingItemId, $itemData, null, $branchIds);
                    $updated++;
                } else {
                    $this->items->create($itemData, [], $branchIds);
                    $inserted++;
                }
            }
        }

        Response::json([
            'total_rows' => count($results),
            'valid_rows' => count($toInsert),
            'invalid_rows' => count($results) - count($toInsert),
            'inserted' => $commit ? $inserted : 0,
            'updated' => $commit ? $updated : 0,
            'committed' => $commit,
            // Brand/Category auto-create: preview shows what WOULD be
            // created, commit shows what actually WAS created — the
            // matching/dedup logic (resolveOrStageMaster) is identical
            // either way, only whether materializePendingMasters() runs differs.
            'new_brands' => array_values($pendingBrands),
            'new_categories' => array_values($pendingCategories),
            'rows' => $results,
        ]);
    }

    /**
     * Maps an Excel header cell back to our internal column key, accepting
     * either the new required label (STOCKITEM, NET_SRATE, S-UNIT, …) or
     * the old internal key spelling (item_name, net_srate, …) so files
     * exported before this terminology existed still import cleanly —
     * never a reason to silently drop a column (section 24).
     */
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
            'gst_percent' => array_column(
                $this->pdo->query('SELECT id, gst_percent FROM tax_codes')->fetchAll(),
                'id',
                'gst_percent'
            ),
            // item_code -> id: an existing item_code UPDATES that row
            // instead of erroring as a duplicate (section 9.6/9.7 — the
            // existing importer was create-only; this is a genuine, small
            // addition, not a behavior it silently lacked already).
            'existing_item_code' => $this->indexById('items', 'item_code'),
            'existing_barcode' => $this->indexById('items', 'barcode'),
            // Fallback match when a row has no item_code at all — without
            // this, re-importing the same file (no codes assigned yet)
            // silently creates a fresh duplicate item every single time
            // instead of recognizing "this item already exists". Matched the
            // same normalized way as Brand/Category (case/space-insensitive).
            'existing_item_name' => $this->indexItemsByNormalizedName(),
        ];
    }

    /** normalized item_name -> id, for items with no item_code to key off of. */
    private function indexItemsByNormalizedName(): array
    {
        $map = [];
        foreach ($this->pdo->query('SELECT id, item_name FROM items')->fetchAll() as $row) {
            $map[$this->normalizeMasterName((string) $row['item_name'])] = (int) $row['id'];
        }
        return $map;
    }

    /** value(lowercased) -> id, for a nullable-unique column. */
    private function indexById(string $table, string $column): array
    {
        $stmt = $this->pdo->query("SELECT id, $column FROM $table WHERE $column IS NOT NULL");
        $map = [];
        foreach ($stmt->fetchAll() as $row) {
            $map[strtolower((string) $row[$column])] = (int) $row['id'];
        }
        return $map;
    }

    /** @return array{0: array{item: array, branch_ids: array}, 1: string[]} */
    private function mapImportRow(array $record, array &$lookups, array &$pendingBrands, array &$pendingCategories): array
    {
        $errors = [];
        $itemName = trim((string) ($record['item_name'] ?? ''));
        if ($itemName === '') {
            $errors[] = 'item_name is required';
        }

        // An existing item_code means this row UPDATES that item rather
        // than being rejected as a duplicate. With no item_code at all,
        // fall back to a normalized item_name match so re-importing the same
        // file updates the existing item instead of creating another copy.
        $itemCode = trim((string) ($record['item_code'] ?? ''));
        $existingItemId = $itemCode !== ''
            ? ($lookups['existing_item_code'][strtolower($itemCode)] ?? null)
            : ($itemName !== '' ? ($lookups['existing_item_name'][$this->normalizeMasterName($itemName)] ?? null) : null);

        $barcode = trim((string) ($record['barcode'] ?? ''));
        $barcodeOwnerId = $barcode !== '' ? ($lookups['existing_barcode'][strtolower($barcode)] ?? null) : null;
        if ($barcodeOwnerId !== null && $barcodeOwnerId !== $existingItemId) {
            $errors[] = "barcode '{$barcode}' already belongs to a different item";
        }

        $baseUnitId = $this->resolveLookup($lookups['base_unit'], $record['base_unit'] ?? null);
        if ($baseUnitId === null) {
            $errors[] = "unknown base_unit '" . ($record['base_unit'] ?? '') . "'";
        }
        $secondaryUnitId = $this->resolveLookup($lookups['base_unit'], $record['secondary_unit'] ?? null);
        if (!empty($record['secondary_unit']) && $secondaryUnitId === null) {
            $errors[] = "unknown secondary_unit '{$record['secondary_unit']}'";
        }

        // Brand/Category are auto-created on import rather than rejected —
        // resolveOrStageMaster() matches case/space-insensitively against
        // what's already loaded, or stages a new one (deduped across rows
        // in this same file) to be created when the import actually commits.
        $categoryId = $this->resolveOrStageMaster($lookups['category'], $pendingCategories, $record['category'] ?? null);
        $brandId = $this->resolveOrStageMaster($lookups['brand'], $pendingBrands, $record['brand'] ?? null);
        // The category/brand mapping restriction only applies when both
        // already exist for real — a brand-new category has no mappings
        // configured yet, which is already "no restriction" (opt-in feature).
        if (is_int($categoryId) && is_int($brandId) && !$this->categoryAllowsBrand($categoryId, $brandId)) {
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
        // No explicit tax_code column, but a GST% number was given directly
        // (the legacy format's own column) — resolve by matching percent.
        if ($taxCodeId === null && empty($record['tax_code']) && ($record['gst'] ?? null) !== null && $record['gst'] !== '') {
            $taxCodeId = $lookups['gst_percent'][number_format((float) $record['gst'], 2)] ?? null;
            if ($taxCodeId === null) {
                $errors[] = "no tax code configured for GST {$record['gst']}%";
            }
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

        foreach ([
            'purchase_price', 'cost_price', 'wholesale_price', 'retail_price', 'mrp', 'min_stock_threshold',
            'net_srate', 'net_purrate', 'secondary_mrp', 'secondary_net_srate', 'secondary_net_purrate', 'gst',
        ] as $numField) {
            if (isset($record[$numField]) && $record[$numField] !== '' && !is_numeric($record[$numField])) {
                $errors[] = "{$numField} must be numeric";
            }
        }

        // NET_SRATE/NET_PURRATE are never derived from MRP or from each
        // other (section 21) — each is read independently, defaulting to
        // null (not 0) when the column is blank so an old row's existing
        // value isn't silently zeroed out by a partial re-import.
        $netSrate = isset($record['net_srate']) && $record['net_srate'] !== '' ? (float) $record['net_srate'] : null;
        $netPurrate = isset($record['net_purrate']) && $record['net_purrate'] !== '' ? (float) $record['net_purrate'] : null;
        $secondaryMrp = isset($record['secondary_mrp']) && $record['secondary_mrp'] !== '' ? (float) $record['secondary_mrp'] : null;
        $secondaryNetSrate = isset($record['secondary_net_srate']) && $record['secondary_net_srate'] !== '' ? (float) $record['secondary_net_srate'] : null;
        $secondaryNetPurrate = isset($record['secondary_net_purrate']) && $record['secondary_net_purrate'] !== '' ? (float) $record['secondary_net_purrate'] : null;

        // A blank cell means "leave unchanged" on an update, never "reset to
        // zero" — so every optional numeric field is null (not 0) here when
        // blank; the commit loop fills nulls with 0 only for brand-new items
        // (where the column has no existing value to preserve).
        $purchasePrice = isset($record['purchase_price']) && $record['purchase_price'] !== '' ? (float) $record['purchase_price'] : $netPurrate;
        $costPrice = isset($record['cost_price']) && $record['cost_price'] !== '' ? (float) $record['cost_price'] : null;
        $wholesalePrice = isset($record['wholesale_price']) && $record['wholesale_price'] !== '' ? (float) $record['wholesale_price'] : null;
        $retailPrice = isset($record['retail_price']) && $record['retail_price'] !== '' ? (float) $record['retail_price'] : $netSrate;
        $mrp = isset($record['mrp']) && $record['mrp'] !== '' ? (float) $record['mrp'] : null;
        $minStockThreshold = isset($record['min_stock_threshold']) && $record['min_stock_threshold'] !== '' ? (float) $record['min_stock_threshold'] : null;

        $mapped = [
            'item_name' => $itemName,
            'category_id' => $categoryId,
            'brand_id' => $brandId,
            'supplier_id' => $supplierId,
            'hsn_code' => $record['hsn_code'] ?? null,
            'barcode' => $barcode ?: null,
            'base_unit_id' => $baseUnitId,
            'secondary_unit_id' => $secondaryUnitId,
            // Legacy fields kept in sync with NET_SRATE/NET_PURRATE (never
            // the reverse) so anything still reading purchase_price/
            // retail_price directly stays meaningful, not stale.
            'purchase_price' => $purchasePrice,
            'cost_price' => $costPrice,
            'wholesale_price' => $wholesalePrice,
            'retail_price' => $retailPrice,
            'mrp' => $mrp,
            'net_srate' => $netSrate,
            'net_purrate' => $netPurrate,
            'secondary_mrp' => $secondaryMrp,
            'secondary_net_srate' => $secondaryNetSrate,
            'secondary_net_purrate' => $secondaryNetPurrate,
            'min_stock_threshold' => $minStockThreshold,
            'tax_code_id' => $taxCodeId,
            'is_active' => isset($record['is_active']) && in_array(strtolower((string) $record['is_active']), ['0', 'no', 'false'], true) ? 0 : 1,
        ];

        return [['item' => $mapped, 'branch_ids' => $branchIds ?: null, 'existing_item_id' => $existingItemId], $errors];
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

    /**
     * Matching key for Brand/Category names during import: case-insensitive,
     * trimmed, and repeated internal whitespace collapsed to one space —
     * just enough to treat "coco_cola" / "COCO_COLA " / "Coco_Cola" as the
     * same logical name without merging names that are genuinely different.
     * Never used to rewrite what's actually stored — only to decide reuse
     * vs. create.
     */
    private function normalizeMasterName(string $name): string
    {
        return strtolower(preg_replace('/\s+/', ' ', trim($name)));
    }

    /**
     * Resolves a Brand/Category name against the already-loaded lookup map;
     * if there's no match, stages it in $pending (normalized => first-seen
     * display spelling) instead of failing the row. Returns either the
     * existing numeric id, a "NEW:<normalized>" sentinel to be resolved to a
     * real id once the import actually commits (see materializePendingMasters),
     * or null for a blank cell. Multiple rows in the same file with
     * case/space variants of one new name all resolve to the same sentinel,
     * so exactly one master record gets created for them.
     */
    private function resolveOrStageMaster(array &$lookup, array &$pending, mixed $rawValue): int|string|null
    {
        if ($rawValue === null || trim((string) $rawValue) === '') {
            return null;
        }
        $display = trim((string) $rawValue);
        $normalized = $this->normalizeMasterName($display);
        if (isset($lookup[$normalized])) {
            return $lookup[$normalized];
        }
        if (!isset($pending[$normalized])) {
            $pending[$normalized] = $display; // first spelling seen wins
        }
        return "NEW:{$normalized}";
    }

    /** Creates the brand/category rows staged in $pending (once each), returning normalized-name => new id. */
    private function materializePendingMasters(string $table, array $pending): array
    {
        $createdIds = [];
        foreach ($pending as $normalized => $displayName) {
            // Re-check right before inserting to narrow (the current schema
            // has no unique index on `name` for either table, so this isn't
            // a full guarantee) the window for a concurrent import creating
            // the same master between buildLookups() and this commit step.
            $stmt = $this->pdo->prepare("SELECT id FROM {$table} WHERE LOWER(TRIM(name)) = :n LIMIT 1");
            $stmt->execute(['n' => $normalized]);
            $existing = $stmt->fetchColumn();
            if ($existing) {
                $createdIds[$normalized] = (int) $existing;
                continue;
            }
            $stmt = $this->pdo->prepare("INSERT INTO {$table} (name) VALUES (:name)");
            $stmt->execute(['name' => $displayName]);
            $createdIds[$normalized] = (int) $this->pdo->lastInsertId();
        }
        return $createdIds;
    }

    /** Swaps a resolveOrStageMaster() result for its real id once pending masters have been created. */
    private function resolvePendingMasterId(int|string|null $value, array $createdIds): ?int
    {
        if ($value === null) {
            return null;
        }
        if (is_int($value)) {
            return $value;
        }
        return $createdIds[substr($value, 4)] ?? null;
    }

    /** GET /api/items/import/template — a blank starter workbook with headers. */
    public function importTemplate(): void
    {
        JwtAuthMiddleware::authenticate();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Items');
        $sheet->fromArray(array_values(self::EXCEL_COLUMNS), null, 'A1');
        // Three rows on purpose, not one: brand/category are given as
        // coco_cola / COCO_COLA / Coco_Cola and Soft Drinks / SOFT DRINKS —
        // case/space variants of names that don't exist yet, so importing
        // this template is itself a live demonstration (and test) of the
        // Brand/Category auto-create + dedup-by-normalized-name behavior —
        // all three rows must end up sharing one Brand id and one Category id.
        $sheet->fromArray(
            ['', 'Coca Cola 250ml', 'Soft Drinks', 'coco_cola', '', 'ABC Distributors', '22021010', '8901111111111',
             'PCS', '15', '13', '11', '', '', '', '', '18',
             '1', 'Main Branch', '11', '9', '13', '10', 'GST18', '1'],
            null,
            'A2'
        );
        $sheet->fromArray(
            ['', 'Coca Cola 500ml', 'SOFT DRINKS', 'COCO_COLA', '', 'ABC Distributors', '22021010', '8901111111112',
             'PCS', '25', '22', '19', '', '', '', '', '18',
             '1', 'Main Branch', '19', '16', '22', '10', 'GST18', '1'],
            null,
            'A3'
        );
        $sheet->fromArray(
            ['', 'Coca Cola 1L', 'Soft Drinks', 'Coco_Cola', '', 'ABC Distributors', '22021010', '8901111111113',
             'PCS', '45', '40', '35', '', '', '', '', '18',
             '1', 'Main Branch', '35', '30', '40', '10', 'GST18', '1'],
            null,
            'A4'
        );

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="items_import_template.xlsx"');
        header('Cache-Control: max-age=0');

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save('php://output');
        exit;
    }

    // -------------------------------------------------------------
    // Retail / Wholesale price management (Phase 14) — a bulk-editable
    // grid over ALL active items, one column at a time (retail_selling_price
    // or wholesale_selling_price). Deliberately separate from item
    // create/edit: this is priced-list maintenance, not item-master editing.
    // -------------------------------------------------------------

    /** GET /api/items/pricing?type=retail|wholesale&search= */
    public function pricingList(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'catalog.manage_items');

        $type = $_GET['type'] ?? '';
        if (!in_array($type, ['retail', 'wholesale'], true)) {
            Response::error('type must be retail or wholesale', 422);
        }
        $priceColumn = $type === 'retail' ? 'retail_selling_price' : 'wholesale_selling_price';
        $search = trim((string) ($_GET['search'] ?? ''));

        $sql = "SELECT i.id, i.item_code, i.item_name, i.barcode, i.mrp, i.net_srate, i.retail_price,
                       i.{$priceColumn} AS price, bu.short_code AS unit_code
                FROM items i
                LEFT JOIN stock_units bu ON bu.id = i.base_unit_id
                WHERE i.is_active = 1";
        $params = [];
        if ($search !== '') {
            $sql .= ' AND (i.item_name LIKE :search_name OR i.item_code LIKE :search_code OR i.barcode LIKE :search_barcode)';
            $params['search_name'] = "%{$search}%";
            $params['search_code'] = "%{$search}%";
            $params['search_barcode'] = "%{$search}%";
        }
        $sql .= ' ORDER BY i.item_name';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // "Normal NET_SRATE" column mirrors ItemModel::resolveUnitPricing's
        // own fallback (legacy retail_price) so this screen shows the same
        // number Normal-mode billing would actually charge.
        foreach ($rows as &$row) {
            $row['net_srate'] = $row['net_srate'] ?? $row['retail_price'];
            unset($row['retail_price']);
        }
        unset($row);

        Response::json($rows);
    }

    /** PUT /api/items/pricing — bulk save: { pricing_type, items: [{item_id, price}] } */
    public function pricingBulkUpdate(): void
    {
        $claims = JwtAuthMiddleware::authenticate();
        PermissionMiddleware::require($claims, 'catalog.manage_items');

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $type = $body['pricing_type'] ?? '';
        if (!in_array($type, ['retail', 'wholesale'], true)) {
            Response::error('pricing_type must be retail or wholesale', 422);
        }
        $priceColumn = $type === 'retail' ? 'retail_selling_price' : 'wholesale_selling_price';

        $items = $body['items'] ?? [];
        if (!is_array($items) || empty($items)) {
            Response::error('items is required', 422);
        }

        $updates = [];
        $errors = [];
        foreach ($items as $i => $row) {
            $itemId = (int) ($row['item_id'] ?? 0);
            $price = $row['price'] ?? null;
            if ($itemId <= 0) {
                $errors[] = "row " . ($i + 1) . ": item_id is required";
                continue;
            }
            if ($price === null || $price === '') {
                $errors[] = "row " . ($i + 1) . ": price is required";
                continue;
            }
            if (!is_numeric($price) || (float) $price < 0) {
                $errors[] = "row " . ($i + 1) . ": price must be a non-negative number";
                continue;
            }
            $updates[] = ['item_id' => $itemId, 'price' => round((float) $price, 2)];
        }

        if (!empty($errors)) {
            Response::error(implode('; ', $errors), 422);
        }

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("UPDATE items SET {$priceColumn} = :price WHERE id = :id");
            foreach ($updates as $u) {
                $stmt->execute(['price' => $u['price'], 'id' => $u['item_id']]);
            }
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        Response::json(['updated' => count($updates)]);
    }
}
