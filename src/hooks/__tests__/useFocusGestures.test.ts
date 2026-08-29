import { describe, it, expect } from 'vitest';
import {
  classifyGesture,
  isInteractiveTarget,
  SWIPE_MIN_DISTANCE_PX,
  TAP_MAX_MOVEMENT_PX,
} from '../useFocusGestures';

/**
 * B6.2: ren klassifiseringslogikk for gestflaten i Fokusmodus.
 * Tersklene skal tåle svette fingre: >= 50 px horisontalt, < 30 graders
 * vinkelavvik for sveip; små bevegelser (<= 12 px) regnes som trykk.
 */
describe('classifyGesture (B6.2)', () => {
  it('klassifiserer lang horisontal bevegelse mot venstre som swipe-left', () => {
    expect(classifyGesture(-60, 0)).toBe('swipe-left');
    expect(classifyGesture(-SWIPE_MIN_DISTANCE_PX, 5)).toBe('swipe-left');
  });

  it('klassifiserer lang horisontal bevegelse mot høyre som swipe-right', () => {
    expect(classifyGesture(60, 0)).toBe('swipe-right');
    expect(classifyGesture(SWIPE_MIN_DISTANCE_PX, -5)).toBe('swipe-right');
  });

  it('avviser sveip kortere enn terskelen', () => {
    expect(classifyGesture(-(SWIPE_MIN_DISTANCE_PX - 1), 0)).toBe('none');
    expect(classifyGesture(30, 2)).toBe('none');
  });

  it('avviser diagonal bevegelse med mer enn 30 graders vinkelavvik', () => {
    // atan2(40, 60) ~ 33.7 grader => for bratt, ikke sveip
    expect(classifyGesture(-60, 40)).toBe('none');
    expect(classifyGesture(60, -40)).toBe('none');
  });

  it('godtar sveip med mindre enn 30 graders vinkelavvik', () => {
    // atan2(30, 60) ~ 26.6 grader => innenfor
    expect(classifyGesture(-60, 30)).toBe('swipe-left');
    expect(classifyGesture(60, 30)).toBe('swipe-right');
  });

  it('klassifiserer liten bevegelse som trykk (tap)', () => {
    expect(classifyGesture(0, 0)).toBe('tap');
    expect(classifyGesture(TAP_MAX_MOVEMENT_PX, -TAP_MAX_MOVEMENT_PX)).toBe('tap');
  });

  it('klassifiserer mellomstor bevegelse som verken trykk eller sveip', () => {
    expect(classifyGesture(TAP_MAX_MOVEMENT_PX + 1, 0)).toBe('none');
    expect(classifyGesture(0, 40)).toBe('none');
  });
});

describe('isInteractiveTarget (B6.2)', () => {
  it('regner knapper (og deres barn) som interaktive', () => {
    const button = document.createElement('button');
    const icon = document.createElement('span');
    button.appendChild(icon);
    document.body.appendChild(button);
    expect(isInteractiveTarget(button)).toBe(true);
    expect(isInteractiveTarget(icon)).toBe(true);
    document.body.removeChild(button);
  });

  it('regner vanlige flater som ikke-interaktive', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(isInteractiveTarget(div)).toBe(false);
    expect(isInteractiveTarget(null)).toBe(false);
    document.body.removeChild(div);
  });
});
