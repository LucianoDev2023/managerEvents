import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthListener } from '../../hooks/useAuthListener';

export default function AuthLayout() {
  const { user, authLoading, isAuthReady } = useAuthListener();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    const allowWhenLogged = new Set([
      '/invite',
      '/invite-gate',
      '/invite-preview',
      '/(auth)/register',
      '/(auth)/login',
      '/register',
      '/login',
    ]);

    // ✅ se está logado (inclui anônimo) e está no grupo (auth)
    if (user && inAuthGroup) {
      if (allowWhenLogged.has(pathname)) return;
      router.replace('/(tabs)');
    }
  }, [isAuthReady, user, segments, pathname, router]);

  if (!isAuthReady || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
