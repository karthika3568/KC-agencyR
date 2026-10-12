-- Migration: Soft-delete completed invoices and enable invoice number reuse
ALTER TABLE invoices
  MODIFY COLUMN status ENUM('held','completed','cancelled','returned','deleted') NOT NULL DEFAULT 'held',
  ADD COLUMN original_invoice_no VARCHAR(30) NULL AFTER invoice_no,
  ADD COLUMN deleted_by INT UNSIGNED NULL AFTER edited_at,
  ADD COLUMN deleted_at TIMESTAMP NULL AFTER deleted_by,
  ADD COLUMN delete_reason VARCHAR(255) NULL AFTER deleted_at,
  ADD CONSTRAINT fk_invoices_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

INSERT INTO permissions (module, code, label, description) VALUES
('pos', 'pos.delete_completed_invoice', 'Delete a completed invoice', 'Soft-delete a completed bill (reverses its stock/credit effects, same as cancel) and frees its invoice number for reuse — unlike cancel, the number is not permanently consumed')
ON DUPLICATE KEY UPDATE label = VALUES(label), module = VALUES(module), description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.id IN (1, 2) AND p.code = 'pos.delete_completed_invoice'
ON DUPLICATE KEY UPDATE role_id = role_id;
