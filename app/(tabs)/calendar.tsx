import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

export default function CalendarScreen() {
  const { state } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Calendar functions
  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const moveMonth = (offset: number) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setSelectedMonth(newMonth);
  };

  // Create calendar data
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);

    const days = [];

    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, hasEvent: false });
    }

    // Add days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);

      // Check if any event is scheduled for this day
      const hasEvent = state.events.some((event) => {
        // Check if this day falls within any event period
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);

        return date >= eventStart && date <= eventEnd;
      });

      days.push({ day, hasEvent });
    }

    return days;
  }, [selectedMonth, state.events]);

  // Get events for the selected month
  const eventsThisMonth = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    return state.events.filter((event) => {
      const eventStartMonth = event.startDate.getMonth();
      const eventStartYear = event.startDate.getFullYear();
      const eventEndMonth = event.endDate.getMonth();
      const eventEndYear = event.endDate.getFullYear();

      return (
        // Event starts in this month
        (eventStartMonth === month && eventStartYear === year) ||
        // Event ends in this month
        (eventEndMonth === month && eventEndYear === year) ||
        // Event spans over this month
        (eventStartYear * 12 + eventStartMonth <= year * 12 + month &&
          eventEndYear * 12 + eventEndMonth >= year * 12 + month)
      );
    });
  }, [selectedMonth, state.events]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/(stack)/events/${eventId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={() => moveMonth(-1)}
          style={styles.navButton}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {selectedMonth.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}
        </Text>

        <TouchableOpacity onPress={() => moveMonth(1)} style={styles.navButton}>
          <ChevronRight size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdaysContainer}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
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
                  style={[
                    styles.dayText,
                    { color: item.hasEvent ? 'white' : colors.text },
                  ]}
                >
                  {item.day}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <Text style={[styles.eventsTitle, { color: colors.text }]}>
        Events This Month
      </Text>

      <ScrollView style={styles.eventsContainer}>
        {eventsThisMonth.length === 0 ? (
          <View style={styles.noEventsContainer}>
            <LucideCalendar size={48} color={colors.textSecondary} />
            <Text
              style={[styles.noEventsText, { color: colors.textSecondary }]}
            >
              No events scheduled for this month
            </Text>
          </View>
        ) : (
          eventsThisMonth.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() => handleEventPress(event.id)}
              activeOpacity={0.7}
            >
              <Card style={styles.eventCard}>
                <Text style={[styles.eventTitle, { color: colors.text }]}>
                  {event.title}
                </Text>
                <Text style={[styles.eventDates, { color: colors.primary }]}>
                  {formatDate(event.startDate)} - {formatDate(event.endDate)}
                </Text>
                <Text
                  style={[
                    styles.eventLocation,
                    { color: colors.textSecondary },
                  ]}
                >
                  {event.location}
                </Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
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
    marginBottom: 24,
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
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
  dayText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  eventsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
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
  eventCard: {
    marginBottom: 12,
  },
  eventTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 4,
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
});
