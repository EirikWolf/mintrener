import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { BottomNav } from '../BottomNav';

/**
 * Bunnmenyen.
 *
 * To feil av samme slag: fanene var navngitt etter mekanismen, ikke etter
 * stedet, og en sjelden handling hadde fått fast plass.
 *
 * «Timer» beskrev komponenten som tegner skjermen. Etter oppryddingen viser
 * den siden ukesmål, favoritter, aktiv utfordring og en timer — «I dag» sier
 * hva du finner der.
 *
 * «Bygg» er noe man gjør av og til, i en meny for steder man er ofte. Den
 * hørte hjemme der programmene bor, som «Nytt program», og lå bare i menyen
 * fordi byggeren var eneste vei tilbake til eget innhold. Den grunnen falt bort
 * da egne program kom inn i katalogen.
 */

describe('Bunnmenyen', () => {
  it('navngir forsiden etter hva som finnes der, ikke etter komponenten', () => {
    render(<BottomNav activeTab="timer" onTabChange={vi.fn()} />);

    const meny = screen.getByRole('navigation', { name: 'Hovedmeny' });
    expect(within(meny).getByRole('button', { name: 'I dag' })).toBeInTheDocument();
    expect(within(meny).queryByRole('button', { name: 'Timer' })).not.toBeInTheDocument();
  });

  it('har ikke lenger en fast fane for å bygge økt', () => {
    render(<BottomNav activeTab="timer" onTabChange={vi.fn()} />);

    const meny = screen.getByRole('navigation', { name: 'Hovedmeny' });
    expect(within(meny).queryByRole('button', { name: 'Bygg økt' })).not.toBeInTheDocument();
    expect(within(meny).getAllByRole('button')).toHaveLength(5);
  });

  it('markerer forsiden som gjeldende side når den er aktiv', () => {
    render(<BottomNav activeTab="timer" onTabChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'I dag' })).toHaveAttribute('aria-current', 'page');
  });

  it('markerer Program som gjeldende også når byggeren er åpen', () => {
    // Byggeren nås fra Program og har ingen egen fane. Uten dette ville ingen
    // fane vært markert mens man bygger — brukeren mister stedsfølelsen.
    render(<BottomNav activeTab="builder" onTabChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Programmer' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('bytter fane ved trykk', () => {
    const onTabChange = vi.fn();
    render(<BottomNav activeTab="timer" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Programmer' }));
    expect(onTabChange).toHaveBeenCalledWith('programs');
  });
});
