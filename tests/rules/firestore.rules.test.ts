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
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
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
      audioDeviationSamples: 40,
      deviationUnder20Ms: 2,
      deviation20to50Ms: 1,
      deviationOver50Ms: 0,
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

  it('NEGATIV: uautentisert kan IKKE opprette rom', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'rooms', 'NYROM1'), {
        roomId: 'NYROM1',
        hostUid: 'ingen',
        status: 'waiting',
        participantCount: 1,
      })
    );
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
