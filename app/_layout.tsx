import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';

import { EventsProvider } from '@/context/EventsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useCachedFonts } from '@/hooks/useFonts';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

function AppContent() {
  const { fontsLoaded, fontError } = useCachedFonts();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { authLoading } = useAuth();

  if (!fontsLoaded || authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
