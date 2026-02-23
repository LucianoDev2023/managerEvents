import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  useColorScheme,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  EmailAuthProvider,
  linkWithCredential,
  User,
} from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react-native';
import { auth } from '@/config/firebase';
import { useRegistrationFlow } from '@/context/RegistrationFlowContext';
import { useEvents } from '@/context/EventsContext';
import { doc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import * as WebBrowser from 'expo-web-browser';
import { LEGAL_URLS } from '@/constants/Legal';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import Fonts from '@/constants/Fonts';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { k } = useLocalSearchParams<{ k?: string }>();
  const { setCameFromRegister } = useRegistrationFlow();
  const { fetchEvents } = useEvents();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, loading: googleLoading } = useGoogleAuth({
    onSuccess: (data) => {
      router.replace({
        pathname: '/accountCreatedScreen',
        params: k ? { k } : {},
      } as any);
    },
  });

  const PRIVACY_VERSION = 'v1.0';
  const TERMS_VERSION = 'v1.0';

  function friendlyAuthError(code?: string, fallback?: string) {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso. Faça login ou use outro e-mail.';
      case 'auth/invalid-email':
        return 'E-mail inválido.';
      case 'auth/weak-password':
        return 'Senha fraca. Use pelo menos 6 caracteres.';
      case 'auth/operation-not-allowed':
        return 'Método de autenticação não habilitado no Firebase.';
      case 'auth/credential-already-in-use':
        return 'Este e-mail já está vinculado a outra conta. Faça login.';
      case 'auth/provider-already-linked':
        return 'Esta conta já está vinculada.';
      default:
        return fallback ?? 'Não foi possível criar sua conta. Tente novamente.';
    }
  }

  const handleRegister = async () => {
    Keyboard.dismiss();

    const cleanEmail = email.trim().toLowerCase();

    if (!name || !cleanEmail || !password || !confirm) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    if (password !== confirm) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    // ✅ LGPD: bloqueio obrigatório
    if (!acceptedTerms) {
      Alert.alert(
        'Atenção',
        'Você precisa aceitar a Política de Privacidade e os Termos de Uso.',
      );
      return;
    }

    setLoading(true);

    try {
      let finalUser: User;

      const current = auth.currentUser;

      // ✅ Se estiver como visitante (anônimo): converte a conta mantendo o mesmo UID
      if (current && current.isAnonymous) {
        const credential = EmailAuthProvider.credential(cleanEmail, password);

        const linked = await linkWithCredential(current, credential);
        finalUser = linked.user;
      } else {
        // ✅ Fluxo normal (sem visitante)
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        finalUser = userCredential.user;
      }

      await updateProfile(finalUser, {
        displayName: name,
      });

      // ✅ LGPD: salvar aceite no Firestore
      await setDoc(
        doc(db, 'users', finalUser.uid),
        {
          name,
          privacyAcceptedAt: Timestamp.now(),
          privacyVersion: PRIVACY_VERSION,
          termsAcceptedAt: Timestamp.now(),
          termsVersion: TERMS_VERSION,
          createdAt: Timestamp.now(),
        },
        { merge: true },
      );

      // ✅ Índice público para busca por e-mail (se você usa isso para convites)
      await setDoc(
        doc(db, 'publicUsers', finalUser.uid),
        {
          uid: finalUser.uid,
          name: name, // ✅ Adiciona o nome ao índice público para resolução na galeria
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setCameFromRegister(true);

      // ✅ Foça reload dos eventos para garantir que o contexto atualize com o usuário "convertido"
      try {
        await fetchEvents();
      } catch (e) {}

      router.replace({
        pathname: '/accountCreatedScreen',
        params: k ? { k } : {},
      } as any);
    } catch (error: any) {
      const msg = friendlyAuthError(error?.code, error?.message);
      Alert.alert('Erro ao registrar', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.gradients}
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Text style={[styles.title, { color: colors.text }]}>Criar Conta</Text>

      <TextInput
        placeholder="Nome"
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
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Email"
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

      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Confirmar senha"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.passwordInput,
            {
              backgroundColor: colors.backgroundCard,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={showPassword}
        />
      </View>

      {/* ✅ LGPD: aceite explícito */}
      <Pressable
        style={styles.checkboxContainer}
        onPress={() => setAcceptedTerms((prev) => !prev)}
      >
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.primary },
            acceptedTerms && { backgroundColor: colors.primary },
          ]}
        />
        <Text style={[styles.checkboxText, { color: colors.textSecondary }]}>
          Li e aceito a{' '}
          <Text
            style={[styles.link, { color: colors.primary }]}
            onPress={() =>
              WebBrowser.openBrowserAsync(LEGAL_URLS.PRIVACY_POLICY)
            }
          >
            Política de Privacidade
          </Text>{' '}
          e os{' '}
          <Text
            style={[styles.link, { color: colors.primary }]}
            onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.TERMS_OF_USE)}
          >
            Termos de Uso
          </Text>
          .
        </Text>
      </Pressable>

      <TouchableOpacity
        onPress={handleRegister}
        style={[styles.registerButton, { backgroundColor: colors.primary }]}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Text style={[styles.registerText, { color: colors.textOnPrimary }]}>
            Registrar
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
        Já tem uma conta?{' '}
        <Text
          style={[styles.signInText, { color: colors.primary }]}
          onPress={() => router.push('/(auth)/login')}
        >
          Fazer login
        </Text>
      </Text>
    </LinearGradient>
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
    marginBottom: 28,
  },
  input: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    fontFamily: Fonts.regular,
  },

  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 14,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#b18aff',
    marginRight: 10,
    marginTop: 3,
  },
  checkboxChecked: {
    backgroundColor: '#b18aff',
  },
  checkboxText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontFamily: Fonts.medium,
  },
  link: {
    textDecorationLine: 'underline',
    fontFamily: Fonts.bold,
  },

  registerButton: {
    borderRadius: 16,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  registerText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  bottomText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  signInText: {
    fontFamily: Fonts.bold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
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
  passwordContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 14,
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
});
