// components/LoadingOverlay.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function LoadingOverlay({ message = 'Carregando...' }) {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#fff" />
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
