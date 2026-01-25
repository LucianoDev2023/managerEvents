// components/LoadingOverlay.tsx
import Colors from '@/constants/Colors';
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function LoadingOverlay({ message = 'Carregando...' }) {
  const colorScheme = 'light';
  const colors = Colors[colorScheme];
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 10,
  },
});
