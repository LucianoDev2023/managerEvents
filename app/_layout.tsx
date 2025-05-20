// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@/config/firebase';
import { EventsProvider } from '@/context/EventsContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useCachedFonts } from '@/hooks/useFonts';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const router = useRouter();
  useFrameworkReady();
  const { fontsLoaded, fontError } = useCachedFonts();
  const [authChecked, setAuthChecked] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
      setAuthChecked(true);
    });

    return unsubscribe;
  }, []);

  // if (!fontsLoaded || !authChecked) {
  //   return (
  //     <View style={[styles.container, { backgroundColor: colors.background }]}>
  //       <ActivityIndicator size="large" color={colors.primary} />
  //     </View>
  //   );
  // }

  return (
    <EventsProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Slot />
        <StatusBar
          style={colorScheme === 'dark' ? 'light' : 'dark'}
          backgroundColor={
            Platform.OS === 'android' ? colors.background : 'transparent'
          }
          translucent
        />
      </View>
    </EventsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
