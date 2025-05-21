import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useColorScheme, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import Colors from '@/constants/Colors';

export default function WelcomeScreen() {
  const router = useRouter();
  const user = getAuth().currentUser;
  const name = user?.displayName || user?.email || 'Usuário';
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Inicia a animação da barra
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: false,
    }).start();

    const timeout = setTimeout(() => {
      router.replace('/(tabs)');
    }, 4000);

    return () => clearTimeout(timeout);
  }, []);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        BEM VINDO,{' '}
        <Text style={{ color: theme.primary }}>{name.toUpperCase()}</Text>
        {'\n'}AO SEU GERENCIADOR DE EVENTOS
      </Text>

      <View style={styles.progressBarBackground}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: theme.primary,
              width: animatedWidth,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 40,
  },
  progressBarBackground: {
    width: '80%',
    height: 12,
    backgroundColor: '#ddd',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
});
