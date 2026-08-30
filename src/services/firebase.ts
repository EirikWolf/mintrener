import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mintrener.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mintrener",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mintrener.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "75260907978",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:75260907978:web:c5f62517b0aea66a60bf33",
};

// Initialiser Firebase App som singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase App Check (beskytter Firestore & Storage mot uautentiserte forespørsler og telemetriforgiftning)
const isE2eOrTest = import.meta.env.MODE === 'e2e' || import.meta.env.MODE === 'test' || Boolean(import.meta.env.VITE_FIREBASE_EMULATOR_HOST);
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;

if (typeof window !== 'undefined' && !isE2eOrTest) {
  // Støtt debug token i utvikling / localhost / CI
  if (import.meta.env.DEV || import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_APPCHECK_DEBUG_TOKEN === 'true' || !import.meta.env.VITE_APPCHECK_DEBUG_TOKEN
        ? true
        : import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  }

  if (recaptchaSiteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.warn('App Check kunne ikke initialiseres:', err);
    }
  }
}

// Auth med Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore med IndexedDB offline-cache (støtter flik-deling)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// B4 (revisjon § 5.3): Playwright-røykflyten bygges med `--mode e2e` (.env.e2e),
// som setter VITE_FIREBASE_EMULATOR_HOST slik at appen snakker med Firestore-
// EMULATOREN i stedet for produksjon. Variabelen finnes ikke i vanlige bygg —
// da er grenen død kode og hele blokken tree-shakes bort av Vite.
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST;
if (emulatorHost) {
  // Port 8080 = firestore-emulatorporten i firebase.json
  connectFirestoreEmulator(db, emulatorHost, 8080);
}

