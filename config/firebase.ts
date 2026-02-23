import { initializeApp, getApps, getApp } from 'firebase/app';
import Constants from 'expo-constants';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey:
    Constants.expoConfig?.extra?.firebaseApiKey ||
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    Constants.expoConfig?.extra?.firebaseAuthDomain ||
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    Constants.expoConfig?.extra?.firebaseProjectId ||
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    Constants.expoConfig?.extra?.firebaseStorageBucket ||
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    Constants.expoConfig?.extra?.firebaseMessagingSenderId ||
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:
    Constants.expoConfig?.extra?.firebaseAppId ||
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Firestore (Offline persistence is automatic in React Native)
export const db = getFirestore(app);

// ✅ App Check (P1 Security)
if (
  typeof window !== 'undefined' &&
  process.env.EXPO_PUBLIC_APP_CHECK_SITE_KEY
) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(
      process.env.EXPO_PUBLIC_APP_CHECK_SITE_KEY,
    ),
    isTokenAutoRefreshEnabled: true,
  });
}

export const storage = getStorage(app);
export const auth = getAuth(app);
