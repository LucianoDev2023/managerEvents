import { useEffect, useRef, useMemo } from 'react';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';

export default function NotFoundScreen() {
  const handledRef = useRef(false);
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const safeReplaceHome = () => {
      if (handledRef.current) return;
      handledRef.current = true;
      router.replace('/');
    };

    const safeReplaceSearch = (title: string, accessCode: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      router.replace({
        pathname: '/(newevents)/search',
        params: { title, accessCode },
      });
    };

    const handleUrlOnce = (url: string) => {
      if (handledRef.current) return;

      const parsed = Linking.parse(url);

      const titleRaw = parsed.queryParams?.title;
      const codeRaw =
        parsed.queryParams?.code ?? parsed.queryParams?.accessCode;

      const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
      const accessCode = typeof codeRaw === 'string' ? codeRaw.trim() : '';

      if (title && accessCode) safeReplaceSearch(title, accessCode);
      else safeReplaceHome();
    };

    // Timeout de segurança (não prende em loading)
    const t = setTimeout(() => safeReplaceHome(), 1800);

    Linking.getInitialURL()
      .then((url) => {
        if (url) handleUrlOnce(url);
        else safeReplaceHome();
      })
      .catch(() => safeReplaceHome())
      .finally(() => clearTimeout(t));

    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient colors={colors.gradients} style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Redirecionando...',
        headerShown: false,
      }} />
      <View style={styles.content}>
        <LottieView
          source={require('@/assets/images/start.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
        <Text style={[styles.text, { color: colors.text }]}>
          Buscando seu evento...
        </Text>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          Aguarde um momento enquanto preparamos tudo
        </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  lottie: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  text: { 
    fontSize: 22, 
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    opacity: 0.8,
  },
});
