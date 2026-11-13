import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function Tabs({ tabs, activeKey, onTabChange, className = '' }) {
  const [internalActive, setInternalActive] = useState(tabs?.[0]?.key);
  const currentActive = activeKey !== undefined ? activeKey : internalActive;

  const scrollContainerRef = useRef(null);
  const tabRefs = useRef({});

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const handleTabClick = (key) => {
    if (onTabChange) {
      onTabChange(key);
    }
    setInternalActive(key);
  };

  // Check scroll position and calculate boundary states
  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    if (clientWidth === 0) return;

    // Tabs overflow if scrollWidth strictly exceeds clientWidth (with 1px threshold for rounding)
    const overflowing = scrollWidth > clientWidth + 1;
    setIsOverflowing(overflowing);

    if (!overflowing) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
    } else {
      // Allow scrolling left if not already at the left boundary
      setCanScrollLeft(scrollLeft > 2);
      // Allow scrolling right if not already at the right boundary (with 2px threshold for high-DPI subpixel scaling)
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
    }
  }, []);

  // Update scrollability on scroll, window resize, content changes, or tabs change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollability();

    const handleScroll = () => {
      checkScrollability();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', checkScrollability);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkScrollability();
      });
      resizeObserver.observe(container);
    }

    let mutationObserver;
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        checkScrollability();
      });
      mutationObserver.observe(container, { childList: true, subtree: true, characterData: true });
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkScrollability);
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
    };
  }, [checkScrollability, tabs]);

  // Synchronously evaluate scrollability before paint to avoid visual flash
  useIsomorphicLayoutEffect(() => {
    checkScrollability();
  }, [isOverflowing, checkScrollability]);

  // Keep selected tab visible in horizontal scroll viewport without causing window jumps
  useEffect(() => {
    const container = scrollContainerRef.current;
    const activeEl = tabRefs.current[currentActive];
    if (!container || !activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();

    if (containerRect.width === 0) return;

    if (elRect.left < containerRect.left) {
      const diff = containerRect.left - elRect.left + 16;
      container.scrollBy({ left: -diff, behavior: 'smooth' });
    } else if (elRect.right > containerRect.right) {
      const diff = elRect.right - containerRect.right + 16;
      container.scrollBy({ left: diff, behavior: 'smooth' });
    }
  }, [currentActive]);

  // Smooth scroll towards previous tabs
  const handleScrollLeft = () => {
    const container = scrollContainerRef.current;
    if (!container || !canScrollLeft) return;
    const scrollAmount = Math.max(140, Math.floor(container.clientWidth * 0.6));
    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  // Smooth scroll towards next tabs
  const handleScrollRight = () => {
    const container = scrollContainerRef.current;
    if (!container || !canScrollRight) return;
    const scrollAmount = Math.max(140, Math.floor(container.clientWidth * 0.6));
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

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

  if (!tabs || tabs.length === 0) return null;

  const activeTab = tabs.find((t) => t.key === currentActive) || tabs[0];

  return (
    <div className={`min-w-0 w-full ${className}`}>
      <div className="relative mb-2.5 flex w-full min-w-0 items-center">
        {isOverflowing && (
          <button
            type="button"
            aria-label="Scroll sub-navigation left"
            title="Scroll sub-navigation left"
            disabled={!canScrollLeft}
            onClick={handleScrollLeft}
            tabIndex={canScrollLeft ? 0 : -1}
            className={`shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 mr-1 sm:mr-1.5 rounded-lg border text-xs transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 z-10 ${
              canScrollLeft
                ? 'border-border-soft bg-white hover:text-primary hover:bg-[#F3EBFB] hover:border-lavender-300 text-ink-muted shadow-2xs active:scale-95 cursor-pointer'
                : 'border-border-soft/40 bg-surface/30 text-ink-muted/30 opacity-30 cursor-not-allowed pointer-events-none'
            }`}
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          role="tablist"
          aria-label="Navigation tabs"
          className="flex-1 min-w-0 flex items-center gap-1 sm:gap-1.5 overflow-x-auto border-b border-border-soft scroll-smooth pb-px no-scrollbar"
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

        {isOverflowing && (
          <button
            type="button"
            aria-label="Scroll sub-navigation right"
            title="Scroll sub-navigation right"
            disabled={!canScrollRight}
            onClick={handleScrollRight}
            tabIndex={canScrollRight ? 0 : -1}
            className={`shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 ml-1 sm:ml-1.5 rounded-lg border text-xs transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 z-10 ${
              canScrollRight
                ? 'border-border-soft bg-white hover:text-primary hover:bg-[#F3EBFB] hover:border-lavender-300 text-ink-muted shadow-2xs active:scale-95 cursor-pointer'
                : 'border-border-soft/40 bg-surface/30 text-ink-muted/30 opacity-30 cursor-not-allowed pointer-events-none'
            }`}
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}
      </div>

      {activeTab?.content}
    </div>
  );
}
