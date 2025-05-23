import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      await register(email, password, name); // A lógica de profile + AsyncStorage está no contexto
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
        <Text style={styles.signInText} onPress={() => router.push('/login')}>
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
    marginBottom: 32,
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
  registerButton: {
    backgroundColor: '#b18aff',
    borderRadius: 25,
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 20,
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
