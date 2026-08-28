import { getUserMaxHeartRate } from './heartRateZoneService';

export type HeartRateZone = 1 | 2 | 3 | 4 | 5;

export interface HeartRateData {
  heartRate: number; // bpm
  zone: HeartRateZone;
  zoneName: string;
  zoneColor: string;
  deviceName?: string;
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
  private maxHeartRate: number = 190; // Standard estimat for aktiv voksen

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
    onDisconnect?: () => void
  ): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth er ikke støttet i denne nettleseren.');
    }

    try {
      // Bruk aldersbasert makspuls fra profilen hvis fødselsår er satt
      this.setMaxHeartRate(getUserMaxHeartRate());
      this.onDataCallback = onData;
      this.onDisconnectCallback = onDisconnect || null;

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

  /**
   * Bytter ut lagrede callbacks uten å koble fra eller be om ny enhet.
   * Trengs fordi HeartRateWidget kan unmountes/remountes midt i en aktiv
   * BLE-tilkobling (fokusmodus skjuler/viser widgeten når en økt starter/
   * fullføres) — selve tilkoblingen lever videre i denne singleton-tjenesten,
   * men den forrige komponentinstansens callbacks peker på avmontert state.
   */
  public reattach(onData: (data: HeartRateData) => void, onDisconnect?: () => void) {
    this.onDataCallback = onData;
    this.onDisconnectCallback = onDisconnect || null;
  }

  public getDeviceName(): string {
    return this.device?.name || 'Pulsbelte / Klokke';
  }

  private handleDisconnected = () => {
    this.disconnect();
  };

  private handleHeartRateMeasurement = (event: Event) => {
    const target = event.target as unknown as { value?: DataView };
    const value = target?.value;
    if (!value || value.byteLength < 2) return;

    // Standard Bluetooth Heart Rate parsing (GATT Specification 0x2A37)
    const flags = value.getUint8(0);
    const is16Bit = (flags & 0x01) !== 0;

    let heartRate: number;
    if (is16Bit && value.byteLength >= 3) {
      heartRate = value.getUint16(1, true); // Little endian
    } else {
      heartRate = value.getUint8(1);
    }

    const { zone, zoneName, zoneColor } = this.calculateZone(heartRate);

    if (this.onDataCallback) {
      this.onDataCallback({
        heartRate,
        zone,
        zoneName,
        zoneColor,
        deviceName: this.getDeviceName(),
      });
    }
  };
}

export const bluetoothHeartRateService = new BluetoothHeartRateService();
