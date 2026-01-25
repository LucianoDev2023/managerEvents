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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useRegistrationFlow } from '@/context/RegistrationFlowContext';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { serverTimestamp } from 'firebase/firestore';

export default function RegisterScreen() {
  const router = useRouter();
  const { setCameFromRegister } = useRegistrationFlow();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const PRIVACY_VERSION = 'v1.0';
  const TERMS_VERSION = 'v1.0';

  const handleRegister = async () => {
    Keyboard.dismiss();

    if (!name || !email || !password || !confirm) {
      alert('Preencha todos os campos.');
      return;
    }

    if (password !== confirm) {
      alert('As senhas não coincidem.');
      return;
    }

    // ✅ LGPD: bloqueio obrigatório
    if (!acceptedTerms) {
      alert(
        'Você precisa aceitar a Política de Privacidade e os Termos de Uso.'
      );
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // ✅ LGPD: salvar aceite no Firestore
      await setDoc(
        doc(db, 'users', userCredential.user.uid),
        {
          name,
          privacyAcceptedAt: Timestamp.now(),
          privacyVersion: PRIVACY_VERSION,
          termsAcceptedAt: Timestamp.now(),
          termsVersion: TERMS_VERSION,
          createdAt: Timestamp.now(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, 'publicUsers', userCredential.user.uid),
        {
          uid: userCredential.user.uid,
          emailLower: email.trim().toLowerCase(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setCameFromRegister(true);
      router.replace('/accountCreatedScreen');
    } catch (error: any) {
      alert('Erro ao registrar: ' + error.message);
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
            onPress={() => router.push('/(auth)/privacidade')}
          >
            Política de Privacidade
          </Text>{' '}
          e os{' '}
          <Text
            style={styles.link}
            onPress={() => router.push('/(auth)/termos')}
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

  // ✅ LGPD checkbox
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
