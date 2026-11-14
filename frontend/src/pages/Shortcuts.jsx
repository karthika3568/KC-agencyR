import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Keyboard, Compass, ShoppingCart } from 'lucide-react';
import {
  GENERAL_NAVIGATION_SHORTCUTS,
  POS_BILLING_SHORTCUTS,
} from '../data/shortcutsData';

export function Shortcuts() {
  const navigate = useNavigate();

  // Language state: 'ta' (default) | 'en'
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('kc_shortcuts_lang') || 'ta';
    } catch {
      return 'ta';
    }
  });

  const handleLangChange = (newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem('kc_shortcuts_lang', newLang);
    } catch {
      // ignore
    }
  };

  const isTa = lang === 'ta';

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-2 sm:gap-2.5">
      {/* 1. Header Bar with Back Button, Title, and Language Toggle */}
      <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-border-soft shadow-2xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-soft bg-page hover:bg-surface-subtle text-ink-muted hover:text-ink transition-colors cursor-pointer"
            title={isTa ? 'முந்தைய பக்கத்திற்குத் திரும்பு' : 'Back to previous page'}
            aria-label="Back"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EEE5FF] text-[#6F2DA8]">
              <Keyboard size={13} />
            </span>
            <span className="text-xs sm:text-sm font-black text-ink tracking-tight truncate">
              {isTa ? 'விசைப்பலகை குறுக்குவழிகள்' : 'Keyboard Shortcuts'}
            </span>
          </div>
        </div>

        {/* Existing Tamil / English Language Toggle */}
        <div className="flex items-center gap-0.5 bg-[#F7F5FF] p-0.5 rounded-lg border border-lavender-200/80 shrink-0">
          <button
            type="button"
            onClick={() => handleLangChange('ta')}
            className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              isTa
                ? 'bg-[#6F2DA8] text-white shadow-2xs'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            தமிழ்
          </button>
          <button
            type="button"
            onClick={() => handleLangChange('en')}
            className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              !isTa
                ? 'bg-[#6F2DA8] text-white shadow-2xs'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* 2. Heading 1: General Navigation */}
      <section className="flex flex-col gap-1 sm:gap-1.5">
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#EEE5FF] text-[#6F2DA8]">
            <Compass size={12} />
          </span>
          <h2 className="text-xs sm:text-sm font-black text-ink tracking-tight">
            {isTa ? 'பொதுவான வழிகாட்டுதல் (General Navigation)' : 'General Navigation'}
          </h2>
        </div>

        {/* Responsive CSS Grid: Desktop 3-4 cols, Tablet 2 cols, Mobile 2 compact cols */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-1.5">
          {GENERAL_NAVIGATION_SHORTCUTS.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-white border border-[#E5E7F5] shadow-2xs hover:border-[#8244AD]/40 transition-colors min-w-0"
            >
              <div className="shrink-0 flex items-center gap-0.5 sm:gap-1">
                {item.keys.map((k, idx) => (
                  <React.Fragment key={k}>
                    {idx > 0 && (
                      <span className="text-[10px] font-bold text-ink-muted select-none px-0.5">
                        {item.separator || '/'}
                      </span>
                    )}
                    <kbd className="inline-flex items-center justify-center min-w-[20px] px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold text-ink bg-[#FAF8FC] border border-[#D0C7DB] rounded shadow-2xs whitespace-nowrap">
                      {k}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-xs font-semibold text-ink leading-tight block">
                  {isTa ? item.actionTa : item.actionEn}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Heading 2: POS Billing */}
      <section className="flex flex-col gap-1 sm:gap-1.5">
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#EEE5FF] text-[#6F2DA8]">
            <ShoppingCart size={12} />
          </span>
          <h2 className="text-xs sm:text-sm font-black text-ink tracking-tight">
            {isTa ? 'POS பில்லிங் (POS Billing)' : 'POS Billing'}
          </h2>
        </div>

        {/* Responsive CSS Grid: Desktop 3-4 cols, Tablet 2 cols, Mobile 2 compact cols */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-1.5">
          {POS_BILLING_SHORTCUTS.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-white border border-[#E5E7F5] shadow-2xs hover:border-[#8244AD]/40 transition-colors min-w-0"
            >
              <div className="shrink-0 flex items-center gap-0.5 sm:gap-1">
                {item.keys.map((k, idx) => (
                  <React.Fragment key={k}>
                    {idx > 0 && (
                      <span className="text-[10px] font-bold text-ink-muted select-none px-0.5">
                        {item.separator || '/'}
                      </span>
                    )}
                    <kbd className="inline-flex items-center justify-center min-w-[20px] px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold text-ink bg-[#FAF8FC] border border-[#D0C7DB] rounded shadow-2xs whitespace-nowrap">
                      {k}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-xs font-semibold text-ink leading-tight block">
                  {isTa ? item.actionTa : item.actionEn}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
