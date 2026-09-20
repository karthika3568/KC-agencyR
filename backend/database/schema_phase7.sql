-- =====================================================================
-- POS / Distributor Billing System — Phase 7 Schema (Polish)
-- Run AFTER schema.sql..schema_phase6.sql. MariaDB/MySQL-safe.
--
-- Found via load-testing 5,000 seeded invoices (see
-- backend/database/seed_load_test.php): the reports/item-wise-sales and
-- reports/gst-register queries filter invoices by branch_id + status +
-- invoice_date together, but only had an index on (branch_id, status) —
-- the date range fell back to a table scan across every one of that
-- branch's completed invoices before filtering by date. This composite
-- index lets the optimizer satisfy the whole WHERE clause from the index.
-- =====================================================================

ALTER TABLE invoices ADD INDEX idx_invoices_branch_status_date (branch_id, status, invoice_date);
