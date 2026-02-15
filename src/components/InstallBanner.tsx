"use client";

import { useState, useEffect } from "react";

const DISMISSED_KEY = "pwa_install_dismissed";

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already in standalone PWA mode — don't show
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    if (isStandalone) return;

    // Already dismissed
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    // Detect iOS (including iPads that report as Mac)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    setIsIOS(ios);

    // Show on mobile devices (iOS + Android)
    const isMobile = ios || /Android/i.test(navigator.userAgent);
    if (isMobile) {
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 animate-slide-up">
      <div className="max-w-md mx-auto bg-surface border border-default rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-primary text-sm font-semibold mb-1">
              Add Fork It Over to your home screen
            </p>
            <p className="text-secondary text-xs leading-relaxed">
              {isIOS ? (
                <>
                  Tap the share button{" "}
                  <span className="inline-block align-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 inline">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3-3m0 0l3 3m-3-3v12" />
                    </svg>
                  </span>
                  {" "}in Safari, then tap <strong>&quot;Add to Home Screen&quot;</strong>
                </>
              ) : (
                <>
                  Tap the menu button <strong>&#8942;</strong> in Chrome, then tap <strong>&quot;Add to Home Screen&quot;</strong>
                </>
              )}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-secondary hover:text-primary transition-colors p-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
