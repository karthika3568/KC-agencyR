-- Migration: Customer GSTIN already existed (gstin column) — this adds the
-- remaining fields needed for the Customer master + Excel import/export:
-- Group (free-text ledger group, e.g. "Wholesaler"/"Sundry Debtors" — no
-- separate master table since nothing else in the app manages/lists
-- groups; import reuses an existing spelling case-insensitively instead of
-- creating near-duplicates), Date of Joining, Date of Birth, and Pricing
-- Type (drives the auto price-mode selection in Billing).
ALTER TABLE customers
  ADD COLUMN customer_group VARCHAR(100) NULL AFTER print_name,
  ADD COLUMN doj DATE NULL AFTER address,
  ADD COLUMN dob DATE NULL AFTER doj,
  ADD COLUMN pricing_type ENUM('normal','retail','wholesale') NOT NULL DEFAULT 'normal' AFTER dob;
