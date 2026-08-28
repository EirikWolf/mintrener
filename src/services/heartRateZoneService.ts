export interface HeartRateZoneInfo {
  zone: 1 | 2 | 3 | 4 | 5;
  minHr: number;
  maxHr: number;
  label: string;
  name: string;
  color: string;
  textColor: string;
}

export function calculateMaxHeartRate(age: number = 30): number {
  // Tanaka formula: 208 - 0.7 * age
  return Math.round(208 - 0.7 * age);
}

const BIRTH_YEAR_STORAGE_KEY = 'mintrener_user_birth_year';
const DEFAULT_MAX_HR = 190;

/**
 * Henter brukerens fødselsår fra lokal lagring (null hvis ikke satt)
 */
export function getUserBirthYear(): number | null {
  try {
    const raw = localStorage.getItem(BIRTH_YEAR_STORAGE_KEY);
    if (!raw) return null;
    const year = parseInt(raw, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < currentYear - 110 || year > currentYear - 10) return null;
    return year;
  } catch {
    return null;
  }
}

/**
 * Lagrer brukerens fødselsår (null sletter innstillingen)
 */
export function setUserBirthYear(year: number | null): void {
  try {
    if (year === null) {
      localStorage.removeItem(BIRTH_YEAR_STORAGE_KEY);
    } else {
      localStorage.setItem(BIRTH_YEAR_STORAGE_KEY, String(Math.round(year)));
    }
  } catch (err) {
    console.warn('Kunne ikke lagre fødselsår:', err);
  }
}

/**
 * Brukerens estimerte makspuls: Tanaka-formelen fra fødselsår hvis satt,
 * ellers standardestimatet 190 (aktiv voksen)
 */
export function getUserMaxHeartRate(): number {
  const birthYear = getUserBirthYear();
  if (birthYear === null) return DEFAULT_MAX_HR;
  const age = new Date().getFullYear() - birthYear;
  return calculateMaxHeartRate(age);
}

export function getHeartRateZones(maxHr: number = 190): HeartRateZoneInfo[] {
  return [
    {
      zone: 1,
      minHr: Math.round(maxHr * 0.5),
      maxHr: Math.round(maxHr * 0.6) - 1,
      label: 'Sone 1',
      name: 'Veldig lett / Restitusjon',
      color: '#60a5fa', // blue-400
      textColor: 'text-blue-400',
    },
    {
      zone: 2,
      minHr: Math.round(maxHr * 0.6),
      maxHr: Math.round(maxHr * 0.7) - 1,
      label: 'Sone 2',
      name: 'Lett aerob / Fettforbrenning',
      color: '#34d399', // emerald-400
      textColor: 'text-emerald-400',
    },
    {
      zone: 3,
      minHr: Math.round(maxHr * 0.7),
      maxHr: Math.round(maxHr * 0.8) - 1,
      label: 'Sone 3',
      name: 'Moderat aerob',
      color: '#fbbf24', // amber-400
      textColor: 'text-amber-400',
    },
    {
      zone: 4,
      minHr: Math.round(maxHr * 0.8),
      maxHr: Math.round(maxHr * 0.9) - 1,
      label: 'Sone 4',
      name: 'Hard / Terskel',
      color: '#f97316', // orange-500
      textColor: 'text-orange-400',
    },
    {
      zone: 5,
      minHr: Math.round(maxHr * 0.9),
      maxHr: maxHr,
      label: 'Sone 5',
      name: 'Maksimal / Vo2Max',
      color: '#ef4444', // red-500
      textColor: 'text-red-400',
    },
  ];
}

export function getHeartRateZone(currentHr: number, maxHr: number = 190): HeartRateZoneInfo {
  const zones = getHeartRateZones(maxHr);

  if (currentHr < zones[0].minHr) {
    return {
      ...zones[0],
      name: 'Under Sone 1 / Hvile',
      label: 'Hvile',
    };
  }

  for (const z of zones) {
    if (currentHr <= z.maxHr) {
      return z;
    }
  }

  return zones[zones.length - 1];
}

/**
 * Dynamisk pausekontroll: Sjekker om hvilen bør forlenges til pulsen er restituert
 */
export function isPulseRecovered(currentHr: number, targetRecoveryZone: number = 2, maxHr: number = 190): boolean {
  const zoneInfo = getHeartRateZone(currentHr, maxHr);
  return zoneInfo.zone <= targetRecoveryZone;
}
