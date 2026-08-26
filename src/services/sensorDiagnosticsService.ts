export interface SensorStatus {
  id: string;
  name: string;
  category: 'audio' | 'screen' | 'haptics' | 'motion' | 'bluetooth' | 'gps';
  status: 'supported' | 'unsupported' | 'permission_required' | 'active';
  description: string;
  platformNotes?: string;
  actionLabel?: string;
}

export class SensorDiagnosticsService {
  /**
   * Sjekker status på alle relevante sensorer og nettleser-API-er med nøyaktig enhets- og protokollgjenkjenning.
   */
  public async getSensorStatuses(): Promise<SensorStatus[]> {
    const isIOS = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    const isDesktop = !isIOS && !isAndroid;
    const isSecure = typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost');

    const statuses: SensorStatus[] = [];

    // 1. Web Audio
    const hasAudio = typeof window !== 'undefined' &&
      ('AudioContext' in window || 'webkitAudioContext' in window);
    statuses.push({
      id: 'web-audio',
      name: 'Lydsignaler (Web Audio API)',
      category: 'audio',
      status: hasAudio ? 'supported' : 'unsupported',
      description: 'Spiller rene pip og toner ved 3-2-1 nedtelling og intervallskifte.',
      platformNotes: isIOS
        ? 'Låses opp automatisk ved første trykk på skjermen i Safari.'
        : 'Full støtte på denne enheten.',
    });

    // 2. Screen Wake Lock
    const hasWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    let wakeLockNote = 'Holder skjermen våken så timeren ikke slukker.';
    if (isIOS) {
      wakeLockNote = 'Støttes i Safari på iOS 16.4+.';
    } else if (isAndroid) {
      wakeLockNote = 'Full støtte i Chrome på Android.';
    } else if (isDesktop) {
      wakeLockNote = 'Støttet i moderne skrivebordsnettlesere.';
    }

    statuses.push({
      id: 'wake-lock',
      name: 'Skjermdvale-hindring (Wake Lock)',
      category: 'screen',
      status: hasWakeLock ? 'supported' : 'unsupported',
      description: 'Holder skjermen tent under aktiv treningsøkt.',
      platformNotes: wakeLockNote,
    });

    // 3. Vibrasjon
    const hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    let vibrationNote = '';
    if (isDesktop) {
      vibrationNote = 'Datamaskiner har ikke vibrasjonsmotor. Fungerer når du åpner appen på Android-telefon.';
    } else if (isIOS) {
      vibrationNote = 'Apple tillater ikke Vibration API i Safari på iPhone. Appen bruker lydsignaler i stedet.';
    } else if (isAndroid) {
      vibrationNote = 'Aktivt og fullt støttet på din Android-telefon.';
    }

    statuses.push({
      id: 'vibration',
      name: 'Vibrasjon og Haptikk',
      category: 'haptics',
      status: hasVibration ? 'supported' : 'unsupported',
      description: 'Gir fysisk vibrasjonsvarsel ved start, hvile og nedtelling.',
      platformNotes: vibrationNote,
    });

    // 4. Bevegelsessensor (DeviceMotion / Akselerometer)
    const hasMotion = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
    let motionStatus: SensorStatus['status'] = hasMotion ? 'supported' : 'unsupported';
    let actionLabel: string | undefined = undefined;
    let motionNote = 'Måler bevegelse og kadens under økten.';

    if (
      typeof (window as unknown as { DeviceMotionEvent?: { requestPermission?: unknown } })
        .DeviceMotionEvent?.requestPermission === 'function'
    ) {
      motionStatus = 'permission_required';
      actionLabel = 'Aktiver bevegelsessensor';
      motionNote = 'iOS krever at du trykker på knappen under for å tillate sensortilgang.';
    } else if (isDesktop) {
      motionNote = 'Vanlige datamaskiner mangler bevegelsessensor. Fungerer på mobil.';
    } else if (isAndroid) {
      motionNote = 'Full støtte på Android uten ekstra godkjenning.';
    }

    statuses.push({
      id: 'device-motion',
      name: 'Akselerometer og Bevegelse',
      category: 'motion',
      status: motionStatus,
      description: 'Registrerer skritt, kadens og bevegelsesmønstre.',
      platformNotes: motionNote,
      actionLabel,
    });

    // 5. Web Bluetooth (Pulsbelte)
    const hasBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    let bluetoothNote = '';
    if (isIOS) {
      bluetoothNote = 'Apple støtter ikke Web Bluetooth i Safari på iOS.';
    } else if (!isSecure) {
      bluetoothNote = 'Web Bluetooth krever HTTPS (vil bli aktivt når appen publiseres til https://mintrener.web.app).';
    } else if (isAndroid) {
      bluetoothNote = 'Klar til å koble til Bluetooth Smart pulsbelter.';
    } else {
      bluetoothNote = 'Støttet i Chrome på datamaskin og Android.';
    }

    statuses.push({
      id: 'web-bluetooth',
      name: 'Pulsbelte (Web Bluetooth)',
      category: 'bluetooth',
      status: hasBluetooth ? 'supported' : 'unsupported',
      description: 'Kobler til standard Bluetooth Smart (BLE) pulsbelter.',
      platformNotes: bluetoothNote,
    });

    // 6. GPS (Geolocation)
    const hasGeolocation = typeof navigator !== 'undefined' && 'geolocation' in navigator;
    statuses.push({
      id: 'geolocation',
      name: 'GPS og Posisjon',
      category: 'gps',
      status: hasGeolocation ? 'supported' : 'unsupported',
      description: 'Måler distanse, fart og rute for utendørsaktiviteter.',
      platformNotes: 'Posisjonstilgang etterspørres ved oppstart av utendørsøkt.',
    });

    return statuses;
  }

  /**
   * Ber om tillatelse for bevegelsessensor (spesielt for iOS Safari)
   */
  public async requestMotionPermission(): Promise<boolean> {
    const DeviceMotionEventClass = (window as unknown as {
      DeviceMotionEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
    }).DeviceMotionEvent;

    if (typeof DeviceMotionEventClass?.requestPermission === 'function') {
      try {
        const res = await DeviceMotionEventClass.requestPermission();
        return res === 'granted';
      } catch (err) {
        console.warn('Tillatelse for bevegelsessensor avvist:', err);
        return false;
      }
    }
    return true;
  }
}

export const sensorDiagnosticsService = new SensorDiagnosticsService();
