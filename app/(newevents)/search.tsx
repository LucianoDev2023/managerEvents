// Refatorado para usar `Guest[]` com base nos novos types + Loading Overlay
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Colors from '@/constants/Colors';
import { BlurView } from 'expo-blur';
import { MapPin, CalendarDays } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { getAuth } from 'firebase/auth';
import LottieView from 'lottie-react-native';

export default function FoundEventScreen() {
  const [hasConfirmedPresence, setHasConfirmedPresence] = useState(false);

  const { accessCode, title } = useLocalSearchParams<{
    accessCode?: string;
    title?: string;
  }>();
  const { state, updateEvent } = useEvents();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const [isLoading, setIsLoading] = useState(true);
  const [presenceStatus, setPresenceStatus] = useState<
    'none' | 'confirmed' | 'interested'
  >('none');

  const [showConfetti, setShowConfetti] = useState(false);
  const user = getAuth().currentUser;
  const userEmail = user?.email ?? 'convidado@anonimo.com';
  const userName = user?.displayName ?? 'Convidado';

  useEffect(() => {
    if (state.events.length > 0) {
      setIsLoading(false);
      return;
    }
    const timeout = setTimeout(() => setIsLoading(false), 10000);
    return () => clearTimeout(timeout);
  }, [state.events]);

  const eventFound = useMemo(() => {
    if (!accessCode || !title || state.events.length === 0) return null;
    return state.events.find(
      (event) =>
        event.title.toLowerCase().trim() === title.toLowerCase().trim() &&
        event.accessCode?.toLowerCase().trim() ===
          accessCode.toLowerCase().trim()
    );
  }, [accessCode, title, state.events]);

  const isCreator = useMemo(() => {
    if (!eventFound || !user?.uid) return false;
    const authUser = getAuth().currentUser;
    const userEmail = authUser?.email?.toLowerCase();
    return eventFound.createdBy === userEmail;
  }, [eventFound, user?.uid]);

  useEffect(() => {
    if (!eventFound) return;
    const guest = eventFound.confirmedGuests?.find(
      (g) => g.email === userEmail
    );
    setPresenceStatus(
      guest
        ? guest.mode === 'confirmado'
          ? 'confirmed'
          : 'interested'
        : 'none'
    );
  }, [eventFound, userEmail]);

  const handlePresence = async (mode: 'confirmado' | 'acompanhando') => {
    if (!eventFound) return;

    try {
      setIsSubmitting(true);

      const updatedGuests = [
        ...(eventFound.confirmedGuests ?? []).filter(
          (g) => g.email !== userEmail
        ),
        { name: userName, email: userEmail, mode },
      ];

      const updatedEvent = { ...eventFound, confirmedGuests: updatedGuests };
      await updateEvent(updatedEvent);
      setPresenceStatus(mode === 'confirmado' ? 'confirmed' : 'interested');

      if (!hasConfirmedPresence && mode === 'confirmado') {
        setShowConfetti(true);
        setHasConfirmedPresence(true);
      }
    } catch (error) {
      Alert.alert('Erro ao atualizar presença', String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flex: 1 }}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.7, 1]}
        style={styles.container}
      >
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

        {isSubmitting && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {showConfetti && (
          <View style={styles.overlay}>
            <LottieView
              source={require('@/assets/images/confetti.json')}
              autoPlay
              loop={false}
              style={{ width: '100%', height: '100%' }}
              onAnimationFinish={() => {
                setShowConfetti(false);
                Alert.alert(
                  '🎉 Evento liberado',
                  'Agora você pode acessar o evento normalmente.'
                );
              }}
            />
          </View>
        )}

        <View
          style={[
            styles.header,
            {
              paddingTop:
                Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Evento Encontrado
          </Text>
        </View>

        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Buscando evento...
              </Text>
            </View>
          ) : eventFound ? (
            <>
              <Pressable
                disabled={presenceStatus === 'none'}
                style={[
                  styles.card,
                  presenceStatus === 'none' && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (presenceStatus === 'none') {
                    Alert.alert(
                      'Confirmação necessária',
                      'Por favor, confirme sua presença ou acompanhe o evento antes de acessar os detalhes.'
                    );
                    return;
                  }
                  router.push(`/events/${eventFound.id}`);
                }}
              >
                <View style={styles.card}>
                  <ImageBackground
                    source={{ uri: eventFound.coverImage }}
                    style={styles.image}
                    imageStyle={{
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                    }}
                  >
                    <BlurView
                      intensity={50}
                      tint={colorScheme}
                      style={styles.blurOverlay}
                    >
                      <Text style={styles.eventTitle}>{eventFound.title}</Text>
                      <View style={styles.row}>
                        <CalendarDays size={16} color="#fff" />
                        <Text style={styles.meta}>
                          {new Date(eventFound.startDate).toLocaleDateString(
                            'pt-BR'
                          )}{' '}
                          até{' '}
                          {new Date(eventFound.endDate).toLocaleDateString(
                            'pt-BR'
                          )}
                        </Text>
                      </View>
                      {eventFound.location && (
                        <View style={styles.row}>
                          <MapPin size={16} color="#fff" />
                          <Text style={styles.meta}>{eventFound.location}</Text>
                        </View>
                      )}
                    </BlurView>
                  </ImageBackground>
                  <View style={styles.cardFooter}>
                    <Text style={styles.buttonText}>Toque para acessar</Text>
                  </View>
                </View>
              </Pressable>

              {!isCreator && (
                <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
                  <View
                    style={{
                      backgroundColor:
                        colorScheme === 'dark' ? '#1f1f25' : '#f4f4fb',
                      borderRadius: 16,
                      padding: 20,
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowOffset: { width: 0, height: 4 },
                      shadowRadius: 6,
                      elevation: 4,
                    }}
                  >
                    <View style={{ gap: 25 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: 'Inter-Medium',
                          color: colors.text,
                          textAlign: 'left',
                          lineHeight: 20,
                        }}
                      >
                        Você foi convidado para este evento especial! 🥳{'\n'}
                        {'\n'}
                        Para acessar o evento escolha abaixo como deseja
                        participar. Sua opção poderá ser alterada mais tarde no
                        seu perfil.
                      </Text>

                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: 'Inter-Regular',
                          color: colors.textSecondary,
                          textAlign: 'left',
                        }}
                      >
                        Sua resposta atual:{' '}
                        <Text
                          style={{
                            fontFamily: 'Inter-Bold',
                            color: colors.text,
                          }}
                        >
                          {presenceStatus === 'confirmed'
                            ? 'Presença confirmada ✅'
                            : presenceStatus === 'interested'
                            ? 'Acompanhando evento 👀'
                            : 'Nenhuma resposta registrada'}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 12,
                      marginTop: 20,
                    }}
                  >
                    <View
                      style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}
                    >
                      <Pressable
                        onPress={() => handlePresence('confirmado')}
                        disabled={isSubmitting}
                        style={[
                          styles.statusButton,
                          presenceStatus === 'confirmed' &&
                            styles.statusButtonActive,
                          isSubmitting && { opacity: 0.6 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusButtonText,
                            presenceStatus === 'confirmed' &&
                              styles.statusButtonTextActive,
                          ]}
                        >
                          Confirmar presença
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handlePresence('acompanhando')}
                        disabled={isSubmitting}
                        style={[
                          styles.statusButton,
                          presenceStatus === 'interested' &&
                            styles.statusButtonActive,
                          isSubmitting && { opacity: 0.6 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusButtonText,
                            presenceStatus === 'interested' &&
                              styles.statusButtonTextActive,
                          ]}
                        >
                          Acompanhar evento
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </>
          ) : (
            <Text
              style={[styles.notFoundText, { color: colors.textSecondary }]}
            >
              Nenhum evento correspondente foi encontrado.
            </Text>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  header: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  loadingContainer: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    fontFamily: 'Inter-Regular',
  },
  notFoundText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    fontFamily: 'Inter-Regular',
  },
  card: {
    backgroundColor: '#1f1f25',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 6,
  },
  image: { height: 180, justifyContent: 'flex-end' },
  blurOverlay: { padding: 16, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  eventTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  meta: { color: 'white', fontSize: 13, fontFamily: 'Inter-Regular' },
  cardFooter: {
    backgroundColor: '#b18aff',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  statusButton: {
    backgroundColor: 'rgba(143, 103, 254, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  statusButtonActive: { backgroundColor: '#5838AD' },
  statusButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
});
