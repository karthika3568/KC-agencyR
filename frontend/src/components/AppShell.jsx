import { TopNav } from './TopNav.jsx';
import { StatusFooter } from './StatusFooter.jsx';

export function AppShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <TopNav />
      <main className="flex-1 p-6">{children}</main>
      <StatusFooter />
    </div>
  );
}
