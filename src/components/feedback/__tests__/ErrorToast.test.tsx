import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ErrorToast } from '../ErrorToast';
import { showErrorToast, dismissErrorToast } from '../../../services/errorToastService';

describe('ErrorToast (komponent)', () => {
  beforeEach(() => {
    dismissErrorToast();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rendrer ingenting synlig uten aktiv toast, men live-regionen finnes', () => {
    const { container } = render(<ErrorToast />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // aria-live-container må være montert FØR meldingen settes inn,
    // ellers annonserer ikke skjermlesere den
    expect(container.querySelector('[aria-live="assertive"]')).not.toBeNull();
  });

  it('viser feilmelding som role=alert når showErrorToast kalles', () => {
    render(<ErrorToast />);
    act(() => {
      showErrorToast('Kunne ikke lagre økten.');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Kunne ikke lagre økten.');
  });

  it('viser toast som allerede var satt før mount (f.eks. fra URL-import ved oppstart)', () => {
    showErrorToast('Delingslenken er ugyldig.');
    render(<ErrorToast />);
    expect(screen.getByRole('alert')).toHaveTextContent('Delingslenken er ugyldig.');
  });

  it('kan lukkes manuelt med lukkeknappen', () => {
    render(<ErrorToast />);
    act(() => {
      showErrorToast('Feil ved lagring.');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lukk feilmelding' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('forsvinner av seg selv etter auto-dismiss-perioden', () => {
    vi.useFakeTimers();
    render(<ErrorToast />);
    act(() => {
      showErrorToast('Feil ved lagring.');
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ny feil erstatter den forrige (én toast av gangen)', () => {
    render(<ErrorToast />);
    act(() => {
      showErrorToast('Første feil');
    });
    act(() => {
      showErrorToast('Andre feil');
    });
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('Andre feil');
  });
});
