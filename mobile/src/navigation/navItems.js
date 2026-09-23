// Mirrors frontend/src/components/TopNav.jsx NAV_ITEMS exactly — every web
// navbar entry maps to a mobile drawer entry and permission-gated the same way.
export const NAV_ITEMS = [
  { key: 'Dashboard', label: 'Dashboard', perm: 'dashboard.view_financial_summary', icon: '📊' },
  { key: 'Billing', label: 'Billing', perm: 'pos.access', icon: '🛒' },
  { key: 'Catalog', label: 'Catalog', perm: 'catalog.manage_items', icon: '📦' },
  { key: 'Parties', label: 'Parties', perm: 'parties.manage_customers', icon: '👥' },
  { key: 'Purchasing', label: 'Purchasing', perm: 'purchases.create_grn', icon: '🚚' },
  { key: 'Orders', label: 'Orders', perm: 'orders.create_prebooking', icon: '📋' },
  { key: 'Inventory', label: 'Inventory', perm: 'inventory.view_stock', icon: '🏬' },
  { key: 'Returns', label: 'Returns', perm: 'returns.sales_return', icon: '↩' },
  { key: 'Invoices', label: 'Invoices', perm: 'pos.access', icon: '🧾' },
  { key: 'Collections', label: 'Collections', perm: 'collections.field_collection_entry', icon: '💰' },
  { key: 'CashHandover', label: 'Cash Handover', perm: 'handover.submit_cash_handover', icon: '💵' },
  { key: 'Expenses', label: 'Expenses', perm: 'expenses.manage', icon: '🧮' },
  { key: 'Reports', label: 'Reports', perm: 'reports.view_all', icon: '📈' },
  { key: 'Staff', label: 'Staff', perm: 'staff.manage_permissions', icon: '🛡' },
  { key: 'Settings', label: 'Settings', perm: 'settings.manage', icon: '⚙' },
  { key: 'Branches', label: 'Branches', perm: 'branches.manage', icon: '🏢' },
];
