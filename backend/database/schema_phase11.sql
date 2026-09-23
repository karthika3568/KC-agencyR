-- =====================================================================
-- Phase 11 — Stock Purchase: per-line MRP/unit/discount + purchase edit.
--
-- Mirrors invoice_items' own convention (unit_id, mrp, discount_percent,
-- discount_amount) onto purchase_items instead of inventing a new one —
-- the two tables become structurally parallel, matching how sales and
-- purchases already share the same stock_ledger / StockLedgerService.
-- =====================================================================

ALTER TABLE purchase_items
  ADD COLUMN unit_id INT UNSIGNED NULL AFTER item_id,
  ADD COLUMN mrp DECIMAL(12,2) NULL AFTER rate,
  ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER mrp,
  ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_percent;

-- Backfill existing rows with the item's own base unit so unit_id can be
-- made NOT NULL going forward without losing any existing GRN data.
UPDATE purchase_items pi
  JOIN items i ON i.id = pi.item_id
  SET pi.unit_id = i.base_unit_id
  WHERE pi.unit_id IS NULL;

ALTER TABLE purchase_items
  MODIFY COLUMN unit_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_purchase_items_unit FOREIGN KEY (unit_id) REFERENCES stock_units(id);

-- Purchase edit — reverses the old stock/supplier-ledger effect and
-- reapplies the new one, mirroring InvoiceModel::editCompleted(). Kept as
-- its own permission (distinct from create/delete) for a clean audit trail.
INSERT INTO permissions (module, code, label, description) VALUES
('purchases', 'purchases.edit_grn', 'Edit a GRN', 'Change items/qty/rate/discount on an existing GRN, with stock and supplier balance corrected automatically')
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.id IN (1, 2) AND p.code = 'purchases.edit_grn'
ON DUPLICATE KEY UPDATE role_id = role_id;
