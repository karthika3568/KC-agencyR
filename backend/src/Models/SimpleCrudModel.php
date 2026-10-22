<?php

declare(strict_types=1);

namespace App\Models;

use PDO;

/**
 * Generic CRUD for simple lookup-style tables (categories, brands,
 * tax_codes, stock_units, suppliers, ...). $columns whitelists which
 * fields a caller may write — never accept arbitrary column names from input.
 */
class SimpleCrudModel
{
    public function __construct(
        private PDO $pdo,
        private string $table,
        private array $columns,
        private string $orderBy = 'id'
    ) {
    }

    public function all(array $where = []): array
    {
        [$clause, $params] = $this->buildWhere($where);
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} {$clause} ORDER BY {$this->orderBy}");
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function paginate(
        array $where = [],
        int $page = 1,
        int $limit = 10,
        ?string $search = null,
        array $searchCols = [],
        ?string $status = null
    ): array {
        [$clause, $params] = $this->buildWhere($where);
        $clauses = $clause !== '' ? [$clause] : [];

        if ($status !== null && $status !== '' && $status !== 'all') {
            if ($status === 'active') {
                if (in_array('status', $this->columns, true) && in_array('is_active', $this->columns, true)) {
                    $clauses[] = "(status = 'active' OR is_active = 1)";
                } elseif (in_array('status', $this->columns, true)) {
                    $clauses[] = "status = 'active'";
                } elseif (in_array('is_active', $this->columns, true)) {
                    $clauses[] = "is_active = 1";
                }
            } elseif ($status === 'inactive') {
                if (in_array('status', $this->columns, true) && in_array('is_active', $this->columns, true)) {
                    $clauses[] = "(status = 'inactive' OR is_active = 0)";
                } elseif (in_array('status', $this->columns, true)) {
                    $clauses[] = "status = 'inactive'";
                } elseif (in_array('is_active', $this->columns, true)) {
                    $clauses[] = "is_active = 0";
                }
            }
        }

        if ($search !== null && trim($search) !== '' && !empty($searchCols)) {
            $searchParts = [];
            $q = '%' . trim($search) . '%';
            foreach ($searchCols as $idx => $sc) {
                $pName = "s_col_{$idx}";
                $searchParts[] = "{$sc} LIKE :{$pName}";
                $params[$pName] = $q;
            }
            $clauses[] = '(' . implode(' OR ', $searchParts) . ')';
        }

        $whereSql = '';
        if (!empty($clauses)) {
            $cleanClauses = array_map(function ($c) {
                return str_starts_with($c, 'WHERE ') ? substr($c, 6) : $c;
            }, $clauses);
            $whereSql = 'WHERE ' . implode(' AND ', $cleanClauses);
        }

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM {$this->table} {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $limit = max(1, $limit);
        $totalPages = max(1, (int) ceil($total / $limit));
        $page = min(max(1, $page), $totalPages);
        $offset = ($page - 1) * $limit;

        $dataStmt = $this->pdo->prepare("SELECT * FROM {$this->table} {$whereSql} ORDER BY {$this->orderBy} LIMIT :limit OFFSET :offset");
        foreach ($params as $k => $v) {
            $dataStmt->bindValue(":$k", $v);
        }
        $dataStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $dataStmt->execute();
        $rows = $dataStmt->fetchAll();

        return [
            'data' => $rows,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => $totalPages,
        ];
    }


    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $data = array_intersect_key($data, array_flip($this->columns));
        $cols = array_keys($data);
        $placeholders = array_map(fn ($c) => ":$c", $cols);

        $stmt = $this->pdo->prepare(
            "INSERT INTO {$this->table} (" . implode(',', $cols) . ")
             VALUES (" . implode(',', $placeholders) . ")"
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $data = array_intersect_key($data, array_flip($this->columns));
        if (empty($data)) {
            return;
        }
        $set = implode(',', array_map(fn ($c) => "$c = :$c", array_keys($data)));

        $stmt = $this->pdo->prepare("UPDATE {$this->table} SET {$set} WHERE id = :id");
        $stmt->execute([...$data, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE id = :id");
        $stmt->execute(['id' => $id]);
    }

    private function buildWhere(array $where): array
    {
        if (empty($where)) {
            return ['', []];
        }
        $clauses = [];
        $params = [];
        foreach ($where as $col => $value) {
            $clauses[] = "$col = :$col";
            $params[$col] = $value;
        }
        return ['WHERE ' . implode(' AND ', $clauses), $params];
    }
}
