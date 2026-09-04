import { STORAGE_KEYS } from '../constants/storageKeys';

export interface TesterChecklistItem {
  id: string;
  title: string;
  category: 'kjernemotor' | 'lyd_tale' | 'bygger' | 'innhold' | 'mobil_pwa';
  description: string;
  status: 'ikke_startet' | 'ok' | 'har_avvik';
  notes?: string;
}

export interface TesterFeedbackItem {
  id: string;
  type: 'strukturert' | 'fri_form' | 'feilrapport' | 'onskesituasjon';
  checklistItemId?: string;
  title?: string;
  feedbackText: string;
  rating?: number; // 1-5 stjerner
  severity?: 'lav' | 'middels' | 'kritisk';
  status?: 'ny' | 'under_arbeid' | 'lost' | 'arkivert';
  screenshotBase64?: string;
  deviceContext: {
    userAgent: string;
    screenSize: string;
    appVersion: string;
    isStandalone: boolean;
  };
  submittedByUid?: string;
  submittedByName?: string;
  submittedAt: string;
}

// Standard sjekkliste ("manus") for testing av kjernefunksjonalitet
export const DEFAULT_TEST_CHECKLIST: TesterChecklistItem[] = [
  {
    id: 'test-tabata-flow',
    title: '1. Tabata / Intervallflyt',
    category: 'kjernemotor',
    description: 'Start en standard Tabata (4 min). Verifiser nedtelling, lydpip ved start/slutt, pause og fullføringsvisning.',
    status: 'ikke_startet',
  },
  {
    id: 'test-audio-coaching',
    title: '2. Lyd & Stemmecoaching',
    category: 'lyd_tale',
    description: 'Test veksling mellom «Pling og pip», «Full stemme (Coach)» og «Stille» i innstillinger under økt.',
    status: 'ikke_startet',
  },
  {
    id: 'test-workout-builder',
    title: '3. Treningsbyggeren',
    category: 'bygger',
    description: 'Opprett en egendefinert økt med 3 valgfrie øvelser, juster arbeidstid og lagre den under «Mine økter».',
    status: 'ikke_startet',
  },
  {
    id: 'test-exercise-library',
    title: '4. Øvelsesbibliotek & Illustrasjon',
    category: 'innhold',
    description: 'Åpne en øvelse (f.eks. Knebøy), se instruksjoner, trinn, muskelkart og test bildebidragsknappen.',
    status: 'ikke_startet',
  },
  {
    id: 'test-bigscreen-tv',
    title: '5. Storskjerm & TV-visning',
    category: 'kjernemotor',
    description: 'Trykk på TV-ikonet i timeren. Sjekk at storskjermmodus fyller vinduet og er lesbar på avstand.',
    status: 'ikke_startet',
  },
  {
    id: 'test-org-competition',
    title: '6. Bedrift & Konkurranse',
    category: 'innhold',
    description: 'Gå inn på Bedrift/Organisasjon (f.eks. med kode HMS2026), velg avdeling og test anonym/skjult personvern.',
    status: 'ikke_startet',
  },
];

export const VALID_TESTER_CODES = ['TEST2026', 'PILOT2026', 'MINTRENER-TEST', 'BETA2026'];

/**
 * Sjekker om gjeldende bruker har tester-status aktivert.
 */
export function isTesterRoleActive(): boolean {
  if (typeof window === 'undefined') return false;

  // Kan aktiveres via URL parameter ?tester=true eller ?tester=TEST2026
  const params = new URLSearchParams(window.location.search);
  const testerParam = params.get('tester');
  if (testerParam) {
    const norm = testerParam.trim().toUpperCase();
    if (norm === 'TRUE' || VALID_TESTER_CODES.includes(norm)) {
      localStorage.setItem(STORAGE_KEYS.IS_TESTER_ROLE, 'true');
      return true;
    }
  }

  return localStorage.getItem(STORAGE_KEYS.IS_TESTER_ROLE) === 'true';
}

/**
 * Genererer full 1-klikks invitasjonslenke for en tester.
 */
