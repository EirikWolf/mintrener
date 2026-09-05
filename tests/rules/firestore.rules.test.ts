/**
 * Sikkerhetstester for firestore.rules — kjøres mot Firestore-emulatoren.
 *
 * Kjør via `npm run test:rules` (wrapper rundt `firebase emulators:exec`).
 * Disse testene er bevisst holdt UTENFOR standard `npm test`-kjøringen
 * (se vitest.config.ts / vitest.rules.config.ts) fordi de krever en
 * kjørende emulator (Java). De trenger IKKE .env.local — alt går mot
 * demo-prosjektet `demo-mintrener` i emulatoren.
 *
 * Why: revisjonens §5.1/§5.3 fant at global_stats var åpen for vilkårlig
 * overskriving (`allow write: if true`) og at rooms-join manglet auth.
 * Testene her låser inn herdingen og fungerer som regresjonsvern.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const HOST_UID = 'host-uid-1';
const GUEST_UID = 'guest-uid-1';
const ROOM_ID = 'TEST01';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-mintrener',
    firestore: {
      rules: readFileSync(fileURLToPath(new URL('../../firestore.rules', import.meta.url)), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed data uten regler: et eksisterende rom, statistikk og en brukerprofil
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'rooms', ROOM_ID), {
      roomId: ROOM_ID,
      hostUid: HOST_UID,
      hostName: 'Instruktør',
      workout: { id: 'w1', name: 'Testøkt' },
      status: 'waiting',
      participantCount: 1,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'global_stats', 'overview'), {
      totalWorkouts: 10,
      totalSecondsTrained: 3600,
      shareLinkOpens: 4,
      types: { hiit: 6, custom: 4 },
      lastUpdated: new Date(),
    });
    await setDoc(doc(db, 'global_stats', 'ratings'), {
      for_lett: 1,
      passe: 5,
      for_tungt: 2,
      lastUpdated: new Date(),
    });
    await setDoc(doc(db, 'global_stats', 'perf'), {
      sessions: 3,
      longTasks: 2,
      longTaskSessions: 2,
      activeMinutes: 25,
      audioDeviationSamples: 40,
      deviationUnder20Ms: 2,
      deviation20to50Ms: 1,
      deviationOver50Ms: 0,
      lastUpdated: new Date(),
    });
    await setDoc(doc(db, 'global_stats', 'engagement'), {
      onboarding_started: 7,
      onboarding_personaChosen_hardcore: 3,
      streak_weekCompleted: 12,
      streak_milestone_w2: 2,
      accountPrompt_first_workout_shown: 5,
      lastUpdated: new Date(),
    });
    await setDoc(doc(db, 'users', 'alice'), { displayName: 'Alice' });
    await setDoc(doc(db, 'clock_sync', 'client-abc'), { ts: new Date() });
  });
});

describe('global_stats', () => {
  it('NEGATIV: uautentisert kan IKKE erstatte overview med vilkårlige data', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'global_stats', 'overview'), { pwned: true, totalWorkouts: 0 })
    );
  });

  it('NEGATIV: kan IKKE sette en teller til en vilkårlig verdi', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(
        doc(db, 'global_stats', 'overview'),
        { totalWorkouts: 999999, lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('NEGATIV: kan IKKE hoppe over lastUpdated=serverTimestamp i en ellers gyldig oppdatering', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'global_stats', 'overview'), { totalWorkouts: increment(1) }, { merge: true })
    );
  });

  it('NEGATIV: kan IKKE skrive ukjente felt til overview', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(
        doc(db, 'global_stats', 'overview'),
        { hacked: 'yes', totalWorkouts: increment(1), lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('NEGATIV: kan IKKE slette overview', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(deleteDoc(doc(db, 'global_stats', 'overview')));
  });

  it('NEGATIV: kan IKKE øke en rating med mer enn 1', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(
        doc(db, 'global_stats', 'ratings'),
        { passe: increment(5), lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('POSITIV: gyldig enkelt-inkrement på overview går gjennom (samme form som telemetryService)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'global_stats', 'overview'),
        {
          totalWorkouts: increment(1),
          totalSecondsTrained: increment(600),
          // Nøstet map-form — setDoc med merge splitter ikke punktum-nøkler,
          // så dette speiler telemetryService sitt faktiske payload
          types: { hiit: increment(1) },
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      )
    );
  });

  it('POSITIV: shareLinkOpens-inkrement går gjennom (recordShareLinkOpen-formen)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'global_stats', 'overview'),
        { shareLinkOpens: increment(1), lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('POSITIV: første skriv (create) med gyldige inkrementer går gjennom', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), 'global_stats', 'overview'));
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'global_stats', 'overview'),
        {
          totalWorkouts: increment(1),
          totalSecondsTrained: increment(900),
          types: { custom: increment(1) },
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      )
    );
  });

  it('POSITIV: øvelsesaggregat i nøstet form går gjennom (recordWorkoutTelemetry-formen)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'global_stats', 'exercises'),
        {
          kneboy: { count: increment(1), seconds: increment(20), name: 'Knebøy' },
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      )
    );
  });

  it('POSITIV: gyldig rating-inkrement (+1) går gjennom', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'global_stats', 'ratings'),
        { for_tungt: increment(1), lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });
});

describe('global_stats/perf (A5 ytelsestelemetri, regresjonsvern)', () => {
  it('POSITIV: gyldig økt-inkrement går gjennom (recordPerfTelemetry-formen)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'global_stats', 'perf'),
        {
          sessions: increment(1),
          longTasks: increment(4),
          audioDeviationSamples: increment(180),
          deviationUnder20Ms: increment(1),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      )
    );
  });

  it('POSITIV: økt UTEN long-task-støtte (iOS Safari) går gjennom uten longTaskSessions/activeMinutes (utelatt valgfritt felt)', async () => {
    // Speiler recordPerfTelemetry når report.longTaskMonitoringSupported er false:
    // sessions/longTasks(0)/lydavvik sendes fortsatt, men longTaskSessions og
    // activeMinutes utelates HELT (ikke satt til 0) – nevneren for
    // long-tasks-per-minutt-metrikken skal kun telle økter som faktisk kunne
    // observere long tasks.
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'global_stats', 'perf'),
        {
          sessions: increment(1),
          longTasks: increment(0),
          audioDeviationSamples: increment(50),
          deviationUnder20Ms: increment(1),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      )
    );
  });

  it('NEGATIV: kan IKKE erstatte perf med vilkårlige data (ikke increment, mangler lastUpdated)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'global_stats', 'perf'), { sessions: 999999, longTasks: 0 })
    );
  });

  it('NEGATIV: kan IKKE skrive ukjente felt til perf', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(
        doc(db, 'global_stats', 'perf'),
        { hacked: 'yes', sessions: increment(1), lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });
});

describe('global_stats/engagement (C1/C2 engasjementstellere, regresjonsvern)', () => {
  it('POSITIV: uautentisert increment-på-1 går gjennom (recordEngagementEvent-formen)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'global_stats', 'engagement'),
        { streak_weekCompleted: increment(1), lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('NEGATIV: kan IKKE øke en teller med mer enn 1', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(
        doc(db, 'global_stats', 'engagement'),
        { streak_weekCompleted: increment(2), lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('NEGATIV: kan IKKE skrive ukjente felt til engagement', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(
        doc(db, 'global_stats', 'engagement'),
        { hacker_field: increment(1), streak_weekCompleted: increment(1), lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });

  it('POSITIV: første skriv (create) med gyldig inkrement går gjennom', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), 'global_stats', 'engagement'));
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'global_stats', 'engagement'),
        { onboarding_started: increment(1), lastUpdated: serverTimestamp() },
        { merge: true }
      )
    );
  });
});

describe('rooms', () => {
  it('NEGATIV: uautentisert kan IKKE øke participantCount', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(db, 'rooms', ROOM_ID), { participantCount: increment(1) })
    );
  });

  it('POSITIV: autentisert deltaker KAN øke participantCount med nøyaktig 1', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'rooms', ROOM_ID), { participantCount: increment(1) })
    );
  });

  it('NEGATIV: autentisert deltaker kan IKKE øke participantCount med 5', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'rooms', ROOM_ID), { participantCount: increment(5) })
    );
  });

  it('NEGATIV: deltaker (ikke vert) kan IKKE endre status', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(updateDoc(doc(db, 'rooms', ROOM_ID), { status: 'running' }));
  });

  it('NEGATIV: join-oppdatering kan IKKE røre andre felt i tillegg til participantCount', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'rooms', ROOM_ID), {
        participantCount: increment(1),
        hostName: 'Ondsinnet',
      })
    );
  });

  it('POSITIV: verten KAN starte økten (status + starttidspunkt)', async () => {
    const db = testEnv.authenticatedContext(HOST_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'rooms', ROOM_ID), {
        status: 'running',
        startTimestamp: Date.now(),
        startAtServerMs: Date.now() + 3000,
      })
    );
  });

  it('NEGATIV: uautentisert kan IKKE liste /rooms-samlingen (forhindrer PII-skraping)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, 'rooms')));
  });

  it('NEGATIV: autentisert deltaker kan IKKE liste /rooms-samlingen', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(getDocs(collection(db, 'rooms')));
  });

  it('POSITIV: uautentisert KAN lese et spesifikt rom ved eksakt ID (getDoc)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'rooms', ROOM_ID)));
  });
});

describe('users (eier-lås, regresjonsvern)', () => {
  it('NEGATIV: kan IKKE lese en annen brukers dokument', async () => {
    const db = testEnv.authenticatedContext('mallory').firestore();
    await assertFails(getDoc(doc(db, 'users', 'alice')));
  });

  it('POSITIV: kan lese sitt eget dokument', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'users', 'alice')));
  });

  it('POSITIV: kan lese og skrive egne personal_records', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', 'alice', 'personal_records', 'kneboy'), {
        exerciseId: 'kneboy',
        maxReps: 50,
      })
    );
    await assertSucceeds(getDoc(doc(db, 'users', 'alice', 'personal_records', 'kneboy')));
  });
});

describe('clock_sync (regresjonsvern for q1-herdingen)', () => {
  it('NEGATIV: kan IKKE skrive ekstra felt utover ts', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'clock_sync', 'client-x'), { ts: serverTimestamp(), evil: 1 })
    );
  });

  it('NEGATIV: kan IKKE liste clock_sync-samlingen', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, 'clock_sync')));
  });

  it('POSITIV: kan skrive sitt eget ts=serverTimestamp-dokument', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(doc(db, 'clock_sync', 'client-y'), { ts: serverTimestamp() })
    );
  });
});

describe('organizations (Fase 2 sikkerhet & B2B-regler, Revisjon D herding)', () => {
  const ORG_ID = 'org-test-bedrift';
  const INACTIVE_ORG_ID = 'org-inaktiv-bedrift';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'organizations', ORG_ID), {
        id: ORG_ID,
        name: 'Test Bedrift AS',
        joinCode: 'BEDRIFT26',
        isActive: true,
        billing: { invoiceEmail: 'faktura@bedrift.no', accountNumber: '1234.56.78901' },
      });
      await setDoc(doc(db, 'organizations', INACTIVE_ORG_ID), {
        id: INACTIVE_ORG_ID,
        name: 'Inaktiv Bedrift AS',
        joinCode: 'GAMMEL25',
        isActive: false,
      });
    });
  });

  it('NEGATIV: uautentisert bruker kan IKKE lese organisasjoner', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'organizations', ORG_ID)));
  });

  it('NEGATIV: vanlig autentisert bruker kan IKKE liste samtlige organisasjoner (hindrer B2B-skraping)', async () => {
    const db = testEnv.authenticatedContext('vanlig-bruker-uid').firestore();
    await assertFails(getDocs(collection(db, 'organizations')));
  });

  it('POSITIV: administrator KAN liste samtlige organisasjoner', async () => {
    const db = testEnv.authenticatedContext('admin-uid', { email: 'admin@mintrener.no' }).firestore();
    await assertSucceeds(getDocs(collection(db, 'organizations')));
  });

  it('POSITIV: autentisert bruker KAN hente (get) en aktiv organisasjon direkte', async () => {
    const db = testEnv.authenticatedContext('vanlig-bruker-uid').firestore();
    await assertSucceeds(getDoc(doc(db, 'organizations', ORG_ID)));
  });

  it('NEGATIV: autentisert bruker kan IKKE hente (get) en deaktivert organisasjon', async () => {
    const db = testEnv.authenticatedContext('vanlig-bruker-uid').firestore();
    await assertFails(getDoc(doc(db, 'organizations', INACTIVE_ORG_ID)));
  });

  it('POSITIV: administrator KAN hente en deaktivert organisasjon', async () => {
    const db = testEnv.authenticatedContext('admin-uid', { email: 'admin@mintrener.no' }).firestore();
    await assertSucceeds(getDoc(doc(db, 'organizations', INACTIVE_ORG_ID)));
  });

  it('NEGATIV: vanlig bruker kan IKKE opprette eller endre en organisasjon', async () => {
    const db = testEnv.authenticatedContext('vanlig-bruker-uid', { email: 'vanlig@bruker.no' }).firestore();
    await assertFails(
      setDoc(doc(db, 'organizations', 'ny-org'), {
        id: 'ny-org',
        name: 'Hacket Bedrift',
        joinCode: 'HACK26',
      })
    );
  });

  it('POSITIV: autorisert administrator kan opprette og endre en organisasjon', async () => {
    const db = testEnv.authenticatedContext('admin-uid', { email: 'admin@mintrener.no' }).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'organizations', 'ny-admin-org'), {
        id: 'ny-admin-org',
        name: 'Ny Pilotbedrift AS',
        joinCode: 'PILOT26',
        isActive: true,
      })
    );
  });
});

describe('users og GDPR Art. 17 sletting (Revisjon D bevis)', () => {
  const USER_ID = 'test-bruker-123';
  const OTHER_USER_ID = 'annen-bruker-456';

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      // Opprett profil
      await setDoc(doc(db, 'users', USER_ID), {
        uid: USER_ID,
        email: 'bruker@test.no',
        displayName: 'Test Bruker',
      });
      // Opprett 5 underkolleksjoner
      await setDoc(doc(db, 'users', USER_ID, 'history', 'hist-1'), {
        id: 'hist-1',
        workoutName: 'Tabata',
      });
      await setDoc(doc(db, 'users', USER_ID, 'workouts', 'custom-1'), {
        id: 'custom-1',
        name: 'Min Egendefinerte Økt',
      });
      await setDoc(doc(db, 'users', USER_ID, 'custom_exercises', 'ex-1'), {
        id: 'ex-1',
        name: 'Kaffepause-strekk',
      });
      await setDoc(doc(db, 'users', USER_ID, 'strength_logs', 'log-1'), {
        id: 'log-1',
        exerciseId: 'push-ups',
        weight: 0,
      });
      await setDoc(doc(db, 'users', USER_ID, 'personal_records', 'pr-1'), {
        id: 'pr-1',
        exerciseId: 'planke',
        bestHoldSeconds: 120,
      });
    });
  });

  it('POSITIV: autentisert eier KAN lese og slette alle sine 5 underkolleksjoner og brukerprofil', async () => {
    const db = testEnv.authenticatedContext(USER_ID).firestore();

    // 1. Verifiser at data kan leses av eier
    const historySnap = await getDocs(collection(db, 'users', USER_ID, 'history'));
    expect(historySnap.docs.length).toBe(1);

    // 2. Slett alle underdokumenter (nøyaktig slik deleteUserData gjør)
    await assertSucceeds(deleteDoc(doc(db, 'users', USER_ID, 'history', 'hist-1')));
    await assertSucceeds(deleteDoc(doc(db, 'users', USER_ID, 'workouts', 'custom-1')));
    await assertSucceeds(deleteDoc(doc(db, 'users', USER_ID, 'custom_exercises', 'ex-1')));
    await assertSucceeds(deleteDoc(doc(db, 'users', USER_ID, 'strength_logs', 'log-1')));
    await assertSucceeds(deleteDoc(doc(db, 'users', USER_ID, 'personal_records', 'pr-1')));

    // 3. Slett brukerprofil-dokumentet
    await assertSucceeds(deleteDoc(doc(db, 'users', USER_ID)));

    // 4. BEVIS: Verifiser direkte mot databasen at alle dokumenter faktisk er borte
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      const profileSnap = await getDoc(doc(adminDb, 'users', USER_ID));
      expect(profileSnap.exists()).toBe(false);

      const hSnap = await getDocs(collection(adminDb, 'users', USER_ID, 'history'));
      expect(hSnap.empty).toBe(true);

      const wSnap = await getDocs(collection(adminDb, 'users', USER_ID, 'workouts'));
      expect(wSnap.empty).toBe(true);

      const cSnap = await getDocs(collection(adminDb, 'users', USER_ID, 'custom_exercises'));
      expect(cSnap.empty).toBe(true);

      const sSnap = await getDocs(collection(adminDb, 'users', USER_ID, 'strength_logs'));
      expect(sSnap.empty).toBe(true);

      const prSnap = await getDocs(collection(adminDb, 'users', USER_ID, 'personal_records'));
      expect(prSnap.empty).toBe(true);
    });
  });

  it('NEGATIV: annen bruker kan IKKE slette en fremmed brukers data', async () => {
    const db = testEnv.authenticatedContext(OTHER_USER_ID).firestore();

    await assertFails(deleteDoc(doc(db, 'users', USER_ID, 'history', 'hist-1')));
    await assertFails(deleteDoc(doc(db, 'users', USER_ID)));
  });

  it('NEGATIV: uautentisert klient kan IKKE slette brukerdata (beviser hvorfor deleteUserData må kalles før deleteUser)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(deleteDoc(doc(db, 'users', USER_ID, 'history', 'hist-1')));
    await assertFails(deleteDoc(doc(db, 'users', USER_ID)));
  });
});

