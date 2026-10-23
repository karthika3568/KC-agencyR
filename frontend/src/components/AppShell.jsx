import { TopNav } from './TopNav.jsx';
import { StatusFooter } from './StatusFooter.jsx';

export function AppShell({ children }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F5FF] font-sans text-[#17233D]">
      {/* Top Header Bar & Sub-Nav */}
      <TopNav />

      {/* Scrollable Page Canvas */}
      <main className="flex-1 overflow-y-auto p-2.5 sm:p-3 lg:px-5 lg:py-3">
        <div className="mx-auto max-w-[1500px]">
          {children}
        </div>
      </main>

      {/* Bottom Persistent Status Footer */}
      <StatusFooter />
    </div>
  );
}
