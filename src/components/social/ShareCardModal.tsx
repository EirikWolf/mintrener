import React, { useState, useEffect } from 'react';
import { ShareCardData, generateShareCardBlob, shareOrDownloadCard } from '../../services/shareCardService';
import {
  Share2,
  X,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';

interface ShareCardModalProps {
  cardData: ShareCardData;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  cardData,
  onClose,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let url = '';

    generateShareCardBlob(cardData)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch((err) => {
        console.error('Feil ved generering av forhåndsvisning:', err);
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [cardData]);

  const handleShare = async () => {
    setIsSharing(true);
    setShareSuccess(null);
    try {
      const res = await shareOrDownloadCard(cardData);
      if (res.shared) {
        setShareSuccess('Delt!');
      } else if (res.downloaded) {
        setShareSuccess('Bilde lastet ned!');
      }
      setTimeout(() => setShareSuccess(null), 2500);
    } finally {
      setIsSharing(false);
    }
  };

  // WCAG: Lukk ved trykk på Escape-tast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 text-white"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-card-title"
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 text-center"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 id="share-card-title" className="font-black text-sm text-white">Del din bragd</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-1 rounded-full text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bilde-forhåndsvisning */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Delingskort"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Genererer delingskort...</span>
            </div>
          )}
        </div>

        {/* Delingsknapper */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleShare}
            disabled={!previewUrl || isSharing}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : shareSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                {shareSuccess}
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Del eller Last ned bilde
              </>
            )}
          </button>

          <p className="text-[10px] text-zinc-400">
            Kortet kan deles direkte til Teams, Slack, Instagram eller melding.
          </p>
        </div>
      </div>
    </div>
  );
};
