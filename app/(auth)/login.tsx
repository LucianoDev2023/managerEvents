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
  useColorScheme,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { useRegistrationFlow } from '@/context/RegistrationFlowContext';
import Fonts from '@/constants/Fonts';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { k } = useLocalSearchParams<{ k?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  const { setCameFromRegister } = useRegistrationFlow();

  const { signIn, loading: googleLoading } = useGoogleAuth({
    onSuccess: (data) => goAfterLogin(data.isNew),
  });

  function resolvedInviteKey() {
    return typeof k === 'string' && k.trim() ? k.trim() : '';
  }

  function goAfterLogin(isNew = false) {
    const key = resolvedInviteKey();

    if (isNew) {
      setCameFromRegister(true);
      router.replace({
        pathname: '/accountCreatedScreen',
        params: key ? { k: key } : {},
      } as any);
      return;
    }

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
        colors={colors.gradients}
        locations={[0, 0.7, 1]}
        style={{ flex: 1 }}
      >
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Text style={[styles.title, { color: colors.text }]}>Login</Text>

          <TextInput
            placeholder="exemplo@gmail.com"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundCard,
                color: colors.text,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Senha"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.passwordInput,
                {
                  backgroundColor: colors.backgroundCard,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
            >
              {showPassword ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotLink}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              Esqueceu a senha?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            style={[styles.signInButton, { backgroundColor: colors.primary }]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text
                style={[styles.signInText, { color: colors.textOnPrimary }]}
              >
                Login
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
              ou
            </Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>

          <GoogleLoginButton
            onPress={signIn}
            loading={googleLoading}
            disabled={loading}
          />

          <Text style={[styles.bottomText, { color: colors.textSecondary }]}>
            Não possui uma conta?{' '}
            <Text
              style={[styles.signUpText, { color: colors.primary }]}
              onPress={() => router.push('/(auth)/register')}
            >
              Cadastre-se
            </Text>
          </Text>

          {/* ✅ LGPD: links obrigatórios no login */}
          <View style={styles.legalBox}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>
              Ao usar o app, você concorda com nossa{' '}
              <Text
                style={[styles.legalLink, { color: colors.primary }]}
                onPress={() => router.push('/(auth)/privacidade')}
              >
                Política de Privacidade
              </Text>{' '}
              e{' '}
              <Text
                style={[styles.legalLink, { color: colors.primary }]}
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
    fontSize: 32,
    fontFamily: Fonts.bold,
    marginBottom: 40,
  },
  input: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    fontFamily: Fonts.regular,
  },
  passwordContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 8,
  },
  passwordInput: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingRight: 45,
    borderWidth: 1,
    fontFamily: Fonts.regular,
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
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  signInButton: {
    borderRadius: 16,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  signInText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  bottomText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  signUpText: {
    fontFamily: Fonts.bold,
  },
  legalBox: {
    marginTop: 18,
    width: '100%',
    paddingHorizontal: 6,
  },
  legalText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: Fonts.regular,
  },
  legalLink: {
    textDecorationLine: 'underline',
    fontFamily: Fonts.bold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
});
