-- =====================================================================
-- Phase 10 — Order Management: Customer Pre-Booking + Supplier Purchase
-- Request upgrade (branch/route/supplier mapping + approval workflow).
--
-- A pre-booking/request is a permanent record of intent — never touches
-- stock, payments, or GRN/invoice tables until explicitly converted by a
-- separate, later action (create GRN / go bill the customer).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Customer Pre-Booking (new — no equivalent existed before this).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_prebookings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prebooking_no VARCHAR(30) NULL,
  customer_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  route_id INT UNSIGNED NULL,
  employee_id INT UNSIGNED NULL,
  booking_source ENUM('salesman','phone','whatsapp','walk_in','direct') NOT NULL DEFAULT 'direct',
  status ENUM('pending','confirmed','processing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
  notes VARCHAR(255) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customer_prebookings_no (prebooking_no),
  CONSTRAINT fk_cpb_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cpb_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_cpb_route FOREIGN KEY (route_id) REFERENCES routes(id),
  CONSTRAINT fk_cpb_employee FOREIGN KEY (employee_id) REFERENCES users(id),
  CONSTRAINT fk_cpb_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  KEY idx_cpb_branch_status (branch_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_prebooking_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prebooking_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_cpbi_prebooking FOREIGN KEY (prebooking_id) REFERENCES customer_prebookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_cpbi_item FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO permissions (module, code, label, description) VALUES
('orders', 'orders.view_prebooking', 'View customer pre-bookings', 'See the customer pre-booking register'),
('orders', 'orders.manage_prebooking_status', 'Manage pre-booking status', 'Confirm/process/cancel a customer pre-booking')
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.id IN (1, 2) AND p.code IN ('orders.view_prebooking', 'orders.manage_prebooking_status')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Every role that can already create a pre-booking should be able to view
-- the register it just wrote to.
INSERT INTO role_permissions (role_id, permission_id)
  SELECT rp.role_id, p.id FROM role_permissions rp
  JOIN permissions src ON src.id = rp.permission_id AND src.code = 'orders.create_prebooking'
  JOIN permissions p ON p.code = 'orders.view_prebooking'
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- ---------------------------------------------------------------------
-- Supplier Purchase Request upgrade: branch/route/supplier mapping +
-- an explicit approval step before a GRN can be created from it.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_routes (
  supplier_id INT UNSIGNED NOT NULL,
  route_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (supplier_id, route_id),
  CONSTRAINT fk_sr_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_sr_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE purchase_requests
  ADD COLUMN route_id INT UNSIGNED NULL AFTER branch_id,
  ADD CONSTRAINT fk_pr_route FOREIGN KEY (route_id) REFERENCES routes(id),
  MODIFY COLUMN status ENUM('open','approved','partially_received','converted_to_grn','cancelled') NOT NULL DEFAULT 'open',
  ADD COLUMN approved_by INT UNSIGNED NULL AFTER created_by,
  ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by,
  ADD CONSTRAINT fk_pr_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);

INSERT INTO permissions (module, code, label, description) VALUES
('orders', 'orders.approve_purchase_request', 'Approve purchase requests', 'Approve a supplier purchase request before it can be turned into a GRN')
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.id IN (1, 2) AND p.code = 'orders.approve_purchase_request'
ON DUPLICATE KEY UPDATE role_id = role_id;
