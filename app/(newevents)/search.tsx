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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Colors from '@/constants/Colors';
import { BlurView } from 'expo-blur';
import { MapPin, CalendarDays } from 'lucide-react-native';

export default function FoundEventScreen() {
  const { accessCode, title } = useLocalSearchParams<{
    accessCode?: string;
    title?: string;
  }>();

  const { state } = useEvents();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Se eventos forem carregados, desativa o loading imediatamente
    if (state.events.length > 0) {
      setIsLoading(false);
      return;
    }

    // Caso contrário, espera até 10 segundos antes de desligar o loading
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

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

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

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
          <Pressable onPress={() => router.push(`/events/${eventFound.id}`)}>
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
                      {new Date(eventFound.endDate).toLocaleDateString('pt-BR')}
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
        ) : (
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Nenhum evento correspondente foi encontrado.
          </Text>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
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
  image: {
    height: 180,
    justifyContent: 'flex-end',
  },
  blurOverlay: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  eventTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  meta: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
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
});
