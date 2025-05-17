import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from './ui/Card';
import { Clock, Calendar, Plus, Image as ImageIcon } from 'lucide-react-native';
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

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handleAddActivity = () => {
    router.push(`/events/${eventId}/program/${program.id}/add-activity`);
  };

  const handleAddPhoto = () => {
    router.push(`/events/${eventId}/program/${program.id}/add-photo`);
  };

  const handleProgramPress = () => {
    router.push(`/events/${eventId}/program/${program.id}`);
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handleProgramPress}>
      <Card style={styles.card}>
        <View style={styles.dateContainer}>
          <Calendar size={20} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDate(program.date)}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {program.activities.length} activities
            </Text>
          </View>

          <View style={styles.statItem}>
            <ImageIcon size={16} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {program.photos.length}/3 photos
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleAddActivity}
          >
            <Plus size={16} color="white" />
            <Text style={styles.actionText}>Add Activity</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity 
            style={[
              styles.actionButton, 
              { 
                backgroundColor: program.photos.length >= 3 
                  ? colors.border 
                  : colors.secondary 
              }
            ]} 
            onPress={handleAddPhoto}
            disabled={program.photos.length >= 3}
          >
            <Plus size={16} color="white" />
            <Text style={styles.actionText}>Add Photo</Text>
          </TouchableOpacity> */}
        </View>
      </Card>
    </TouchableOpacity>
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
    flexDirection: 'row',
    marginBottom: 16,
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
    borderRadius: 8,
    flex: 0.48,
  },
  actionText: {
    marginLeft: 4,
    color: 'white',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
});
