import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "mintrener",
  appId: "1:75260907978:web:c5f62517b0aea66a60bf33",
  storageBucket: "mintrener.firebasestorage.app",
  apiKey: "AIzaSyDGFE0j1GmJGCzSveCtnXOut8wdRobybM4",
  authDomain: "mintrener.firebaseapp.com",
  messagingSenderId: "75260907978",
  projectNumber: "75260907978",
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
