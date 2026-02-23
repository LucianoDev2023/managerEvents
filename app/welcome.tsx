import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Platform,
  StatusBar as RNStatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { auth } from '@/config/firebase';

// const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
  const theme = Colors[scheme];

  // Gradiente mais sofisticado
  const gradientColors = useMemo<[string, string, string]>(() => {
    return scheme === 'dark'
      ? ['#0F0F1A', '#2D1B4E', '#4C2A85'] // Deep purple night theme
      : ['#FFFFFF', '#F0F4FF', '#D6E4FF']; // Clean modern light theme
  }, [scheme]);

  const user = auth.currentUser;
  const name = user?.displayName?.trim() || 'Usuário';

  // Navegação automática após 3s
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/(tabs)');
    }, 5800);

    return () => clearTimeout(t);
  }, [router]);

  const topPad =
    Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0;

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={scheme === 'dark' ? 'light' : 'dark'}
      />

      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.contentWrapper}>
          
          {/* 1. Animação de entrada suave para o "Olá" */}
          <Animated.View 
            entering={FadeInDown.duration(800).delay(200)} 
            style={styles.headerBlock}
          >
            <Text style={[styles.welcomeLabel, { color: theme.textSecondary }]}>
              Olá,
            </Text>
            <Text 
              style={[styles.userName, { color: theme.text }]}
              numberOfLines={1}
            >
              {name}!
            </Text>
          </Animated.View>

          {/* 2. Destaque principal com Zoom */}
          <Animated.View 
            entering={ZoomIn.duration(1000).delay(500).springify()}
            style={styles.centerBlock}
          >
            <Text style={[styles.mainTitle, { color: theme.text }]}>
              Seu evento,{'\n'}
              <Text style={{ color: theme.primary }}>Simplificado.</Text>
            </Text>
          </Animated.View>

          {/* 3. Subtítulo explicativo */}
          <Animated.View 
            entering={FadeInDown.duration(800).delay(1100)}
            style={styles.footerBlock}
          >
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Gerencie convidados, finanças e{'\n'}programação em um só lugar.
            </Text>
          </Animated.View>

        </View>

        {/* Círculos decorativos de fundo (Glassmorphism vibes) */}
        <Animated.View 
          entering={ZoomIn.duration(1500).delay(100)}
          style={[
            styles.decorativeCircle, 
            { 
              backgroundColor: theme.primary,
              opacity: scheme === 'dark' ? 0.15 : 0.08,
              top: -100,
              right: -80,
            }
          ]} 
        />
        <Animated.View 
          entering={ZoomIn.duration(1500).delay(300)}
          style={[
            styles.decorativeCircle, 
            { 
              backgroundColor: theme.primaryLight ?? '#FFD700',
              opacity: scheme === 'dark' ? 0.1 : 0.05,
              bottom: 50,
              left: -100,
              width: 250,
              height: 250,
              borderRadius: 125,
            }
          ]} 
        />
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
    paddingHorizontal: 32,
    justifyContent: 'center',
    overflow: 'hidden', // para cortar os círculos
  },
  contentWrapper: {
    zIndex: 10,
    gap: 40,
    justifyContent: 'center',
    flex: 1,
  },
  
  headerBlock: {
    alignItems: 'flex-start',
  },
  welcomeLabel: {
    fontSize: 20,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },

  centerBlock: {
    marginVertical: 20,
  },
  mainTitle: {
    fontSize: 42,
    fontFamily: Fonts.bold, // Using Inter-Bold as Inter-Black is not loaded
    lineHeight: 48,
    letterSpacing: -1,
  },

  footerBlock: {
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    lineHeight: 24,
  },

  decorativeCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
});
