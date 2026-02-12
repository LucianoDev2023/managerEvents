import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';

import Colors from '@/constants/Colors';
import { auth } from '@/config/firebase';

export default function WelcomeScreen() {
  const router = useRouter();

  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
  const theme = Colors[scheme];

  const gradientColors = useMemo<[string, string, string]>(() => {
    return scheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];
  }, [scheme]);

  const user = auth.currentUser;
  const name = (user?.displayName?.trim() || 'Usuário').toUpperCase();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2500);

    return () => clearTimeout(t);
  }, [router]);

  const topPad =
    Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0;

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.7, 1]}
      style={styles.gradient}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={scheme === 'dark' ? 'light' : 'dark'}
      />

      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.textBlock}>
          <Text style={[styles.welcomeText, { color: theme.text }]}>
            BEM-VINDO!
          </Text>

          <Text style={[styles.userName, { color: theme.primary }]}>
            {name}
          </Text>

          <Text style={[styles.subtitle, { color: theme.text }]}>
            Esse é seu gerenciador de
          </Text>

          <Text style={[styles.highlight, { color: theme.text }]}>EVENTOS</Text>
        </View>

        {/* <LottieView
          source={require('../assets/images/loading.json')}
          autoPlay
          loop
          style={styles.lottie}
        /> */}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 10,
  },

  welcomeText: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },

  userName: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    opacity: 0.85,
    textAlign: 'center',
  },

  highlight: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.5,
  },

  lottie: {
    width: 150,
    height: 150,
  },
});
