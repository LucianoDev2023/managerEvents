// app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
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

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!authLoading && !user && !inAuthGroup) {
      router.replace('/(auth)/landing');
    }
  }, [authLoading, user, segments, router]);

  useEffect(() => {
    (async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          console.log('[Linking] initialUrl', url, Linking.parse(url));
        } else {
          console.log('[Linking] initialUrl', url);
        }
      } catch (e) {
        console.log('[Linking] initialUrl error', e);
      }
    })();
    const sub = Linking.addEventListener('url', (ev) => {
      console.log('[Linking] url event', ev.url, Linking.parse(ev.url));
    });
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
