import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

import LottieView from 'lottie-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';

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
        {/* Título */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={[styles.title, { color: colors.primary }]}>
            SysEvent
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Organize eventos, convide pessoas e controle tudo na palma da mão.
          </Text>
        </Animated.View>

        {/* Animação / Banner */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.lottieBox}
        >
          <LottieView
            source={require('@/assets/images/date.json')}
            autoPlay
            loop
            style={{ width: 280, height: 280 }}
          />
        </Animated.View>

        {/* Funcionalidades */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={styles.featureList}
        >
          <Text style={[styles.featureItem, { color: colors.text }]}>
            ✅ Crie eventos com capa, local e data
          </Text>
          <Text style={[styles.featureItem, { color: colors.text }]}>
            ✅ Adicione programações e atividades
          </Text>
          <Text style={[styles.featureItem, { color: colors.text }]}>
            ✅ Adicine fotos da atividade e descrição
          </Text>
          <Text style={[styles.featureItem, { color: colors.text }]}>
            ✅ Compartilhe via QR Code e WhatsApp
          </Text>
          <Text style={[styles.featureItem, { color: colors.text }]}>
            ✅ Dê permissões para outros usuários
          </Text>
          <Text style={[styles.featureItem, { color: colors.text }]}>
            ✅ Visualize no mapa e siga eventos
          </Text>
        </Animated.View>

        {/* Imagem destaque (mock) */}
        {/* <Animated.View entering={FadeInDown.delay(400)} style={styles.preview}>
          <Image
            source={require('@/assets/images/loginpage.png')}
            style={styles.previewImage}
          />
        </Animated.View> */}

        {/* Botão CTA */}
        <Animated.View
          entering={FadeInDown.delay(500)}
          style={{ width: '100%' }}
        >
          <Button
            title="Comece agora mesmo"
            onPress={() => router.push('/(auth)/login')}
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            textStyle={styles.ctaText}
          />
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
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  lottieBox: {
    marginBottom: 24,
  },
  featureList: {
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 6,
  },
  preview: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    resizeMode: 'contain',
  },
  ctaBtn: {
    paddingVertical: 12,
    borderRadius: 14,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
});
