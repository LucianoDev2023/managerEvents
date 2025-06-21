import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
  BackHandler,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from '@react-navigation/native';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [exitModalVisible, setExitModalVisible] = useState(false);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withTiming(1, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // useFocusEffect(
  //   useCallback(() => {
  //     const onBackPress = () => {
  //       setExitModalVisible(true);
  //       return true;
  //     };
  //     BackHandler.addEventListener('hardwareBackPress', onBackPress);
  //     return () => {
  //       BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  //     };
  //   }, [])
  // );

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Sair do aplicativo?',
          'Você realmente deseja fechar o app?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Sair',
              onPress: () => BackHandler.exitApp(),
              style: 'destructive',
            },
          ]
        );
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [])
  );

  const confirmExit = () => BackHandler.exitApp();
  // const cancelExit = () => setExitModalVisible(false);

  const handleNavigateWithFade = (path: Parameters<typeof router.push>[0]) => {
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(router.push)(path);
    });
    scale.value = withTiming(0.96, { duration: 300 });
  };

  return (
    <LinearGradient
      colors={
        colorScheme === 'dark'
          ? ['#0b0b0f', '#1b0033', '#3e1d73']
          : ['#ffffff', '#f0f0ff', '#e9e6ff']
      }
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.animatedWrapper, animatedStyle]}>
          <View
            style={[
              styles.content,
              {
                paddingTop:
                  Platform.OS === 'android'
                    ? RNStatusBar.currentHeight ?? 40
                    : 0,
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
                  handleNavigateWithFade('/events/new?mode=create')
                }
              >
                <Text style={styles.buttonText}>Criar um evento novo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={() => handleNavigateWithFade('/(stack)/myevents')}
              >
                <Text style={styles.buttonText}>Abrir meus eventos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={() => handleNavigateWithFade('/(stack)/qr-scanner')}
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
              loop
              style={{ width: 100, height: 100 }}
            />
          </View>
        </Animated.View>
        {/* <Modal
          visible={exitModalVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelExit}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Sair do aplicativo?</Text>
              <Text style={styles.modalMessage}>
                Você realmente deseja fechar o app?
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={cancelExit}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmExit}
                  style={styles.exitButton}
                >
                  <Text style={styles.exitText}>Sair</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal> */}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  animatedWrapper: { flex: 1 },
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
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  lottieWrapper: {
    alignItems: 'center',
    marginBottom: 23,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 24 : 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    paddingTop:
      Platform.OS === 'android' ? 24 + (RNStatusBar.currentHeight ?? 0) : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111',
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    color: '#555',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#aaa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    fontSize: 14,
  },
  exitButton: {
    flex: 1,
    backgroundColor: '#e63946',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exitText: {
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
    fontSize: 14,
  },
});
