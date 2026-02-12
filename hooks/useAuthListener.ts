import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  User,
  signInAnonymously as fbSignInAnonymously,
  signOut,
} from 'firebase/auth';
import { auth } from '@/config/firebase';

type AuthUserState = User | null;

export function useAuthListener() {
  const [user, setUser] = useState<AuthUserState | undefined>(undefined); // undefined = carregando
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const isAuthReady = !authLoading && user !== undefined;
  const isLogged = !!user; // inclui anônimo
  const isAnonymous = !!user?.isAnonymous;

  const signInAnonymously = useCallback(async () => {
    // se já está logado (anon ou não), não precisa refazer
    if (auth.currentUser) return auth.currentUser;

    const cred = await fbSignInAnonymously(auth);
    return cred.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return {
    user: (user === undefined ? null : user) as AuthUserState, // opcional: normalize pra não vazar undefined
    rawUser: user, // se você quiser diferenciar undefined
    authLoading,
    isAuthReady,
    isLogged,
    isAnonymous,
    signInAnonymously,
    logout,
  };
}
