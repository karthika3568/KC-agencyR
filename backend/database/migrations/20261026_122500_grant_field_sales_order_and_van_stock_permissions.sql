-- =====================================================================
-- Migration: 20261026_122500_grant_field_sales_order_and_van_stock_permissions.sql
-- Description: Grant customer order-related and van-stock-related permissions
-- to the Field Sales Executive role (role_id = 4).
-- =====================================================================

INSERT INTO role_permissions (role_id, permission_id)
  SELECT 4, id FROM permissions
  WHERE code IN (
    'orders.view_prebooking',
    'orders.manage_prebooking_status',
    'inventory.issue_van_stock'
  )
ON DUPLICATE KEY UPDATE role_id = role_id;
