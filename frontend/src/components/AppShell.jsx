import { useLocation } from 'react-router-dom';
import { TopNav } from './TopNav.jsx';
import { StatusFooter } from './StatusFooter.jsx';

export function AppShell({ children }) {
  const location = useLocation();
  const isPos = location.pathname === '/pos';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F5FF] font-sans text-[#17233D]">
      {/* Top Header Bar & Sub-Nav */}
      <TopNav />

      {/* Page Canvas - on desktop (lg+), POS stays single-screen fixed layout; on mobile/tablet, allow vertical scrolling */}
      <main className={`flex-1 min-h-0 ${isPos ? 'overflow-y-auto lg:overflow-hidden p-2 sm:p-2.5 flex flex-col' : 'overflow-y-auto p-2.5 sm:p-3 lg:px-5 lg:py-3'}`}>
        <div className={isPos ? 'flex-1 min-h-0 w-full max-w-[1700px] mx-auto flex flex-col overflow-visible lg:overflow-hidden' : 'mx-auto max-w-[1500px]'}>
          {children}
        </div>
      </main>

      {/* Bottom Persistent Status Footer (Hidden on POS since POS has its own approved status footer) */}
      {!isPos && <StatusFooter />}
    </div>
  );
}
