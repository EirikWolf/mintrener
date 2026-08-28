import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPromptModal: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // Sjekk om appen allerede kjører som standalone PWA
    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isAppStandalone);

    // Detekter iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Fang Android / Chrome install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsOpen(false);
      }
    } else {
      setIsOpen(true);
    }
  };

  // WCAG: Lukk ved trykk på Escape-tast
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Hvis allerede installert og åpnet som app, trenger vi ikke vise knappen
  if (isStandalone) {
    return null;
  }

  const modal = isOpen ? (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-modal-title"
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 relative z-[101]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="pwa-modal-title" className="text-base font-black text-white">Installer Min Trener</h2>
              <p className="text-[10px] text-zinc-400">Raskere start & fullskjerm-opplevelse</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Lukk"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Innhold basert på OS */}
        {isIos ? (
          <div className="space-y-3 text-xs text-zinc-300">
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              For å installere på <strong>iPhone / iPad</strong>:
            </p>
            <div className="space-y-2 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-200">
                  Trykk på <strong>Del-knappen</strong> <Share className="w-4 h-4 text-cyan-400 inline" /> i Safari.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-200">
                  Scroll ned og velg <strong>«Legg til på Hjem-skjerm»</strong> <PlusSquare className="w-4 h-4 text-emerald-400 inline" />.
                </span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400">
              Appen får da eget ikon på hjemskjermen, åpnes i ren fullskjerm og fungerer 100 % offline!
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-zinc-300">
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Installer appen på din Android-telefon for lynrask tilgang, fullskjerm uten nettleserlinjer og full støtte for Bluetooth pulssensorer.
            </p>
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Installer på hjemskjerm nå
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setIsOpen(false)}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
        >
          Lukk
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Diskré installer-knapp i topplinjen */}
      <button
        onClick={() => (deferredPrompt ? handleInstallClick() : setIsOpen(true))}
        title="Installer appen på hjemskjerm"
        className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-[10px] font-bold text-emerald-400 hover:bg-emerald-900 transition-all flex items-center gap-1 shadow-sm active:scale-95"
      >
        <Download className="w-2.5 h-2.5" />
        <span className="hidden xs:inline">Installer</span>
      </button>

      {typeof document !== 'undefined' && modal && createPortal(modal, document.body)}
    </>
  );
};
