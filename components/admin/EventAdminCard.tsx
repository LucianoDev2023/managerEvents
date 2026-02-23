import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Calendar, MapPin, AlertCircle } from 'lucide-react-native';
import { Event } from '@/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { getOptimizedUrl } from '@/lib/cloudinary';

export const EventAdminCard = ({ event, onPress }: { event: Event, onPress: () => void }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const pendingTasks = event.tasks?.filter(t => !t.completed).length ?? 0;
  const pendingFinance = event.financials?.filter(f => !f.paid).length ?? 0;
  const totalPending = pendingTasks + pendingFinance;

  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.card, 
        { backgroundColor: colors.backgroundCard, opacity: pressed ? 0.9 : 1 }
      ]}
    >
      <Image 
        source={{ uri: getOptimizedUrl(event.coverImage, { width: 400 }) }} 
        style={styles.image} 
      />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
        
        <View style={styles.row}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={[styles.detail, { color: colors.textSecondary }]}>
                {new Date(event.startDate).toLocaleDateString('pt-BR')}
            </Text>
        </View>

        <View style={styles.row}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={1}>
                {event.location}
            </Text>
        </View>

        {totalPending > 0 && (
            <View style={styles.badge}>
                <AlertCircle size={10} color={colors.error} />
                <Text style={[styles.badgeText, { color: colors.error }]}>
                    {totalPending} {totalPending === 1 ? 'pendência' : 'pendências'}
                </Text>
            </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
    marginBottom: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#222',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  }
});
