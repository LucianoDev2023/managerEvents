import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  Pressable,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import Colors from '@/constants/Colors';

export default function LandingScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

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
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Organize seus eventos, convide amigos e controle tudo na palma da
            mão.
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
          entering={FadeInDown.delay(300)}
          style={styles.featureList}
        >
          {[
            '✅ Criação e organização completa de eventos',
            '✅ Programações e atividades personalizadas',
            '✅ Galeria de fotos e descrições detalhadas',
            '✅ Compartilhamento por QR Code e WhatsApp',
            '✅ Controle de permissões para colaboradores',
            '✅ Visualização no mapa com a localização real',
            '✅ Seu evento. No seu ritmo. Com o seu controle',
          ].map((item, index) => (
            <Text
              key={index}
              style={[styles.featureItem, { color: colors.text }]}
            >
              {item}
            </Text>
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400)}
          style={styles.lottieButtonContainer}
        >
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={styles.pressable}
          >
            <LottieView
              source={require('@/assets/images/action.json')}
              autoPlay
              loop
              style={styles.lottie1}
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
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 50,
    paddingBottom: 40,
  },
  centeredBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 12,
  },
  lottieBox: {
    marginVertical: 16,
    alignItems: 'center',
  },
  lottie: {
    width: 280,
    height: 180,
  },
  lottie1: {
    width: 280,
    height: 70,
  },
  featureList: {
    width: '100%',
    paddingHorizontal: 6,
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 6,
  },
  lottieButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
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
