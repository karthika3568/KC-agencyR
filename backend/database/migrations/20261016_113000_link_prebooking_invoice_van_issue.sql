-- =====================================================================
-- Migration: 20261016_113000_link_prebooking_invoice_van_issue.sql
-- Description: Add invoice_id and van_issue_id to customer_prebookings
-- for direct flow from customer order to Van dispatch and POS Invoice.
-- =====================================================================

ALTER TABLE `customer_prebookings`
  ADD COLUMN `invoice_id` INT UNSIGNED NULL AFTER `status`,
  ADD COLUMN `van_issue_id` INT UNSIGNED NULL AFTER `invoice_id`,
  ADD CONSTRAINT `fk_cpb_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cpb_van_issue` FOREIGN KEY (`van_issue_id`) REFERENCES `stock_issue_notes`(`id`) ON DELETE SET NULL;
