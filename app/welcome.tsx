import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import Colors from '@/constants/Colors';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function WelcomeScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const name = user?.displayName || user?.email || 'Usuário';
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const gradientColors =
    scheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/(tabs)');
    }, 6000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={scheme === 'dark' ? 'light' : 'dark'}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop:
              Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
          },
        ]}
      >
        <View style={styles.textBlock}>
          <Text style={[styles.welcomeText, { color: theme.text }]}>
            BEM-VINDO!
          </Text>

          <Text style={[styles.userName, { color: theme.primary }]}>
            {name.toUpperCase()}
          </Text>

          <Text style={[styles.subtitle, { color: theme.text }]}>
            Esse é seu gerenciador de
          </Text>
          <Text style={[styles.userName, { color: theme.text }]}>EVENTOS</Text>
        </View>

        <LottieView
          source={require('../assets/images/loading.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },

  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: 'center',
  },

  userName: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 6,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    opacity: 0.8,
    textAlign: 'center',
  },

  text: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 40,
    fontFamily: 'Inter',
  },
  lottie: {
    width: 150,
    height: 150,
  },
});
