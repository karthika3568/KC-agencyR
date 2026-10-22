import { useState } from 'react';

export function Tabs({ tabs, activeKey, onTabChange }) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.key);
  const currentActive = activeKey !== undefined ? activeKey : internalActive;

  const handleTabClick = (key) => {
    if (onTabChange) {
      onTabChange(key);
    }
    setInternalActive(key);
  };

  const activeTab = tabs.find((t) => t.key === currentActive) || tabs[0];

  return (
    <div>
      <div className="mb-2.5 flex gap-1 overflow-x-auto border-b border-border-soft">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
              currentActive === tab.key
                ? 'border-b-2 border-primary text-primary font-bold'
                : 'text-ink-muted hover:text-ink hover:border-b-2 hover:border-lavender-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab?.content}
    </div>
  );
}

