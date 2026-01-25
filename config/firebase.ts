// config/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth } from 'firebase/auth';
import ReactNativeAsyncStorage, {
  AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyD_UKirzoq-kOOBaxo63sct1QbH-46zvTs',
  authDomain: 'wpfg-2025.firebaseapp.com',
  projectId: 'wpfg-2025',
  storageBucket: 'wpfg-2025.firebasestorage.app',
  messagingSenderId: '1036526058558',
  appId: '1:1036526058558:web:37897f3d04ec1efd30e56f',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); //
