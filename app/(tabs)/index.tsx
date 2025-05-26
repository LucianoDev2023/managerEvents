import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme]; //
  const router = useRouter();

  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop:
              Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
          },
        ]}
      >
        <Image
          source={require('@/assets/images/search.png')}
          style={styles.illustration}
          resizeMode="contain"
        />

        <Text style={[styles.title, { color: colors.text }]}>
          O que deseja fazer?
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              router.push({
                pathname: '/(newevents)/event-form',
                params: { mode: 'create' },
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Criar um evento novo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(stack)/myevents')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Abrir meus eventos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(newevents)/qr-scanner')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              Visualizar um convite recebido
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.lottieWrapper}>
        <LottieView
          source={require('../../assets/images/date.json')}
          autoPlay
          loop={true}
          style={{ width: 80, height: 80 }}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  illustration: {
    width: 250,
    height: 250,
    marginBottom: 32,
    borderRadius: 250,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#b18aff',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Inter',
  },
  buttons: {
    width: '100%',
    gap: 16,
  },
  button: {
    backgroundColor: '#6e56cf',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  lottieWrapper: {
    position: 'absolute',
    top: 182,
    right: 23,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: '50%',
    height: 50,
  },
});
