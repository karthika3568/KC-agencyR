-- Migration: 20261014_135000_remove_product_lines.sql
-- Description: Completely remove Product Line concept, tables, columns, and foreign keys.

-- 1. Drop foreign key constraint on items table
ALTER TABLE items DROP FOREIGN KEY fk_items_product_line;

-- 2. Drop product_line_id column from items table
ALTER TABLE items DROP COLUMN product_line_id;

-- 3. Drop product_lines table (also removes fk_product_lines_branch and uq_product_lines_code)
DROP TABLE IF EXISTS product_lines;
