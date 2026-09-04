import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { syncUserProfile, deleteUserData } from '../services/firestoreService';
import { clearAllLocalUserData } from '../constants/storageKeys';
import { UserProfile } from '../types/models';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Sjekk om vi kom tilbake fra en mobil redirect-innlogging
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          setUser(result.user);
          const p = await syncUserProfile(result.user);
          setProfile(p);
        }
      })
      .catch((err) => {
        console.warn('Redirect innloggingsfeil:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const p = await syncUserProfile(currentUser);
          setProfile(p);
        } catch (err) {
          console.warn('Kunne ikke synke brukerprofil:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        // Fallback til full redirect på mobil
        await signInWithRedirect(auth, googleProvider);
      } else if (error.code === 'auth/operation-not-allowed') {
        alert('Google Innlogging er ikke aktivert i Firebase Console ennå.\n\nGå til Firebase Console -> Authentication -> Sign-in method -> Google -> Aktiver.');
      } else if (error.code === 'auth/unauthorized-domain') {
        alert('Domenet er ikke godkjent i Firebase Console.\n\nLegg til ' + window.location.hostname + ' under Authentication -> Settings -> Authorized domains.');
      } else {
        console.error('Innlogging feilet:', err);
        // Prøv redirect som fallback
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          console.error('Redirect feilet også:', redirectErr);
        }
      }
    }
  };

  const logout = async () => {
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const deleteAccount = async () => {
    if (!user) return;
    const uid = user.uid;

    // 1. Re-autentiser først for å sikre at sesjonen er fersk (hindrer auth/requires-recent-login
    // ETTER at data er slettet, som ville etterlatt en halv-slettet tilstand)
    try {
      await reauthenticateWithPopup(user, googleProvider);
    } catch (authErr: any) {
      console.warn('Re-autentisering feilet:', authErr);
      // Hvis brukeren avbryter popupen, avbryt hele slettingen uten å røre data
      if (authErr.code === 'auth/popup-closed-by-user' || authErr.code === 'auth/cancelled-popup-request') {
        throw new Error('Sletting avbrutt: re-autentisering ble ikke fullført.');
      }
      // For andre feil (f.eks. popup blokkert), prøv likevel sletting direkte
    }

    try {
      // 2. Slett brukerdata fra Firestore og lokal lagring (GDPR Art. 17) MENS brukeren fortsatt er autentisert
      await deleteUserData(uid);

      // 3. Slett selve auth-kontoen til slutt
      const currentUser = auth.currentUser || user;
      await deleteUser(currentUser);
    } catch (err) {
      // Sikre at lokal lagring uansett er tømt selv om en nettverksfeil oppstod underveis
      clearAllLocalUserData();
      throw err;
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      profile: null,
      loading: false,
      signInWithGoogle: async () => {},
      logout: async () => {},
      deleteAccount: async () => {},
    };
  }
  return context;
}
