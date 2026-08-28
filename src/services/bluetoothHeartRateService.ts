import { getUserMaxHeartRate } from './heartRateZoneService';

export type HeartRateZone = 1 | 2 | 3 | 4 | 5;

export interface HeartRateData {
  heartRate: number; // bpm
  zone: HeartRateZone;
  zoneName: string;
  zoneColor: string;
  deviceName?: string;
  rrIntervals?: number[]; // RR-intervaller i millisekunder (grunnlag for HRV)
}

/**
 * Ren parsing av Bluetooth Heart Rate Measurement-karakteristikken (GATT 0x2A37).
 * Trukket ut som egen funksjon slik at den kan testes uten et faktisk BLE-oppsett.
 *
 * Forutsetning: `view.byteLength >= 2` (flagg-byte + minst ett HR-byte). Kalles funksjonen
 * med en tom eller for kort buffer, kaster de underliggende DataView-kallene `RangeError`.
 */
export function parseHeartRateMeasurement(view: DataView): { heartRate: number; rrIntervals: number[] } {
  const flags = view.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  const hasEnergyExpended = (flags & 0x08) !== 0;
  const hasRrIntervals = (flags & 0x10) !== 0;

  let offset = 1;
  let heartRate: number;
  if (is16Bit && view.byteLength >= 3) {
    heartRate = view.getUint16(offset, true); // Little endian
    offset += 2;
  } else {
    heartRate = view.getUint8(offset);
    offset += 1;
  }

  if (hasEnergyExpended) {
    offset += 2; // Energy Expended-feltet brukes ikke her, men må hoppes over for riktig RR-offset
  }

  const rrIntervals: number[] = [];
  if (hasRrIntervals) {
    for (let i = offset; i + 1 < view.byteLength; i += 2) {
      const raw = view.getUint16(i, true); // Enhet: 1/1024 sekund
      rrIntervals.push(Math.round((raw / 1024) * 1000));
    }
  }

  return { heartRate, rrIntervals };
}

/**
 * Eksponentiell backoff-tidsplan for BLE-reconnect: 1s, 2s, 4s, 8s, 16s, deretter gi opp.
 * `attempt` er 0-indeksert. Returnerer null når forsøkene er brukt opp (eller for negative forsøk).
 */
export function getReconnectDelayMs(attempt: number): number | null {
  if (attempt < 0 || attempt > 4) {
    return null;
  }
  return 1000 * 2 ** attempt;
}

// Web Bluetooth types
interface BluetoothGATTCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BluetoothGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothGATTCharacteristic>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

interface BluetoothGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<{
    getCharacteristic(characteristic: string | number): Promise<BluetoothGATTCharacteristic>;
  }>;
}

