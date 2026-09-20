import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AppShell } from './components/AppShell.jsx';
import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { StubPage } from './pages/StubPage.jsx';

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
      <Route path="/pos" element={<Protected><StubPage title="POS" /></Protected>} />
      <Route path="/catalog" element={<Protected><StubPage title="Catalog" /></Protected>} />
      <Route path="/reports" element={<Protected><StubPage title="Reports" /></Protected>} />
      <Route path="/staff" element={<Protected><StubPage title="Staff & Permissions" /></Protected>} />
    </Routes>
  );
}
