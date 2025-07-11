// app/(tabs)/event-detail-refatorado.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import {
  useFocusEffect,
  useLocalSearchParams,
  router,
  Stack,
} from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  CalendarDays,
} from 'lucide-react-native';
import ProgramItem from '@/components/ProgramItem';
import Button from '@/components/ui/Button';
import LoadingOverlay from '@/components/LoadingOverlay';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import LottieView from 'lottie-react-native';
import type { Guest, Event } from '@/types';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function EventDetailScreen() {
  const { refetchEventById, deleteEvent, addProgram, getGuestsByEventId } =
    useEvents();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [confirmed, setConfirmed] = useState<Guest[]>([]);
  const [interested, setInterested] = useState<Guest[]>([]);

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const userEmail = getAuth().currentUser?.email?.toLowerCase() ?? '';

  const hasPermission =
    event &&
    (event.createdBy?.toLowerCase() === userEmail ||
      event.subAdmins?.some(
        (admin) =>
          admin.email.toLowerCase() === userEmail &&
          (admin.level === 'Super Admin' || admin.level === 'Admin parcial')
      ));

  const fetchEventData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const updatedEvent = await refetchEventById(id);
      if (updatedEvent) {
        setEvent(updatedEvent);
        const guests = await getGuestsByEventId(updatedEvent.id);
        setConfirmed(guests.filter((g) => g.mode === 'confirmado'));
        setInterested(guests.filter((g) => g.mode === 'acompanhando'));
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchEventData();
    }, [fetchEventData])
  );

  const handleOpenInMaps = (location: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location
    )}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o mapa.')
    );
  };

  const handleDateChange = (e: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (e.type === 'dismissed') return;
    if (date) {
      setSelectedDate(date);
      if (Platform.OS === 'ios') return;
      confirmAddProgram(date);
    }
  };

  const confirmAddProgram = async (date: Date) => {
    const exists = event?.programs?.some(
      (p) => new Date(p.date).toDateString() === date.toDateString()
    );
    if (!exists && event) {
      setIsAddingProgram(true);
      try {
        await addProgram(event.id, date);
        await fetchEventData(); // Atualiza com o novo dia
      } catch {
        Alert.alert('Erro', 'Não foi possível adicionar o dia.');
      } finally {
        setIsAddingProgram(false);
      }
    } else {
      Alert.alert('Erro', 'Já existe um programa para esta data.');
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      'Excluir Evento',
      'Tem certeza que deseja excluir este evento? Essa ação não poderá ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event!.id);
              router.replace('/'); // ou router.back(), dependendo do fluxo
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o evento.');
            }
          },
        },
      ]
    );
  };

  if (!event || isLoading) {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
        style={styles.centeredContent}
      >
        <View
          style={[
            styles.centeredContent,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[
              styles.emptyText,
              { color: colors.textSecondary, marginTop: 12 },
            ]}
          >
            Carregando programação...
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <LinearGradient
      colors={
        colorScheme === 'dark'
          ? ['#0b0b0f', '#1b0033', '#3e1d73']
          : ['#ffffff', '#f0f0ff', '#e9e6ff']
      }
      style={styles.container}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Detalhes do evento',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            hasPermission ? (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/(stack)/events/new',
                      params: { mode: 'edit', id: event.id },
                    })
                  }
                >
                  <Edit size={20} color={colors.text} />
                </TouchableOpacity>
                {event.createdBy === userEmail && (
                  <TouchableOpacity onPress={handleDeleteEvent}>
                    <Trash2 size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ) : null,
        }}
      />

      {event.coverImage && (
        <ImageBackground
          source={{ uri: event.coverImage }}
          style={styles.coverImage}
        >
          <View style={styles.overlayBottom}>
            <Text style={styles.coverTitle}>{event.title}</Text>
            <View style={styles.row}>
              <CalendarDays size={16} color="#fff" />
              <Text style={styles.meta}>
                {new Date(event.startDate).toLocaleDateString('pt-BR')} até{' '}
                {new Date(event.endDate).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleOpenInMaps(event.location)}
              style={[styles.mapBtn, { borderColor: colors.border }]}
            >
              <View style={styles.animaps}>
                <LottieView
                  source={require('@/assets/images/animaps.json')}
                  autoPlay
                  loop
                  style={styles.lottieIcon}
                />
              </View>
              <Text
                style={[styles.mapBtnText, { color: colors.textSecondary }]}
              >
                {event.location}
              </Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Programação diária
        </Text>
        {hasPermission && (
          <View style={{ flexDirection: 'row' }}>
            <View style={[styles.buttonRow, { marginBottom: 10 }]}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.controlButton,
                  { borderColor: colors.primary },
                  isAddingProgram && styles.disabled,
                ]}
                disabled={isAddingProgram}
                activeOpacity={0.8}
              >
                <Plus size={18} color={colors.text} />
                <Text
                  style={[styles.controlButtonText, { color: colors.text }]}
                >
                  {isAddingProgram ? 'Adicionando...' : 'Dia'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/events/${event.id}/eventOrganizerNoteViewScreen`
                  )
                }
                style={[styles.controlButton, { borderColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Edit size={18} color={colors.text} />
                <Text
                  style={[styles.controlButtonText, { color: colors.text }]}
                >
                  Notas
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {event.programs?.length ? (
          event.programs
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .map((program) => (
              <ProgramItem
                key={program.id}
                program={program}
                eventId={event.id}
              />
            ))
        ) : (
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Nenhuma programação ainda.
          </Text>
        )}
      </ScrollView>

      {isAddingProgram && <LoadingOverlay message="Adicionando dia..." />}

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date(event.startDate)}
          maximumDate={new Date(event.endDate)}
          onChange={handleDateChange}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coverImage: {
    width: '100%',
    height: 250,
    justifyContent: 'flex-end',
    marginBottom: 20,
  },

  overlayBottom: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    paddingLeft: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  coverTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  sectionHeader: {
    alignContent: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  headerActions: { flexDirection: 'row', gap: 12 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
  },
  mapBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  lottieIcon: {
    width: 30,
    height: 30,
  },
  animaps: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: '#fefefe',
    borderRadius: 50,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
  },

  controlButton: {
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },

  controlButtonText: {
    fontSize: 14,
    justifyContent: 'center',
    fontFamily: 'Inter_500Medium',
  },

  disabled: {
    opacity: 0.5,
  },
});
