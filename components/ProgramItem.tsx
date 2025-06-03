import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import Card from './ui/Card';
import {
  Clock,
  Calendar,
  Plus,
  Image as ImageIcon,
  ChevronRight,
  SmileIcon,
  SmilePlusIcon,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Program } from '@/types';
import { router } from 'expo-router';

interface ProgramItemProps {
  program: Program;
  eventId: string;
}

export default function ProgramItem({ program, eventId }: ProgramItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const getPhotoCount = () => {
    return program.activities.reduce((total, activity) => {
      return total + (activity.photos?.length || 0);
    }, 0);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('pt-BR', options);
  };

  const handleProgramPress = () => {
    router.push(`/events/${eventId}/program/${program.id}`);
  };

  return (
    <Pressable
      onPress={handleProgramPress}
      android_ripple={{ color: `${colors.primary}50`, borderless: false }}
      style={({ pressed }) => [
        styles.cardWrapper,
        pressed && Platform.OS === 'ios' && { opacity: 0.9 },
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.background, shadowColor: colors.text },
        ]}
      >
        <View style={styles.dateContainer}>
          <Calendar size={20} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDate(program.date)}
          </Text>
        </View>

        <Text style={[styles.statText, { color: colors.textSecondary }]}>
          Visualize as atividades e fotos deste dia.
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <SmilePlusIcon size={16} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {program.activities.length === 0
                ? 'Nenhuma atividade'
                : `${program.activities.length} - atividade${
                    program.activities.length > 1 ? 's' : ''
                  }`}
            </Text>
          </View>
          <View style={styles.statItem}>
            <ImageIcon size={16} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {getPhotoCount() === 0
                ? 'Nenhuma foto adicionada'
                : `${getPhotoCount()} - foto${getPhotoCount() > 1 ? 's' : ''}`}
            </Text>
            <View style={styles.chevronContainer}>
              <ChevronRight size={24} color={colors.primary} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    margin: 4,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff', // será sobrescrito dinamicamente com `colors.card`
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // para Android
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  statsContainer: {
    flexDirection: 'column',
    marginBottom: 10,
    marginTop: 10,
    padding: 2,
    paddingVertical: 4,
    gap: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    padding: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 0.48,
  },
  actionText: {
    marginLeft: 4,
    color: 'white',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  cardWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  chevronContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingLeft: 12,
  },
});
