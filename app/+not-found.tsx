import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function NotFoundScreen() {
  useEffect(() => {
    const redirectIfValid = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        const parsed = Linking.parse(url);
        const title = parsed.queryParams?.title as string;
        const code = parsed.queryParams?.code as string;

        if (title && code) {
          router.replace({
            pathname: '/(newevents)/search',
            params: { title, accessCode: code },
          });
        } else {
          router.replace('/');
        }
      }
    };

    redirectIfValid();
  }, []);

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
  text: {
    fontSize: 18,
    marginTop: 10,
  },
});
