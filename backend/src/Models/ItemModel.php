<?php

declare(strict_types=1);

namespace App\Models;

use App\Helpers\CodeGenerator;
use PDO;

class ItemModel
{
    /** Columns a caller may write directly on the items row. */
    private const WRITABLE_COLUMNS = [
        'item_name', 'category_id', 'brand_id', 'product_line_id', 'hsn_code', 'barcode',
        'base_unit_id', 'secondary_unit_id', 'conversion_factor', 'purchase_price', 'cost_price',
        'wholesale_price', 'retail_price', 'mrp', 'min_stock_threshold', 'tax_code_id', 'image', 'is_active',
    ];

    public function __construct(private PDO $pdo)
    {
    }

    private const LIST_SELECT = "
        SELECT i.*, c.name AS category_name, b.name AS brand_name, pl.name AS product_line_name,
               bu.short_code AS base_unit_code, su.short_code AS secondary_unit_code,
               tc.code AS tax_code, tc.gst_percent
        FROM items i
        LEFT JOIN categories c ON c.id = i.category_id
        LEFT JOIN brands b ON b.id = i.brand_id
        LEFT JOIN product_lines pl ON pl.id = i.product_line_id
        LEFT JOIN stock_units bu ON bu.id = i.base_unit_id
        LEFT JOIN stock_units su ON su.id = i.secondary_unit_id
        LEFT JOIN tax_codes tc ON tc.id = i.tax_code_id
    ";

    public function all(?string $search = null): array
    {
        $sql = self::LIST_SELECT;
        $params = [];

        if ($search !== null && $search !== '') {
            $sql .= ' WHERE i.item_name LIKE :search OR i.item_code LIKE :search OR i.barcode LIKE :search';
            $params['search'] = "%$search%";
        }

        $sql .= ' ORDER BY i.item_name';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(self::LIST_SELECT . ' WHERE i.id = :id');
        $stmt->execute(['id' => $id]);
        $item = $stmt->fetch();

        if (!$item) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT iuc.*, su.short_code, su.name AS unit_name
             FROM item_unit_conversions iuc
             JOIN stock_units su ON su.id = iuc.unit_id
             WHERE iuc.item_id = :item_id'
        );
        $stmt->execute(['item_id' => $id]);
        $item['unit_conversions'] = $stmt->fetchAll();

        return $item;
    }

    public function findByCode(string $itemCode): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM items WHERE item_code = :code LIMIT 1');
        $stmt->execute(['code' => $itemCode]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Creates an item + its optional unit conversions in one transaction,
     * then assigns item_code from the new row's own id (ITM00001 style).
     */
    public function create(array $data, array $unitConversions = []): int
    {
        $this->pdo->beginTransaction();
        try {
            $columns = array_intersect_key($data, array_flip(self::WRITABLE_COLUMNS));
            $cols = array_keys($columns);
            $placeholders = array_map(fn ($c) => ":$c", $cols);

            $stmt = $this->pdo->prepare(
                'INSERT INTO items (' . implode(',', $cols) . ')
                 VALUES (' . implode(',', $placeholders) . ')'
            );
            $stmt->execute($columns);
            $id = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('UPDATE items SET item_code = :code WHERE id = :id')
                ->execute(['code' => CodeGenerator::fromId('ITM', $id), 'id' => $id]);

            $this->saveUnitConversions($id, $unitConversions);

            $this->pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function update(int $id, array $data, ?array $unitConversions = null): void
    {
        $this->pdo->beginTransaction();
        try {
            $columns = array_intersect_key($data, array_flip(self::WRITABLE_COLUMNS));
            if (!empty($columns)) {
                $set = implode(',', array_map(fn ($c) => "$c = :$c", array_keys($columns)));
                $stmt = $this->pdo->prepare("UPDATE items SET {$set} WHERE id = :id");
                $stmt->execute([...$columns, 'id' => $id]);
            }

            if ($unitConversions !== null) {
                $this->pdo->prepare('DELETE FROM item_unit_conversions WHERE item_id = :item_id')
                    ->execute(['item_id' => $id]);
                $this->saveUnitConversions($id, $unitConversions);
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function delete(int $id): void
    {
        $this->pdo->prepare('DELETE FROM items WHERE id = :id')->execute(['id' => $id]);
    }

    private function saveUnitConversions(int $itemId, array $unitConversions): void
    {
        if (empty($unitConversions)) {
            return;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO item_unit_conversions (item_id, unit_id, conversion_to_base, is_purchase_unit, is_sale_unit)
             VALUES (:item_id, :unit_id, :conversion_to_base, :is_purchase_unit, :is_sale_unit)'
        );

        foreach ($unitConversions as $uc) {
            if (empty($uc['unit_id']) || !isset($uc['conversion_to_base'])) {
                continue;
            }
            $stmt->execute([
                'item_id' => $itemId,
                'unit_id' => (int) $uc['unit_id'],
                'conversion_to_base' => (float) $uc['conversion_to_base'],
                'is_purchase_unit' => !empty($uc['is_purchase_unit']) ? 1 : 0,
                'is_sale_unit' => !empty($uc['is_sale_unit']) ? 1 : 0,
            ]);
        }
    }
}