interface BluetoothDevice extends EventTarget {
  name?: string;
  gatt?: BluetoothGATTServer;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

export class BluetoothHeartRateService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothGATTServer | null = null;
  private characteristic: BluetoothGATTCharacteristic | null = null;
  private onDataCallback: ((data: HeartRateData) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private onReconnectingCallback: ((attempt: number) => void) | null = null;
  private maxHeartRate: number = 190; // Standard estimat for aktiv voksen

  // Reconnect-tilstand: skiller "bruker koblet fra bevisst" fra "beltet mistet kontakt"
  private isManualDisconnect = false;
  private reconnectAttempt = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public setMaxHeartRate(maxHr: number) {
    if (maxHr > 100 && maxHr < 240) {
      this.maxHeartRate = maxHr;
    }
  }

  public calculateZone(hr: number): { zone: HeartRateZone; zoneName: string; zoneColor: string } {
    const pct = hr / this.maxHeartRate;
    if (pct < 0.6) {
      return { zone: 1, zoneName: 'Sone 1: Rolig', zoneColor: 'text-blue-400 bg-blue-950/60 border-blue-800/60' };
    } else if (pct < 0.7) {
      return { zone: 2, zoneName: 'Sone 2: Fettforbrenning', zoneColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' };
    } else if (pct < 0.8) {
      return { zone: 3, zoneName: 'Sone 3: Kondisjon', zoneColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60' };
    } else if (pct < 0.9) {
      return { zone: 4, zoneName: 'Sone 4: Terskel', zoneColor: 'text-orange-400 bg-orange-950/60 border-orange-800/60' };
    } else {
      return { zone: 5, zoneName: 'Sone 5: Maksimal', zoneColor: 'text-rose-400 bg-rose-950/60 border-rose-800/60' };
    }
  }

  public async connect(
    onData: (data: HeartRateData) => void,
    onDisconnect?: () => void,
    onReconnecting?: (attempt: number) => void
  ): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth er ikke støttet i denne nettleseren.');
    }

    try {
      // Bruk aldersbasert makspuls fra profilen hvis fødselsår er satt
      this.setMaxHeartRate(getUserMaxHeartRate());
      this.onDataCallback = onData;
      this.onDisconnectCallback = onDisconnect || null;
      this.onReconnectingCallback = onReconnecting || null;
      this.isManualDisconnect = false;
      this.reconnectAttempt = 0;
      this.clearReconnectTimer();

      const nav = navigator as unknown as {
        bluetooth: {
          requestDevice(options: {
            filters: { services: (string | number)[] }[];
            optionalServices?: (string | number)[];
          }): Promise<BluetoothDevice>;
        };
      };

      // Søk etter BLE enhet med standard Heart Rate Service (0x180D)
      this.device = await nav.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      });

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnected);

