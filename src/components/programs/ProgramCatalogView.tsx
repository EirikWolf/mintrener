import React, { useState } from 'react';
import { TRAINING_PROGRAMS } from '../../data/programs';
import { STARTER_CHALLENGES } from '../../data/challenges';
import { CONTEXT_PROFILES, TrainingMode } from '../../data/contextProfiles';
import { WorkoutTemplate } from '../../types/workout';
import { ChallengeCategory, ChallengeItem } from '../../schemas/challengeSchema';
import { ChallengeDetailModal } from '../challenges/ChallengeDetailModal';
import { getChallengeProgress, getActiveChallengeId } from '../../services/challengeService';
import { getFavoriteProgramIds, toggleFavoriteProgramId } from '../../services/favoritesService';
import { applyProgramOverrides } from '../../services/programOverrideService';
import {
  Play,
  Clock,
  Zap,
  Users,
  User,
  Radio,
  Briefcase,
  Smile,
  Heart,
  Music,
  Trophy,
  SearchX,
  Star,
  Edit3,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';

interface ProgramCatalogViewProps {
  onStartProgram: (workout: WorkoutTemplate) => void;
  onCustomizeProgram?: (workout: WorkoutTemplate) => void;
  onNavigateToTimer?: () => void;
}

const CHALLENGE_CATEGORIES: Array<{ id: 'alle' | ChallengeCategory; label: string }> = [
  { id: 'alle', label: 'Alle' },
  { id: 'styrke', label: 'Styrke' },
  { id: 'kontor', label: 'Kontor' },
  { id: 'mobilitet', label: 'Mobilitet' },
  { id: 'kondisjon', label: 'Kondisjon' },
  { id: 'barn', label: 'Barn & Familie' },
];

export const ProgramCatalogView: React.FC<ProgramCatalogViewProps> = ({
  onStartProgram,
  onCustomizeProgram,
  onNavigateToTimer,
}) => {
  const [mainTab, setMainTab] = useState<'okter' | 'utfordringer'>('okter');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('alle');
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [selectedChallengeCategory, setSelectedChallengeCategory] = useState<'alle' | ChallengeCategory>('alle');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeItem | null>(null);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('alene');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteProgramIds());
  const activeChallengeId = getActiveChallengeId();

  const handleToggleFavorite = (programId: string) => {
    const updated = toggleFavoriteProgramId(programId);
    setFavoriteIds(updated);
  };

  // Ikon-velger for kontekstprofiler
  const getProfileIcon = (iconName: string) => {
    switch (iconName) {
      case 'Briefcase': return <Briefcase className="w-3.5 h-3.5" />;
      case 'Smile': return <Smile className="w-3.5 h-3.5" />;
      case 'Music': return <Music className="w-3.5 h-3.5" />;
      case 'Heart': return <Heart className="w-3.5 h-3.5" />;
      case 'Trophy': return <Trophy className="w-3.5 h-3.5" />;
      case 'Users': return <Users className="w-3.5 h-3.5" />;
      default: return <Users className="w-3.5 h-3.5" />;
    }
  };

  // Filtrering av enkeltøkter
  const filteredPrograms = TRAINING_PROGRAMS.filter((prog) => {
    if (selectedProfileId !== 'alle') {
      return prog.targetProfileId === selectedProfileId || prog.category === selectedProfileId;
    }
    if (selectedCategory !== 'alle') {
      return prog.category === selectedCategory;
    }
    return true;
  });

  // Filtrering av utfordringer
  const filteredChallenges = STARTER_CHALLENGES.filter((c) => {
    if (selectedChallengeCategory === 'alle') return true;
    return c.category === selectedChallengeCategory;
  });

  return (
    <div className="flex flex-col h-full max-w-md mx-auto px-4 pt-2 pb-2 select-none overflow-hidden">
      {/* Topplinje med Tilbake-knapp */}
      <div className="flex items-center justify-between pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {onNavigateToTimer && (
            <button
              onClick={onNavigateToTimer}
              title="Tilbake til Timer / Forside"
              aria-label="Tilbake til Timer"
              className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
            >
              <span className="text-xs font-bold text-emerald-400">← Timer</span>
            </button>
          )}
          <h1 className="text-lg font-black tracking-tight text-white">Programmer</h1>
        </div>
      </div>

      {/* Hovedvelger: Økter vs 28/30-dagers Utfordringer */}
      <div className="grid grid-cols-2 p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl shrink-0 mb-2.5 shadow-sm">
        <button
          onClick={() => setMainTab('okter')}
          className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'okter'
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Økter & Rutiner</span>
        </button>

        <button
          onClick={() => setMainTab('utfordringer')}
          className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'utfordringer'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>28/30d Utfordringer</span>
        </button>
      </div>

      {mainTab === 'okter' ? (
        <>
          {/* 1. Modusvelger (Alene, Sammen, Led en gruppe) */}
          <div className="flex p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl shrink-0 mb-2 shadow-sm">
            <button
              onClick={() => setTrainingMode('alene')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                trainingMode === 'alene'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Alene
            </button>

            <button
              onClick={() => setTrainingMode('sammen')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                trainingMode === 'sammen'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Sammen
            </button>

            <button
              onClick={() => setTrainingMode('led_gruppe')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                trainingMode === 'led_gruppe'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Led gruppe
            </button>
          </div>

          {/* 2. Kontekstprofiler (Kontor, Barn, etc.) */}
          <div className="space-y-1.5 pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Målgruppe & Profiler</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => {
                  setSelectedProfileId('alle');
                  setSelectedCategory('alle');
                }}
                className={`py-1 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedProfileId === 'alle'
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Alle
              </button>
              {CONTEXT_PROFILES.map((profile) => {
                const isPlanned = profile.status === 'planned';
                return (
                  <button
                    key={profile.id}
                    disabled={isPlanned}
                    aria-disabled={isPlanned}
                    onClick={() => {
                      if (isPlanned) return;
                      setSelectedProfileId(profile.id);
                      setSelectedCategory('alle');
                    }}
                    className={`py-1 px-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      selectedProfileId === profile.id
                        ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                        : isPlanned
                        ? 'bg-zinc-950/60 border border-zinc-900 text-zinc-600 opacity-50 cursor-not-allowed'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {getProfileIcon(profile.icon)}
                    <span>{profile.name.split(' ')[0]}</span>
                    {isPlanned && (
                      <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 rounded uppercase font-semibold">snart</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Programliste */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 mt-1 pb-4">
            {filteredPrograms.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-zinc-400">
                <SearchX className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-sm font-semibold">Ingen programmer matcher valgt filter.</p>
                <button
                  onClick={() => {
                    setSelectedProfileId('alle');
                    setSelectedCategory('alle');
                  }}
                  className="text-xs text-emerald-400 font-bold hover:underline"
                >
                  Vis alle programmer
                </button>
              </div>
            ) : (
              filteredPrograms.map((prog) => (
                <div
                  key={prog.id}
                  className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        {prog.category}
                      </span>
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono font-bold">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {prog.durationMinutes} min
                        </span>
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-400">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {prog.intensity}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-black text-white">{prog.name}</h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{prog.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFavorite(prog.workout.id)}
                        role="switch"
                        aria-checked={favoriteIds.includes(prog.workout.id)}
                        aria-label={favoriteIds.includes(prog.workout.id) ? `Fjern ${prog.name} fra favoritter` : `Fest ${prog.name} som favoritt`}
                        className={`p-2 rounded-xl border transition-all ${
                          favoriteIds.includes(prog.workout.id)
                            ? 'text-amber-400 bg-amber-950/60 border-amber-800/80'
                            : 'text-zinc-400 border-zinc-800 hover:text-amber-400 hover:bg-zinc-800'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${favoriteIds.includes(prog.workout.id) ? 'fill-current' : ''}`} />
                      </button>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {prog.workout.items.length} øvelser {prog.workout.rounds > 1 ? `(${prog.workout.rounds} runder)` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onCustomizeProgram && (
                        <button
                          onClick={() => onCustomizeProgram({ ...prog.workout, voiceTone: prog.voiceTone })}
                          title="Tilpass dette programmet i øktbyggeren"
                          className="py-1.5 px-2.5 bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all border border-zinc-700/80"
                        >
                          <Edit3 className="w-3 h-3 text-emerald-400" />
                          <span>Tilpass</span>
                        </button>
                      )}

                      <button
                        onClick={() =>
                          onStartProgram({
                            ...applyProgramOverrides(prog.id, prog.workout),
                            voiceTone: prog.voiceTone,
                          })
                        }
                        className="py-1.5 px-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start økt
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {/* Utfordringer (28- & 30-dagers) */}
          <div className="space-y-1.5 pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Kategori</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {CHALLENGE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedChallengeCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    selectedChallengeCategory === cat.id
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 mt-1 pb-4">
            {filteredChallenges.map((ch) => {
              const prog = getChallengeProgress(ch.id);
              const isActive = ch.id === activeChallengeId;
              const completedCount = prog.completedDays.length;
              const percent = Math.round((completedCount / ch.durationDays) * 100);

              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChallenge(ch)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 shadow-sm active:scale-[0.99] ${
                    isActive
                      ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/40'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xl shrink-0 shadow-inner">
                        {ch.badgeReward.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-white">{ch.title}</h3>
                          {isActive && (
                            <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-amber-500 text-zinc-950 rounded">
                              Aktiv
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {ch.durationDays} dager • {ch.phases.length} faser • {ch.category}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 mt-2" />
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                    {ch.description}
                  </p>

                  <div className="space-y-1 pt-1 border-t border-zinc-850">
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>{completedCount} av {ch.durationDays} dager fullført</span>
                      <span className="font-bold text-amber-400">{percent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal for å se utfordringens dagsplan og starte økt */}
      {selectedChallenge && (
        <ChallengeDetailModal
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          onStartWorkout={(workout) => {
            setSelectedChallenge(null);
            onStartProgram(workout);
          }}
        />
      )}
    </div>
  );
};
