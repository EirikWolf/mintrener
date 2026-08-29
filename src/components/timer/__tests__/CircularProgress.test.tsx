import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CircularProgress } from '../CircularProgress';

// Reviewfunn (Oppgave A3-oppfølging): 1s-transisjonen på fremdriftsringens
// stroke-dashoffset skal slås av for akkurat den ene "reset-framen" der en ny fase
// starter (progress hopper brått tilbake mot 0) - ellers animerer ringen en synlig
// BAKOVER-sveip ved hvert faseskifte (~16x per Tabata-økt). Denne testen ER selve
// DOM-proben som avdekket at et tidligere forsøk var en funksjonell no-op: en plain
// `isResetFrame`-const utledet av `clampedProgress < prevProgress` FØR
// `setPrevProgress` kalles under render blir alltid false i det COMMITTEDE
// resultatet, fordi React forkaster det render-passet og re-kjører komponenten med
// prevProgress allerede oppdatert til clampedProgress. Fiksen flytter flagget inn i
// egen state (satt i SAMME betingede blokk som prevProgress-oppdateringen).
function getActiveCircleTransition(container: HTMLElement): string {
  const circles = container.querySelectorAll('circle');
  // Første <circle> er det statiske bakgrunnssporet (ingen transition-stil), andre
  // er den aktive fremdriftslinjen som denne testen bryr seg om.
  const activeCircle = circles[1] as SVGCircleElement;
  return activeCircle.style.transition;
}

describe('CircularProgress – ingen bakover-sveip av ringen ved faseskifte', () => {
  it('slår av 1s stroke-dashoffset-transisjonen på reset-framen (progress synker), og slår den på igjen ved neste fremover-bevegelse', () => {
    const { container, rerender } = render(
      <CircularProgress progress={0.95} remainingSeconds={1} phase="work" />
    );
    expect(getActiveCircleTransition(container)).toContain('stroke-dashoffset 1s linear');

    // Faseskifte: progress hopper brått tilbake til nær 0 (ny fase har startet)
    rerender(<CircularProgress progress={0.02} remainingSeconds={20} phase="rest" />);
    const resetTransition = getActiveCircleTransition(container);
    expect(resetTransition).not.toContain('stroke-dashoffset');
    expect(resetTransition).toContain('stroke 0.3s ease');

    // Fremover-bevegelse innad i den nye fasen: 1s-transisjonen skal være tilbake
    rerender(<CircularProgress progress={0.1} remainingSeconds={18} phase="rest" />);
    expect(getActiveCircleTransition(container)).toContain('stroke-dashoffset 1s linear');
  });
});
