import { hasPermission } from '../hooks/usePermission';

/**
 * Single source of truth for page-level route permissions across the application.
 * If a route requires one of multiple permissions, specify them as an array.
 */
export const ROUTE_PERMISSIONS = {
  '/': 'dashboard.view_financial_summary',
  '/pos': 'pos.access',
  '/catalog': 'catalog.manage_items',
  '/price-adjustment': ['catalog.manage_price_lists', 'catalog.manage_price_rules', 'catalog.manage_items'],
  '/parties': ['parties.manage_customers', 'parties.manage_suppliers'],
  '/customers': 'parties.manage_customers',
  '/purchasing': [
    'purchases.create_grn',
    'purchases.edit_grn',
    'purchases.delete_grn',
    'purchases.view_purchase_cost',
    'purchases.settle_supplier_payment',
  ],
  '/orders': [
    'orders.create_prebooking',
    'orders.create_purchase_indent',
    'orders.approve_purchase_request',
    'orders.manage_prebooking_status',
    'orders.view_prebooking',
  ],
  '/vans': ['inventory.issue_van_stock', 'inventory.view_stock'],
  '/van-stock': ['inventory.issue_van_stock', 'inventory.view_stock'],
  '/stock-history': ['inventory.view_stock', 'inventory.issue_van_stock'],
  '/inventory': ['inventory.view_stock', 'inventory.stock_adjustment', 'inventory.issue_van_stock'],
  '/returns': ['returns.sales_return', 'returns.purchase_return', 'returns.approve_untraceable_return'],
  '/invoices': 'pos.access',
  '/collections': [
    'collections.field_collection_entry',
    'credit.collect_credit_payment',
    'credit.view_shopwide_outstanding',
  ],
  '/cash-handover': ['handover.submit_cash_handover', 'handover.verify_reconcile'],
  '/expenses': 'expenses.manage',
  '/reports': [
    'reports.view_all',
    'reports.view_gst_register',
    'reports.view_non_gst_register',
    'reports.view_profit',
    'reports.export_excel',
  ],
  '/staff': ['staff.manage_accounts', 'staff.manage_permissions'],
  '/settings': ['settings.manage', 'branches.manage'],
  '/print/invoice': 'pos.access',
};

/**
 * Order of priority when determining which authorized route to land on if the user
 * doesn't have access to Dashboard ('/').
 */
const LANDING_ROUTE_PRIORITY = [
  '/',
  '/pos',
  '/customers',
  '/parties',
  '/orders',
  '/inventory',
  '/van-stock',
  '/vans',
  '/stock-history',
  '/invoices',
  '/catalog',
  '/purchasing',
  '/collections',
  '/returns',
  '/cash-handover',
  '/expenses',
  '/reports',
  '/price-adjustment',
  '/staff',
  '/settings',
];

/**
 * Returns the first authorized landing route for this user based on their effective permissions.
 * If user has no permissions for any route, returns null.
 * 
 * @param {object|null} user
 * @returns {string|null}
 */
export function getFirstAuthorizedRoute(user) {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) {
    return null;
  }

  for (const path of LANDING_ROUTE_PRIORITY) {
    const requiredPerm = ROUTE_PERMISSIONS[path];
    if (requiredPerm && hasPermission(user, requiredPerm)) {
      // Special case: Field Sales Executive is restricted from counter /pos
      if (user?.role === 'Field Sales Executive' && path === '/pos') {
        continue;
      }
      return path;
    }
  }

  return null;
}
