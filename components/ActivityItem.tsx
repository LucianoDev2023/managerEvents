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

interface ActivityItemProps {
  activity: Activity;
  eventId: string;
  programId: string;
  createdBy: string;
  subAdmins?: SubAdmin[];
}

export default function ActivityItem({
  activity,
  eventId,
  programId,
  createdBy,
  subAdmins = [],
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
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.timeContainer}>
            <Clock size={18} color={colors.primary} />
            <Text style={[styles.time, { color: colors.primary }]}>
              {activity.time}
            </Text>
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
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 10,
    paddingLeft: 18,
    margin: 8,
    marginHorizontal: 10,
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
});
