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
import { Inventory } from './pages/Inventory.jsx';
import { Returns } from './pages/Returns.jsx';
import { Collections } from './pages/Collections.jsx';
import { CashHandover } from './pages/CashHandover.jsx';
import { Expenses } from './pages/Expenses.jsx';
import { Reports } from './pages/Reports.jsx';
import { StaffPermissions } from './pages/StaffPermissions.jsx';
import { Settings } from './pages/Settings.jsx';
import { Branches } from './pages/Branches.jsx';

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
      <Route path="/parties" element={<Protected><Parties /></Protected>} />
      <Route path="/purchasing" element={<Protected><Purchasing /></Protected>} />
      <Route path="/inventory" element={<Protected><Inventory /></Protected>} />
      <Route path="/returns" element={<Protected><Returns /></Protected>} />
      <Route path="/collections" element={<Protected><Collections /></Protected>} />
      <Route path="/cash-handover" element={<Protected><CashHandover /></Protected>} />
      <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/staff" element={<Protected><StaffPermissions /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/branches" element={<Protected><Branches /></Protected>} />
      <Route path="/print/invoice/:id" element={<ProtectedRoute><InvoicePrint /></ProtectedRoute>} />
    </Routes>
  );
}
