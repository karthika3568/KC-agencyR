-- =====================================================================
-- POS / Distributor Billing System — Phase 3 Seed Data
-- Run AFTER schema_phase3.sql.
-- =====================================================================

SET NAMES utf8mb4;

-- One GST + one Non-GST sequence per existing branch, per section 4.19.
INSERT INTO invoice_sequences (branch_id, series, prefix, current_number)
SELECT id, 'gst', 'INV-', 0 FROM branches
ON DUPLICATE KEY UPDATE branch_id = branch_id;

INSERT INTO invoice_sequences (branch_id, series, prefix, current_number)
SELECT id, 'non_gst', 'EST-', 0 FROM branches
ON DUPLICATE KEY UPDATE branch_id = branch_id;
