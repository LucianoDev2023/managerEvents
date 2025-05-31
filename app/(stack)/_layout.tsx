import React from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  useColorScheme,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Colors from '@/constants/Colors';
import { ArrowLeft } from 'lucide-react-native';

export default function StackLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { from } = useLocalSearchParams<{ from?: string }>();

  const handleGoBack = () => {
    if (from === 'profile') {
      router.push('/(tabs)/profile');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const renderHeaderLeft = () => (
    <TouchableOpacity onPress={handleGoBack} style={{ marginLeft: 16 }}>
      <ArrowLeft size={24} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack
        screenOptions={{
          headerShown: true,
          animation: 'fade',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontFamily: 'Inter-Bold',
            fontSize: 18,
            color: colors.primary,
          },
          headerTintColor: colors.text,
          headerTitleAlign: 'center',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="events/[id]/edit_event"
          options={{
            title: '',
          }}
        />

        <Stack.Screen
          name="myevents"
          options={{
            title: 'Lista de eventos',
            headerShown: true,
            headerLeft: renderHeaderLeft,
          }}
        />

        <Stack.Screen
          name="permission-confirmation/[id]"
          options={{
            title: 'Administrar permissões',
            headerShown: true,
            headerLeft: renderHeaderLeft,
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
