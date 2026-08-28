import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { HeartRateWidget } from '../HeartRateWidget';
import { bluetoothHeartRateService, HeartRateData } from '../../../services/bluetoothHeartRateService';

// Fokusmodus (Oppgave 8) kan unmounte/remounte HeartRateWidget midt i en aktiv
// BLE-tilkobling. Denne testen dekker at widgeten gjenoppretter tilstand fra
// tjenesten ved mount i stedet for å anta "ikke tilkoblet".
vi.mock('../../../services/bluetoothHeartRateService', () => ({
  bluetoothHeartRateService: {
    isSupported: vi.fn(() => true),
    isConnected: vi.fn(() => false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    reattach: vi.fn(),
  },
}));

const mockedService = bluetoothHeartRateService as unknown as {
  isSupported: ReturnType<typeof vi.fn>;
  isConnected: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  reattach: ReturnType<typeof vi.fn>;
};

describe('HeartRateWidget – gjenoppretting av tilstand ved remount (fokusmodus)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedService.isSupported.mockReturnValue(true);
  });

  it('kobler nye callbacks til tjenesten via reattach når den allerede er tilkoblet ved mount', () => {
    mockedService.isConnected.mockReturnValue(true);

    render(<HeartRateWidget />);

    // Widgeten skal IKKE be om ny paring – tilkoblingen lever allerede
    expect(mockedService.connect).not.toHaveBeenCalled();
    // ...men den skal koble seg til den eksisterende tilkoblingen
    expect(mockedService.reattach).toHaveBeenCalledTimes(1);
  });

  it('viser puls-data igjen etter remount så snart en oppdatering kommer via reattach', () => {
    mockedService.isConnected.mockReturnValue(true);

    let capturedOnData: ((data: HeartRateData) => void) | undefined;
    mockedService.reattach.mockImplementation((onData: (data: HeartRateData) => void) => {
      capturedOnData = onData;
    });

    render(<HeartRateWidget />);

    // Simulerer at tjenesten sender neste pulsmåling til den gjenopprettede callbacken
    act(() => {
      capturedOnData?.({
        heartRate: 150,
        zone: 4,
        zoneName: 'Sone 4: Terskel',
        zoneColor: 'text-orange-400 bg-orange-950/60 border-orange-800/60',
        deviceName: 'Garmin',
      });
    });

    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('lar isConnected forbli false ved mount når tjenesten ikke er tilkoblet (idle-tilstand uendret)', () => {
    mockedService.isConnected.mockReturnValue(false);

    render(<HeartRateWidget />);

    expect(mockedService.reattach).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Åpne pulsmåler')).toBeInTheDocument();
  });
});
