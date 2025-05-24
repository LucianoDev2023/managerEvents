import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/config/firebase';

export function useAuthListener() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // <-- undefined: ainda carregando
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return () => {
      unsubscribe(); // segurança: remove listener ao desmontar
    };
  }, []);

  return { user, authLoading };
}
