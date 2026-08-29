import React, { useRef } from 'react';

/**
 * B6.2 (revisjon § 3.2 funn 2): gestflate for Fokusmodus.
 *
 * Terskler valgt for svette fingre i bevegelse:
 * - Sveip: >= 50 px horisontal distanse og < 30 graders vinkelavvik fra
 *   horisontalen — en slurvete, buet tommelsveip midt i en økt skal treffe,
 *   mens en vertikal "tørke svette av skjermen"-bevegelse skal ikke.
 * - Trykk: <= 12 px total bevegelse. Enkelttrykk er BEVISST inert
 *   (feiltrykksfilosofien låsefunksjonen etablerer) — kun dobbelttrykk
 *   innen 300 ms utløser pause/gjenoppta.
 *
 * Gestene er et TILLEGG: alle handlinger kan fortsatt gjøres med knappene,
 * og gester som starter på interaktive elementer ignoreres helt.
 */

export const SWIPE_MIN_DISTANCE_PX = 50;
export const SWIPE_MAX_ANGLE_DEG = 30;
export const DOUBLE_TAP_WINDOW_MS = 300;
export const TAP_MAX_MOVEMENT_PX = 12;

export type GestureKind = 'swipe-left' | 'swipe-right' | 'tap' | 'none';

/** Ren klassifisering av en fullført pekerbevegelse (dx, dy i px). */
export function classifyGesture(dx: number, dy: number): GestureKind {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX >= SWIPE_MIN_DISTANCE_PX) {
    const angleDeg = (Math.atan2(absY, absX) * 180) / Math.PI;
    if (angleDeg < SWIPE_MAX_ANGLE_DEG) {
      return dx < 0 ? 'swipe-left' : 'swipe-right';
    }
  }
  if (absX <= TAP_MAX_MOVEMENT_PX && absY <= TAP_MAX_MOVEMENT_PX) {
    return 'tap';
  }
  return 'none';
}

/**
 * Gest som starter på et interaktivt element skal ALDRI tolkes som flate-gest —
 * knappene beholder sin vanlige klikk-semantikk uforstyrret (bestillingens
 * kollisjonskrav). Sjekker oppover fra event-target.
 */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('button, a, input, select, textarea, [role="dialog"]') !== null
  );
}

export interface UseFocusGesturesOptions {
  /** Kun aktiv i fokusmodus (running/paused) og ulåst — aldri i idle. */
  enabled: boolean;
  onDoubleTap: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export interface FocusGestureHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}

interface GestureStart {
  x: number;
  y: number;
  pointerId: number;
}

/**
 * Pekerhåndterere til å spre på bakgrunnsflaten (rot-containeren). Bruker
 * pointer events (dekker både touch og mus) og Date.now() for dobbelttrykk-
 * vinduet slik at logikken er testbar med fake timers.
 */
export function useFocusGestures(options: UseFocusGesturesOptions): FocusGestureHandlers {
  const startRef = useRef<GestureStart | null>(null);
  const lastTapAtRef = useRef<number>(0);
  // Multi-touch-vern: to samtidige pekere (klype/hvile med to fingre) skal
  // aldri tolkes som gest. Flagget settes ved andre samtidige pointerdown og
  // ugyldiggjør ALT til alle pekere er løftet igjen.
  const activePointersRef = useRef<Set<number>>(new Set());
  const multiTouchRef = useRef(false);

  const releasePointer = (pointerId: number) => {
    activePointersRef.current.delete(pointerId);
    if (activePointersRef.current.size === 0) {
      multiTouchRef.current = false;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    activePointersRef.current.add(e.pointerId);
    if (activePointersRef.current.size > 1) {
      multiTouchRef.current = true;
    }
    if (!options.enabled || multiTouchRef.current || isInteractiveTarget(e.target)) {
      startRef.current = null;
      return;
    }
    startRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const wasMultiTouch = multiTouchRef.current;
    releasePointer(e.pointerId);
    const start = startRef.current;
    startRef.current = null;
    if (!options.enabled || wasMultiTouch || !start || start.pointerId !== e.pointerId) return;

    const kind = classifyGesture(e.clientX - start.x, e.clientY - start.y);
    if (kind === 'swipe-left') {
      lastTapAtRef.current = 0;
      options.onSwipeLeft();
    } else if (kind === 'swipe-right') {
      lastTapAtRef.current = 0;
      options.onSwipeRight();
    } else if (kind === 'tap') {
      const now = Date.now();
      if (now - lastTapAtRef.current <= DOUBLE_TAP_WINDOW_MS) {
        // Nullstill vinduet slik at et trippeltrykk ikke fyrer to ganger
        lastTapAtRef.current = 0;
        options.onDoubleTap();
      } else {
        lastTapAtRef.current = now;
      }
    }
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    releasePointer(e.pointerId);
    startRef.current = null;
  };

  return { onPointerDown, onPointerUp, onPointerCancel };
}
