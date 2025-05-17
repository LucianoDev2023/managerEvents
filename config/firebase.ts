import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyD_UKirzoq-kOOBaxo63sct1QbH-46zvTs',
  authDomain: 'wpfg-2025.firebaseapp.com',
  projectId: 'wpfg-2025',
  storageBucket: 'wpfg-2025.firebasestorage.app',
  messagingSenderId: '1036526058558',
  appId: '1:1036526058558:web:37897f3d04ec1efd30e56f',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
