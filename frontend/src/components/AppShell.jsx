import { useLocation } from 'react-router-dom';
import { TopNav } from './TopNav.jsx';
import { StatusFooter } from './StatusFooter.jsx';

export function AppShell({ children }) {
  const location = useLocation();
  const isPos = location.pathname === '/pos';

  return (
    <div
      className="flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-[#F7F5FF] font-sans text-[#17233D] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      style={{ paddingBottom: 'var(--pwa-banner-h, 0px)' }}
    >
      {/* Top Header Bar & Sub-Nav */}
      <TopNav />

      {/* Page Canvas - on desktop (lg+), POS stays single-screen fixed layout; on mobile/tablet, allow vertical scrolling */}
      <main className={`flex-1 min-h-0 min-w-0 w-full ${isPos ? 'overflow-y-auto lg:overflow-hidden p-2 sm:p-2.5 flex flex-col' : 'overflow-y-auto p-2.5 sm:p-3 lg:px-5 lg:py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'}`}>
        <div className={isPos ? 'flex-1 min-h-0 min-w-0 w-full max-w-[1700px] mx-auto flex flex-col overflow-visible lg:overflow-hidden' : 'mx-auto w-full min-w-0 max-w-[1500px]'}>
          {children}
        </div>
      </main>

      {/* Bottom Persistent Status Footer (Hidden on POS since POS has its own approved status footer) */}
      {!isPos && <StatusFooter />}
    </div>
  );
}
