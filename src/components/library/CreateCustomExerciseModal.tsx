import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { saveCustomExercise, CustomExerciseItem } from '../../services/customExercisesService';
import { z } from 'zod';
import { ExerciseEquipmentSchema } from '../../schemas/exerciseSchema';
import { X, Plus, Clock, Sparkles } from 'lucide-react';

interface CreateCustomExerciseModalProps {
  onClose: () => void;
  onSaved: (item: CustomExerciseItem) => void;
}

export const CreateCustomExerciseModal: React.FC<CreateCustomExerciseModalProps> = ({
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const [navn, setNavn] = useState('');
  const [kategori, setKategori] = useState<'kroppsvekt' | 'kettlebell' | 'frivekt' | 'mobilitet' | 'kondisjon' | 'annet'>('kroppsvekt');
  const [muskler, setMuskler] = useState('helkropp');
  const [utstyr, setUtstyr] = useState<string>('ingen');
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(50);
  const [instruks, setInstruks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navn.trim()) {
      setErrorMsg('Vennligst oppgi et navn på øvelsen.');
      return;
    }

    const totalSeconds = (Number(durationMinutes) || 0) * 60 + (Number(durationSeconds) || 0);
    if (totalSeconds <= 0) {
      setErrorMsg('Varigheten må være minst 1 sekund.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const validUtstyr = (utstyr.trim() || 'ingen') as z.infer<typeof ExerciseEquipmentSchema>;

      const saved = await saveCustomExercise(user?.uid, {
        navn: { nb: navn.trim() },
        kategori,
        type: 'tid',
        muskler: {
          primær: [muskler.trim() || 'helkropp'],
          sekundær: [],
        },
        utstyr: [validUtstyr],
        nivå: 'nybegynner',
        defaultDurationSeconds: totalSeconds,
        sensorProfil: 'ingen',
        bildeVinkel: 'side',
        instruks: {
          nb: instruks.trim() ? [instruks.trim()] : ['Egendefinert øvelse'],
        },
        vanligeFeil: { nb: [] },
      });

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kunne ikke lagre øvelsen.');
    } finally {
      setIsSaving(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-black text-white">Ny egendefinert øvelse</h2>
              <p className="text-[10px] text-zinc-400">Bestem navn, kategori og ønsket varighet</p>
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

        {/* Skjema */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {/* Navn */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300">Øvelsens navn *</label>
            <input
              type="text"
              required
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              placeholder="f.eks. Romaskin, Tøying av bryst, Sykling..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Kategori */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300">Kategori</label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value as any)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="kroppsvekt">Kroppsvekt</option>
              <option value="kettlebell">Kettlebell</option>
              <option value="frivekt">Frivekt / Manualer</option>
              <option value="kondisjon">Kondisjon / Kardio</option>
              <option value="mobilitet">Mobilitet & Tøying</option>
              <option value="annet">Annet / Spesial</option>
            </select>
          </div>

          {/* Varighet (Minutter & Sekunder fritt valg) */}
          <div className="space-y-1.5 p-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Standard varighet (fritt valg)</span>
            </div>
            <p className="text-[10px] text-zinc-400">
              F.eks. 15 minutter (900s), 50 sekunder, 3 minutter – velg det som passer øvelsen.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400">Minutter</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400">Sekunder</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="text-right text-[11px] font-mono text-zinc-300 font-bold pt-1">
              Totalt:{' '}
              <span className="text-emerald-400">
                {Math.floor(((durationMinutes * 60) + durationSeconds) / 60)}m {((durationMinutes * 60) + durationSeconds) % 60}s
              </span>{' '}
              ({(durationMinutes * 60) + durationSeconds} sekunder)
            </div>
          </div>

          {/* Muskler & Utstyr */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Primærmuskler</label>
              <input
                type="text"
                value={muskler}
                onChange={(e) => setMuskler(e.target.value)}
                placeholder="f.eks. lår, rygg, kjerne"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Utstyr</label>
              <input
                type="text"
                value={utstyr}
                onChange={(e) => setUtstyr(e.target.value)}
                placeholder="f.eks. romaskin, matte"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Instruks / Notat */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-300">Instruksjon eller notat</label>
            <textarea
              rows={2}
              value={instruks}
              onChange={(e) => setInstruks(e.target.value)}
              placeholder="Beskriv hvordan øvelsen utføres..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {errorMsg && (
            <div className="p-2 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Knapper */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isSaving ? 'Lagrer...' : 'Lagre øvelse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
