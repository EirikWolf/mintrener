import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

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
