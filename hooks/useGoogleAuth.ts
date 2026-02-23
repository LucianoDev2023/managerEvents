import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import Constants from 'expo-constants';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { logger } from '@/lib/logger';
import { getFriendlyErrorMessage } from '@/lib/utils/errors';

interface UseGoogleAuthOptions {
  onSuccess?: (data: { user: any; isNew: boolean }) => void;
  skipProvisioning?: boolean; // ✅ Se true, não cria documento no Firestore
}

// Configuração única fora do hook
const GOOGLE_WEB_CLIENT_ID =
  Constants.expoConfig?.extra?.googleWebClientId ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

logger.debug('[GoogleAuth] Usando Web Client ID:', GOOGLE_WEB_CLIENT_ID);

if (!GOOGLE_WEB_CLIENT_ID) {
  throw new Error(
    '[useGoogleAuth] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID não definido. Verifique o .env ou as configurações do Expo.',
  );
}

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  scopes: ['profile', 'email', 'openid'],
});

export function useGoogleAuth(options?: UseGoogleAuthOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFirebaseLogin = async (idToken: string) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const isNew = !userDoc.exists();

      if (isNew) {
        if (options?.skipProvisioning) {
          // Skip provisioning if flag is set
        } else {
          await setDoc(
            userDocRef,
            {
              name: user.displayName || 'Usuário Google',
              email: user.email,
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );

          await setDoc(
            doc(db, 'publicUsers', user.uid),
            {
              uid: user.uid,
              name: user.displayName || 'Usuário Google', // ✅ Nome público para galeria
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      }

      options?.onSuccess?.({ user, isNew });
    } catch (err: any) {
      const errorMsg = getFriendlyErrorMessage(err);
      setError(errorMsg);
      Alert.alert('Erro', errorMsg);
      logger.error('Firebase Auth Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);

      await GoogleSignin.hasPlayServices();

      // ✅ Força a exibição do seletor de contas "limpando" qualquer sessão anterior
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignora se não houver sessão ativa
      }

      const response = await GoogleSignin.signIn();

      if (response.type !== 'success') {
        setLoading(false);
        return;
      }

      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error('Token não recebido.');
      }

      await handleFirebaseLogin(idToken);
    } catch (err: any) {
      const errorMsg = getFriendlyErrorMessage(err);

      if (errorMsg === 'cancelled') {
        setLoading(false);
        return;
      }

      setError(errorMsg);
      setLoading(false);
      Alert.alert('Login', errorMsg);
      logger.error('Google Sign-In Error:', err);
    }
  };

  return {
    signIn,
    loading,
    error,
  };
}
