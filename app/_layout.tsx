// app/_layout.tsx
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import * as Linking from 'expo-linking';

import Colors from '../constants/Colors';
import { useAuthListener } from '../hooks/useAuthListener';
import { EventsProvider } from '../context/EventsContext';
import { RegistrationFlowProvider } from '../context/RegistrationFlowContext';
import { VersionChecker } from '../components/VersionChecker';
import { useCachedFonts } from '../hooks/useFonts';

export default function RootLayout() {
  const { fontsLoaded, fontError } = useCachedFonts();
  const { user, authLoading } = useAuthListener();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (!fontsLoaded || authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const publicPaths = new Set([
      '/(auth)/landing',
      '/landing',
      '/invite',
      '/invite-gate',
      '/invite-preview',
      '/+not-found',
    ]);
    
    if (!user && !inAuthGroup && !publicPaths.has(pathname)) {
      router.replace('/(auth)/landing');
    }
  }, [authLoading, user, segments, router, pathname, fontsLoaded]);

  useEffect(() => {
    (async () => {
      try {
        await Linking.getInitialURL();
      } catch {}
    })();
    const sub = Linking.addEventListener('url', () => {});
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <VersionChecker enableInDev={true}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <RegistrationFlowProvider>
          <EventsProvider>
            <Slot />
          </EventsProvider>
        </RegistrationFlowProvider>
      </View>
    </VersionChecker>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
