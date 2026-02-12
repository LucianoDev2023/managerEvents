// app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import * as Linking from 'expo-linking';

import Colors from '../constants/Colors';
import { useAuthListener } from '../hooks/useAuthListener';
import { EventsProvider } from '../context/EventsContext';
import { RegistrationFlowProvider } from '../context/RegistrationFlowContext';

export default function RootLayout() {
  const { user, authLoading } = useAuthListener();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const publicPaths = new Set([
      '/(auth)/landing',
      '/invite',
      '/invite-gate',
      '/invite-preview',
      '/+not-found',
    ]);
    if (!authLoading && !user && !inAuthGroup && !publicPaths.has(pathname)) {
      router.replace('/(auth)/landing');
    }
  }, [authLoading, user, segments, router, pathname]);

  useEffect(() => {
    (async () => {
      try {
        await Linking.getInitialURL();
      } catch {}
    })();
    const sub = Linking.addEventListener('url', () => {});
    return () => sub.remove();
  }, []);

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RegistrationFlowProvider>
        <EventsProvider>
          <Slot />
        </EventsProvider>
      </RegistrationFlowProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
