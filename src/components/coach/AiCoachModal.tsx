import React, { useState, useEffect, useRef } from 'react';
import { localAiCoach, CoachMessage, CoachContext } from '../../services/localAiCoachService';
import { speechService } from '../../services/speechService';
import {
  Sparkles,
  Send,
  X,
  Volume2,
  VolumeX,
  ShieldCheck,
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AiCoachModalProps {
  onClose: () => void;
  context: CoachContext;
  onSelectWorkoutById?: (id: string) => void;
}

const QUICK_PROMPTS = [
  '💡 Hva bør jeg trene i dag?',
  '🏋️ Tips for perfekt knebøy',
  '🤕 Hvordan unngå vondt i korsryggen?',
  '📈 Hvordan øker jeg progresjonen?',
  '🛌 Raskere restitusjon & stølhet',
  '🔥 Gi meg litt ekstra motivasjon!',
];

export const AiCoachModal: React.FC<AiCoachModalProps> = ({
  onClose,
  context,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CoachMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'coach',
      text: localAiCoach.generateDailyBriefing(context),
      timestamp: Date.now(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  // WCAG: Lukk med Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Autoscroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim()) return;

    const userMsg: CoachMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userText) setInput('');
    setIsTyping(true);

    try {
      const replyText = await localAiCoach.askCoach(textToSend, context);
      
      const coachMsg: CoachMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, coachMsg]);

      // Les opp med stemme hvis aktivert
      if (voiceSpeechEnabled) {
        speechService.speak(replyText);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'coach',
          text: 'Beklager, jeg fikk en liten hikke. Prøv igjen!',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-coach-title"
        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg h-[90vh] sm:h-[650px] flex flex-col overflow-hidden shadow-2xl focus:outline-none"
      >
        {/* Topplinje */}
        <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 id="ai-coach-title" className="font-black text-sm text-white">Astrid • AI-Trener</h3>
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Lokal AI
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-400" /> 100% on-device & privat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const next = !voiceSpeechEnabled;
                setVoiceSpeechEnabled(next);
                if (next) {
                  speechService.speak('Stemmeveiledning aktivert.');
                }
              }}
              role="switch"
              aria-checked={voiceSpeechEnabled}
              aria-label="Stemmeveiledning"
              title={voiceSpeechEnabled ? 'Slå av stemme' : 'Slå på stemme'}
              className={`p-2 rounded-xl border transition-all ${
                voiceSpeechEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
            >
              {voiceSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Lukk"
              className="p-2 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-xl border border-zinc-700/50 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meldingsområde */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                    : 'bg-zinc-800/90 text-zinc-200 rounded-bl-none border border-zinc-700/60 shadow-md'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[9px] text-zinc-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-1.5 p-3 bg-zinc-800/60 border border-zinc-700/40 rounded-2xl w-fit text-xs text-zinc-400 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Astrid tenker...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Hurtigvalg-chips */}
        <div className="px-3 pt-2 pb-1 bg-zinc-950/40 border-t border-zinc-800/60 overflow-x-auto whitespace-nowrap no-scrollbar flex gap-1.5">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full text-[11px] font-medium border border-zinc-700/60 shrink-0 transition-all active:scale-95"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Inputfelt */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-zinc-950/90 border-t border-zinc-800 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Spør Astrid om teknikk, råd eller økter..."
            className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-zinc-950 font-bold rounded-xl shadow-md transition-all active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
