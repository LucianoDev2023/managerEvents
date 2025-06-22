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
import { ChevronRight, Clock, Edit, LucideCamera } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Activity, SubAdmin } from '@/types';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { scheduleNotification } from '@/app/utils/notifications';

interface ActivityItemProps {
  activity: Activity;
  eventId: string;
  programId: string;
  createdBy: string;
  subAdmins?: SubAdmin[];
  programDate: string | Date;
}

export default function ActivityItem({
  activity,
  eventId,
  programId,
  createdBy,
  subAdmins = [],
  programDate, //
}: ActivityItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const authUser = getAuth().currentUser;
  const userEmail = authUser?.email?.toLowerCase();

  const isCreator = createdBy.toLowerCase() === userEmail;
  const isSubAdmin = subAdmins.some(
    (admin) => admin.email.toLowerCase() === userEmail
  );

  const hasPermission = isCreator || isSubAdmin;

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
    <Pressable
      onPress={handleViewPhotos}
      android_ripple={{ color: colors.primary, borderless: false }}
      style={({ pressed }) => [
        styles.cardWrapper,
        pressed && Platform.OS === 'ios' && { opacity: 0.7 },
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.background, borderRadius: 10 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.timeContainer}>
            <Clock size={18} color={colors.primary} />
            <Text style={[styles.time, { color: colors.text, marginLeft: 6 }]}>
              {activity.time}
            </Text>

            <Pressable
              onPress={() =>
                scheduleNotification({
                  title: activity.title,
                  date: programDate,
                  time: activity.time,
                })
              }
              style={styles.inlineNotifyButton}
            >
              <Text style={styles.inlineNotifyButtonText}>🔔</Text>
            </Pressable>
          </View>

          {hasPermission && (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                onPress={handleAddPhoto}
                style={styles.iconButton}
              >
                <Text style={{ color: colors.textSecondary }}>Adicionar</Text>
                <LucideCamera size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditActivity}
                style={styles.iconButton}
              >
                <Text style={{ color: colors.textSecondary }}>Editar</Text>
                <Edit size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {activity.title}
        </Text>

        {activity.description && (
          <View style={styles.setaCard}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {activity.description}
            </Text>
            <ChevronRight size={24} color={colors.primary} />
          </View>
        )}
        <View style={styles.photoRow}>
          <LucideCamera size={16} color={colors.textSecondary} />
          <Text style={[styles.photoCount, { color: colors.textSecondary }]}>
            {activity.photos?.length || 0}{' '}
            {activity.photos?.length === 0
              ? ''
              : activity.photos?.length === 1
              ? 'foto'
              : 'fotos'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    paddingLeft: 18,
    margin: 2,
    marginHorizontal: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    alignItems: 'center',
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
  cardWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  setaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  photoCount: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  inlineNotifyButton: {
    marginLeft: 12,
    backgroundColor: '#6e56cf',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  inlineNotifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
