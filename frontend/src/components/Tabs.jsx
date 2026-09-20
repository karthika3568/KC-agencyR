import { useState } from 'react';

export function Tabs({ tabs }) {
  const [active, setActive] = useState(tabs[0].key);
  const activeTab = tabs.find((t) => t.key === active);

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-border-soft">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              active === tab.key
                ? 'border-b-2 border-gold text-gold'
                : 'text-ink-muted hover:text-ink'
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
