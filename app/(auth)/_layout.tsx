// app/(auth)/_layout.tsx
import { Slot, useRouter, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthListener } from '@/hooks/useAuthListener';

export default function AuthLayout() {
  const { user, authLoading } = useAuthListener();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && user && pathname !== '/accountCreatedScreen') {
      router.replace('/accountCreatedScreen');
    }
  }, [authLoading, user, pathname]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
