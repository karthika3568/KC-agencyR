-- =====================================================================
-- AJ Agency POS — Phase 8 Schema (branch mapping, category-brand mapping,
-- item-supplier mapping). Run AFTER schema.sql..schema_phase7.sql.
-- MySQL 8 / MariaDB-safe.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Item <-> Branch mapping. Deliberate departure from the earlier
-- "items are fully global" decision (Phase 1/2), per explicit client
-- request: an item only sells at branches it's mapped to. An item with
-- zero mapped branches is available nowhere — the app must not silently
-- fall back to "everywhere" when this table is empty for an item.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS item_branches (
  item_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (item_id, branch_id),
  CONSTRAINT fk_item_branches_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_branches_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Category <-> Brand mapping — which brands are valid under a category,
-- used to filter the Brand dropdown when a Category is picked on the
-- item form (section 8 of the request).
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS category_brands (
  category_id INT UNSIGNED NOT NULL,
  brand_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (category_id, brand_id),
  CONSTRAINT fk_category_brands_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_category_brands_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Item -> Supplier mapping (master-data level, distinct from which
-- supplier a given GRN was actually bought from).
-- ---------------------------------------------------------------------

ALTER TABLE items ADD COLUMN supplier_id INT UNSIGNED NULL AFTER product_line_id;
ALTER TABLE items ADD CONSTRAINT fk_items_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Backward compatibility: every item that already existed before this
-- migration must stay sellable everywhere it already was — an item with
-- zero item_branches rows is available NOWHERE going forward, so without
-- this backfill every existing item would silently vanish from every
-- branch's POS screen the moment this migration runs.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO item_branches (item_id, branch_id)
  SELECT i.id, b.id FROM items i CROSS JOIN branches b;
