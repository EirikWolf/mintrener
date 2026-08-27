import React, { useState, useEffect } from 'react';
import { SKILL_TREES } from '../../data/skillTrees';
import { SkillCategory, SkillLevel, UserSkillProgress } from '../../schemas/skillTreeSchema';
import {
  getUserSkillProgress,
  recordSkillLevelTest,
} from '../../services/skillTreeService';
import { audioService } from '../../services/audioService';
import { WorkoutTemplate } from '../../types/workout';
import {
  X,
  Trophy,
  Lock,
  Unlock,
  Check,
  Play,
  Sparkles,
  Target,
  Award,
} from 'lucide-react';

interface SkillTreeModalProps {
  onClose: () => void;
  onStartWorkout: (workout: WorkoutTemplate) => void;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  onClose,
  onStartWorkout,
}) => {
  const [selectedTreeId, setSelectedTreeId] = useState<SkillCategory>('pushups');
  const [progress, setProgress] = useState<UserSkillProgress>(() =>
    getUserSkillProgress('pushups')
  );
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>(() => SKILL_TREES[0].levels[0]);
  const [testScoreInput, setTestScoreInput] = useState<string>('');
  const [testResultFeedback, setTestResultFeedback] = useState<{
    mastered: boolean;
    nextUnlocked: boolean;
  } | null>(null);

  const activeTree = SKILL_TREES.find((t) => t.id === selectedTreeId) || SKILL_TREES[0];

  useEffect(() => {
    const prog = getUserSkillProgress(selectedTreeId);
    setProgress(prog);
    const activeLvl = activeTree.levels.find((l) => l.level === prog.currentLevel) || activeTree.levels[0];
    setSelectedLevel(activeLvl);
    setTestResultFeedback(null);
  }, [selectedTreeId]);

  const handleSelectLevel = (level: SkillLevel) => {
    setSelectedLevel(level);
    setTestResultFeedback(null);
    setTestScoreInput('');
  };

  const handleRunLevelTest = () => {
    const score = parseInt(testScoreInput, 10);
    if (isNaN(score) || score < 0) return;

    const res = recordSkillLevelTest(selectedTreeId, selectedLevel.level, score);
    setProgress(res.progress);
    setTestResultFeedback({ mastered: res.mastered, nextUnlocked: res.nextLevelUnlocked });

    if (res.mastered) {
      audioService.playWorkoutComplete(true);
    }
  };

  const handleStartLevelWorkout = () => {
    const isReps = selectedLevel.masteryRequirement.type === 'reps';
    const target = selectedLevel.masteryRequirement.target;

    const workout: WorkoutTemplate = {
      id: `skill-${selectedTreeId}-lvl-${selectedLevel.level}`,
      name: `${selectedLevel.title} (Nivå ${selectedLevel.level})`,
      description: `Mestringsøkt for ${selectedLevel.title}`,
      type: 'custom',
      rounds: 3,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 60,
      items: [
        {
          id: `item-${selectedLevel.exerciseId}`,
          exercise: {
            id: selectedLevel.exerciseId,
            name: selectedLevel.title,
            category: 'bodyweight',
          },
          workDurationSeconds: isReps ? Math.max(30, target * 3) : target,
          restDurationSeconds: 0,
        },
      ],
    };

    onStartWorkout(workout);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 text-white">
      <div className="w-full max-w-lg max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Ferdighetstrær</h2>
              <p className="text-xs text-zinc-400">Kroppsvektmestringsstige i 7 nivåer (C.7)</p>
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

        {/* Kategori-tabs */}
        <div className="grid grid-cols-4 gap-1.5 shrink-0">
          {SKILL_TREES.map((tree) => {
            const isSelected = tree.id === selectedTreeId;
            return (
              <button
                key={tree.id}
                onClick={() => setSelectedTreeId(tree.id)}
                className={`py-2 px-1 rounded-2xl border text-center transition-all flex flex-col items-center gap-0.5 ${
                  isSelected
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-400/30'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <span className="text-lg">{tree.icon}</span>
                <span className="text-[10px] font-bold capitalize truncate max-w-full">
                  {tree.title.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* 7-Trinns Mestringsstige Horisontal Scroll */}
        <div className="shrink-0 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Mestringsstige (Nivå 1–7)
          </span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 pr-2">
            {activeTree.levels.map((lvl) => {
              const isCompleted = progress.completedLevels.includes(lvl.level);
              const isUnlocked = lvl.level <= progress.unlockedLevel;
              const isCurrent = lvl.level === selectedLevel.level;

              return (
                <button
                  key={lvl.level}
                  onClick={() => handleSelectLevel(lvl)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-between gap-1.5 min-w-[76px] transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-emerald-500 text-zinc-950 font-black border-white shadow-lg'
                      : isCompleted
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                      : isUnlocked
                      ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                      : 'bg-zinc-950/40 border-zinc-900 text-zinc-600 opacity-60'
                  }`}
                >
                  <span className={`text-[10px] font-black ${isCurrent ? 'text-zinc-950' : 'text-zinc-400'}`}>
                    NIVÅ {lvl.level}
                  </span>

                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : isUnlocked ? (
                    <Unlock className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}

                  <span className="text-[9px] font-bold truncate max-w-[66px]">
                    {lvl.title.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Valgt Nivå Detaljer */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px] font-black uppercase">
                Nivå {selectedLevel.level} av 7
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                Krav: {selectedLevel.masteryRequirement.target}{' '}
                {selectedLevel.masteryRequirement.type === 'reps' ? 'reps' : 'sekunder'}
              </span>
            </div>

            <h3 className="text-base font-black text-white">{selectedLevel.title}</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">{selectedLevel.description}</p>

            {/* Tips */}
            <div className="space-y-1 pt-1 border-t border-zinc-850">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Teknikktips:</span>
              <ul className="text-xs text-zinc-300 space-y-0.5 list-disc list-inside">
                {selectedLevel.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Test / Evalueringsboks */}
          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <Award className="w-4 h-4 text-amber-400" />
                Registrer Nivåtest
              </span>
              <span className="text-[10px] text-zinc-400">
                Klarer du {selectedLevel.masteryRequirement.target}{' '}
                {selectedLevel.masteryRequirement.type === 'reps' ? 'reps' : 'sekunder'}?
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={testScoreInput}
                onChange={(e) => setTestScoreInput(e.target.value)}
                placeholder={selectedLevel.masteryRequirement.type === 'reps' ? 'Antall reps' : 'Antall sekunder'}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleRunLevelTest}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-md active:scale-95 transition-all"
              >
                Evaluer
              </button>
            </div>

            {testResultFeedback && (
              <div
                className={`p-2.5 rounded-xl border text-xs animate-in fade-in ${
                  testResultFeedback.mastered
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                }`}
              >
                {testResultFeedback.mastered ? (
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    🎉 Gratulerer! Du har mestret Nivå {selectedLevel.level}!{' '}
                    {testResultFeedback.nextUnlocked && 'Nivå ' + (selectedLevel.level + 1) + ' er låst opp!'}
                  </p>
                ) : (
                  <p>
                    Bra forsøk! Fortsett å øve for å nå målet på {selectedLevel.masteryRequirement.target}{' '}
                    {selectedLevel.masteryRequirement.type === 'reps' ? 'reps' : 'sekunder'}.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Start Treningsøkt for dette nivået */}
        <div className="pt-2 border-t border-zinc-850 shrink-0">
          <button
            onClick={handleStartLevelWorkout}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black rounded-2xl shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Økt for Nivå {selectedLevel.level} ({selectedLevel.title})
          </button>
        </div>
      </div>
    </div>
  );
};
