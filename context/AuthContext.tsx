import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { auth } from '@/config/firebase';

// Tipagem do contexto
interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Valor padrão
const AuthContext = createContext<AuthContextType>({
  user: null,
  authLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
});

// Provider do contexto
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // Listener para mudanças de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const justCreated = await AsyncStorage.getItem('justCreatedAccount');
        if (justCreated === 'true') {
          // Deixa a AccountCreatedScreen cuidar do redirecionamento
          setAuthLoading(false);
          return;
        }
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }

      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Registro + perfil + redirecionamento
  const register = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(userCredential.user, { displayName: name });
    await AsyncStorage.setItem('justCreatedAccount', 'true');
    router.replace('/accountCreatedScreen'); // ajuste o caminho se necessário
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.replace('/login');
  };

  // Reset de senha
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{ user, authLoading, login, register, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook para consumir o contexto
export const useAuth = () => useContext(AuthContext);
