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

-- ---------------------------------------------------------------------
-- Bug fix found after adding multi-branch support: invoice_no was
-- globally UNIQUE, but each branch has its own independent INV-/EST-
-- sequence starting at 000001 (section 4.19) — so a second branch's
-- first invoice ("INV-2026-000001") collided with the first branch's.
-- invoice_no must be unique per branch, not globally; the branch's own
-- letterhead/GSTIN on the printed invoice is what actually disambiguates
-- two branches sharing the same number. schema_phase3.sql now creates
-- the composite constraint directly for a fresh install — this ALTER is
-- only for a database that already ran the old schema_phase3.sql.
-- ---------------------------------------------------------------------

ALTER TABLE invoices DROP INDEX uq_invoices_invoice_no;
ALTER TABLE invoices ADD UNIQUE KEY uq_invoices_branch_invoice_no (branch_id, invoice_no);
