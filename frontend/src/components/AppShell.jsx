import { useState } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { TopNav } from './TopNav.jsx';
import { StatusFooter } from './StatusFooter.jsx';

export function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F5FF] font-sans text-[#17233D]">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={collapsed}
        isMobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <TopNav
          onToggleSidebar={() => setCollapsed(!collapsed)}
          onToggleMobile={() => setMobileOpen(true)}
        />

        {/* Scrollable Page Canvas */}
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-3 lg:px-5 lg:py-2.5">
          <div className="mx-auto max-w-[1500px]">
            {children}
          </div>
        </main>

        {/* Bottom Persistent Status Footer */}
        <StatusFooter />
      </div>
    </div>
  );
}
