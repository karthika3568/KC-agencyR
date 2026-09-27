-- =====================================================================
-- POS / Distributor Billing System — Phase 5 Seed Data
-- Run AFTER schema_phase5.sql.
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO expense_categories (name) VALUES
('Rent'), ('Electricity'), ('Staff Salary'), ('Transport / Fuel'),
('Packing Material'), ('Maintenance'), ('Miscellaneous')
ON DUPLICATE KEY UPDATE name = VALUES(name);
