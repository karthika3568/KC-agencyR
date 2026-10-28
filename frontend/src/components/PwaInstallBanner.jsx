import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

/**
 * PWA Install Prompt Banner
 * Displays a persistent bottom banner inviting the user to install the KC Agency web app on their device.
 * Matches Chrome/Edge's beforeinstallprompt API, with fallback guidance for iOS Safari.
 */
export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Check if the app is already installed or running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // 2. Check if user dismissed the banner in this session
    const isDismissed = sessionStorage.getItem('kc_pwa_banner_dismissed');

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = isIosDevice && /safari/.test(ua) && !/crios|fxios|opios/.test(ua);
    setIsIOS(isIosDevice);

    if (isSafari && !isDismissed) {
      // For iOS Safari, beforeinstallprompt is not supported, so we show the banner
      setIsVisible(true);
    }

    // 4. Capture standard beforeinstallprompt (Chrome, Edge, Samsung Internet, Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback instruction if browser blocked native prompt
      alert('To install the app, tap your browser menu (⋮ or ...) and select "Install KC Agency" or "Add to Home Screen".');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setIsVisible(false);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('kc_pwa_banner_dismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Bottom PWA Install Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-stone-900/95 text-white backdrop-blur-md px-3.5 py-2.5 sm:px-6 shadow-[0_-4px_25px_rgba(0,0,0,0.35)] border-t border-stone-800 transition-all duration-300 animate-in slide-in-from-bottom">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left section: Icon + Message */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Download className="h-5 w-5 animate-bounce" />
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold tracking-wide truncate text-zinc-100">
                Install <span className="text-amber-400 font-bold">KC Agency</span> App on your Home Screen!
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-400 hidden sm:block">
                Fast one-tap launch, offline capability, and desktop/mobile app experience.
              </p>
            </div>
          </div>

          {/* Right section: Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white px-2.5 py-1.5 rounded transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Smartphone className="h-4 w-4 hidden xs:inline" />
              <span>Install App</span>
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-stone-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-amber-500" />
                Install on iOS Safari
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-stone-600">
              <p className="font-medium text-stone-800">
                To install KC Agency on your iPhone or iPad:
              </p>
              <div className="flex items-start gap-3 rounded-lg bg-stone-50 p-2.5 border border-stone-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800 text-[11px]">1</span>
                <div>
                  Tap the <strong className="text-stone-900">Share</strong> button <Share className="inline h-3.5 w-3.5 text-blue-600 mb-0.5" /> in Safari's bottom toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-stone-50 p-2.5 border border-stone-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800 text-[11px]">2</span>
                <div>
                  Scroll down and tap <strong className="text-stone-900">Add to Home Screen</strong> <PlusSquare className="inline h-3.5 w-3.5 text-stone-700 mb-0.5" />.
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-stone-50 p-2.5 border border-stone-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800 text-[11px]">3</span>
                <div>
                  Tap <strong className="text-stone-900">Add</strong> in the top right corner to finish.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400 active:scale-98 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

