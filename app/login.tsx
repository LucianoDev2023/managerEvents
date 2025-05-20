import React, { useState } from 'react';
import { View, TextInput, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import Colors from '@/constants/Colors';
import AuthScreen from '@/components/AuthScreen';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      alert('Erro no login: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      type="login"
      title="Login"
      subtitle="Bem-vindo"
      buttonText="Entrar"
      loading={loading}
      inputs={
        <View
          style={{
            borderRadius: 10,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.backgroundAlt,
            shadowColor: scheme === 'dark' ? '#fff' : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 6,
            marginBottom: 24,
          }}
        >
          <TextInput
            placeholder="Digite seu email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            style={{
              color: theme.text,
              fontSize: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              marginBottom: 12,
            }}
          />
          <TextInput
            placeholder="Digite sua senha"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{
              color: theme.text,
              fontSize: 16,
              paddingVertical: 12,
            }}
          />
        </View>
      }
      onSubmit={handleLogin}
      bottomText="Não tem uma conta?"
      bottomActionText="Criar conta"
      onBottomAction={() => router.push('/register')}
    />
  );
}
