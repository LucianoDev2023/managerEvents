import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';

export default function LoginScreen() {
  const router = useRouter();
  const { k } = useLocalSearchParams<{ k?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  function resolvedInviteKey() {
    return typeof k === 'string' && k.trim() ? k.trim() : '';
  }

  function goAfterLogin() {
    const key = resolvedInviteKey();
    if (key) {
      router.replace({
        pathname: '/(auth)/invite-preview',
        params: { k: key },
      } as any);
      return;
    }
    router.replace('/(tabs)');
  }

  const doLogin = async () => {
    Keyboard.dismiss();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      goAfterLogin();
    } catch (error: any) {
      Alert.alert('Erro no login', 'Confirme e-mail e/ou senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const current = auth.currentUser;

    // ⚠️ Se está como visitante, fazer login com conta existente pode “abandonar” dados do UID anônimo
    if (current?.isAnonymous) {
      Alert.alert(
        'Você está como visitante',
        'Se você entrar com uma conta existente agora, os dados criados como visitante podem não aparecer nessa conta.\n\nRecomendado: crie sua conta (converter) para manter tudo.',
        [
          {
            text: 'Converter (recomendado)',
            onPress: () => router.push('/(auth)/register'),
          },
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar login',
            style: 'destructive',
            onPress: () => {
              void doLogin();
            },
          },
        ],
      );
      return;
    }

    void doLogin();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient
        colors={['#0b0b0f', '#1b0033', '#3e1d73']}
        locations={[0, 0.7, 1]}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Text style={styles.title}>Login</Text>

          <TextInput
            placeholder="exemplo@gmail.com"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Senha"
              placeholderTextColor="#aaa"
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
            >
              {showPassword ? (
                <EyeOff size={20} color="#aaa" />
              ) : (
                <Eye size={20} color="#aaa" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            style={styles.signInButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signInText}>Login</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.bottomText}>
            Não possui uma conta?{' '}
            <Text
              style={styles.signUpText}
              onPress={() => router.push('/(auth)/register')}
            >
              Cadastre-se
            </Text>
          </Text>

          {/* ✅ LGPD: links obrigatórios no login */}
          <View style={styles.legalBox}>
            <Text style={styles.legalText}>
              Ao usar o app, você concorda com nossa{' '}
              <Text
                style={styles.legalLink}
                onPress={() => router.push('/(auth)/privacidade')}
              >
                Política de Privacidade
              </Text>{' '}
              e{' '}
              <Text
                style={styles.legalLink}
                onPress={() => router.push('/(auth)/termos')}
              >
                Termos de Uso
              </Text>
              .
            </Text>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingLeft: 40,
    paddingRight: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#1f1f25',
    color: '#fff',
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  passwordContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: '#1f1f25',
    color: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: 45,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 10,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#b18aff',
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: '#b18aff',
    borderRadius: 25,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  signInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomText: {
    color: '#aaa',
    fontSize: 14,
  },
  signUpText: {
    color: '#b18aff',
  },
  legalBox: {
    marginTop: 18,
    width: '100%',
    paddingHorizontal: 6,
  },
  legalText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  legalLink: {
    color: '#b18aff',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
