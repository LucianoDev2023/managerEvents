import React, { useState } from 'react';
import { View, TextInput, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase';
import Colors from '@/constants/Colors';
import AuthScreen from '@/components/AuthScreen';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      alert('Digite seu e-mail.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Email de recuperação enviado!');
      router.push('/login');
    } catch (error: any) {
      alert('Erro ao enviar email: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      type="recover"
      title="Recuperar Senha"
      subtitle="Informe seu e-mail para redefinir"
      buttonText="Enviar"
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
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            style={{
              color: theme.text,
              fontSize: 16,
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      }
      onSubmit={handleResetPassword}
      bottomText="Lembrou sua senha?"
      bottomActionText="Voltar para login"
      onBottomAction={() => router.push('/login')}
    />
  );
}
