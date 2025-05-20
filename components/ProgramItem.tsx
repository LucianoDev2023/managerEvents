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

  // const handleAddActivity = () => {
  //   router.push(`/events/${eventId}/program/${program.id}/add-activity`);
  // };

  // const handleAddPhoto = () => {
  //   router.push(`/events/${eventId}/program/${program.id}/add-photo`);
  // };

  const handleProgramPress = () => {
    router.push(`/events/${eventId}/program/${program.id}`);
  };

  return (
    <Pressable
      onPress={handleProgramPress}
      android_ripple={{ color: colors.primary, borderless: false }}
      style={({ pressed }) => [
        styles.cardWrapper,
        pressed && Platform.OS === 'ios' && { opacity: 0.7 },
      ]}
    >
      <Card style={styles.card}>
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
          </View>
        </View>

        {/* <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleAddActivity}
          >
            <Plus size={16} color="white" />
            <Text style={styles.actionText}>Add Atividade</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  program.photos.length >= 3 ? colors.border : colors.secondary,
              },
            ]}
            onPress={handleAddPhoto}
            disabled={program.photos.length >= 3}
          >9
            <Plus size={16} color="white" />
            <Text style={styles.actionText}>Add Photo</Text>
          </TouchableOpacity>
        </View> */}
        <View style={styles.chevronContainer}>
          <ChevronRight size={24} color={colors.primary} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    margin: 8,
    marginHorizontal: 16,
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
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 12,
  },
});
