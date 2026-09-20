-- =====================================================================
-- POS / Distributor Billing System — Phase 4 Schema (Purchasing & Inventory Ops)
-- Run AFTER schema.sql..seed_phase3.sql. MariaDB/MySQL-safe.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Purchase requests / indents (section 4.5)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS purchase_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_no VARCHAR(30) NULL,
  supplier_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  status ENUM('open','partially_received','converted_to_grn','cancelled') NOT NULL DEFAULT 'open',
  notes VARCHAR(255) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_purchase_requests_no (request_no),
  CONSTRAINT fk_pr_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_pr_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_pr_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_request_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_request_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_pri_request FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_pri_item FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- GRN / purchases (section 4.5 + 4.13 refinement)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS purchases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grn_no VARCHAR(30) NULL,
  purchase_request_id INT UNSIGNED NULL,
  supplier_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  supplier_invoice_no VARCHAR(50) NULL,
  purchase_date DATE NOT NULL,
  payment_mode ENUM('cash','credit','bank_transfer','upi') NOT NULL DEFAULT 'credit',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(12,2) GENERATED ALWAYS AS (grand_total - paid_amount) STORED,
  status ENUM('active','cancelled') NOT NULL DEFAULT 'active',
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_purchases_grn_no (grn_no),
  CONSTRAINT fk_purchases_request FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_purchases_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_purchases_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  free_qty DECIMAL(12,3) NOT NULL DEFAULT 0,
  rate DECIMAL(12,2) NOT NULL,
  tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_purchase_items_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_items_item FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Supplier ledger + payments (section 4.14) — append-only, mirrors
-- credit_transactions on the customer side.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS supplier_ledger_transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT UNSIGNED NOT NULL,
  transaction_type ENUM('purchase_credit','payment_made','debit_note_adjustment') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  purchase_id INT UNSIGNED NULL,
  payment_id INT UNSIGNED NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  notes VARCHAR(255) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_slt_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_slt_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
  KEY idx_slt_supplier (supplier_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_code VARCHAR(30) NULL,
  supplier_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_mode ENUM('cash','bank_transfer','upi','cheque') NOT NULL,
  reference_no VARCHAR(50) NULL,
  notes VARCHAR(255) NULL,
  paid_by INT UNSIGNED NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supplier_payments_code (payment_code),
  CONSTRAINT fk_sp_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_sp_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_sp_user FOREIGN KEY (paid_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_payment_id INT UNSIGNED NOT NULL,
  purchase_id INT UNSIGNED NOT NULL,
  allocated_amount DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_spa_payment FOREIGN KEY (supplier_payment_id) REFERENCES supplier_payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_spa_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Stock adjustments (section 4.4)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id INT UNSIGNED NOT NULL,
  owner_type ENUM('warehouse','branch','employee') NOT NULL,
  owner_id INT UNSIGNED NOT NULL,
  adjustment_type ENUM('addition','deduction') NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  reason ENUM('damage','spoilage','count_correction','other') NOT NULL,
  remarks VARCHAR(255) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_adj_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_stock_adj_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Van / salesman stock (section 4.7)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_issue_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_no VARCHAR(30) NULL,
  branch_id INT UNSIGNED NOT NULL,
  employee_id INT UNSIGNED NOT NULL,
  route_id INT UNSIGNED NULL,
  issued_by INT UNSIGNED NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255) NULL,
  UNIQUE KEY uq_stock_issue_no (issue_no),
  CONSTRAINT fk_sin_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_sin_employee FOREIGN KEY (employee_id) REFERENCES users(id),
  CONSTRAINT fk_sin_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
  CONSTRAINT fk_sin_issued_by FOREIGN KEY (issued_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_issue_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  CONSTRAINT fk_sii_issue FOREIGN KEY (issue_id) REFERENCES stock_issue_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_sii_item FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_return_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_no VARCHAR(30) NULL,
  issue_id INT UNSIGNED NULL,
  branch_id INT UNSIGNED NOT NULL,
  employee_id INT UNSIGNED NOT NULL,
  returned_by INT UNSIGNED NOT NULL,
  returned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255) NULL,
  UNIQUE KEY uq_stock_return_no (return_no),
  CONSTRAINT fk_srn_issue FOREIGN KEY (issue_id) REFERENCES stock_issue_notes(id) ON DELETE SET NULL,
  CONSTRAINT fk_srn_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_srn_employee FOREIGN KEY (employee_id) REFERENCES users(id),
  CONSTRAINT fk_srn_returned_by FOREIGN KEY (returned_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_return_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  CONSTRAINT fk_sri_return FOREIGN KEY (return_id) REFERENCES stock_return_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_sri_item FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
