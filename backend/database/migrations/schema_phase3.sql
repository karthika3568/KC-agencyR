-- =====================================================================
-- POS / Distributor Billing System — Phase 3 Schema (Core Billing)
-- Run AFTER schema.sql, seed.sql, schema_phase2.sql, seed_phase2.sql.
-- MariaDB/MySQL-safe.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Stock ledger — single source of truth for quantity on hand, plus the
-- full audit trail of every change (section 4.4 of spec).
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_ledger (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id INT UNSIGNED NOT NULL,
  owner_type ENUM('warehouse','branch','employee') NOT NULL,
  owner_id INT UNSIGNED NOT NULL,
  quantity_on_hand DECIMAL(14,3) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_stock_ledger_owner (item_id, owner_type, owner_id),
  CONSTRAINT fk_stock_ledger_item FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id INT UNSIGNED NOT NULL,
  owner_type ENUM('warehouse','branch','employee') NOT NULL,
  owner_id INT UNSIGNED NOT NULL,
  movement_type ENUM('purchase','sale','sale_return','purchase_return','adjustment',
                      'issue_to_salesman','salesman_return','opening_stock','damage') NOT NULL,
  qty_change DECIMAL(14,3) NOT NULL,
  qty_before DECIMAL(14,3) NOT NULL,
  qty_after DECIMAL(14,3) NOT NULL,
  reference_table VARCHAR(50) NULL,
  reference_id INT UNSIGNED NULL,
  reason VARCHAR(255) NULL,
  remarks VARCHAR(255) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_movements_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_stock_movements_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_stock_movements_item_owner (item_id, owner_type, owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Invoice numbering — atomic per-branch, per-series counter (section 4.19).
-- Locked with SELECT ... FOR UPDATE at completion time, never at hold time.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invoice_sequences (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  series ENUM('gst','non_gst') NOT NULL,
  prefix VARCHAR(10) NOT NULL,
  current_number INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_invoice_sequences (branch_id, series),
  CONSTRAINT fk_invoice_sequences_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Invoices — single table for both Hold Bill and completed sale
-- (amendment 4.8a). status='held' rows are invisible to every report
-- and never touch stock/credit; status flips to 'completed' atomically.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invoices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(30) NULL,
  branch_id INT UNSIGNED NOT NULL,
  customer_id INT UNSIGNED NULL,
  employee_id INT UNSIGNED NOT NULL,
  bill_type ENUM('gst','non_gst') NOT NULL,
  invoice_format ENUM('local','outstation') NOT NULL DEFAULT 'local',
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  taxable_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  cess_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  round_off DECIMAL(6,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(12,2) GENERATED ALWAYS AS (grand_total - paid_amount) STORED,
  payment_status ENUM('paid','partial','credit','cancelled','returned') NULL,
  status ENUM('held','completed','cancelled','returned') NOT NULL DEFAULT 'held',
  vehicle_no VARCHAR(20) NULL,
  customer_outstanding_after DECIMAL(12,2) NULL,
  irn VARCHAR(100) NULL,
  ack_no VARCHAR(50) NULL,
  ack_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- invoice_no is unique PER BRANCH, not globally: each branch has its own
  -- independent INV-/EST- sequence starting at 000001 (section 4.19), so
  -- "INV-2026-000001" legitimately exists once per branch, distinguished by
  -- that branch's own letterhead/GSTIN on the printed invoice.
  UNIQUE KEY uq_invoices_branch_invoice_no (branch_id, invoice_no),
  CONSTRAINT fk_invoices_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_employee FOREIGN KEY (employee_id) REFERENCES users(id),
  KEY idx_invoices_branch_status (branch_id, status),
  KEY idx_invoices_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  unit_id INT UNSIGNED NOT NULL,
  item_name_snapshot VARCHAR(150) NOT NULL,
  hsn_snapshot VARCHAR(20) NULL,
  qty DECIMAL(12,3) NOT NULL,
  free_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
  rate DECIMAL(12,2) NOT NULL,
  mrp DECIMAL(12,2) NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  cess_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_items_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_invoice_items_unit FOREIGN KEY (unit_id) REFERENCES stock_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT UNSIGNED NOT NULL,
  payment_method ENUM('cash','upi','card','credit','other') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference_no VARCHAR(50) NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoice_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Customer credit ledger — append-only (section 4.10). Current
-- outstanding is always the latest balance_after row for that customer,
-- never a mutated running-total column.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS credit_transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  transaction_type ENUM('sale_credit','payment_received','credit_reversal') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  invoice_id INT UNSIGNED NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  notes VARCHAR(255) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_credit_transactions_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_credit_transactions_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  KEY idx_credit_transactions_customer (customer_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
