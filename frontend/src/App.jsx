import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AppShell } from './components/AppShell.jsx';
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

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/pos" element={<Protected><POS /></Protected>} />
      <Route path="/catalog" element={<Protected><Catalog /></Protected>} />
      <Route path="/price-adjustment" element={<Protected><PriceAdjustment /></Protected>} />
      <Route path="/parties" element={<Protected><Parties /></Protected>} />
      <Route path="/customers" element={<Protected><Customers /></Protected>} />
      <Route path="/purchasing" element={<Protected><Purchasing /></Protected>} />
      <Route path="/orders" element={<Protected><OrderManagement /></Protected>} />
      <Route path="/vans" element={<Protected><Vans /></Protected>} />
      <Route path="/van-stock" element={<Protected><VanStock /></Protected>} />
      <Route path="/stock-history" element={<Protected><StockHistory /></Protected>} />
      <Route path="/inventory" element={<Protected><Inventory /></Protected>} />
      <Route path="/returns" element={<Protected><Returns /></Protected>} />
      <Route path="/invoices" element={<Protected><InvoiceManagement /></Protected>} />
      <Route path="/collections" element={<Protected><Collections /></Protected>} />
      <Route path="/cash-handover" element={<Protected><CashHandover /></Protected>} />
      <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/staff" element={<Protected><StaffPermissions /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/print/invoice/:id" element={<ProtectedRoute><InvoicePrint /></ProtectedRoute>} />
    </Routes>
  );
}
