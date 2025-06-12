import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  Pressable,
  Dimensions,
  AccessibilityRole,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/Colors';
import { Check } from 'lucide-react-native';

const mockups = [
  require('@/assets/kup/mockup1.png'),
  require('@/assets/kup/mockup2.png'),
  require('@/assets/kup/mockup3.png'),
  require('@/assets/kup/mockup4.png'),
  require('@/assets/kup/mockup5.png'),
];

const MOCKUP_WIDTH = Dimensions.get('window').width * 0.7;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE_SPACING = (SCREEN_WIDTH - MOCKUP_WIDTH) / 4;

const features = [
  'Gerencie seus eventos',
  'Controle de convidados e presença',
  'Compartilhamento por QR Code e WhatsApp',
  'Galeria privada de fotos por atividade',
  'Administração por múltiplos usuários',
  'Perfeito para todo tipo de evento: aniversários, casamentos, encontros sociais ou confraternizações',
];

export default function LandingScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const scrollRef = useRef<ScrollView>(null);
  const mockupIndex = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      mockupIndex.current = (mockupIndex.current + 1) % mockups.length;
      scrollRef.current?.scrollTo({
        x: mockupIndex.current * MOCKUP_WIDTH,
        animated: true,
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = useCallback(() => {
    router.push('/(auth)/login');
  }, []);

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
          <Text style={[styles.slogan, { color: colors.text }]}>
            Sua experiência de eventos no seu tempo, no seu estilo.
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
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: SIDE_SPACING,
            }}
            snapToInterval={10}
            decelerationRate="fast"
            scrollEventThrottle={16}
          >
            {mockups.map((img, index) => (
              <Animated.Image
                key={index}
                source={img}
                style={[
                  styles.mockupImage,
                  index === mockups.length - 1 && { marginRight: 0 }, // remove margem do último
                ]}
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
              <Check
                size={18}
                color={colors.primary}
                style={styles.featureIcon}
              />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {item}
              </Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400)}
          style={styles.buttonContainer}
        >
          <Pressable
            onPress={handleNavigate}
            style={styles.button}
            accessible
            accessibilityRole="button"
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

        <Text style={styles.testimonial}>Experimente a versão Beta. V 1.0</Text>
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
  centeredBlock: { alignItems: 'center', marginTop: 24 },
  title: {
    fontSize: 40,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  slogan: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 12,
  },
  lottieBox: { marginVertical: 20, alignItems: 'center' },
  lottie: { width: 300, height: 150 },
  mockupGallery: { width: '100%' },
  mockupScroll: { paddingHorizontal: 10, gap: 10 },
  mockupImage: {
    width: MOCKUP_WIDTH,
    height: 380,
    resizeMode: 'contain',
    borderRadius: 16,
    marginRight: 10, // consistente com o SNAP_INTERVAL
  },
  featureList: { width: '100%', paddingHorizontal: 6, marginBottom: 32 },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    flexShrink: 1,
  },
  buttonContainer: { alignItems: 'center', justifyContent: 'center' },
  button: { alignItems: 'center', justifyContent: 'center' },
  lottieButton: { width: 280, height: 80 },
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
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  testimonial: {
    fontSize: 14,
    fontFamily: 'Inter-Light',
    color: '#aaa',
    textAlign: 'center',
    marginTop: 24,
  },
});
