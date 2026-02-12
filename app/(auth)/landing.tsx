import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  Pressable,
  Dimensions,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/config/firebase';

import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import Colors from '@/constants/Colors';
import { Check } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

import { useAuthListener } from '@/hooks/useAuthListener';

const mockups = [
  require('@/assets/kup/mockup1.png'),
  require('@/assets/kup/mockup2.png'),
  require('@/assets/kup/mockup3.png'),
  require('@/assets/kup/mockup4.png'),
  require('@/assets/kup/mockup5.png'),
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const MOCKUP_WIDTH = SCREEN_WIDTH * 0.6;
const SIDE_SPACING = (SCREEN_WIDTH - MOCKUP_WIDTH) / 3;

// ✅ Largura única para os dois botões (igual ao guestButton)
const BUTTON_WIDTH = 220;

// ✅ Altura real de botão (mais coerente)
const PRIMARY_BUTTON_HEIGHT = 48;

const features = [
  'Organize seus eventos em um só lugar',
  'Gerencie convidados, presenças e acompanhantes com facilidade',
  'Convites rápidos via QR Code ou link compartilhável',
  'Fotos privadas organizadas por atividade do evento',
  'Permissões inteligentes para múltiplos administradores',
  'Perfeito para festas, casamentos, encontros e eventos sociais',
];

export default function LandingScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const router = useRouter();

  const { user } = useAuthListener();
  const [guestLoading, setGuestLoading] = useState(false);

  const gradientColors: [string, string, ...string[]] = useMemo(
    () =>
      colorScheme === 'dark'
        ? ['#0a0a10', '#151326', '#2a2150']
        : ['#ffffff', '#f7f7ff', '#efecff'],
    [colorScheme],
  );

  const scrollRef = useRef<ScrollView>(null);
  const mockupIndex = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      mockupIndex.current = (mockupIndex.current + 1) % mockups.length;
      scrollRef.current?.scrollTo({
        x: mockupIndex.current * (MOCKUP_WIDTH + 10),
        animated: true,
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleNavigate = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  const handleGuest = useCallback(async () => {
    try {
      if (guestLoading) return;

      // se já estiver logado (anon ou não), só entra
      if (user) {
        router.replace('/(tabs)');
        return;
      }

      setGuestLoading(true);
      await signInAnonymously(auth);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(
        'Não foi possível entrar como visitante',
        e?.message ?? 'Tente novamente.',
      );
    } finally {
      setGuestLoading(false);
    }
  }, [guestLoading, router, user]);

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
          entering={FadeInDown.duration(550)
            .easing(Easing.out(Easing.cubic))
            .delay(100)}
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
            snapToInterval={MOCKUP_WIDTH + 10}
            decelerationRate="fast"
            scrollEventThrottle={16}
          >
            {/* {mockups.map((img, index) => (
              <Animated.Image
                key={index}
                source={img}
                style={[
                  styles.mockupImage,
                  index === mockups.length - 1 && { marginRight: 0 },
                ]}
                entering={FadeInDown.delay(300 + index * 100)}
              />
            ))} */}
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
          entering={FadeInDown.duration(550)
            .easing(Easing.out(Easing.cubic))
            .delay(400)}
          style={styles.buttonContainer}
        >
          {/* ✅ Botão principal (Lottie vira só “efeito” e não quebra clicks) */}
          <Pressable
            onPress={handleNavigate}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              {
                opacity: pressed ? 0.95 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
            accessible
            accessibilityRole="button"
          >
            {/* ✅ wrapper com pointerEvents="none" (TypeScript OK) */}
            <View style={styles.primaryLottieWrap} pointerEvents="none">
              <LottieView
                source={require('@/assets/images/action.json')}
                autoPlay
                loop
                resizeMode="cover"
                style={styles.primaryLottieBg}
              />
            </View>

            <Text style={styles.primaryText}>Comece agora</Text>
          </Pressable>

          {/* Botão secundário: Visitante */}
          <Pressable
            onPress={handleGuest}
            disabled={guestLoading}
            style={({ pressed }) => [
              styles.guestButton,
              {
                opacity: guestLoading ? 0.7 : pressed ? 0.85 : 1,
                borderColor: colors.primary,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
            accessible
            accessibilityRole="button"
          >
            {guestLoading ? (
              <View style={styles.guestRow}>
                <ActivityIndicator color={colors.text} size="small" />
                <Text style={[styles.guestText, { color: colors.text }]}>
                  Entrando...
                </Text>
              </View>
            ) : (
              <Text style={[styles.guestText, { color: colors.text }]}>
                Explorar sem conta
              </Text>
            )}
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
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
  },

  centeredBlock: { alignItems: 'center', marginTop: 24 },
  title: {
    fontSize: 40,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  slogan: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },

  lottieBox: { marginVertical: 20, alignItems: 'center' },
  lottie: { width: 300, height: 150 },

  mockupGallery: { width: '100%' },
  mockupImage: {
    width: MOCKUP_WIDTH,
    height: 340,
    resizeMode: 'contain',
    borderRadius: 16,
    marginRight: 10,
  },

  featureList: { width: '100%', paddingHorizontal: 6, marginBottom: 32 },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: { marginRight: 10 },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    flexShrink: 1,
  },

  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  // ✅ Botão principal (cara de botão)
  primaryButton: {
    width: BUTTON_WIDTH,
    height: PRIMARY_BUTTON_HEIGHT,
    borderRadius: PRIMARY_BUTTON_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  // ✅ wrapper absoluto do Lottie (onde aplicamos pointerEvents)
  primaryLottieWrap: {
    ...StyleSheet.absoluteFillObject,
  },

  // ✅ Lottie como textura/efeito (não “desenha” o botão)
  primaryLottieBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
    transform: [{ scale: 1.35 }],
  },

  primaryText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  guestButton: {
    width: BUTTON_WIDTH,
    paddingVertical: 12,
    borderRadius: PRIMARY_BUTTON_HEIGHT / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guestText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});
