import React, { useCallback, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [exitModalVisible, setExitModalVisible] = useState(false);

  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  // Intercepta botão físico voltar
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        setExitModalVisible(true);
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [])
  );

  const confirmExit = () => {
    BackHandler.exitApp();
  };

  const cancelExit = () => {
    setExitModalVisible(false);
  };

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

      <SafeAreaView style={styles.safeArea}>
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
            style={{ width: 100, height: 100 }}
          />
        </View>
      </SafeAreaView>

      {/* Modal de confirmação */}
      <Modal
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
              <TouchableOpacity onPress={confirmExit} style={styles.exitButton}>
                <Text style={styles.exitText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
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
