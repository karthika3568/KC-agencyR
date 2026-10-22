-- Migration: Remove unused customer fields (customer_group, doj, dob)
-- Note: is_local_customer is preserved for POS billing format & free quantity rules.

ALTER TABLE customers
  DROP COLUMN customer_group,
  DROP COLUMN doj,
  DROP COLUMN dob;
