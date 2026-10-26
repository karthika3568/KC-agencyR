import { useState, useRef, useEffect } from 'react';

export function Tabs({ tabs, activeKey, onTabChange, className = '' }) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.key);
  const currentActive = activeKey !== undefined ? activeKey : internalActive;
  const tabRefs = useRef({});

  const handleTabClick = (key) => {
    if (onTabChange) {
      onTabChange(key);
    }
    setInternalActive(key);
  };

  // Keep selected tab visible in horizontal scroll viewport without clipping on smaller screens
  useEffect(() => {
    const activeEl = tabRefs.current[currentActive];
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [currentActive]);

  const handleKeyDown = (e, index) => {
    if (e.defaultPrevented) return;
    if (e.key === 'ArrowRight') {
      const nextIndex = (index + 1) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (nextTab) {
        tabRefs.current[nextTab.key]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      const prevTab = tabs[prevIndex];
      if (prevTab) {
        tabRefs.current[prevTab.key]?.focus();
      }
    }
  };

  const activeTab = tabs.find((t) => t.key === currentActive) || tabs[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Navigation tabs"
        className="mb-2.5 flex items-center gap-1 sm:gap-1.5 overflow-x-auto border-b border-border-soft scroll-smooth pb-px"
      >
        {tabs.map((tab, idx) => {
          const isActive = currentActive === tab.key;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              role="tab"
              aria-selected={isActive}
              data-catalog-nav="true"
              onClick={() => handleTabClick(tab.key)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-150 rounded-t-lg -mb-px border-b-2 cursor-pointer focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:z-10 ${
                isActive
                  ? 'bg-[#F3EBFB] text-primary font-semibold border-primary shadow-2xs'
                  : 'bg-transparent text-ink-muted border-transparent hover:text-ink hover:bg-[#FAF6FE] hover:border-lavender-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab?.content}
    </div>
  );
}


