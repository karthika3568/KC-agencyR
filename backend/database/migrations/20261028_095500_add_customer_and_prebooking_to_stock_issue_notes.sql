-- =====================================================================
-- Migration: 20261028_095500_add_customer_and_prebooking_to_stock_issue_notes.sql
-- Description: Add customer_id and prebooking_id to stock_issue_notes
-- for direct mapping of Customer Orders to Van Stock dispatch.
-- =====================================================================

ALTER TABLE `stock_issue_notes`
  ADD COLUMN `customer_id` INT UNSIGNED NULL AFTER `employee_id`,
  ADD COLUMN `prebooking_id` INT UNSIGNED NULL AFTER `customer_id`,
  ADD CONSTRAINT `fk_sin_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sin_prebooking` FOREIGN KEY (`prebooking_id`) REFERENCES `customer_prebookings`(`id`) ON DELETE SET NULL;
