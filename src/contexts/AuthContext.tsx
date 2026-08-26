import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { syncUserProfile, deleteUserData } from '../services/firestoreService';
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
    try {
      // 1. Slett data fra Firestore og localStorage
      await deleteUserData(uid);
      // 2. Slett selve auth-kontoen
      await deleteUser(user);
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        // Bruker må logge inn på nytt for å bekrefte sletting
        await signInWithPopup(auth, googleProvider);
        if (auth.currentUser) {
          await deleteUserData(uid);
          await deleteUser(auth.currentUser);
        }
      } else {
        throw err;
      }
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
    throw new Error('useAuth må brukes innenfor en AuthProvider');
  }
  return context;
}
