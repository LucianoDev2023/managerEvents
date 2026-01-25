import { useEffect, useRef } from 'react';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function NotFoundScreen() {
  const handledRef = useRef(false);

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
    const t = setTimeout(() => safeReplaceHome(), 1500);

    Linking.getInitialURL()
      .then((url) => {
        if (url) handleUrlOnce(url);
        else safeReplaceHome();
      })
      .catch(() => safeReplaceHome())
      .finally(() => clearTimeout(t));

    return () => clearTimeout(t);
  }, []);
  const pathname = usePathname();
  const segments = useSegments();

  console.log('🧨 NOT FOUND pathname:', pathname);
  console.log('🧨 NOT FOUND segments:', segments);

  return (
    <>
      <Stack.Screen options={{ title: 'Redirecionando...' }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Buscando evento...</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: { fontSize: 18, marginTop: 10 },
});
