import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WorkoutTemplate } from '../../types/workout';
import { useAuth } from '../../contexts/AuthContext';
import {
  GroupRoomState,
  createGroupRoom,
  joinGroupRoom,
  subscribeToGroupRoom,
  startGroupWorkout,
} from '../../services/groupRoomService';
import { estimateServerClockOffset, getServerNow } from '../../services/clockSyncService';
import { Users, X, Play, Copy, Check, Radio, Sparkles, ArrowRight } from 'lucide-react';

interface GroupRoomModalProps {
  workout: WorkoutTemplate;
  onClose: () => void;
  onStartSyncedWorkout: (roomState: GroupRoomState) => void;
}

export const GroupRoomModal: React.FC<GroupRoomModalProps> = ({
  workout,
  onClose,
  onStartSyncedWorkout,
}) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [roomState, setRoomState] = useState<GroupRoomState | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hindrer at felles-starten trigges flere ganger (onSnapshot kan fyre igjen mens vi venter)
  const hasStartedRef = useRef(false);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Vert oppretter rom
  const handleCreateRoom = async () => {
    setErrorMsg(null);
    try {
      const code = await createGroupRoom(
        user?.uid || 'anon-host',
        user?.displayName || 'Vert / Instruktør',
        workout
      );
      setRoomCode(code);
      // Varm opp klokkeoffset-cachen mens vi venter på deltakere, så selve starten
      // ikke må vente på en fersk måling. Fire-and-forget: funksjonen kaster aldri.
      void estimateServerClockOffset();
    } catch (err: any) {
      setErrorMsg('Kunne ikke opprette rom. Prøv igjen.');
    }
  };

  // Deltaker blir med i rom
  const handleJoinRoom = async () => {
    if (inputCode.trim().length < 6) {
      setErrorMsg('Tast inn en 6-tegns romkode.');
      return;
    }

    setIsJoining(true);
    setErrorMsg(null);
    try {
      const room = await joinGroupRoom(inputCode);
      if (room) {
        setRoomState(room);
        setRoomCode(room.roomId);
        // Samme oppvarming som verten gjør, se handleCreateRoom.
        void estimateServerClockOffset();
      } else {
        setErrorMsg('Fant ikke noe aktivt rom med den koden.');
      }
    } catch (err) {
      setErrorMsg('Feil ved tilkobling til rom.');
    } finally {
      setIsJoining(false);
    }
  };

  // Lytt til romoppdateringer
  useEffect(() => {
    if (!roomCode) return;

    const unsubscribe = subscribeToGroupRoom(roomCode, (state) => {
      if (state) {
        setRoomState(state);
        // Hvis verten har startet økten, start timeren for deltakeren (og verten selv)!
        if (state.status === 'running' && !hasStartedRef.current) {
          hasStartedRef.current = true;

          const beginSyncedWorkout = () => {
            // Nullstill FØR callbackene kjører: cleanup som løper etter en normal (fyrt)
            // start skal ikke tolke dette som en avbrutt, uferdig start og resette guarden.
            startTimeoutRef.current = null;
            onStartSyncedWorkout(state);
            onClose();
          };

          if (typeof state.startAtServerMs === 'number') {
            // Klokkesynkronisert start: alle klienter venter til samme serverklokke-tidspunkt,
            // uavhengig av avvik mellom enhetenes egne veggklokker. Se clockSyncService.
            const delayMs = Math.max(0, state.startAtServerMs - getServerNow());
            startTimeoutRef.current = setTimeout(beginSyncedWorkout, delayMs);
          } else {
            // Fallback for eldre rom/klienter uten startAtServerMs: uendret gammel oppførsel.
            beginSyncedWorkout();
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (startTimeoutRef.current) {
        // Timeout var IKKE fyrt ennå (beginSyncedWorkout ville ha nullstilt den selv).
        // TimerDisplay re-rendrer stadig mens en pulssensor er tilkoblet, som gir
        // onClose/onStartSyncedWorkout ny identitet og trigger denne cleanupen midt i
        // 3s-ventetiden. Vi må derfor nullstille guarden også, slik at det gjenabonnerte
        // onSnapshot-kallet (som fyrer umiddelbart med status 'running') får lov til å
        // planlegge en ny, korrekt omregnet forsinkelse i stedet for å bli blokkert.
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
        hasStartedRef.current = false;
      }
    };
  }, [roomCode, onStartSyncedWorkout, onClose]);

  const handleStartAsHost = async () => {
    if (!roomCode || isStarting) return;
    setErrorMsg(null);
    // Sperr knappen med det samme: et andre trykk ville skrevet en ny startAtServerMs
    // og dermed forskjøvet starttidspunktet for klienter som allerede har planlagt sin.
    setIsStarting(true);
    try {
      await startGroupWorkout(roomCode);
      // Selve overgangen til økten skjer i onSnapshot-lytteren over (klokkesynkronisert),
      // slik at verten starter i takt med deltakerne i stedet for øyeblikkelig.
    } catch (err) {
      setErrorMsg('Kunne ikke starte økten. Prøv igjen.');
      setIsStarting(false);
    }
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // WCAG: Lukk ved trykk på Escape-tast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modal = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-room-title"
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 relative z-[101]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 id="group-room-title" className="text-base font-black text-white">Grupperom (Synkront)</h2>
              <p className="text-[10px] text-zinc-400">Tren sammen i samme rom eller på avstand</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Velger */}
        {!roomCode && (
          <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 shrink-0">
            <button
              onClick={() => setTab('create')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'create'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Opprett rom (Vert)
            </button>
            <button
              onClick={() => setTab('join')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'join'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Bli med i rom
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* 1. Opprett Rom (Før opprettelse) */}
        {tab === 'create' && !roomCode && (
          <div className="space-y-4">
            <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Valgt økt:</span>
              <p className="text-xs font-bold text-white truncate">{workout.name}</p>
              <p className="text-[10px] text-zinc-400">
                {workout.items.length} øvelser • {workout.rounds} {workout.rounds === 1 ? 'runde' : 'runder'}
              </p>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 active:scale-95 text-white font-black rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Opprett rom & generer kode
            </button>
          </div>
        )}

        {/* 2. Vert i aktivt rom */}
        {tab === 'create' && roomCode && (
          <div className="space-y-4 text-center">
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-5 space-y-2">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                Romkode for kollegaer / familie
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-black font-mono tracking-widest text-white">
                  {roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  title="Kopier romkode"
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">
                Deltakere åpner mintrener.web.app og taster inn koden.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>{roomState?.participantCount || 1} i rommet (klare)</span>
            </div>

            <button
              onClick={handleStartAsHost}
              disabled={isStarting}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 disabled:opacity-60 disabled:pointer-events-none text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 text-base"
            >
              <Play className="w-5 h-5 fill-current" />
              {isStarting ? 'Starter om 3 sekunder...' : 'Start felles økt for alle!'}
            </button>
          </div>
        )}

        {/* 3. Bli med i rom */}
        {tab === 'join' && !roomState && (
          <div className="space-y-4">
            <div className="space-y-1.5 text-center">
              <label htmlFor="group-room-code-input" className="text-xs font-bold text-zinc-300">Tast inn 6-tegns romkode</label>
              <input
                id="group-room-code-input"
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="f.eks. K7M9P2"
                className="w-full py-3 text-center font-mono text-2xl font-black bg-zinc-950 border border-zinc-800 rounded-2xl text-white tracking-widest focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={isJoining}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 active:scale-95 text-white font-black rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              {isJoining ? 'Kobler til...' : 'Bli med i rommet'}
            </button>
          </div>
        )}

        {/* 4. Deltaker tilkoblet og venter på start */}
        {tab === 'join' && roomState && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-500 text-purple-400 flex items-center justify-center mx-auto animate-bounce">
              <Radio className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Tilkoblet rom {roomCode}!</h3>
              <p className="text-xs text-zinc-300">
                Økt: <strong>{roomState.workout.name}</strong>
              </p>
              <p className="text-[11px] text-purple-300 font-medium">
                Venter på at verten ({roomState.hostName}) skal starte økten...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
