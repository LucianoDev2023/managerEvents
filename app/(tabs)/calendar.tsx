import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import {
  Calendar as LucideCalendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import Card from '@/components/ui/Card';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const normalizeDate = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function CalendarScreen() {
  const userEmail = getAuth().currentUser?.email?.toLowerCase() ?? '';
  const { state } = useEvents();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const gradientColors =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#e6e6f0', '#f9f9ff'];

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

  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, hasEvent: false });
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = normalizeDate(new Date(year, month, day));
      const hasEvent = state.events.some((event) => {
        if (!event.createdBy) return false;
        const start = normalizeDate(event.startDate);
        const end = normalizeDate(event.endDate);
        return (
          event.createdBy.toLowerCase() === userEmail &&
          date >= start &&
          date <= end
        );
      });
      days.push({ day, hasEvent });
    }

    return days;
  }, [selectedMonth, state.events]);

  const eventsThisMonth = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    return state.events.filter((event) => {
      if (!event.createdBy) return false;
      const createdBy = event.createdBy.toLowerCase();
      if (createdBy !== userEmail) return false;
      const start = event.startDate;
      const end = event.endDate;

      const isInMonth =
        (start.getMonth() === month && start.getFullYear() === year) ||
        (end.getMonth() === month && end.getFullYear() === year) ||
        (start.getFullYear() * 12 + start.getMonth() <= year * 12 + month &&
          end.getFullYear() * 12 + end.getMonth() >= year * 12 + month);

      return isInMonth;
    });
  }, [selectedMonth, state.events]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const handleEventPress = (eventId: string) => {
    router.push(`/(stack)/events/${eventId}`);
  };

  return (
    <LinearGradient
      colors={
        colorScheme === 'dark'
          ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
          : (['#f2f2f2', '#e6e6f0', '#ffffff'] as const)
      }
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
              Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
          },
        ]}
      >
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

        <View style={styles.daysContainer}>
          {calendarDays.map((item, index) => (
            <View
              key={index}
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
                    style={{
                      color: item.hasEvent ? '#fff' : colors.text,
                      fontFamily: 'Inter-Regular',
                    }}
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
                style={[styles.noEventsText, { color: colors.textSecondary }]}
              >
                Nenhum evento disponível
              </Text>
            </View>
          ) : (
            eventsThisMonth.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => handleEventPress(event.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardShadow}>
                  <View
                    style={[
                      styles.eventCard,
                      { backgroundColor: colors.backGroundSecondary },
                    ]}
                  >
                    <Text style={[styles.eventTitle, { color: colors.text }]}>
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
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  eventTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
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
  emptyDay: {
    opacity: 0,
  },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  eventsContainer: {
    flex: 1,
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  noEventsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },

  eventDates: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginBottom: 4,
  },
  eventLocation: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  cardShadow: {
    borderRadius: 12,
    backgroundColor: '#000', // fallback para Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 12,
  },
  eventCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6e56cf',
  },
  eventsTitle1: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 16,
  },
});