      if (!this.device.gatt) {
        throw new Error('Klarte ikke å åpne GATT-server på enheten.');
      }

      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService('heart_rate');
      this.characteristic = await service.getCharacteristic('heart_rate_measurement');

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleHeartRateMeasurement);

      return true;
    } catch (err) {
      console.warn('Bluetooth tilkoblingsfeil:', err);
      this.disconnect();
      return false;
    }
  }

  public disconnect() {
    // Manuell frakobling: hindre at gattserverdisconnected-handleren starter en reconnect
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.reconnectAttempt = 0;

    if (this.characteristic) {
      try {
        this.characteristic.removeEventListener('characteristicvaluechanged', this.handleHeartRateMeasurement);
      } catch {}
      this.characteristic = null;
    }

    if (this.server && this.server.connected) {
      try {
        this.server.disconnect();
      } catch {}
      this.server = null;
    }

    if (this.device) {
      try {
        this.device.removeEventListener('gattserverdisconnected', this.handleDisconnected);
      } catch {}
      this.device = null;
    }

    if (this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }
  }

  public isConnected(): boolean {
    return !!this.server && this.server.connected;
  }

  public getDeviceName(): string {
    return this.device?.name || 'Pulsbelte / Klokke';
  }

  private handleDisconnected = () => {
    if (this.isManualDisconnect) {
      // Håndtert av disconnect() selv - unngå å starte reconnect på en bevisst frakobling
      return;
    }

    // Beltet mistet kontakt uventet: GATT-koblingen er allerede brutt, men behold
    // device-referansen så vi kan forsøke å koble til igjen. Telleren nullstilles IKKE her -
    // den er allerede 0 etter connect()/vellykket reconnect, og hvis et forsøk faller ut
    // midt i en pågående backoff-kjede (flaky belte under service discovery) skal vi
    // fortsette skjemaet der det var, ikke starte om fra 1s (uendelig retry-loop).
    this.characteristic = null;
    this.server = null;
    this.scheduleReconnect();
  };

  private clearReconnectTimer() {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /** Planlegger neste reconnect-forsøk basert på backoff-skjemaet, eller gir opp. */
  private scheduleReconnect() {
    // Enkelte Web Bluetooth-implementasjoner fyrer gattserverdisconnected to ganger for
    // samme frakobling; uten denne rydder vi bort en evt. allerede ventende timer først
    // slik at vi aldri får to parallelle backoff/reconnect-kjeder (og dupliserte listeners).
    this.clearReconnectTimer();

    const delay = getReconnectDelayMs(this.reconnectAttempt);
    if (delay === null) {
      this.giveUpReconnecting();
      return;
    }

    const attempt = this.reconnectAttempt;
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      void this.tryReconnect(attempt);
    }, delay);
  }

  /** Ett reconnect-forsøk: kobler til GATT-serveren igjen og re-abonnerer på notifikasjoner. */
  private async tryReconnect(attempt: number) {
    if (this.isManualDisconnect || !this.device || !this.device.gatt) {
      return;
    }

    try {
      // En kastende onReconnecting-konsument skal ikke avbryte reconnect-kjeden som en
      // uhåndtert rejection - dette forsøket skal fortsette (eller reschedules) uansett.
      this.onReconnectingCallback?.(attempt);
    } catch (err) {
      console.warn('onReconnecting-callback kastet feil:', err);
    }

    let staleServer: BluetoothGATTServer | null = null;
    try {
      // Brukeren kan ha kalt disconnect() mens et av awaitene under var i flight. disconnect()
      // finner da ingenting å rive ned (this.server er fortsatt null) og fyrer onDisconnectCallback
      // med en gang - så hvis vi lar dette forsøket fullføre uanfektet, "gjenopplive" vi en
      // tilkobling brukeren bevisst har avsluttet, og UI-en begynner å motta data igjen selv om
      // den allerede fikk beskjed om at økten var over. Derfor sjekkes flagget på nytt etter HVERT
      // await, og en tilkobling som rekker å bli opprettet etter en manuell frakobling rives
      // fysisk ned igjen i stedet for å bli tatt i bruk.
      const server = await this.device.gatt.connect();
      staleServer = server;
      if (this.isManualDisconnect) {
        this.abortStaleReconnect(server);
        return;
      }

      const service = await server.getPrimaryService('heart_rate');
      if (this.isManualDisconnect) {
        this.abortStaleReconnect(server);
        return;
      }

      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      if (this.isManualDisconnect) {
        this.abortStaleReconnect(server);
        return;
      }

      await characteristic.startNotifications();
      if (this.isManualDisconnect) {
        this.abortStaleReconnect(server);
        return;
      }

      characteristic.addEventListener('characteristicvaluechanged', this.handleHeartRateMeasurement);
      this.server = server;
      this.characteristic = characteristic;
      this.reconnectAttempt = 0; // Suksess - nullstill telleren for neste gang beltet faller ut
    } catch (err) {
      if (this.isManualDisconnect) {
        // Avbrutt av brukeren mens forsøket var i gang - ikke reschedule, bare rydd opp
        // en eventuell fersk (men nå ubrukt) GATT-kobling.
        this.abortStaleReconnect(staleServer);
        return;
      }
      console.warn('BLE reconnect-forsøk feilet:', err);
      this.reconnectAttempt = attempt + 1;
      this.scheduleReconnect();
    }
  }

  /** Fysisk rydding av en GATT-kobling som ble opprettet etter at brukeren allerede koblet manuelt fra. */
  private abortStaleReconnect(server: BluetoothGATTServer | null) {
    if (server && server.connected) {
      try {
        server.disconnect();
      } catch {}
    }
  }

  /** Alle reconnect-forsøk er brukt opp: rydd opp og varsle konsumenten som ved vanlig frakobling. */
  private giveUpReconnecting() {
    this.clearReconnectTimer();

    if (this.device) {
      try {
        this.device.removeEventListener('gattserverdisconnected', this.handleDisconnected);
      } catch {}
      this.device = null;
    }
    this.characteristic = null;
    this.server = null;

    if (this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }
  }

  private handleHeartRateMeasurement = (event: Event) => {
    const target = event.target as unknown as { value?: DataView };
    const value = target?.value;
    if (!value || value.byteLength < 2) return;

    const { heartRate, rrIntervals } = parseHeartRateMeasurement(value);
    const { zone, zoneName, zoneColor } = this.calculateZone(heartRate);

    if (this.onDataCallback) {
      this.onDataCallback({
        heartRate,
        zone,
        zoneName,
        zoneColor,
        deviceName: this.getDeviceName(),
        rrIntervals,
      });
    }
  };
}

export const bluetoothHeartRateService = new BluetoothHeartRateService();
