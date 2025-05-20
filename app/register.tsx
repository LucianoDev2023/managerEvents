import React, { useState } from 'react';
import { View, TextInput, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebase';
import Colors from '@/constants/Colors';
import AuthScreen from '@/components/AuthScreen';

export default function RegisterScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirm) return;
    if (password !== confirm) {
      alert('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: name });
      router.replace('/(tabs)');
    } catch (error: any) {
      alert('Erro ao registrar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      type="register"
      title="Criar Conta"
      subtitle="Preencha seus dados"
      buttonText="Registrar"
      loading={loading}
      inputs={
        <View
          style={{
            borderRadius: 12,
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
            placeholder="Nome"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
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
            placeholder="Email"
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
            placeholder="Senha"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{
              color: theme.text,
              fontSize: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          />
          <TextInput
            placeholder="Confirmar senha"
            placeholderTextColor={theme.textSecondary}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            style={{
              color: theme.text,
              fontSize: 16,
              paddingVertical: 12,
            }}
          />
        </View>
      }
      onSubmit={handleRegister}
      bottomText="Já tem uma conta?"
      bottomActionText="Fazer login"
      onBottomAction={() => router.push('/login')}
    />
  );
}
