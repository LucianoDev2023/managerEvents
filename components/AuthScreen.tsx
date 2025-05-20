import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Colors from '@/constants/Colors';
import { useRouter } from 'expo-router';

interface AuthScreenProps {
  type: 'login' | 'register' | 'recover';
  title: string;
  subtitle: string;
  buttonText: string;
  inputs: React.ReactNode;
  onSubmit: () => void;
  bottomText: string;
  bottomActionText: string;
  onBottomAction: () => void;
  loading?: boolean;
}

export default function AuthScreen({
  type,
  title,
  subtitle,
  buttonText,
  inputs,
  onSubmit,
  bottomText,
  bottomActionText,
  onBottomAction,
  loading = false,
}: AuthScreenProps) {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <LinearGradient colors={['#6e56cf', '#a26bfa']} style={styles.header}>
        <StatusBar translucent backgroundColor="transparent" style="light" />
        <Image
          source={require('@/assets/images/loginpage.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={[styles.title1, { color: theme.text }]}>
          Gerenciador de eventos
        </Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>

        {inputs}
        {type === 'login' && (
          <TouchableOpacity onPress={() => router.push('/forgot-password')}>
            <Text style={[styles.forgotText, { color: theme.primary }]}>
              Esqueceu a senha?
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: '#fff' }]}>
            {' '}
            {loading ? 'Aguarde...' : buttonText}{' '}
          </Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={{ color: theme.textSecondary }}>{bottomText}</Text>
          <TouchableOpacity onPress={onBottomAction}>
            <Text style={[styles.registerLink, { color: theme.primary }]}>
              {' '}
              {bottomActionText}{' '}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 200,
    borderBottomRightRadius: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 100,
    height: 100,
    position: 'absolute',
    top: 110,
    right: 16,
  },
  title1: {
    fontSize: 19,
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  registerLink: {
    marginTop: 8,
    fontWeight: 'bold',
    fontSize: 15,
  },
  forgotText: {
    fontSize: 14,
    textAlign: 'left',
    marginBottom: 16,
    marginLeft: 8,
  },
});
