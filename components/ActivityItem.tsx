import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from './ui/Card';
import { Clock, CreditCard as Edit2, Plus } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Activity } from '@/types';
import { router } from 'expo-router';

interface ActivityItemProps {
  activity: Activity;
  eventId: string;
  programId: string;
}

export default function ActivityItem({
  activity,
  eventId,
  programId,
}: ActivityItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleEditActivity = (e: any) => {
    e.stopPropagation();
    router.push(
      `/events/${eventId}/program/${programId}/edit-activity/${activity.id}`
    );
  };

  const handleAddPhoto = (e: any) => {
    e.stopPropagation();
    router.push(
      `/events/${eventId}/program/${programId}/activity/${activity.id}/add-photo`
    );
  };

  const handleViewPhotos = () => {
    router.push(
      `/events/${eventId}/program/${programId}/activity/${activity.id}/photos`
    );
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={handleViewPhotos}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.timeContainer}>
            <Clock size={16} color={colors.primary} />
            <Text style={[styles.time, { color: colors.primary }]}>
              {activity.time}
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              onPress={handleAddPhoto}
              style={styles.iconButton}
            >
              <Plus size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleEditActivity}
              style={styles.iconButton}
            >
              <Edit2 size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {activity.title}
        </Text>

        {activity.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {activity.description}
          </Text>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
});
