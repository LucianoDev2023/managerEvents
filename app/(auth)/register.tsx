import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  EmailAuthProvider,
  linkWithCredential,
  User,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useRegistrationFlow } from '@/context/RegistrationFlowContext';
import { useEvents } from '@/context/EventsContext';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { serverTimestamp } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import { LEGAL_URLS } from '@/constants/Legal';

export default function RegisterScreen() {
  const router = useRouter();
  const { k } = useLocalSearchParams<{ k?: string }>();
  const { setCameFromRegister } = useRegistrationFlow();
  const { fetchEvents } = useEvents();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

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
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setCameFromRegister(true);

      // ✅ Foça reload dos eventos para garantir que o contexto atualize com o usuário "convertido"
      try {
        await fetchEvents();
      } catch (e) {
      }

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
      colors={['#0b0b0f', '#1b0033', '#3e1d73']}
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <Text style={styles.title}>Criar Conta</Text>

      <TextInput
        placeholder="Nome"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Senha"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        placeholder="Confirmar senha"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />

      {/* ✅ LGPD: aceite explícito */}
      <Pressable
        style={styles.checkboxContainer}
        onPress={() => setAcceptedTerms((prev) => !prev)}
      >
        <View
          style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
        />
        <Text style={styles.checkboxText}>
          Li e aceito a{' '}
          <Text
            style={styles.link}
            onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.PRIVACY_POLICY)}
          >
            Política de Privacidade
          </Text>{' '}
          e os{' '}
          <Text
            style={styles.link}
            onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.TERMS_OF_USE)}
          >
            Termos de Uso
          </Text>
          .
        </Text>
      </Pressable>

      <TouchableOpacity
        onPress={handleRegister}
        style={styles.registerButton}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.registerText}>Registrar</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.bottomText}>
        Já tem uma conta?{' '}
        <Text
          style={styles.signInText}
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
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 28,
  },
  input: {
    backgroundColor: '#1f1f25',
    color: '#fff',
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
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
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  link: {
    color: '#b18aff',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },

  registerButton: {
    backgroundColor: '#b18aff',
    borderRadius: 25,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  registerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomText: {
    color: '#aaa',
    fontSize: 14,
  },
  signInText: {
    color: '#b18aff',
  },
});
