import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export type AuthScreenType = 'signin' | 'signup' | null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authScreen: AuthScreenType;
  openAuthScreen: (screen: 'signin' | 'signup') => void;
  closeAuthScreen: () => void;
  signInWithGoogle: () => Promise<void>;
  signInEmail: (email: string, pass: string) => Promise<void>;
  signUpEmail: (email: string, pass: string, displayName?: string, phone?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInDemoCaregiver: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  syncProfileToFirestore: (extraData?: Record<string, any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreenType>(() => {
    // When opening app for the first time, immediately show Sign Up screen
    return sessionStorage.getItem('aura_authenticated_session') === 'true' ? null : 'signup';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Authenticated: take user directly to the main app dashboard
        sessionStorage.setItem('aura_authenticated_session', 'true');
        setAuthScreen(null);

        // Sync or retrieve user profile
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Elder Rajamma',
              email: currentUser.email || 'user@example.com',
              photoURL: currentUser.photoURL || '',
              seniorName: localStorage.getItem('aura_senior_name') || 'Rajamma',
              seniorAge: localStorage.getItem('aura_senior_age') || '72',
              liveVoice: localStorage.getItem('aura_live_voice') || 'Aoede',
              liveLang: localStorage.getItem('aura_live_lang') || 'te-IN',
              speechRate: localStorage.getItem('aura_speech_rate') || 'Normal',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn('Profile initialization note:', err);
        }
      } else {
        // Unauthenticated: if no active session, show signup (or keep signin if user chose signin)
        sessionStorage.removeItem('aura_authenticated_session');
        setAuthScreen((prev) => (prev === 'signin' ? 'signin' : 'signup'));
      }
    });

    return () => unsubscribe();
  }, []);

  const openAuthScreen = (screen: 'signin' | 'signup') => {
    setAuthScreen(screen);
    setIsAuthModalOpen(false);
  };

  const closeAuthScreen = () => {
    if (user) {
      setAuthScreen(null);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      sessionStorage.setItem('aura_authenticated_session', 'true');
      setAuthScreen(null);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        const error = new Error('Sign-in popup was blocked by the browser. Please allow popups or use email sign-in.');
        (error as any).code = 'auth/popup-blocked';
        throw error;
      }
      console.warn('Google Sign-In note:', err?.message || err);
      throw err;
    }
  };

  const signInEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      sessionStorage.setItem('aura_authenticated_session', 'true');
      setAuthScreen(null);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      throw err;
    }
  };

  const signUpEmail = async (email: string, pass: string, displayName?: string, phone?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (displayName && userCredential.user) {
        try {
          await updateProfile(userCredential.user, { displayName });
        } catch (e) {
          console.warn('Could not update displayName:', e);
        }
      }
      if (displayName) {
        localStorage.setItem('aura_caregiver_name', displayName);
      }
      if (phone) {
        localStorage.setItem('aura_caregiver_phone', phone);
      }
      sessionStorage.setItem('aura_authenticated_session', 'true');
      setAuthScreen(null);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      throw err;
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      throw err;
    }
  };

  const signInDemoCaregiver = async () => {
    const demoEmail = 'caregiver.rajamma@aura.care';
    const demoPass = 'Caregiver2026!';
    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      sessionStorage.setItem('aura_authenticated_session', 'true');
      setAuthScreen(null);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
          sessionStorage.setItem('aura_authenticated_session', 'true');
          setAuthScreen(null);
          setIsAuthModalOpen(false);
          return;
        } catch {
          // Handled below
        }
      }
      throw err;
    }
  };

  const signOut = async () => {
    try {
      sessionStorage.removeItem('aura_authenticated_session');
      await fbSignOut(auth);
      setAuthScreen('signin');
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error('Sign out error:', err);
      sessionStorage.removeItem('aura_authenticated_session');
      setAuthScreen('signin');
      setIsAuthModalOpen(false);
      throw err;
    }
  };

  const syncProfileToFirestore = async (extraData?: Record<string, any>) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}`;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(
        userDocRef,
        {
          uid: auth.currentUser.uid,
          displayName: auth.currentUser.displayName || 'Elder Rajamma',
          email: auth.currentUser.email || 'user@example.com',
          photoURL: auth.currentUser.photoURL || '',
          seniorName: localStorage.getItem('aura_senior_name') || 'Rajamma',
          seniorAge: localStorage.getItem('aura_senior_age') || '72',
          liveVoice: localStorage.getItem('aura_live_voice') || 'Aoede',
          liveLang: localStorage.getItem('aura_live_lang') || 'te-IN',
          speechRate: localStorage.getItem('aura_speech_rate') || 'Normal',
          updatedAt: new Date().toISOString(),
          ...extraData,
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authScreen,
        openAuthScreen,
        closeAuthScreen,
        signInWithGoogle,
        signInEmail,
        signUpEmail,
        sendPasswordReset,
        signInDemoCaregiver,
        signOut,
        isAuthModalOpen,
        setIsAuthModalOpen,
        syncProfileToFirestore,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
