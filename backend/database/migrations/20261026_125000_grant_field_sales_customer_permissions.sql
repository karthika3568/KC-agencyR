-- =====================================================================
-- Migration: 20261026_125000_grant_field_sales_customer_permissions.sql
-- Description: Grant customer management permission (parties.manage_customers)
-- to Field Sales Executive role (role_id = 4).
-- =====================================================================

INSERT INTO role_permissions (role_id, permission_id)
  SELECT 4, id FROM permissions
  WHERE code IN (
    'parties.manage_customers'
  )
ON DUPLICATE KEY UPDATE role_id = role_id;
