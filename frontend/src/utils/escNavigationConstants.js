/**
 * Navigation Priority:
 * 0. Open confirmation alertdialog (110)
 * 1. Dropdown / autocomplete list / suggestions / popover (100)
 * 2. Modal / dialog / popup (80)
 * 3. Nested form / edit screen / detail view / subsection (60)
 * 4. Nested module -> Parent module (40)
 * 5. Main module -> Previous application route (20)
 * 6. No previous level -> Do nothing
 */
export const ESC_PRIORITY = {
  CONFIRM: 110,
  DROPDOWN: 100,
  MODAL: 80,
  NESTED_SCREEN: 60,
  PARENT_MODULE: 40,
  ROUTE: 20,
};

/**
 * Mapping from application routes to their parent navigation group ID in TopNav
 */
export const ROUTE_PARENT_MODULE_MAP = {
  // Sales & Customers
  '/pos': 'sales-customers',
  '/parties': 'sales-customers',
  '/customers': 'sales-customers',
  '/orders': 'sales-customers',
  '/returns': 'sales-customers',

  // Products & Inventory
  '/catalog': 'products-inventory',
  '/inventory': 'products-inventory',
  '/purchasing': 'products-inventory',
  '/price-adjustment': 'products-inventory',
  '/vans': 'products-inventory',
  '/van-stock': 'products-inventory',
  '/stock-history': 'products-inventory',

  // Finance & Accounts
  '/invoices': 'finance-accounts',
  '/collections': 'finance-accounts',
  '/expenses': 'finance-accounts',
  '/cash-handover': 'finance-accounts',

  // Administration
  '/staff': 'administration',
  '/settings': 'administration',
};
