-- =====================================================================
-- POS / Distributor Billing System — Phase 5 Schema (Post-sale)
-- Run AFTER schema.sql..schema_phase4.sql. MariaDB/MySQL-safe.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Sales returns (section 4.9) — with or without the original invoice.
-- An untraceable (no invoice_id) return needs admin approval before it
-- touches stock/credit; status default depends on who created it
-- (see SalesReturnModel).
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sales_returns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_no VARCHAR(30) NULL,
  invoice_id INT UNSIGNED NULL,
  customer_id INT UNSIGNED NULL,
  branch_id INT UNSIGNED NOT NULL,
  reason VARCHAR(255) NULL,
  refund_action ENUM('credit_note','cash_refund') NOT NULL DEFAULT 'credit_note',
  requires_admin_approval TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('pending_approval','approved','rejected') NOT NULL DEFAULT 'approved',
  approved_by INT UNSIGNED NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sales_returns_no (return_no),
  CONSTRAINT fk_sr_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  CONSTRAINT fk_sr_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_sr_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_sr_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sr_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_return_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_return_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_srit_return FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
  CONSTRAINT fk_srit_item FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Purchase returns (section 4.9) — supplier-side mirror.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS purchase_returns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_no VARCHAR(30) NULL,
  purchase_id INT UNSIGNED NULL,
  supplier_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  reason VARCHAR(255) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_purchase_returns_no (return_no),
  CONSTRAINT fk_pret_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
  CONSTRAINT fk_pret_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_pret_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_pret_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_return_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_preti_return FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
  CONSTRAINT fk_preti_item FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Customer collections — FIFO oldest-bill auto-deduction (section 4.15).
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customer_collections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_no VARCHAR(30) NULL,
  customer_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('cash','upi','card','other') NOT NULL,
  collected_by INT UNSIGNED NOT NULL,
  route_id INT UNSIGNED NULL,
  collected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customer_collections_no (receipt_no),
  CONSTRAINT fk_cc_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cc_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_cc_collected_by FOREIGN KEY (collected_by) REFERENCES users(id),
  CONSTRAINT fk_cc_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS collection_allocations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  collection_id INT UNSIGNED NOT NULL,
  invoice_id INT UNSIGNED NOT NULL,
  allocated_amount DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_ca_collection FOREIGN KEY (collection_id) REFERENCES customer_collections(id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Cash handover & reconciliation (section 4.16).
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cash_handovers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  handover_no VARCHAR(30) NULL,
  employee_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  handover_date DATE NOT NULL,
  system_cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  system_digital_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  submitted_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  verified_amount DECIMAL(12,2) NULL,
  discrepancy DECIMAL(12,2) GENERATED ALWAYS AS (verified_amount - submitted_amount) STORED,
  status ENUM('pending','verified','discrepancy_flagged') NOT NULL DEFAULT 'pending',
  verified_by INT UNSIGNED NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cash_handovers_no (handover_no),
  CONSTRAINT fk_ch_employee FOREIGN KEY (employee_id) REFERENCES users(id),
  CONSTRAINT fk_ch_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_ch_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cash_handover_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  handover_id INT UNSIGNED NOT NULL,
  collection_id INT UNSIGNED NOT NULL,
  CONSTRAINT fk_chi_handover FOREIGN KEY (handover_id) REFERENCES cash_handovers(id) ON DELETE CASCADE,
  CONSTRAINT fk_chi_collection FOREIGN KEY (collection_id) REFERENCES customer_collections(id),
  UNIQUE KEY uq_chi_collection (collection_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Expenses & other income (section 4.17) — branch-wise.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS expense_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_expense_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_no VARCHAR(30) NULL,
  branch_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_mode ENUM('cash','upi','card','bank_transfer') NOT NULL DEFAULT 'cash',
  description VARCHAR(255) NULL,
  expense_date DATE NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_expenses_no (expense_no),
  CONSTRAINT fk_exp_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_exp_category FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_exp_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS other_income (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_no VARCHAR(30) NULL,
  branch_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_mode ENUM('cash','upi','card','bank_transfer') NOT NULL DEFAULT 'cash',
  description VARCHAR(255) NOT NULL,
  income_date DATE NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_other_income_no (receipt_no),
  CONSTRAINT fk_oi_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_oi_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
