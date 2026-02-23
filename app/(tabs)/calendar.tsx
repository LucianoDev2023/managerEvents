import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
} from 'react-native';

import { useColorScheme } from 'react-native';
import {
  Calendar as LucideCalendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { useEvents } from '../../context/EventsContext';
import Colors from '../../constants/Colors';
import Fonts from '@/constants/Fonts';
import { getGuestParticipationsByUserId } from '../../hooks/guestService';
import type { GuestParticipation } from '../../types/guestParticipation';

const toDateSafe = (value: any): Date => {
  if (!value) return new Date(0);
  if (typeof value?.toDate === 'function') return value.toDate(); // Firestore Timestamp
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

const normalizeDate = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function CalendarScreen() {
  const { state } = useEvents();

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#e6e6f0', '#f9f9ff'] as const);

  const [uid, setUid] = useState('');
  const [participations, setParticipations] = useState<GuestParticipation[]>(
    [],
  );
  const [isLoadingParticipations, setIsLoadingParticipations] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? ''));
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!uid) {
        if (!cancelled) setParticipations([]);
        return;
      }

      try {
        setIsLoadingParticipations(true);
        const data = await getGuestParticipationsByUserId(uid);
        if (!cancelled) setParticipations(data);
      } catch (e) {
        if (!cancelled) setParticipations([]);
      } finally {
        if (!cancelled) setIsLoadingParticipations(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const daysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const firstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const moveMonth = (offset: number) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setSelectedMonth(newMonth);
  };

  const participantEventIds = useMemo(() => {
    return new Set(
      participations
        .filter((p) => p.mode === 'confirmado' || p.mode === 'acompanhando')
        .map((p) => p.eventId),
    );
  }, [participations]);

  const hasAccessToEvent = useMemo(() => {
    return (event: any) => {
      if (!uid) return false;

      const isCreator = event.userId === uid;
      const isSubAdmin = !!event.subAdminsByUid?.[uid];
      const isParticipant = participantEventIds.has(event.id);

      return isCreator || isSubAdmin || isParticipant;
    };
  }, [uid, participantEventIds]);

  const accessibleEvents = useMemo(() => {
    return state.events.filter(hasAccessToEvent);
  }, [state.events, hasAccessToEvent]);

  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);

    const days: Array<{ day: number; hasEvent: boolean }> = [];

    for (let i = 0; i < firstDay; i++) days.push({ day: 0, hasEvent: false });

    for (let day = 1; day <= totalDays; day++) {
      const date = normalizeDate(new Date(year, month, day));

      const hasEvent = accessibleEvents.some((event) => {
        const start = normalizeDate(toDateSafe(event.startDate));
        const end = normalizeDate(toDateSafe(event.endDate));
        return date >= start && date <= end;
      });

      days.push({ day, hasEvent });
    }

    return days;
  }, [selectedMonth, accessibleEvents]);

  const eventsThisMonth = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    return accessibleEvents.filter((event) => {
      const start = toDateSafe(event.startDate);
      const end = toDateSafe(event.endDate);

      const isInMonth =
        (start.getMonth() === month && start.getFullYear() === year) ||
        (end.getMonth() === month && end.getFullYear() === year) ||
        (start.getFullYear() * 12 + start.getMonth() <= year * 12 + month &&
          end.getFullYear() * 12 + end.getMonth() >= year * 12 + month);

      return isInMonth;
    });
  }, [selectedMonth, accessibleEvents]);

  const formatDate = (dateLike: any) =>
    toDateSafe(dateLike).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const handleEventPress = (eventId: string) => {
    router.push({
      pathname: `/(stack)/events/${eventId}`,
      params: { from: 'calendar' },
    } as any);
  };

  const isLoading = !!uid && isLoadingParticipations;
  const showEmpty = !!uid && !isLoading && accessibleEvents.length === 0;

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.7, 1]}
      style={styles.gradient}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />

      <View
        style={[
          styles.container,
          {
            paddingTop:
              Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 40) + 8 : 44,
          },
        ]}
      >
        <View style={{ paddingHorizontal: 4, marginBottom: 20, marginTop: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Visualize e organize seus próximos eventos confirmados e gerenciados:
          </Text>
          <Text style={{ color: colors.text, fontSize: 18, fontFamily: Fonts.bold, marginTop: 10 }}>
            Calendário de Eventos
          </Text>
        </View>
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text, marginTop: 12 }}>
              Carregando...
            </Text>
          </View>
        )}

        {!isLoading && showEmpty && (
          <View style={styles.center}>
            <LucideCalendar size={56} color={colors.textSecondary} />
            <Text
              style={[styles.noEventsText, { color: colors.textSecondary }]}
            >
              Você ainda não tem eventos acessíveis.
            </Text>
          </View>
        )}

        {!isLoading && !showEmpty && (
          <>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={() => moveMonth(-1)}
                style={styles.navButton}
              >
                <ChevronLeft size={24} color={colors.text} />
              </TouchableOpacity>

              <Text style={[styles.monthTitle, { color: colors.text }]}>
                {selectedMonth.toLocaleString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>

              <TouchableOpacity
                onPress={() => moveMonth(1)}
                style={styles.navButton}
              >
                <ChevronRight size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdaysContainer}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <Text
                  key={day}
                  style={[styles.weekday, { color: colors.textSecondary }]}
                >
                  {day}
                </Text>
              ))}
            </View>

            <View
              style={[
                styles.daysContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              {calendarDays.map((item, index) => (
                <View
                  key={`${item.day}-${index}`}
                  style={[styles.day, item.day === 0 && styles.emptyDay]}
                >
                  {item.day > 0 && (
                    <View
                      style={[
                        styles.dayNumber,
                        item.hasEvent && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={{ color: item.hasEvent ? '#fff' : colors.text }}
                      >
                        {item.day}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <Text style={[styles.eventsTitle1, { color: colors.text }]}>
              Eventos para este Mês
            </Text>

            <ScrollView style={styles.eventsContainer}>
              {eventsThisMonth.length === 0 ? (
                <View style={styles.noEventsContainer}>
                  <LucideCalendar size={48} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.noEventsText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Nenhum evento disponível neste mês
                  </Text>
                </View>
              ) : (
                eventsThisMonth.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    onPress={() => handleEventPress(event.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.cardShadow,
                        { backgroundColor: colors.backgroundSecondary },
                      ]}
                    >
                      <View
                        style={[
                          styles.eventCard,
                          {
                            backgroundColor: colors.backgroundSecondary,
                            borderColor: colors.primaryDark,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.eventTitle, { color: colors.text }]}
                        >
                          {event.title}
                        </Text>
                        <Text
                          style={[styles.eventDates, { color: colors.primary }]}
                        >
                          {formatDate(event.startDate)} -{' '}
                          {formatDate(event.endDate)}
                        </Text>
                        <Text
                          style={[
                            styles.eventLocation,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {event.location}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: { padding: 1 },
  monthTitle: { fontSize: 18, fontFamily: Fonts.bold },

  weekdaysContainer: { flexDirection: 'row', marginTop: 2 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Fonts.medium,
    paddingVertical: 8,
  },

  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 1,
  },
  emptyDay: { opacity: 0 },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  eventsTitle1: { fontFamily: Fonts.bold, fontSize: 16, marginBottom: 16 },
  eventsContainer: { flex: 1 },

  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  noEventsText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },

  eventTitle: { fontFamily: Fonts.bold, fontSize: 16, marginBottom: 2 },
  eventDates: { fontFamily: Fonts.medium, fontSize: 14, marginBottom: 4 },
  eventLocation: { fontFamily: Fonts.regular, fontSize: 14 },

  cardShadow: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 12,
  },
  eventCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
});
