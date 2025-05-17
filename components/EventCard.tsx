import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startFormatted = start.toLocaleDateString('en-US', options);
    const endFormatted = end.toLocaleDateString('en-US', options);
    
    if (startFormatted === endFormatted) {
      return startFormatted;
    }
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const handlePress = () => {
    router.push(`/events/${event.id}`);
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
      <Card style={styles.card}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
          
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
              {event.programs.length} {event.programs.length === 1 ? 'day' : 'days'} scheduled
            </Text>
          </View>
        </View>
        
        <View style={styles.chevronContainer}>
          <ChevronRight size={24} color={colors.primary} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    alignItems: 'center',
  },
});