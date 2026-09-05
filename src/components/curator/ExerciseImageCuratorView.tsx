import React, { useState, useEffect } from 'react';
import { EXERCISE_LIBRARY } from '../../data/exercises';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircle2,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Filter,
  Eye,
  ShieldAlert,
} from 'lucide-react';

import { INITIAL_CURATION_FEEDBACK, INITIAL_CURATOR_VALG, FeedbackEntry } from '../../data/curatorFeedback';

interface FeedbackMap {
  [exerciseIdPhase: string]: FeedbackEntry;
}

const STORAGE_KEY = 'mintrener_image_curator_feedback';
/**
 * Valgt kandidat per bilde, atskilt fra tilbakemeldingene.
 *
 * Et seed-valg og en tekstlig anmerkning er to ulike ting: valget sier hvilken
 * av tre genereringer som skal inn i appen, anmerkningen sier hva som er galt
 * med den som ligger der nå. Å blande dem i én nøkkel ville gjort det umulig å
 * si «denne kandidaten er valgt, men den har fortsatt en feil».
 */
const VALG_KEY = 'mintrener_image_curator_valg';

/** Skrives av scripts/publiserKandidater.ts. Nøkkel → tilgjengelige seeds. */
type Kandidatmanifest = Record<string, string[]>;

interface ExerciseImageCuratorViewProps {
  onNavigateToTimer?: () => void;
}

