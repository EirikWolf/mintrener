import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getTesterChecklist,
  updateTesterChecklistItem,
  submitTesterFeedback,
  TesterChecklistItem,
} from '../../services/testerService';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { compressImageFile } from '../../services/exerciseContributionService';
import {
  ClipboardCheck,
  MessageSquarePlus,
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Star,
  Send,
  Sparkles,
  Bug,
  Lightbulb,
  Mic,
  MicOff,
  Camera,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

interface TesterFeedbackModalProps {
  onClose: () => void;
}

export const TesterFeedbackModal: React.FC<TesterFeedbackModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'manus' | 'fri'>('manus');
  const [checklist, setChecklist] = useState<TesterChecklistItem[]>(() => getTesterChecklist());

  // Fri form felter
  const [freeType, setFreeType] = useState<'fri_form' | 'feilrapport' | 'onskesituasjon'>('fri_form');
  const [freeTitle, setFreeTitle] = useState('');
  const [freeText, setFreeText] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [severity, setSeverity] = useState<'lav' | 'middels' | 'kritisk'>('lav');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  useEffect(() => {
    const handler = () => setChecklist(getTesterChecklist());
    window.addEventListener('tester-checklist-changed', handler);
    return () => window.removeEventListener('tester-checklist-changed', handler);
  }, []);

  // Klargjør Web Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'nb-NO';

      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setFreeText((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${currentTranscript}` : currentTranscript;
          });
        }
      };

      rec.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Tale-til-tekst feil:', event.error);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } catch {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Kunne ikke starte talegjenkjenning:', err);
      }
    }
  };

  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1200, 0.85);
      setScreenshotBase64(compressed);
    } catch (err) {
      console.error('Feil ved behandling av skjermbilde:', err);
    }
  };

  const handleUpdateItemStatus = (
    itemId: string,
    status: 'ikke_startet' | 'ok' | 'har_avvik',
    notes?: string
  ) => {
    updateTesterChecklistItem(itemId, status, notes);
    setChecklist(getTesterChecklist());
  };

  const handleSubmitFreeFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeText.trim()) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    submitTesterFeedback({
      type: freeType,
      title: freeTitle.trim() || undefined,
      feedbackText: freeText.trim(),
      rating,
      severity: freeType === 'feilrapport' ? severity : undefined,
      screenshotBase64: screenshotBase64 || undefined,
      userId: user?.uid,
      userName: user?.displayName || 'Betatester',
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setFreeTitle('');
      setFreeText('');
      setScreenshotBase64(null);
    }, 2000);
  };

  const completedCount = checklist.filter((i) => i.status === 'ok').length;
  const issuesCount = checklist.filter((i) => i.status === 'har_avvik').length;

  const modal = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 text-white"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tester-modal-title"
        className="w-full max-w-lg max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-3.5 relative z-[121] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="tester-modal-title" className="text-base font-black text-white flex items-center gap-1.5">
                <span>Betatesting & Tilbakemelding</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  QA-Portal
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400">Strukturert testsjekkliste og fri innmelding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk modal"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveTab('manus')}
            className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'manus'
                ? 'bg-purple-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Med manus (Sjekkliste)</span>
          </button>
          <button
            onClick={() => setActiveTab('fri')}
            className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'fri'
                ? 'bg-purple-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Uten manus (Fri form)</span>
          </button>
        </div>

        {/* Innhold */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
          {/* FANE 1: MED MANUS (SJEKKLISTE) */}
          {activeTab === 'manus' && (
            <div className="space-y-3">
              {/* Fremdriftsbar */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-zinc-400">Testfremdrift:</span>
                  <span className="text-purple-300">
                    {completedCount} av {checklist.length} godkjent
                    {issuesCount > 0 && ` (${issuesCount} med avvik)`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(completedCount / checklist.length) * 100}%` }}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${(issuesCount / checklist.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Sjekklistepunkter */}
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all space-y-2 ${
                      item.status === 'ok'
                        ? 'bg-emerald-950/20 border-emerald-800/50'
                        : item.status === 'har_avvik'
                        ? 'bg-rose-950/20 border-rose-800/50'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-white text-xs">{item.title}</h3>
                        <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          item.status === 'ok'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.status === 'har_avvik'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {item.status === 'ok'
                          ? '✓ OK'
                          : item.status === 'har_avvik'
                          ? '⚠ Avvik'
                          : 'Utestet'}
                      </span>
                    </div>

                    {/* Handlingsknapper per punkt */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/60">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemStatus(item.id, 'ok')}
                        className={`flex-1 py-1 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition-all ${
                          item.status === 'ok'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-zinc-900 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-850'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Fungerte bra</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const note = prompt('Beskriv hva som feilet eller var uklart:', item.notes || '');
                          if (note !== null) {
                            handleUpdateItemStatus(item.id, 'har_avvik', note);
                          }
                        }}
                        className={`flex-1 py-1 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition-all ${
                          item.status === 'har_avvik'
                            ? 'bg-rose-600 text-white shadow'
                            : 'bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:bg-zinc-850'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Meld avvik</span>
                      </button>
                    </div>

                    {item.notes && (
                      <p className="text-[10px] text-rose-300 bg-rose-950/40 p-2 rounded-xl border border-rose-900/40">
                        <strong>Tester-notat:</strong> {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FANE 2: UTEN MANUS (FRI FORM) */}
          {activeTab === 'fri' && (
            <form onSubmit={handleSubmitFreeFeedback} className="space-y-3">
              {isSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Takk for tilbakemeldingen! Den er registrert for utviklingsteamet.</span>
                </div>
              )}

              {/* Velg type tilbakemelding */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">
                  Hva gjelder det?
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFreeType('fri_form')}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                      freeType === 'fri_form'
                        ? 'bg-purple-600/30 border-purple-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] font-bold">Generelt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreeType('feilrapport')}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                      freeType === 'feilrapport'
                        ? 'bg-rose-600/30 border-rose-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Bug className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[10px] font-bold">Feil / Bug</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreeType('onskesituasjon')}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                      freeType === 'onskesituasjon'
                        ? 'bg-amber-600/30 border-amber-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold">Idé / Ønske</span>
                  </button>
                </div>
              </div>

              {/* Tittel (valgfri) */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">
                  Kort overskrift:
                </label>
                <input
                  type="text"
                  value={freeTitle}
                  onChange={(e) => setFreeTitle(e.target.value)}
                  placeholder="F.eks. Lyd kuttet ut etter 2 runder, eller forslag til knapp"
                  className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Fritekst med tale-til-tekst */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-zinc-400">
                    Beskrivelse:
                  </label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                        isListening
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-purple-500/30'
                      }`}
                      title={isListening ? 'Trykk for å stoppe opptak' : 'Trykk og snakk inn tilbakemeldingen (tale-til-tekst)'}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3 h-3 text-white" />
                          <span>Lytter... Trykk for å stoppe</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3 text-purple-400" />
                          <span>Snakk inn (Tale-til-tekst)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder={isListening ? 'Snakk nå... ordene dine dukker opp her i sanntid...' : 'Fortell fritt hva du opplevde, hva som var bra, hva som var forvirrende eller hva du savnet...'}
                  className={`w-full py-2 px-3 bg-zinc-950 border rounded-xl text-xs text-white focus:outline-none resize-none transition-colors ${
                    isListening ? 'border-rose-500 shadow-sm shadow-rose-500/20' : 'border-zinc-800 focus:border-purple-500'
                  }`}
                  required
                />
              </div>

              {/* Skjermbildeopplasting */}
              <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-purple-400" />
                    Legg ved skjermbilde (valgfritt):
                  </span>
                  {screenshotBase64 && (
                    <button
                      type="button"
                      onClick={() => setScreenshotBase64(null)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Fjern bilde
                    </button>
                  )}
                </div>

                {screenshotBase64 ? (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-800 max-h-40 bg-zinc-900 flex items-center justify-center">
                    <img
                      src={screenshotBase64}
                      alt="Vedlagt skjermbilde"
                      className="max-h-40 object-contain w-full"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotSelect}
                      className="hidden"
                      id="tester-screenshot-input"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 border border-dashed border-zinc-700 hover:border-purple-500/60 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Last opp eller lim inn skjermbilde</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Alvorlighetsgrad hvis feil */}
              {freeType === 'feilrapport' && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400">
                    Alvorlighetsgrad:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['lav', 'middels', 'kritisk'] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                          severity === sev
                            ? 'bg-rose-600 border-rose-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vurdering / Stjerner */}
              <div className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                  Samlet inntrykk:
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-500'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Automatisk kontekstmerknad */}
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850 text-[10px] text-zinc-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Enhetstype, skjermoppløsning og appversjon logges automatisk sammen med rapporten.</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send tilbakemelding</span>
              </button>
            </form>
          )}
        </div>

        {/* Lukk */}
        <div className="pt-2 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-2xl transition-all"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
