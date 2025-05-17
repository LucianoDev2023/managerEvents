import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme, View, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

export default function StackLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

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
            color: colors.text,
          },
          headerTintColor: colors.text,
          headerTitleAlign: 'center',
          contentStyle: {
            backgroundColor: colors.background, // ← ESSENCIAL para evitar piscada
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
