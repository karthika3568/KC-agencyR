import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AppShell } from './components/AppShell.jsx';
import { AccessDenied } from './components/AccessDenied.jsx';
import { useAuth } from './hooks/useAuth.jsx';
import { hasPermission } from './hooks/usePermission';
import { ROUTE_PERMISSIONS, getFirstAuthorizedRoute } from './utils/navigationConfig';

import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Catalog } from './pages/Catalog.jsx';
import { Parties } from './pages/Parties.jsx';
import { POS } from './pages/POS.jsx';
import { InvoicePrint } from './pages/InvoicePrint.jsx';
import { Purchasing } from './pages/Purchasing.jsx';
import { OrderManagement } from './pages/OrderManagement.jsx';
import { Inventory } from './pages/Inventory.jsx';
import { Returns } from './pages/Returns.jsx';
import { Collections } from './pages/Collections.jsx';
import { InvoiceManagement } from './pages/InvoiceManagement.jsx';
import { CashHandover } from './pages/CashHandover.jsx';
import { Expenses } from './pages/Expenses.jsx';
import { Reports } from './pages/Reports.jsx';
import { StaffPermissions } from './pages/StaffPermissions.jsx';
import { Settings } from './pages/Settings.jsx';
import { PriceAdjustment } from './pages/PriceAdjustment.jsx';
import { Customers } from './pages/Customers.jsx';
import { Vans } from './pages/Vans.jsx';
import { VanStock } from './pages/VanStock.jsx';
import { StockHistory } from './pages/StockHistory.jsx';

function Protected({ children, perm, targetPath }) {
  return (
    <ProtectedRoute perm={perm} targetPath={targetPath}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

/**
 * Dynamic Root Route Controller:
 * If the user has permission to view the main financial dashboard, render it.
 * If the user has other permitted pages, seamlessly forward to their first authorized workspace.
 * If no permissions are assigned to the account at all, display Access Denied.
 */
function RootRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Financial summary dashboard
  if (hasPermission(user, 'dashboard.view_financial_summary')) {
    return <Dashboard />;
  }

  // Field Sales Executive with at least one active field sales permission
  if (user?.role === 'Field Sales Executive') {
    const hasFieldSalesPerm = hasPermission(user, [
      'orders.create_prebooking',
      'orders.view_prebooking',
      'parties.manage_customers',
      'inventory.view_stock',
      'inventory.issue_van_stock',
    ]);
    if (hasFieldSalesPerm) {
      return <Dashboard />;
    }
  }

  // Otherwise find the first authorized page for this user
  const firstRoute = getFirstAuthorizedRoute(user);
  if (firstRoute && firstRoute !== '/') {
    return <Navigate to={firstRoute} replace />;
  }

  return <AccessDenied noPermissions={true} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><RootRoute /></Protected>} />
      <Route path="/pos" element={<Protected perm={ROUTE_PERMISSIONS['/pos']} targetPath="/pos"><POS /></Protected>} />
      <Route path="/catalog" element={<Protected perm={ROUTE_PERMISSIONS['/catalog']}><Catalog /></Protected>} />
      <Route path="/price-adjustment" element={<Protected perm={ROUTE_PERMISSIONS['/price-adjustment']}><PriceAdjustment /></Protected>} />
      <Route path="/parties" element={<Protected perm={ROUTE_PERMISSIONS['/parties']}><Parties /></Protected>} />
      <Route path="/customers" element={<Protected perm={ROUTE_PERMISSIONS['/customers']}><Customers /></Protected>} />
      <Route path="/purchasing" element={<Protected perm={ROUTE_PERMISSIONS['/purchasing']}><Purchasing /></Protected>} />
      <Route path="/orders" element={<Protected perm={ROUTE_PERMISSIONS['/orders']}><OrderManagement /></Protected>} />
      <Route path="/vans" element={<Protected perm={ROUTE_PERMISSIONS['/vans']}><Vans /></Protected>} />
      <Route path="/van-stock" element={<Protected perm={ROUTE_PERMISSIONS['/van-stock']}><VanStock /></Protected>} />
      <Route path="/stock-history" element={<Protected perm={ROUTE_PERMISSIONS['/stock-history']}><StockHistory /></Protected>} />
      <Route path="/inventory" element={<Protected perm={ROUTE_PERMISSIONS['/inventory']}><Inventory /></Protected>} />
      <Route path="/returns" element={<Protected perm={ROUTE_PERMISSIONS['/returns']}><Returns /></Protected>} />
      <Route path="/invoices" element={<Protected perm={ROUTE_PERMISSIONS['/invoices']}><InvoiceManagement /></Protected>} />
      <Route path="/collections" element={<Protected perm={ROUTE_PERMISSIONS['/collections']}><Collections /></Protected>} />
      <Route path="/cash-handover" element={<Protected perm={ROUTE_PERMISSIONS['/cash-handover']}><CashHandover /></Protected>} />
      <Route path="/expenses" element={<Protected perm={ROUTE_PERMISSIONS['/expenses']}><Expenses /></Protected>} />
      <Route path="/reports" element={<Protected perm={ROUTE_PERMISSIONS['/reports']}><Reports /></Protected>} />
      <Route path="/staff" element={<Protected perm={ROUTE_PERMISSIONS['/staff']}><StaffPermissions /></Protected>} />
      <Route path="/settings" element={<Protected perm={ROUTE_PERMISSIONS['/settings']}><Settings /></Protected>} />
      <Route path="/print/invoice/:id" element={<ProtectedRoute perm="pos.access"><InvoicePrint /></ProtectedRoute>} />
      <Route path="*" element={<Protected><AccessDenied /></Protected>} />
    </Routes>
  );
}
