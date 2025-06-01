import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import Colors from '@/constants/Colors';

// Importe seus mockups aqui:
const mockups = [
  require('@/assets/kup/mockup1.png'),
  require('@/assets/kup/mockup2.png'),
  require('@/assets/kup/mockup3.png'),
  require('@/assets/kup/mockup4.png'),
  require('@/assets/kup/mockup5.png'),
];

const MOCKUP_WIDTH = 180;

export default function LandingScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const features = [
    'Criação e organização de eventos completos',
    'Programações e atividades personalizadas',
    'Galeria de fotos com descrição por atividade',
    'Compartilhe via QR Code e WhatsApp',
    'Controle de permissões por colaborador',
    'Indicação da localização pelo Google maps',
    'Gestão moderna, prática e intuitiva',
  ];

  // Carrossel automático de mockups
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % mockups.length;
      scrollRef.current?.scrollTo({
        x: nextIndex * MOCKUP_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      <StatusBar translucent style="light" backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          Platform.OS === 'android' && {
            paddingTop: RNStatusBar.currentHeight ?? 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={styles.centeredBlock}
        >
          <Text style={[styles.title, { color: colors.primary }]}>PLANNIX</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Gerencie eventos como nunca antes: fácil, moderno e no seu ritmo.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.lottieBox}
        >
          <LottieView
            source={require('@/assets/images/start.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(250)}
          style={styles.mockupGallery}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Veja o app na prática:
          </Text>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mockupScroll}
            snapToInterval={MOCKUP_WIDTH}
            decelerationRate="fast"
            scrollEventThrottle={16}
          >
            {mockups.map((img, index) => (
              <Animated.Image
                key={index}
                source={img}
                style={styles.mockupImage}
                entering={FadeInDown.delay(300 + index * 100)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300)}
          style={styles.featureList}
        >
          {features.map((item, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={[styles.featureText, { color: colors.text }]}>
                • {item}
              </Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400)}
          style={styles.buttonContainer}
        >
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={styles.button}
          >
            <LottieView
              source={require('@/assets/images/action.json')}
              autoPlay
              loop
              style={styles.lottieButton}
            />
            <View style={styles.textOverlay}>
              <Text style={styles.overlayText}>Comece agora</Text>
            </View>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 50,
    paddingBottom: 40,
  },
  centeredBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 12,
  },
  lottieBox: {
    marginVertical: 20,
    alignItems: 'center',
  },
  lottie: {
    width: 300,
    height: 150,
  },
  mockupGallery: {
    // marginVertical: 12,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  mockupScroll: {
    paddingHorizontal: 10,
    gap: 10,
  },
  mockupImage: {
    width: MOCKUP_WIDTH,
    height: 480,
    resizeMode: 'contain',
    borderRadius: 16,
    marginRight: 10,
  },
  featureList: {
    width: '100%',
    paddingHorizontal: 6,
    marginBottom: 32,
  },
  featureItem: {
    marginBottom: 10,
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieButton: {
    width: 280,
    height: 80,
  },
  textOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
});
