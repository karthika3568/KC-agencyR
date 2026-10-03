-- Migration: E-Invoice (IRN) + E-Way Bill status tracking on invoices, and
-- the GST configuration this needs.
--
-- irn/ack_no/ack_date already existed on `invoices` (scaffolded in an
-- earlier phase, never wired to anything) — reused here rather than
-- duplicated. Everything else is new: explicit status enums (so the UI can
-- show Not Generated/Generated/Failed/Cancelled instead of guessing from a
-- null IRN), the QR payload, per-feature error text for a failed attempt,
-- the raw provider response for audit, and E-Way Bill's own fields
-- (mirrors IRN/ack_no/ack_date's shape, since it's the same kind of
-- "external filing reference" data).
ALTER TABLE invoices
  ADD COLUMN einvoice_status ENUM('not_generated','generated','failed','cancelled') NOT NULL DEFAULT 'not_generated' AFTER ack_date,
  ADD COLUMN einvoice_qr_code TEXT NULL AFTER einvoice_status,
  ADD COLUMN einvoice_error VARCHAR(500) NULL AFTER einvoice_qr_code,
  ADD COLUMN einvoice_raw_response TEXT NULL AFTER einvoice_error,
  ADD COLUMN eway_bill_status ENUM('not_generated','generated','failed','cancelled') NOT NULL DEFAULT 'not_generated' AFTER einvoice_raw_response,
  ADD COLUMN eway_bill_no VARCHAR(20) NULL AFTER eway_bill_status,
  ADD COLUMN eway_bill_date TIMESTAMP NULL AFTER eway_bill_no,
  ADD COLUMN eway_bill_valid_until TIMESTAMP NULL AFTER eway_bill_date,
  ADD COLUMN eway_bill_error VARCHAR(500) NULL AFTER eway_bill_valid_until,
  ADD COLUMN eway_bill_raw_response TEXT NULL AFTER eway_bill_error,
  -- Transport details E-Way Bill generation needs — none of this existed
  -- on invoices before (vehicle_no did, from Phase 3, and is reused as-is).
  ADD COLUMN transporter_name VARCHAR(150) NULL AFTER eway_bill_raw_response,
  ADD COLUMN transporter_gstin VARCHAR(20) NULL AFTER transporter_name,
  ADD COLUMN transport_distance_km INT UNSIGNED NULL AFTER transporter_gstin;

INSERT INTO permissions (module, code, label, description) VALUES
('pos', 'pos.manage_gst_filing', 'Generate E-Invoice / E-Way Bill', 'Generate or cancel a completed invoice''s E-Invoice (IRN) and E-Way Bill filings')
ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.id IN (1, 2) AND p.code = 'pos.manage_gst_filing'
ON DUPLICATE KEY UPDATE role_id = role_id;
