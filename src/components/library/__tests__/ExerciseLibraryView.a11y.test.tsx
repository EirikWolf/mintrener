import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { ExerciseLibraryView } from '../ExerciseLibraryView';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

/**
 * Tilgjengelighet i øvelsesbiblioteket (Revisjon A, funn B2).
 *
 * Radene var klikkbare <div>-er uten rolle eller tabIndex. WCAG 2.2 2.1.1
 * (Tastatur) er nivå A — ikke AA — så dette stengte hele øvelseskatalogen
 * for tastatur- og bryterbrukere. Målgruppen inkluderer eksplisitt seniorer.
 */
describe('ExerciseLibraryView — tastaturtilgjengelighet (B2)', () => {
  const noop = () => {};

  function radene(): HTMLElement[] {
    return screen.getAllByRole('button', { name: /åpne øvelsen/i });
  }

  it('hver øvelsesrad er en fokuserbar knapp, ikke en klikkbar div', () => {
    render(<ExerciseLibraryView onNavigateToTimer={noop} />);

    const rader = radene();
    expect(rader.length).toBeGreaterThan(0);

    for (const rad of rader) {
      // Et ekte <button>-element er nåbart med Tab uten eksplisitt tabIndex.
      expect(rad.tagName).toBe('BUTTON');
      expect(rad.getAttribute('tabindex')).not.toBe('-1');
    }
  });

  it('kan fokuseres og aktiveres, slik at detaljvisningen åpnes', () => {
    render(<ExerciseLibraryView onNavigateToTimer={noop} />);

    const rad = radene()[0];
    rad.focus();
    expect(rad).toHaveFocus();

    // Nettleseren oversetter Enter/Space på en <button> til et klikk.
    fireEvent.click(rad);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('slettekontrollen er søsken til raden, ikke nestet inni den', () => {
    // Nestede <button>-elementer er ugyldig HTML og gir uforutsigbar
    // fokusrekkefølge. Slettekontrollen for egendefinerte øvelser må
    // derfor ligge ved siden av raden, ikke inne i den.
    render(<ExerciseLibraryView onNavigateToTimer={noop} />);

    for (const rad of radene()) {
      expect(within(rad).queryByRole('button')).toBeNull();
    }
  });
});
