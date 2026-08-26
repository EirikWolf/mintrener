import React, { useState, useEffect } from 'react';
import { sensorDiagnosticsService, SensorStatus } from '../../services/sensorDiagnosticsService';
import { audioService } from '../../services/audioService';
import { speechService } from '../../services/speechService';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Volume2,
  Smartphone,
} from 'lucide-react';

interface SensorStatusModalProps {
  onClose: () => void;
}

export const SensorStatusModal: React.FC<SensorStatusModalProps> = ({ onClose }) => {
  const [statuses, setStatuses] = useState<SensorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [testedAudio, setTestedAudio] = useState(false);

  useEffect(() => {
    sensorDiagnosticsService.getSensorStatuses().then((list) => {
      setStatuses(list);
      setLoading(false);
    });
  }, []);

  const handleRequestMotion = async () => {
    const granted = await sensorDiagnosticsService.requestMotionPermission();
    if (granted) {
      const updated = await sensorDiagnosticsService.getSensorStatuses();
      setStatuses(updated);
    }
  };

  const handleTestAudio = async () => {
    await audioService.unlockAudio();
    audioService.playWorkStart(true);
    setTestedAudio(true);
    setTimeout(() => setTestedAudio(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-black text-white">Sensorstatus</h2>
              <p className="text-[10px] text-zinc-400">Hva som støttes på denne enheten</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk sensorstatus"
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sensorliste */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 mt-1">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-zinc-950/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            statuses.map((sensor) => {
              const isSupported = sensor.status === 'supported' || sensor.status === 'active';
              const isWarning = sensor.status === 'permission_required';

              return (
                <div
                  key={sensor.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isSupported
                      ? 'bg-zinc-950/60 border-zinc-800/80'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-800/40'
                      : 'bg-zinc-950/30 border-zinc-800/40 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {isSupported ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isWarning ? (
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-zinc-600 shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-white">{sensor.name}</h4>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-tight">{sensor.description}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                        isSupported
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : isWarning
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                          : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                      }`}
                    >
                      {isSupported ? 'Støttet' : isWarning ? 'Krever samtykke' : 'Ikke tilgjengelig'}
                    </span>
                  </div>

                  {/* Plattform-forklaring */}
                  {sensor.platformNotes && (
                    <div className="mt-2 text-[10px] text-zinc-400 bg-zinc-900/80 rounded-xl p-2 border border-zinc-800/60">
                      💡 {sensor.platformNotes}
                    </div>
                  )}

                  {/* Handling hvis påkrevd */}
                  {sensor.actionLabel && isWarning && (
                    <button
                      onClick={handleRequestMotion}
                      className="mt-2 w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      {sensor.actionLabel}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Lyd-test, Tale-test og Lukk */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleTestAudio}
              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-zinc-700"
            >
              <Volume2 className={`w-3.5 h-3.5 ${testedAudio ? 'text-emerald-400 animate-bounce' : ''}`} />
              {testedAudio ? 'Spilte pip!' : 'Test pipelyd'}
            </button>
            <button
              onClick={() => speechService.testVoice()}
              className="flex-1 py-2 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-800/80 active:scale-95 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              Test norsk tale
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
