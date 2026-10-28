import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Monitor, Info, CheckCircle2 } from 'lucide-react';

/**
 * PWA Install Prompt Banner
 * Displays a persistent bottom banner inviting the user to install KC Agency on their device / home screen.
 * Works seamlessly across Chrome, Edge, Android, iOS Safari, and local IP/HTTPS environments.
 */
export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator?.standalone ||
      document.referrer?.includes('android-app://');
    if (isStandalone) return false;
    return !sessionStorage.getItem('kc_pwa_banner_dismissed');
  });

  const [isIOS, setIsIOS] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  useEffect(() => {
    // 1. Standalone check
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator?.standalone ||
      document.referrer?.includes('android-app://');

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    // 2. Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // 3. Listen for browser native beforeinstallprompt (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('kc_pwa_banner_dismissed')) {
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
    // Case 1: Native Chrome/Edge deferred prompt is ready
    if (deferredPrompt) {
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
      return;
    }

    // Case 2: On iOS or plain HTTP IP (where Chrome suppresses native prompt), show the step-by-step guidance modal
    setShowInstructionsModal(true);
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
      {/* Bottom PWA Install Banner matching the user's reference design */}
      <div className="fixed bottom-0 left-0 right-0 z-[99999] bg-stone-900/95 text-white backdrop-blur-md px-3.5 py-2.5 sm:px-6 shadow-[0_-4px_25px_rgba(0,0,0,0.4)] border-t border-stone-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left section: Icon + Text */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Download className="h-5 w-5 animate-bounce" />
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold tracking-wide truncate text-zinc-100">
                Install <span className="text-amber-400 font-bold">KC Agency</span> App on your Home Screen!
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-400 hidden sm:block">
                One-click desktop/mobile app launch, fast offline billing & smoother performance.
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
              className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="h-4 w-4" />
              <span>Install App</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Installation Modal (For HTTP IP or iOS or manual browser install) */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 text-stone-900 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Download className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-stone-900 leading-tight">Install KC Agency App</h3>
                  <p className="text-[11px] text-stone-500">Add to your Desktop or Mobile Home Screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {isIOS ? (
                /* iOS Safari instructions */
                <>
                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 border border-stone-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-stone-950 text-xs">1</span>
                    <p className="text-xs text-stone-700">
                      Tap the <strong className="text-stone-950">Share</strong> button <Share className="inline h-3.5 w-3.5 text-blue-600 mb-0.5" /> in Safari's bottom bar.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 border border-stone-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-stone-950 text-xs">2</span>
                    <p className="text-xs text-stone-700">
                      Scroll down and tap <strong className="text-stone-950">Add to Home Screen</strong> <PlusSquare className="inline h-3.5 w-3.5 text-stone-800 mb-0.5" />.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 border border-stone-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-stone-950 text-xs">3</span>
                    <p className="text-xs text-stone-700">
                      Tap <strong className="text-stone-950">Add</strong> in the top right corner.
                    </p>
                  </div>
                </>
              ) : (
                /* Chrome / Edge / Desktop / Android instructions */
                <>
                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 border border-stone-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-stone-950 text-xs">1</span>
                    <p className="text-xs text-stone-700">
                      Click the <strong className="text-stone-950">Three Dots Menu (⋮)</strong> at the top-right corner of your browser.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 border border-stone-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-stone-950 text-xs">2</span>
                    <p className="text-xs text-stone-700">
                      Click <strong className="text-stone-950">"Install KC Agency..."</strong> or hover on <strong className="text-stone-950">"Save and share" ➔ "Install page as app"</strong> (or <strong className="text-stone-950">"Add to Home screen"</strong> on Android).
                    </p>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3 border border-stone-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-stone-950 text-xs">3</span>
                    <p className="text-xs text-stone-700">
                      Confirm by clicking <strong className="text-stone-950">"Install"</strong> in the popup.
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50/80 p-3 border border-amber-200/80 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      <strong>Tip:</strong> If you open the app at <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">http://localhost:4173</code> (or <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">localhost:5173</code>), Chrome enables automatic 1-click install prompt!
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstructionsModal(false)}
              className="mt-5 w-full rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white hover:bg-stone-800 active:scale-98 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
