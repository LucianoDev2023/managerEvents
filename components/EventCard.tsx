import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import { CalendarDays, MapPin, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Event } from '@/types';
import { router } from 'expo-router';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const textColor = colors.text2;
  const overlayColor =
    colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.7)';

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    const startFormatted = start.toLocaleDateString('pt-BR', options);
    const endFormatted = end.toLocaleDateString('pt-BR', options);
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
      <View style={styles.cardShadow}>
        <View style={styles.card}>
          {event.coverImage && (
            <Image
              source={{ uri: event.coverImage }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          )}

          <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
            <View style={styles.content}>
              <Text style={[styles.title, { color: textColor }]}>
                {event.title}
              </Text>

              <View style={styles.infoContainer}>
                <View style={styles.infoItem}>
                  <CalendarDays size={18} color={textColor} />
                  <Text style={[styles.infoText, { color: textColor }]}>
                    {formatDateRange(event.startDate, event.endDate)}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <MapPin size={18} color={textColor} />
                  <Text style={[styles.infoText, { color: textColor }]}>
                    {event.location}
                  </Text>
                </View>
              </View>

              <Text style={[styles.statsText, { color: textColor }]}>
                {event.programs.length === 0
                  ? 'Nenhum programa adicionado'
                  : `${event.programs.length} ${
                      event.programs.length === 1
                        ? 'programa adicionado'
                        : 'programas adicionados'
                    }`}
              </Text>
            </View>
          </View>

          <View style={styles.chevronContainer}>
            <ChevronRight size={24} color={colors.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardShadow: {
    borderRadius: 12,
    backgroundColor: '#b18aff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  card: {
    height: 245,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
    margin: 1,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '50%',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 8,
  },
  content: {
    padding: 18,
    paddingBottom: 2,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 6,
  },
  infoContainer: {
    marginBottom: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  statsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  chevronContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
});
