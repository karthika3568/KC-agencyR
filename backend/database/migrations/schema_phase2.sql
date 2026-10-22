-- =====================================================================
-- POS / Distributor Billing System — Phase 2 Schema (Catalog & Parties)
-- Run AFTER schema.sql + seed.sql (Phase 1). MariaDB/MySQL-safe.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Catalog — shared/global across all branches (section 3.2 of spec)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS brands (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_brands_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_lines (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NULL,
  code VARCHAR(20) NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_lines_code (code),
  CONSTRAINT fk_product_lines_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tax_codes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  cgst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  sgst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  igst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  cess_percent DECIMAL(5,2) NULL,
  UNIQUE KEY uq_tax_codes_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_units (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  short_code VARCHAR(10) NOT NULL,
  is_decimal TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_stock_units_short_code (short_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_code VARCHAR(20) NULL,
  item_name VARCHAR(150) NOT NULL,
  category_id INT UNSIGNED NULL,
  brand_id INT UNSIGNED NULL,
  hsn_code VARCHAR(20) NULL,
  barcode VARCHAR(50) NULL,
  base_unit_id INT UNSIGNED NOT NULL,
  secondary_unit_id INT UNSIGNED NULL,
  conversion_factor DECIMAL(10,3) NULL,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  wholesale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  retail_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  mrp DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_stock_threshold DECIMAL(12,3) NOT NULL DEFAULT 0,
  tax_code_id INT UNSIGNED NULL,
  image VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_items_item_code (item_code),
  UNIQUE KEY uq_items_barcode (barcode),
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_items_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  CONSTRAINT fk_items_product_line FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE SET NULL,
  CONSTRAINT fk_items_base_unit FOREIGN KEY (base_unit_id) REFERENCES stock_units(id),
  CONSTRAINT fk_items_secondary_unit FOREIGN KEY (secondary_unit_id) REFERENCES stock_units(id) ON DELETE SET NULL,
  CONSTRAINT fk_items_tax_code FOREIGN KEY (tax_code_id) REFERENCES tax_codes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS item_unit_conversions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id INT UNSIGNED NOT NULL,
  unit_id INT UNSIGNED NOT NULL,
  conversion_to_base DECIMAL(10,3) NOT NULL,
  is_purchase_unit TINYINT(1) NOT NULL DEFAULT 0,
  is_sale_unit TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_item_unit (item_id, unit_id),
  CONSTRAINT fk_iuc_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT fk_iuc_unit FOREIGN KEY (unit_id) REFERENCES stock_units(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Party masters — branch-scoped (section 4.2 of spec)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS routes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_routes_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  route_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cities_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  city_id INT UNSIGNED NULL,
  route_id INT UNSIGNED NULL,
  ledger_name VARCHAR(150) NOT NULL,
  print_name VARCHAR(150) NULL,
  phone VARCHAR(20) NULL,
  gstin VARCHAR(20) NULL,
  address VARCHAR(255) NULL,
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_local_customer TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_customers_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
  CONSTRAINT fk_customers_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS suppliers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NULL,
  address VARCHAR(255) NULL,
  gstin VARCHAR(20) NULL,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_suppliers_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
