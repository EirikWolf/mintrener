import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  GpsPoint,
  GpsWorkoutSession,
  calculateDistanceMeters,
  formatPace,
  downloadGpxFile,
} from '../../services/gpsTrackingService';
import { useAuth } from '../../contexts/AuthContext';
import { saveCompletedWorkout } from '../../services/firestoreService';
import { Navigation, Play, Pause, Square, Download, X, Footprints, Bike, CheckCircle2 } from 'lucide-react';

interface GpsTrackerModalProps {
  onClose: () => void;
}

export const GpsTrackerModal: React.FC<GpsTrackerModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activityType, setActivityType] = useState<'lop' | 'ga' | 'sykkel'>('lop');
  const [status, setStatus] = useState<'idle' | 'tracking' | 'paused' | 'finished'>('idle');
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoPauseEnabled, setAutoPauseEnabled] = useState<boolean>(true);
  const [isAutoPaused, setIsAutoPaused] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastPointRef = useRef<GpsPoint | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const stationaryTickRef = useRef<number>(0);

  // Sekundteller med støtte for auto-pause ved stillstand
  useEffect(() => {
    if (status === 'tracking' && !isAutoPaused) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, isAutoPaused]);

  const startTracking = () => {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolokasjon (GPS) støttes ikke i denne nettleseren.');
      return;
    }

    setErrorMsg(null);
    setStatus('tracking');
    setIsAutoPaused(false);
    stationaryTickRef.current = 0;
    startTimeRef.current = Date.now();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const speed = pos.coords.speed;

        // Auto-pause ved stillstand (fart under 0.4 m/s over 3 målinger)
        if (autoPauseEnabled) {
          if (speed !== null && speed < 0.4) {
            stationaryTickRef.current += 1;
            if (stationaryTickRef.current >= 3) {
              setIsAutoPaused(true);
            }
          } else if (speed !== null && speed >= 0.6) {
            stationaryTickRef.current = 0;
            setIsAutoPaused(false);
          }
        }

        const newPoint: GpsPoint = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        };

        if (lastPointRef.current) {
          const deltaMeters = calculateDistanceMeters(
            lastPointRef.current.latitude,
            lastPointRef.current.longitude,
            newPoint.latitude,
            newPoint.longitude
          );
          // Filtrer bort GPS jitter (kun legg til hvis bevegelse > 1.2 meter)
          if (deltaMeters > 1.2 && (!autoPauseEnabled || !isAutoPaused)) {
            setDistanceMeters((prev) => prev + deltaMeters);
          }
        }

        lastPointRef.current = newPoint;
        setCurrentSpeed(pos.coords.speed);
        setPoints((prev) => [...prev, newPoint]);
      },
      (err) => {
        console.warn('GPS feil:', err);
        setErrorMsg('Vennligst godkjenn posisjonstilgang for å måle rute og distanse.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  };

  const pauseTracking = () => {
    setStatus('paused');
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const resumeTracking = () => {
    startTracking();
  };

  const finishTracking = async () => {
    setStatus('finished');
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const distKm = (distanceMeters / 1000).toFixed(2);
    const actName = activityType === 'lop' ? 'Løpetur (GPS)' : activityType === 'sykkel' ? 'Sykkeltur (GPS)' : 'Gåtur (GPS)';

    await saveCompletedWorkout(user?.uid, {
      workoutId: `gps-${Date.now()}`,
      workoutName: `${actName} • ${distKm} km`,
      workoutType: 'gps',
      durationSeconds: elapsedSeconds,
      roundsCompleted: 1,
      totalRounds: 1,
    });
  };

  const completedSession: GpsWorkoutSession = {
    id: `gps-session-${Date.now()}`,
    activityType,
    startTime: startTimeRef.current,
    endTime: Date.now(),
    totalDistanceMeters: distanceMeters,
    elapsedSeconds,
    averageSpeedKmh: elapsedSeconds > 0 ? (distanceMeters / elapsedSeconds) * 3.6 : 0,
    currentPaceMinKm: formatPace(currentSpeed),
    points,
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  const distanceKm = (distanceMeters / 1000).toFixed(2);

  // WCAG: Lukk ved trykk på Escape-tast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'tracking') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, status]);

  const modal = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== 'tracking') onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gps-modal-title"
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 relative z-[101]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Navigation className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 id="gps-modal-title" className="text-base font-black text-white">GPS Utendørsøkt</h2>
              <p className="text-[10px] text-zinc-400">Distanse, tempo & GPX-eksport</p>
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

        {errorMsg && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {status === 'idle' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Velg aktivitetstype</label>
              <div role="radiogroup" aria-label="Velg aktivitetstype" className="grid grid-cols-3 gap-2">
                <button
                  role="radio"
                  aria-checked={activityType === 'lop'}
                  onClick={() => setActivityType('lop')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    activityType === 'lop'
                      ? 'bg-emerald-950/80 border-emerald-500 text-white font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <Footprints className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs">Løp</span>
                </button>
                <button
                  role="radio"
                  aria-checked={activityType === 'ga'}
                  onClick={() => setActivityType('ga')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    activityType === 'ga'
                      ? 'bg-emerald-950/80 border-emerald-500 text-white font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <Footprints className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs">Gå</span>
                </button>
                <button
                  role="radio"
                  aria-checked={activityType === 'sykkel'}
                  onClick={() => setActivityType('sykkel')}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                    activityType === 'sykkel'
                      ? 'bg-emerald-950/80 border-emerald-500 text-white font-bold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <Bike className="w-5 h-5 text-amber-400" />
                  <span className="text-xs">Sykkel</span>
                </button>
              </div>

              {/* Auto-pause bryter */}
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-xs text-zinc-300 font-medium">Auto-pause ved stillstand (rødt lys)</span>
                <button
                  role="switch"
                  aria-checked={autoPauseEnabled}
                  aria-label="Auto-pause ved stillstand"
                  onClick={() => setAutoPauseEnabled((p) => !p)}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${autoPauseEnabled ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoPauseEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <button
              onClick={startTracking}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-base"
            >
              <Play className="w-5 h-5 fill-current" />
              Start GPS-økt
            </button>
          </div>
        )}

        {(status === 'tracking' || status === 'paused') && (
          <div className="space-y-4 text-center">
            {/* Auto-pause statusindikator */}
            {isAutoPaused && status === 'tracking' && (
              <div className="py-1 px-3 bg-amber-500/20 border border-amber-500/60 rounded-xl text-amber-300 font-bold text-xs animate-pulse flex items-center justify-center gap-1.5 shadow-sm">
                <span>⏸️ Auto-pause aktiv (stillstand registrert)</span>
              </div>
            )}

            {/* Distanse Stort */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Distanse
              </span>
              <div className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                {distanceKm} <span className="text-xl text-emerald-400 font-sans font-bold">km</span>
              </div>
            </div>

            {/* Tid & Tempo */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Tid</span>
                <p className="text-xl font-black font-mono text-cyan-400 mt-0.5">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Tempo</span>
                <p className="text-sm font-black font-mono text-amber-400 mt-1">
                  {formatPace(currentSpeed)}
                </p>
              </div>
            </div>

            {/* Knapper */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {status === 'tracking' ? (
                <button
                  onClick={pauseTracking}
                  className="py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={resumeTracking}
                  className="py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Fortsett
                </button>
              )}

              <button
                onClick={finishTracking}
                className="py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs"
              >
                <Square className="w-4 h-4 fill-current" />
                Avslutt økt
              </button>
            </div>
          </div>
        )}

        {status === 'finished' && (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">GPS-økt fullført!</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {distanceKm} km på {formatTime(elapsedSeconds)} ({activityType.toUpperCase()})
              </p>
            </div>

            {/* GPX Eksportknapp for Strava/Garmin */}
            <button
              onClick={() => downloadGpxFile(completedSession)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-xs transition-all shadow-md shadow-cyan-600/20"
            >
              <Download className="w-4 h-4" />
              Last ned GPX-fil (for Strava / Garmin)
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
            >
              Lukk
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
