import { describe, it, expect, beforeEach } from 'vitest';
import {
  COACH_PERSONAS,
  getPersonaAccentColor,
  applyPersonaAccent,
  setActiveCoachPersona,
} from '../coachPersonaService';

/**
 * B6 delleveranse 1 (revisjon § 3.3 nivå 1): persona-aksentfarge som CSS-variabel.
 * Kontrastkravet (WCAG AA, 4.5:1 for normal tekst) verifiseres her mot de tre
 * fokusmodus-bakgrunnene aksenten faktisk står på i TimerDisplay.
 */

// --- WCAG 2.x relativ luminans + kontrastratio (testlokal hjelpelogikk) ---

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Ugyldig hex-farge: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: [number, number, number]): number {
  const l1 = relativeLuminance(hexToRgb(fg));
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Fokusmodus-bakgrunnene i TimerDisplay: fasefarge-950 med 80 % dekning over
// app-rotens zinc-950 (#09090b). Blandingen er 0.8*fase + 0.2*zinc-950.
const FOCUS_BACKGROUNDS: Record<string, [number, number, number]> = {
  // prepare: bg-zinc-950 (ublandet)
  prepare: [9, 9, 11],
  // work: emerald-950 (#022c22) 80 % over zinc-950
  work: [3, 37, 29],
  // rest/round_rest: amber-950 (#451a03) 80 % over zinc-950
  rest: [57, 23, 5],
};

describe('persona-aksentfarger (B6.1)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--persona-accent');
  });

  it('gir en gyldig hex-aksentfarge for hver persona, avledet av color-feltet', () => {
    for (const persona of COACH_PERSONAS) {
      const accent = getPersonaAccentColor(persona.id);
      expect(accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('gir ulik aksent for personaer med ulikt color-felt', () => {
    const accents = new Set(COACH_PERSONAS.map((p) => getPersonaAccentColor(p.id)));
    // 5 personaer med 5 distinkte color-felt => 5 distinkte aksenter
    expect(accents.size).toBe(COACH_PERSONAS.length);
  });

  it('holder WCAG AA (>= 4.5:1) mot alle fokusmodus-bakgrunner', () => {
    for (const persona of COACH_PERSONAS) {
      const accent = getPersonaAccentColor(persona.id);
      for (const [phase, bg] of Object.entries(FOCUS_BACKGROUNDS)) {
        const ratio = contrastRatio(accent, bg);
        expect(
          ratio,
          `${persona.id} (${accent}) mot ${phase}-bakgrunn: ${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('applyPersonaAccent setter --persona-accent på rot-elementet', () => {
    applyPersonaAccent('hardcore');
    expect(document.documentElement.style.getPropertyValue('--persona-accent')).toBe(
      getPersonaAccentColor('hardcore')
    );
  });

  it('applyPersonaAccent uten argument bruker aktiv persona (oppstartsstien)', () => {
    setActiveCoachPersona('hardcore');
    document.documentElement.style.removeProperty('--persona-accent');
    applyPersonaAccent();
    expect(document.documentElement.style.getPropertyValue('--persona-accent')).toBe(
      getPersonaAccentColor('hardcore')
    );
  });

  it('setActiveCoachPersona oppdaterer aksent-variabelen ved persona-bytte', () => {
    setActiveCoachPersona('boyband');
    expect(document.documentElement.style.getPropertyValue('--persona-accent')).toBe(
      getPersonaAccentColor('boyband')
    );
    setActiveCoachPersona('boyband');
    expect(document.documentElement.style.getPropertyValue('--persona-accent')).toBe(
      getPersonaAccentColor('boyband')
    );
  });
});
