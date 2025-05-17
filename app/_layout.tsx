import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

import { useCachedFonts } from '@/hooks/useFonts';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { EventsProvider } from '@/context/EventsContext';

export default function RootLayout() {
  console.log('Tela HOME carregada!');

  useFrameworkReady();
  const { fontsLoaded, fontError } = useCachedFonts();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (!fontsLoaded && !fontError) {
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
        <StatusBar style="auto" />
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