export const ExerciseImageCuratorView: React.FC<ExerciseImageCuratorViewProps> = ({
  onNavigateToTimer,
}) => {
  const { user } = useAuth();
  const [kandidater, setKandidater] = useState<Kandidatmanifest>({});
  /**
   * Nøkkelen som vises i stor visning, eller null.
   *
   * Miniatyrene er for små til å bedømme en positur — det er nettopp det som
   * skal vurderes, om albuen er 90 grader og ryggen er strak. Valget tas derfor
   * i stor visning, ikke fra stripa.
   */
  const [forstørret, setForstørret] = useState<string | null>(null);
  const [valg, setValg] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(VALG_KEY);
      if (stored) {
        return { ...INITIAL_CURATOR_VALG, ...JSON.parse(stored) };
      }
    } catch {}
    return INITIAL_CURATOR_VALG;
  });

  // Manifestet er valgfritt: har man ikke kjørt publiserKandidater, skal siden
  // fungere nøyaktig som før i stedet for å feile.
  useEffect(() => {
    fetch('/images/kandidater/manifest.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setKandidater)
      .catch(() => setKandidater({}));
  }, []);

  // Esc lukker, 1–3 velger. En kurering er hundrevis av valg; da teller det å
  // slippe å flytte hånda til musa for hvert enkelt.
  useEffect(() => {
    if (!forstørret) return;
    const påTast = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setForstørret(null);
      const n = Number(e.key);
      const seeds = kandidater[forstørret] ?? [];
      if (n >= 1 && n <= seeds.length) velgKandidat(forstørret, seeds[n - 1]);
    };
    window.addEventListener('keydown', påTast);
    return () => window.removeEventListener('keydown', påTast);
  });

  const velgKandidat = (nøkkel: string, seed: string) => {
    const neste = { ...valg };
    // Klikk på det valgte fjerner valget. Uten det kan man ikke ombestemme seg
    // til «ingen av dem duger» etter først å ha valgt en.
    if (neste[nøkkel] === seed) delete neste[nøkkel];
    else neste[nøkkel] = seed;
    setValg(neste);
    localStorage.setItem(VALG_KEY, JSON.stringify(neste));
    setSuccessMsg(neste[nøkkel] ? `${nøkkel}: valgte ${seed}` : `${nøkkel}: valg fjernet`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };
  const [exercises] = useState<ExerciseItem[]>(EXERCISE_LIBRARY);
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [feedbackMap, setFeedbackMap] = useState<FeedbackMap>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...INITIAL_CURATION_FEEDBACK, ...JSON.parse(raw) };
      }
    } catch {}
    return INITIAL_CURATION_FEEDBACK;
  });
  const [reordering, setReordering] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setFeedbackMap({ ...INITIAL_CURATION_FEEDBACK, ...JSON.parse(raw) });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CURATION_FEEDBACK));
      }
    } catch {}
  }, []);

  const saveFeedback = (key: string, feedback: string, status: 'mangler' | 'generert' | 'godkjent' | 'regenerer' | 'ubehandlet') => {
    const updated: FeedbackMap = {
      ...feedbackMap,
      [key]: {
        feedback,
        status,
        updatedAt: new Date().toISOString(),
      },
    };
    setFeedbackMap(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleApprove = (exerciseId: string, phaseIndex: number) => {
    const key = `${exerciseId}-${phaseIndex}`;
    const current = feedbackMap[key]?.feedback || '';
    saveFeedback(key, current, 'godkjent');
    setSuccessMsg(`Fase ${phaseIndex + 1} for ${exerciseId} er godkjent!`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleRequestRegeneration = async (exercise: ExerciseItem, phaseIndex: number) => {
    const key = `${exercise.id}-${phaseIndex}`;
    const currentFeedback = feedbackMap[key]?.feedback || '';
    saveFeedback(key, currentFeedback, 'regenerer');
    setReordering(key);

    setSuccessMsg(`Bestilling registrert for ${exercise.navn.nb} (Fase ${phaseIndex + 1})`);
    setTimeout(() => {
      setReordering(null);
      setSuccessMsg(null);
    }, 2000);
  };

  /**
   * Eksporterer kureringen som JSON.
   *
   * Tilbakemeldingene bodde bare i localStorage, i den nettleseren de ble
   * skrevet i. Kurerte du på telefonen, ble de liggende på telefonen — og den
   * som skulle bruke dem til å rette promptene kom aldri til dem.
   *
   * Eksporten tar med ØVELSENS NÅVÆRENDE PROMPT og kameravinkel ved siden av
   * kommentaren. Uten det må mottakeren slå opp hver enkelt for å se hva som
   * faktisk ble bestilt, og det er nettopp der forskjellen mellom «modellen
   * bommet» og «vi ba om feil ting» ligger.
   */
  const byggEksport = () => {
    const rader = exercises.flatMap((ex) =>
      [0, 1].map((fase) => {
        const post = feedbackMap[`${ex.id}-${fase}`];
        return {
          øvelse: ex.id,
          navn: ex.navn.nb,
          fase,
          status: post?.status ?? 'ubehandlet',
          kommentar: post?.feedback ?? '',
          vurdertAt: post?.updatedAt ?? null,
          kameravinkel: ex.bildeVinkel ?? 'side',
          valgtKandidat: valg[`${ex.id}-${fase}`] ?? null,
          nåværendePrompt: ex.bildePrompt?.[String(fase)] ?? null,
        };
      })
    );
    return {
      eksportertAt: new Date().toISOString(),
      antall: rader.length,
      godkjent: rader.filter((r) => r.status === 'godkjent').length,
      tilRegenerering: rader.filter((r) => r.status === 'regenerer').length,
      rader,
    };
  };

  const handleEksporter = () => {
    const blob = new Blob([JSON.stringify(byggEksport(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kurering-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg('Kurering eksportert som JSON.');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleKopier = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(byggEksport(), null, 2));
      setSuccessMsg('Kurering kopiert til utklippstavlen.');
    } catch {
      // Utklippstavlen kan være blokkert. Da er nedlastingsknappen veien.
      setSuccessMsg('Kunne ikke kopiere — bruk «Last ned» i stedet.');
    }
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const categories = ['alle', 'kroppsvekt', 'kettlebell', 'frivekt', 'mobilitet', 'kondisjon'];

  const filtered = selectedCategory === 'alle'
    ? exercises
    : exercises.filter((e) => e.kategori === selectedCategory);

  const approvedCount = Object.values(feedbackMap).filter((v) => v.status === 'godkjent').length;
  const totalPhases = exercises.length * 2;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto px-4 text-center space-y-4">
        <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-white">Krever innlogging</h2>
        <p className="text-xs text-zinc-400">
          Bildekurator og QA-verktøyet er kun tilgjengelig for påloggede administratorer.
        </p>
        {onNavigateToTimer && (
          <button
            onClick={onNavigateToTimer}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-800 transition-all"
          >
            ← Tilbake til I dag
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 pt-2 pb-6 select-none overflow-hidden">
      {/* Topplinje */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          {onNavigateToTimer && (
            <button
              onClick={onNavigateToTimer}
              title="Tilbake til I dag / Forside"
              aria-label="Tilbake til I dag"
              className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
            >
              <span className="text-xs font-bold text-emerald-400">← I dag</span>
            </button>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              Bildekurator & QA-Dashboard
            </h1>
            <p className="text-xs text-zinc-400">
              Kuratér, gi tilbakemelding og bestill regenerering fra Kitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Eksport, fordi kureringen ellers bare bor i denne nettleseren. */}
          <button
            onClick={handleEksporter}
            title="Last ned kureringen som JSON, med hver øvelses nåværende prompt ved siden av kommentaren"
            className="px-2.5 py-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
          >
            Last ned
          </button>
          <button
            onClick={handleKopier}
            title="Kopiér kureringen til utklippstavlen"
            className="px-2.5 py-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
          >
            Kopiér
          </button>
          <button
            onClick={() => {
              if (window.confirm('Nullstill nettleserens lokale overstyringer og synkroniser godkjenninger og kandidatvalg fra kodebasen?')) {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(VALG_KEY);
                setFeedbackMap(INITIAL_CURATION_FEEDBACK);
                setValg(INITIAL_CURATOR_VALG);
                setSuccessMsg('Synkronisert status og kandidatvalg fra kodebase.');
                setTimeout(() => setSuccessMsg(null), 2500);
              }
            }}
            title="Hent inn nyeste status, godkjenninger og kandidatvalg fra kodebasen"
            className="px-2.5 py-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Synk fra kode
          </button>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-2xl text-xs">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white">{approvedCount} / {totalPhases}</span>
          <span className="text-[10px] text-zinc-400 uppercase">Godkjent</span>
        </div>
      </div>

      {/* Filterknapper */}
      <div className="flex gap-1.5 py-2.5 overflow-x-auto no-scrollbar shrink-0">
        <Filter className="w-4 h-4 text-zinc-400 my-auto ml-1 mr-0.5" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`py-1 px-3 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Melding */}
      {successMsg && (
        <div className="mb-2 p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-bold text-center animate-in fade-in shrink-0">
          {successMsg}
        </div>
      )}

      {/* Scrollbar Øvelsesliste for kuratering */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {filtered.map((exercise) => (
          <div
            key={exercise.id}
            className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-3xl space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/50 mr-2">
                  {exercise.kategori}
                </span>
                <span className="font-black text-white text-base">{exercise.navn.nb}</span>
                {exercise.navn.en && (
                  <span className="text-xs text-zinc-400 ml-1.5">({exercise.navn.en})</span>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">ID: {exercise.id}</span>
            </div>

            {/* De to fasene side ved side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((phaseIdx) => {
                const key = `${exercise.id}-${phaseIdx}`;
                const cur = feedbackMap[key];
                const isApproved = cur?.status === 'godkjent';
                const isRegenerating = reordering === key;

                return (
                  <div
                    key={phaseIdx}
                    className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
                      isApproved
                        ? 'bg-emerald-950/20 border-emerald-800/50'
                        : 'bg-zinc-950/60 border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200">
                        {phaseIdx === 0 ? 'Fase 1: Startposisjon' : 'Fase 2: Sluttposisjon'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                            : cur?.status === 'regenerer'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {isApproved ? '✅ Godkjent' : cur?.status === 'regenerer' ? '⏳ Bestilt' : 'Ubehandlet'}
                      </span>
                    </div>

                    {/* Bildevisning */}
                    <div className="w-full h-52 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                      <ExerciseIllustration
                        exercise={exercise}
                        phaseIndex={phaseIdx}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Kandidater fra dybdebatchen — synlige bare der de finnes */}
                    {(kandidater[key]?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-sky-400" />
                          Velg kandidat ({kandidater[key].length} seeds) — klikk for stor visning
                        </span>
                        <div
                          className="grid grid-cols-3 gap-1.5"
                          role="group"
                          aria-label={`Kandidatbilder for ${exercise.navn.nb}, fase ${phaseIdx + 1}`}
                        >
                          {kandidater[key].map((seed) => {
                            const valgt = valg[key] === seed;
                            return (
                              <button
                                key={seed}
                                type="button"
                                onClick={() => setForstørret(key)}
                                aria-label={`Vis kandidat ${seed} for ${exercise.navn.nb}, fase ${phaseIdx + 1} i stor visning${valgt ? ' (valgt)' : ''}`}
                                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                                  valgt
                                    ? 'border-sky-400 ring-2 ring-sky-500/40'
                                    : 'border-zinc-800 hover:border-zinc-600'
                                }`}
                              >
                                <img
                                  src={`/images/kandidater/${key}-${seed}.png`}
                                  alt=""
                                  loading="lazy"
                                  className="w-full h-28 object-cover"
                                />
                                <span
                                  className={`absolute bottom-0 inset-x-0 text-[9px] font-bold py-0.5 ${
                                    valgt ? 'bg-sky-500 text-white' : 'bg-black/70 text-zinc-300'
                                  }`}
                                >
                                  {valgt ? `✓ ${seed}` : seed}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tilbakemeldingsfelt */}
                    <div className="space-y-1">
                      <label htmlFor={`curator-feedback-${key}`} className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-zinc-400" />
                        Hva må forbedres på dette bildet?
                      </label>
                      <textarea
                        id={`curator-feedback-${key}`}
                        rows={2}
                        value={cur?.feedback || ''}
                        onChange={(e) => saveFeedback(key, e.target.value, cur?.status || 'mangler')}
                        placeholder="f.eks. Vis hele kroppen inkludert føtter i profil, dypere knebøy..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>

                    {/* Handlingsknapper */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(exercise.id, phaseIdx)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          isApproved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 hover:bg-emerald-950/80 hover:text-emerald-300 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isApproved ? 'Godkjent' : 'Godkjenn'}
                      </button>

                      <button
                        onClick={() => handleRequestRegeneration(exercise, phaseIdx)}
                        disabled={isRegenerating}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-amber-950/80 hover:text-amber-300 text-zinc-300 border border-zinc-700 flex items-center justify-center gap-1 transition-all"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                        Bestill ny (Kitor)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Stor visning: der valget faktisk tas */}
      {forstørret && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Velg kandidat for ${forstørret}`}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4"
          onClick={() => setForstørret(null)}
        >
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="text-white">
              <span className="font-black">{forstørret}</span>
              <span className="text-xs text-zinc-400 ml-3">
                Klikk et bilde for å velge · tast 1–3 · Esc lukker
              </span>
            </div>
            <button
              type="button"
              onClick={() => setForstørret(null)}
              className="px-3 py-1.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
            >
              Lukk
            </button>
          </div>

          {/* Kandidatene fyller hele høyden. object-contain, ikke cover:
              en beskåret positur er nettopp det som ikke kan bedømmes. */}
          <div
            className="flex-1 grid gap-3 min-h-0"
            style={{ gridTemplateColumns: `repeat(${(kandidater[forstørret] ?? []).length}, minmax(0, 1fr))` }}
            onClick={(e) => e.stopPropagation()}
          >
            {(kandidater[forstørret] ?? []).map((seed, i) => {
              const valgt = valg[forstørret] === seed;
              return (
                <button
                  key={seed}
                  type="button"
                  onClick={() => velgKandidat(forstørret, seed)}
                  aria-pressed={valgt}
                  aria-label={`Velg kandidat ${seed}${valgt ? ' (valgt)' : ''}`}
                  className={`relative rounded-2xl overflow-hidden border-2 bg-zinc-950 min-h-0 ${
                    valgt ? 'border-sky-400 ring-4 ring-sky-500/40' : 'border-zinc-800 hover:border-zinc-500'
                  }`}
                >
                  <img
                    src={`/images/kandidater/${forstørret}-${seed}.png`}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                  <span
                    className={`absolute bottom-0 inset-x-0 text-xs font-bold py-1.5 ${
                      valgt ? 'bg-sky-500 text-white' : 'bg-black/80 text-zinc-200'
                    }`}
                  >
                    {valgt ? `✓ valgt — ${seed}` : `${i + 1}  ·  ${seed}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
