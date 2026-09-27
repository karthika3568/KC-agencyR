-- =====================================================================
-- Phase 15 — Return refund amounts + original-line linkage.
--
-- Sales/purchase returns previously had no way to record what was
-- actually refunded/paid back — refund_action was a label with no money
-- behind it (cash_refund did nothing at all; credit_note posted the full
-- line-item total, never a partial amount). This adds:
--   - return_total / refund_amount / balance_amount (generated) on both
--     header tables, mirroring invoices.grand_total/paid_amount/balance_due.
--   - a nullable FK from each return line back to the original
--     invoice_items / purchase_items row it was returned against, so
--     "how much of this line has already been returned" can be computed
--     with SUM(...) instead of a separately-maintained counter (same
--     derive-don't-duplicate approach as stock_ledger vs stock_movements).
--     NULL for untraceable sales returns (no invoice_id at all).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE sales_returns
  ADD COLUMN return_total DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER refund_action,
  ADD COLUMN refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER return_total,
  ADD COLUMN balance_amount DECIMAL(12,2) GENERATED ALWAYS AS (return_total - refund_amount) STORED AFTER refund_amount;

ALTER TABLE sales_return_items
  ADD COLUMN invoice_item_id INT UNSIGNED NULL AFTER item_id,
  ADD CONSTRAINT fk_srit_invoice_item FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id) ON DELETE SET NULL;

ALTER TABLE purchase_returns
  ADD COLUMN return_total DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER reason,
  ADD COLUMN refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER return_total,
  ADD COLUMN balance_amount DECIMAL(12,2) GENERATED ALWAYS AS (return_total - refund_amount) STORED AFTER refund_amount;

ALTER TABLE purchase_return_items
  ADD COLUMN purchase_item_id INT UNSIGNED NULL AFTER item_id,
  ADD CONSTRAINT fk_prit_purchase_item FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON DELETE SET NULL;

-- A cash-refund return now posts a real expense (Section: Cash Refund
-- effect). expenses.category_id is nullable, so no seed category is
-- strictly required, but a dedicated one keeps Reports > Expense/Income
-- readable instead of lumping refunds into "Uncategorized".
INSERT INTO expense_categories (name)
  SELECT 'Sales Return Refund' WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = 'Sales Return Refund');

SET FOREIGN_KEY_CHECKS = 1;