export function generateTesterInviteUrl(code: string = 'TEST2026'): string {
  if (typeof window === 'undefined') return `https://mintrener.web.app/?tester=${code}`;
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?tester=${encodeURIComponent(code)}`;
}

/**
 * Aktiverer eller deaktiverer tester-rolle med en hemmelig invitasjonskode.
 */
export function verifyAndSetTesterCode(code: string): { success: boolean; message: string } {
  const normalized = code.trim().toUpperCase();
  if (VALID_TESTER_CODES.includes(normalized)) {
    localStorage.setItem(STORAGE_KEYS.IS_TESTER_ROLE, 'true');
    window.dispatchEvent(new Event('tester-role-changed'));
    return { success: true, message: 'Gratulerer! Du er nå aktivert som registrert betatester.' };
  }
  return { success: false, message: 'Ugyldig testerkode. Kontakt ansvarlig for tilgang.' };
}

/**
 * Henter testerens sjekkliste med lagret framdrift.
 */
export function getTesterChecklist(): TesterChecklistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TESTER_CHECKLIST_PROGRESS);
    if (!raw) return DEFAULT_TEST_CHECKLIST;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TEST_CHECKLIST;

    // Flett med standard for å fange opp eventuelle nye punkter
    return DEFAULT_TEST_CHECKLIST.map((item) => {
      const saved = parsed.find((p) => p.id === item.id);
      return saved ? { ...item, ...saved } : item;
    });
  } catch {
    return DEFAULT_TEST_CHECKLIST;
  }
}

/**
 * Oppdaterer status for et punkt i sjekklisten.
 */
export function updateTesterChecklistItem(
  itemId: string,
  status: 'ikke_startet' | 'ok' | 'har_avvik',
  notes?: string
): void {
  const list = getTesterChecklist();
  const updated = list.map((item) => (item.id === itemId ? { ...item, status, notes } : item));
  localStorage.setItem(STORAGE_KEYS.TESTER_CHECKLIST_PROGRESS, JSON.stringify(updated));
  window.dispatchEvent(new Event('tester-checklist-changed'));
}

/**
 * Henter alle innsendte tilbakemeldinger.
 */
export function getAllTesterFeedback(): TesterFeedbackItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TESTER_FEEDBACK);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch {
    return [];
  }
}

/**
 * Sender inn en tilbakemelding (strukturert eller fri form).
 */
export function submitTesterFeedback(params: {
  type: 'strukturert' | 'fri_form' | 'feilrapport' | 'onskesituasjon';
  checklistItemId?: string;
  title?: string;
  feedbackText: string;
  rating?: number;
  severity?: 'lav' | 'middels' | 'kritisk';
  screenshotBase64?: string;
  userId?: string;
  userName?: string;
}): TesterFeedbackItem {
  const current = getAllTesterFeedback();

  const isStandalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  const newFeedback: TesterFeedbackItem = {
    id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: params.type,
    checklistItemId: params.checklistItemId,
    title: params.title,
    feedbackText: params.feedbackText,
    rating: params.rating,
    severity: params.severity || 'lav',
    status: 'ny',
    screenshotBase64: params.screenshotBase64,
    deviceContext: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Ukjent',
      screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Ukjent',
      appVersion: '1.3.0',
      isStandalone,
    },
    submittedByUid: params.userId,
    submittedByName: params.userName || 'Tester',
    submittedAt: new Date().toISOString(),
  };

  const updated = [newFeedback, ...current];
  localStorage.setItem(STORAGE_KEYS.TESTER_FEEDBACK, JSON.stringify(updated));
  window.dispatchEvent(new Event('tester-feedback-changed'));

  return newFeedback;
}

/**
 * Oppdaterer status på en testrapport (f.eks. 'under_arbeid', 'lost', 'arkivert')
 */
export function updateTesterFeedbackStatus(
  id: string,
  status: 'ny' | 'under_arbeid' | 'lost' | 'arkivert'
): void {
  const current = getAllTesterFeedback();
  const updated = current.map((item) => (item.id === id ? { ...item, status } : item));
  localStorage.setItem(STORAGE_KEYS.TESTER_FEEDBACK, JSON.stringify(updated));
  window.dispatchEvent(new Event('tester-feedback-changed'));
}

/**
 * Sletter en testrapport.
 */
export function deleteTesterFeedback(id: string): void {
  const current = getAllTesterFeedback();
  const updated = current.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEYS.TESTER_FEEDBACK, JSON.stringify(updated));
  window.dispatchEvent(new Event('tester-feedback-changed'));
}

/**
 * Formaterer en testrapport som et strukturert oppdrag for Antigravity eller Claude Code.
 */
export function formatFeedbackAsAiTask(item: TesterFeedbackItem): string {
  const typeLabel = item.type === 'feilrapport' ? 'BUG/FEIL' : item.type === 'onskesituasjon' ? 'FORBEDRING/ØNSKE' : 'TILBAKEMELDING';
  const checklistContext = item.checklistItemId
    ? `\n- **Tilhørende sjekkpunkt:** ${item.checklistItemId}`
    : '';

  return `### [TESTER-${typeLabel}] ${item.title || 'Innsendt observasjon'}
- **Alvorlighetsgrad:** ${item.severity || 'normal'}
- **Innsendt av:** ${item.submittedByName || 'Tester'} (${new Date(item.submittedAt).toLocaleString('nb-NO')})
- **Enhet / Miljø:** ${item.deviceContext.userAgent} (Skjerm: ${item.deviceContext.screenSize}, Frittstående PWA: ${item.deviceContext.isStandalone ? 'Ja' : 'Nei'})
- **Appversjon:** ${item.deviceContext.appVersion}${checklistContext}

#### Beskrivelse:
${item.feedbackText}

${item.screenshotBase64 ? '*(Skjermbilde er vedlagt i rapporten i adminpanelet)*\n' : ''}
---
**Foreslått oppdrag for AI-agent (Antigravity / Claude Code):**
1. Undersøk kildekoden knyttet til ${item.checklistItemId || 'denne observasjonen'}.
2. Verifiser oppførselen på ${item.deviceContext.screenSize}-oppløsning eller tilsvarende enhet.
3. Foreslå og implementer en målrettet feilretting eller forbedring.
4. Kjør relevante enhetstester for å bekrefte at løsningen fungerer.`;
}
