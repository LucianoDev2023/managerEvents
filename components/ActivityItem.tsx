import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  useColorScheme,
} from 'react-native';
import { ChevronRight, Clock, Edit, LucideCamera, Plus } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import type { Activity, PermissionLevel } from '@/types';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import Fonts from '@/constants/Fonts';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface ActivityItemProps {
  activity: Activity;
  eventId: string;
  programId: string;
  creatorUid: string;
  subAdminsByUid?: Record<string, PermissionLevel>;
  programDate: string | Date;
}

export default function ActivityItem({
  activity,
  eventId,
  programId,
  creatorUid,
  subAdminsByUid = {},
  programDate,
}: ActivityItemProps) {
  const colorScheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  const myUid = getAuth().currentUser?.uid ?? '';

  const hasPermission = useMemo(() => {
    if (!myUid) return false;
    const isCreator = creatorUid === myUid;
    const level = subAdminsByUid?.[myUid];
    const levelNorm = String(level ?? '').toLowerCase();
    const isSubAdmin =
      levelNorm === 'super admin' || levelNorm === 'admin parcial';
    return isCreator || isSubAdmin;
  }, [myUid, creatorUid, subAdminsByUid]);

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
    <Animated.View entering={FadeInUp.delay(50)}>
      <Pressable
        onPress={handleViewPhotos}
        android_ripple={{ color: colors.primary, borderless: false }}
        style={({ pressed }) => [
          styles.cardWrapper,
          pressed && Platform.OS === 'ios' && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View
          style={[
            styles.card,
            { 
              backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
              borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.timeBadge, { backgroundColor: colors.primary + '15' }]}>
              <Clock size={14} color={colors.primary} />
              <Text style={[styles.timeText, { color: colors.primary }]}>
                {activity.time}
              </Text>
            </View>

            <View style={styles.actions}>
              {hasPermission && (
                <View style={styles.adminActions}>
                  <TouchableOpacity
                    onPress={handleEditActivity}
                    style={styles.actionIcon}
                  >
                    <Edit size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={[styles.titleText, { color: colors.text }]}>
                {activity.title}
              </Text>
              <ChevronRight size={18} color={colors.textSecondary} opacity={0.5} />
            </View>

            {!!activity.description && (
              <Text 
                style={[styles.descriptionText, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {activity.description}
              </Text>
            )}

            <View style={[styles.footer, { borderTopColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={styles.photoCount}>
                <LucideCamera size={14} color={colors.textSecondary} />
                <Text style={[styles.photoCountText, { color: colors.textSecondary }]}>
                  {activity.photos?.length || 0} {activity.photos?.length === 1 ? 'foto' : 'fotos'}
                </Text>
              </View>

              {hasPermission && (
                <TouchableOpacity
                  onPress={handleAddPhoto}
                  activeOpacity={0.7}
                  style={[styles.addPhotoButton, { borderColor: colors.primary + '40' }]}
                >
                  <Plus size={14} color={colors.primary} />
                  <Text style={[styles.addPhotoText, { color: colors.primary }]}>Adicionar Foto</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(110, 86, 207, 0.1)',
  },
  timeText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifyButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifyIcon: {
    fontSize: 14,
  },
  adminActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  content: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    marginTop: 2,
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  photoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoCountText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(110, 86, 207, 0.03)',
  },
  addPhotoText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
});
