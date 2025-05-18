import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Card from './ui/Card';
import { CalendarDays, MapPin, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Event } from '@/types';
import { router } from 'expo-router';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    const startFormatted = start.toLocaleDateString('en-US', options);
    const endFormatted = end.toLocaleDateString('en-US', options);

    return startFormatted === endFormatted
      ? startFormatted
      : `${startFormatted} - ${endFormatted}`;
  };

  const handlePress = () => {
    router.push(`/events/${event.id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ color: colors.primary }}
      style={({ pressed }) => [
        styles.cardWrapper,
        pressed && Platform.OS === 'ios' && { opacity: 0.85 },
      ]}
    >
      <Card style={styles.card}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>
            {event.title}
          </Text>

          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <CalendarDays size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {formatDateRange(event.startDate, event.endDate)}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <MapPin size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {event.location}
              </Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <Text style={[styles.statsText, { color: colors.textSecondary }]}>
              {event.programs.length}{' '}
              {event.programs.length === 1
                ? 'programa adicionado neste evento'
                : 'programas adicionados neste evento'}{' '}
            </Text>
          </View>
        </View>

        <View style={styles.chevronContainer}>
          <ChevronRight size={24} color={colors.primary} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    padding: 16,
    margin: 8,
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  infoContainer: {
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 12,
  },
});
