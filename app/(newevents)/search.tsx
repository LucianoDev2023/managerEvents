import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  ImageBackground,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Colors from '@/constants/Colors';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { getAuth } from 'firebase/auth';
import LottieView from 'lottie-react-native';
import { MapPin, CalendarDays } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useEventAccess } from '@/hooks/useEventAccess';

export default function FoundEventScreen() {
  const { accessCode, title } = useLocalSearchParams<{
    accessCode?: string;
    title?: string;
  }>();
  const { addGuest } = useEvents();
  const { isLoading, eventFound, guestStatus } = useEventAccess(
    title,
    accessCode
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [modeSelected, setModeSelected] = useState<
    'confirmado' | 'acompanhando' | null
  >(null);

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const user = getAuth().currentUser;
  const userEmail = user?.email ?? 'convidado@anonimo.com';
  const userName = user?.displayName ?? 'Convidado';

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const handlePresence = async (mode: 'confirmado' | 'acompanhando') => {
    if (!eventFound) return;
    try {
      setIsSubmitting(true);
      setModeSelected(mode);
      await addGuest(eventFound.id, {
        name: userName,
        email: userEmail,
        mode,
      });
      setShowConfetti(true);
    } catch (error) {
      console.error('Erro ao confirmar presença:', error);
      setIsSubmitting(false);
    }
  };

  const handleConfettiFinish = () => {
    setTimeout(() => {
      setIsSubmitting(false);
      if (eventFound) {
        router.replace(`/events/${eventFound.id}`);
      }
    }, 1000);
  };

  if (isLoading || !eventFound) {
    return (
      <View
        style={[styles.loadingOverlay, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Carregando evento...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

        {(isSubmitting || showConfetti) && (
          <Modal visible transparent animationType="fade">
            <View style={styles.overlayDimmed}>
              {showConfetti && (
                <LottieView
                  source={require('@/assets/images/confetti.json')}
                  autoPlay
                  loop={false}
                  style={{ width: '100%', height: '100%' }}
                  onAnimationFinish={handleConfettiFinish}
                />
              )}
              {modeSelected === 'confirmado' && (
                <View style={styles.confettiMessageContainer}>
                  <Text
                    style={[styles.confettiMessage, { color: colors.text }]}
                  >
                    🎉 Presença confirmada com sucesso!
                  </Text>
                </View>
              )}
            </View>
          </Modal>
        )}

        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.background }]}>
            <ImageBackground
              source={{ uri: eventFound.coverImage }}
              style={styles.image}
              imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
            />
            <BlurView
              intensity={40}
              tint={colorScheme}
              style={styles.blurOverlay}
            >
              <Text style={[styles.eventTitle, { color: colors.text }]}>
                {eventFound.title}
              </Text>
              <View style={styles.row}>
                <CalendarDays size={16} color={colors.text} />
                <Text style={[styles.meta, { color: colors.text }]}>
                  {' '}
                  {new Date(eventFound.startDate).toLocaleDateString(
                    'pt-BR'
                  )}{' '}
                  até {new Date(eventFound.endDate).toLocaleDateString('pt-BR')}{' '}
                </Text>
              </View>
              <View style={styles.row}>
                <MapPin size={16} color={colors.text} />
                <Text style={[styles.meta, { color: colors.text }]}>
                  {eventFound.location}
                </Text>
              </View>
            </BlurView>
          </View>
        </View>

        <Modal
          visible={guestStatus === 'none' && !isSubmitting && !showConfetti}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.animatedContainer}
            >
              <LinearGradient
                colors={gradientColors}
                locations={[0, 0.7, 1]}
                style={[styles.modalContent, { borderColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.modalText,
                    {
                      color: colors.text,
                      fontSize: 16,
                      textAlign: 'center',
                      marginTop: 8,
                    },
                  ]}
                >
                  💫 Seja muito bem-vindo(a)
                </Text>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.primary, fontSize: 22 },
                  ]}
                >
                  Você foi convidado!
                </Text>
                <Text
                  style={[
                    styles.modalText,
                    {
                      color: colors.text,
                      fontSize: 15,
                      textAlign: 'center',
                      marginTop: 12,
                    },
                  ]}
                >
                  Escolha como deseja participar deste momento especial.{' '}
                  <Text style={{ fontStyle: 'italic' }}>
                    Você poderá alterar sua escolha a qualquer momento.
                  </Text>
                </Text>
                <View style={styles.modalButtons}>
                  <Pressable
                    onPress={() => handlePresence('confirmado')}
                    style={[
                      styles.confirmBtn,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.confirmText, { color: '#fff' }]}>
                      Confirmar Presença
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handlePresence('acompanhando')}
                    style={[
                      styles.secondaryBtn,
                      { backgroundColor: colors.backgroundComents },
                    ]}
                  >
                    <Text style={[styles.confirmText, { color: '#fff' }]}>
                      Acompanhar Evento
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => router.replace('/')}
                  style={[
                    styles.cancelBtn,
                    {
                      backgroundColor:
                        colorScheme === 'dark' ? '#ffffff22' : '#00000011',
                    },
                  ]}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>
                    Voltar
                  </Text>
                </Pressable>
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  overlayDimmed: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  confettiMessageContainer: {
    position: 'absolute',
    top: '60%',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confettiMessage: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  image: { height: 180, width: '100%' },
  blurOverlay: { padding: 16, backgroundColor: 'rgba(0,0,0,0.25)' },
  eventTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  meta: { fontSize: 13 },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  animatedContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    borderWidth: 1.5,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalText: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '600' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 10,
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: { fontSize: 16, fontWeight: '500', marginTop: 12 },
  cancelBtn: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
