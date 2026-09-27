-- =====================================================================
-- Phase 9 — Invoice cancellation (Cancel + rebill only; no recalculating
-- edit of a completed invoice). Adds an audit trail on the invoice row
-- and the permission that gates it.
-- =====================================================================

ALTER TABLE invoices
  ADD COLUMN cancelled_by INT UNSIGNED NULL AFTER status,
  ADD COLUMN cancelled_at TIMESTAMP NULL AFTER cancelled_by,
  ADD COLUMN cancel_reason VARCHAR(255) NULL AFTER cancelled_at,
  ADD CONSTRAINT fk_invoices_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id);

INSERT INTO permissions (module, code, label, description) VALUES
('pos', 'pos.cancel_completed_invoice', 'Cancel a completed invoice', 'Void a completed bill, reversing its stock and credit effects')
ON DUPLICATE KEY UPDATE label = VALUES(label), module = VALUES(module), description = VALUES(description);

-- Grant to Super Admin (1) and Admin (2) by default, same as every other
-- permission those two roles hold in seed.sql.
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.id IN (1, 2) AND p.code = 'pos.cancel_completed_invoice'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- =====================================================================
-- Phase 9b — Invoice edit (in-place edit of a COMPLETED invoice). Reverses
-- the old stock effect, applies the new one, and adjusts only the delta on
-- the customer's credit ledger; invoice_payments and invoice_no are never
-- touched. Adds an audit trail mirroring cancelled_by/cancelled_at.
-- =====================================================================

ALTER TABLE invoices
  ADD COLUMN edited_by INT UNSIGNED NULL AFTER cancel_reason,
  ADD COLUMN edited_at TIMESTAMP NULL AFTER edited_by,
  ADD CONSTRAINT fk_invoices_edited_by FOREIGN KEY (edited_by) REFERENCES users(id);

INSERT INTO permissions (module, code, label, description) VALUES
('pos', 'pos.edit_completed_invoice', 'Edit a completed invoice', 'Change items/qty/rate/discount on a completed bill, with stock and credit corrected automatically')
ON DUPLICATE KEY UPDATE label = VALUES(label), module = VALUES(module), description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.id IN (1, 2) AND p.code = 'pos.edit_completed_invoice'
ON DUPLICATE KEY UPDATE role_id = role_id;
