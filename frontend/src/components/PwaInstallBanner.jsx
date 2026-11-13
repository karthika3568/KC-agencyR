import React, { useState, useEffect, useRef } from 'react';
import { Download, Smartphone } from 'lucide-react';

/**
 * PWA Install Prompt Banner
 * Displays a bottom banner. Clicking "Install App" directly opens the native browser installation prompt.
 */
export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const promptRef = useRef(null);
  const bannerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator?.standalone ||
      document.referrer?.includes('android-app://');
    if (isStandalone) return false;
    return !sessionStorage.getItem('kc_pwa_banner_dismissed');
  });

  useEffect(() => {
    // 1. If already installed/standalone, hide immediately
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator?.standalone ||
      document.referrer?.includes('android-app://');

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    const isAutoInstall = new URLSearchParams(window.location.search).get('install') === 'true';

    // 2. Capture Chrome / Edge native beforeinstallprompt
    const handleBeforeInstallPrompt = async (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      promptRef.current = e;

      // If user clicked install and was redirected to localhost, trigger prompt immediately
      if (isAutoInstall) {
        window.history.replaceState({}, '', window.location.pathname);
        try {
          await e.prompt();
          const choice = await e.userChoice;
          if (choice && choice.outcome === 'accepted') {
            setIsVisible(false);
          }
        } catch (err) {
          console.warn('Auto install prompt failed:', err);
        }
      } else if (!sessionStorage.getItem('kc_pwa_banner_dismissed')) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      promptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || promptRef.current;

    // 1. Direct native prompt if available
    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsVisible(false);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        setDeferredPrompt(null);
        promptRef.current = null;
      }
      return;
    }

    // 2. If user is on an HTTP IP address (e.g. 192.168.1.105), Chrome disables native prompt for security.
    // Seamlessly navigate to localhost where Chrome immediately triggers the native install dialog!
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'https:') {
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.href = `http://localhost${port}${window.location.pathname}?install=true`;
      return;
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('kc_pwa_banner_dismissed', 'true');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (!isVisible) {
      root.style.setProperty('--pwa-banner-h', '0px');
      return undefined;
    }
    const updateHeight = () => {
      const h = bannerRef.current?.offsetHeight || 0;
      root.style.setProperty('--pwa-banner-h', `${h}px`);
    };
    updateHeight();
    let ro;
    if (typeof ResizeObserver !== 'undefined' && bannerRef.current) {
      ro = new ResizeObserver(updateHeight);
      ro.observe(bannerRef.current);
    }
    window.addEventListener('resize', updateHeight);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateHeight);
      root.style.setProperty('--pwa-banner-h', '0px');
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-0 left-0 right-0 z-[15] bg-stone-900/95 text-white backdrop-blur-md px-3 py-2 sm:px-6 sm:py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_25px_rgba(0,0,0,0.4)] border-t border-stone-800 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left section: Icon + Message */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <span className="hidden min-[380px]:flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Download className="h-4 w-4 sm:h-5 sm:w-5 animate-bounce" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-sm font-semibold leading-tight text-zinc-100">
              <span className="sm:hidden">Install <span className="text-amber-400 font-bold">KC Agency</span></span>
              <span className="hidden sm:inline">Install <span className="text-amber-400 font-bold">KC Agency</span> App on your Home Screen!</span>
            </p>
            <p className="text-[10px] sm:text-xs text-zinc-400 hidden sm:block">
              Fast one-tap launch, offline capability, and desktop/mobile app experience.
            </p>
          </div>
        </div>

        {/* Right section: Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-white px-2 sm:px-2.5 py-1.5 min-h-[36px] rounded transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleInstallClick}
            className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs sm:text-sm font-bold px-2.5 sm:px-4 py-1.5 min-h-[36px] rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Install</span>
            <span className="hidden sm:inline">App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
