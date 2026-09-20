-- =====================================================================
-- POS / Distributor Billing System — Phase 6 Schema (Reports & Admin)
-- Run AFTER schema.sql..schema_phase5.sql. MariaDB/MySQL-safe.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Per-branch print/settings (section 4.19) — thermal/A4 printer profile,
-- bank/UPI details for the invoice footer, terms & conditions.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS branch_print_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  printer_type ENUM('thermal_58','thermal_80','a4') NOT NULL DEFAULT 'a4',
  invoice_footer_note VARCHAR(255) NULL,
  default_print_copies TINYINT UNSIGNED NOT NULL DEFAULT 1,
  bank_account_no VARCHAR(30) NULL,
  bank_name VARCHAR(100) NULL,
  upi_id VARCHAR(100) NULL,
  terms_and_conditions TEXT NULL,
  show_upi_qr_on_thermal TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_branch_print_settings_branch (branch_id),
  CONSTRAINT fk_bps_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
