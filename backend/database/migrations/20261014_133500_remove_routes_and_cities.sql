-- Migration: Remove Route and City concepts
-- Created at: 2026-10-14 13:35:00
-- Target database: pos_system (local)

-- Step 1: Drop foreign key constraints and columns from dependent tables
ALTER TABLE `customers`
  DROP FOREIGN KEY `fk_customers_city`,
  DROP FOREIGN KEY `fk_customers_route`,
  DROP COLUMN `city_id`,
  DROP COLUMN `route_id`;

ALTER TABLE `customer_collections`
  DROP FOREIGN KEY `fk_cc_route`,
  DROP COLUMN `route_id`;

ALTER TABLE `customer_prebookings`
  DROP FOREIGN KEY `fk_cpb_route`,
  DROP COLUMN `route_id`;

ALTER TABLE `purchase_requests`
  DROP FOREIGN KEY `fk_pr_route`,
  DROP COLUMN `route_id`;

ALTER TABLE `stock_issue_notes`
  DROP FOREIGN KEY `fk_sin_route`,
  DROP COLUMN `route_id`;

-- Step 2: Drop junction and dedicated Route/City tables
DROP TABLE IF EXISTS `supplier_routes`;
DROP TABLE IF EXISTS `cities`;
DROP TABLE IF EXISTS `routes`;
