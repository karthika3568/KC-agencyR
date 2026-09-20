import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';

export function AppShell({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
