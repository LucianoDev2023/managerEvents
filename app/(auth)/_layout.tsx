// app/(auth)/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthListener } from '../../hooks/useAuthListener';

export default function AuthLayout() {
  const { user, authLoading } = useAuthListener();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // ✅ rotas do (auth) que podem existir mesmo logado
    const allowWhenLogged = new Set([
      '/invite',
      '/invite-gate',
      '/invite-preview',
      '/landing', // se quiser permitir ver landing mesmo logado
    ]);

    if (user && inAuthGroup) {
      // se estiver em rota permitida, não redireciona
      if (allowWhenLogged.has(pathname)) return;

      // caso contrário, manda pro app
      router.replace('/(tabs)');
    }
  }, [authLoading, user, segments, pathname, router]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
