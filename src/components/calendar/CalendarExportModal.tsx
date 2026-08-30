import React, { useState, useRef } from 'react';
import { ChallengeItem } from '../../schemas/challengeSchema';
import {
  createChallengeIcs,
  downloadIcsFile,
  generateGoogleCalendarUrl,
} from '../../services/calendarExportService';
import { Calendar, Download, ExternalLink, X, Clock, Check } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface CalendarExportModalProps {
  challenge: ChallengeItem;
  onClose: () => void;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  challenge,
  onClose,
}) => {
  const [selectedTime, setSelectedTime] = useState<string>('11:30');
  const [copied, setCopied] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  const [hour, minute] = selectedTime.split(':').map((v) => parseInt(v, 10));

  const handleDownloadIcs = () => {
    const ics = createChallengeIcs(challenge, new Date(), hour || 11, minute || 30);
    const safeFilename = `${challenge.id}-plan.ics`;
    downloadIcsFile(safeFilename, ics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenGoogleCalendar = () => {
    const today = new Date();
    today.setHours(hour || 11, minute || 30, 0, 0);

    const url = generateGoogleCalendarUrl({
      title: `🔥 Min Trener: ${challenge.title}`,
      description: `Gjennomfør dagens økt i ${challenge.title}.\n\nÅpne: https://mintrener.web.app`,
      startDate: today,
      durationMinutes: 5,
      recurrenceRule: `FREQ=DAILY;COUNT=${challenge.durationDays}`,
    });

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // WCAG: Lukk ved trykk på Escape-tast
  React.useEffect(() => {
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
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-export-title"
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 id="calendar-export-title" className="font-black text-sm text-white">Legg i kalender</h3>
              <p className="text-[10px] text-zinc-400">{challenge.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-1 rounded-full text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Klokkeslett-innstilling */}
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2">
          <label htmlFor="calendar-time-input" className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Når på dagen vil du trene?
          </label>
          <div className="flex items-center gap-2">
            <input
              id="calendar-time-input"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-[11px] text-zinc-400">hver dag</span>
          </div>
        </div>

        {/* Eksportknapper */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDownloadIcs}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-blue-950 flex items-center justify-center gap-2 text-xs transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Kalenderfil lastet ned!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Last ned .ics (Apple / Outlook / Mac)
              </>
            )}
          </button>

          <button
            onClick={handleOpenGoogleCalendar}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold rounded-2xl flex items-center justify-center gap-1.5 text-xs transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            Åpne i Google Kalender
          </button>
        </div>
      </div>
    </div>
  );
};
