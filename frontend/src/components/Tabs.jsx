import { useState } from 'react';

export function Tabs({ tabs }) {
  const [active, setActive] = useState(tabs[0].key);
  const activeTab = tabs.find((t) => t.key === active);

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-sm font-medium ${
              active === tab.key
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
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
