-- =====================================================================
-- POS / Distributor Billing System — Phase 2 Seed Data
-- Run AFTER schema_phase2.sql.
-- =====================================================================

SET NAMES utf8mb4;

-- Standard Indian GST slabs
INSERT INTO tax_codes (code, name, gst_percent, cgst_percent, sgst_percent, igst_percent, cess_percent) VALUES
('GST0', 'GST 0%', 0, 0, 0, 0, NULL),
('GST5', 'GST 5%', 5, 2.5, 2.5, 5, NULL),
('GST12', 'GST 12%', 12, 6, 6, 12, NULL),
('GST18', 'GST 18%', 18, 9, 9, 18, NULL),
('GST28', 'GST 28%', 28, 14, 14, 28, NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Common stock units
INSERT INTO stock_units (name, short_code, is_decimal) VALUES
('Pieces', 'PCS', 0),
('Kilogram', 'KG', 1),
('Litre', 'LTR', 1),
('Box', 'BOX', 0),
('Carton', 'CTN', 0)
ON DUPLICATE KEY UPDATE name = VALUES(name);
