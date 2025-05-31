import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import { useAuthListener } from '@/hooks/useAuthListener';
import { EventsProvider } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { RegistrationFlowProvider } from '@/context/RegistrationFlowContext';

export default function RootLayout() {
  useFrameworkReady();
  const { user, authLoading } = useAuthListener();
  const segments = useSegments(); // ex: ['(auth)', 'login']
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Protege rotas privadas e evita acesso de usuários logados a rotas públicas
  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!authLoading) {
      if (!user && !inAuthGroup) {
        router.replace('/landing'); // redireciona para login se não autenticado
      }
    }
  }, [authLoading, user, segments]);

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
