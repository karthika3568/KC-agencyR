-- Migration: Customer master additional fields
-- Customer Group, Date of Joining, Date of Birth, and Pricing Type
ALTER TABLE customers
  ADD COLUMN customer_group VARCHAR(100) NULL AFTER print_name,
  ADD COLUMN doj DATE NULL AFTER address,
  ADD COLUMN dob DATE NULL AFTER doj,
  ADD COLUMN pricing_type ENUM('normal','retail','wholesale') NOT NULL DEFAULT 'normal' AFTER dob;
