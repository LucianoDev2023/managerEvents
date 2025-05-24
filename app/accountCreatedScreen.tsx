import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthListener } from '@/hooks/useAuthListener';
import { useRegistrationFlow } from '@/context/RegistrationFlowContext';

const { height } = Dimensions.get('window');

export default function AccountCreatedScreen() {
  const router = useRouter();
  const { user, authLoading } = useAuthListener();
  const { cameFromRegister, setCameFromRegister } = useRegistrationFlow();

  // Se o usuário acessar manualmente essa rota, redireciona
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (!cameFromRegister) {
        router.replace('/welcome');
      }
    }
  }, [authLoading, user, cameFromRegister]);

  const handleContinue = () => {
    setCameFromRegister(false); // limpa o estado após seguir
    router.replace('/welcome');
  };

  if (authLoading || !cameFromRegister) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6e56cf" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#0b0b0f', '#1b0033', '#3e1d73']}
      style={styles.container}
      locations={[0.2, 0.5, 1]}
    >
      <View style={styles.iconWrapper}>
        <View style={styles.circle}>
          <Check size={48} color="#6e56cf" />
        </View>
        <Text style={styles.title}>Parabéns! 🎉</Text>
        <Text style={styles.subtitle}>Conta criada com sucesso!</Text>
      </View>

      <TouchableOpacity onPress={handleContinue} style={styles.button}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b0f',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.2,
  },
  circle: {
    borderWidth: 2,
    borderColor: '#6e56cf',
    borderRadius: 60,
    padding: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    color: '#a78bfa',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
  },
  button: {
    borderWidth: 1,
    borderColor: '#6e56cf',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  buttonText: {
    color: '#a78bfa',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
