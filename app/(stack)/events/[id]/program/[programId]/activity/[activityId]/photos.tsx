import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

import PhotoGallery from '@/components/PhotoGallery';
import LoadingOverlay from '@/components/LoadingOverlay';
import Colors from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import type { Event, Program, Activity, Photo, PermissionLevel } from '@/types';

const MAX_PHOTOS_PER_USER_PER_ACTIVITY = 5;

function pickParam(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? (value[0] ?? '') : value;
}

type RouteParams = {
  id?: string | string[];
  programId?: string | string[];
  activityId?: string | string[];
};

type GuestParticipation = { eventId: string };

export default function ActivityPhotosScreen(): JSX.Element {
  const params = useLocalSearchParams<RouteParams>();

  const id = pickParam(params.id);
  const programId = pickParam(params.programId);
  const activityId = pickParam(params.activityId);

  const {
    state,
    deletePhoto,
    refetchEventById,
    getGuestParticipationsByUserId,
  } = useEvents();

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const auth = getAuth();
  const uid = auth.currentUser?.uid ?? '';

  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [isParticipant, setIsParticipant] = useState<boolean>(false);

  // =========================
  // Derived data (typed)
  // =========================
  const event: Event | undefined = useMemo(() => {
    return state.events.find((e: Event) => e.id === id);
  }, [state.events, id]);

  const program: Program | undefined = useMemo(() => {
    return event?.programs.find((p: Program) => p.id === programId);
  }, [event, programId]);

  const activity: Activity | undefined = useMemo(() => {
    return program?.activities.find((a: Activity) => a.id === activityId);
  }, [program, activityId]);

  const photos: Photo[] = useMemo(() => {
    const raw = activity?.photos ?? [];
    return [...raw].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }, [activity?.photos]);

  // =========================
  // Permissions
  // =========================
  const myLevel: PermissionLevel | null = useMemo(() => {
    if (!event || !uid) return null;
    return event.subAdminsByUid?.[uid] ?? null;
  }, [event, uid]);

  const isCreator = !!event && !!uid && event.userId === uid;
  const isSuperAdmin = myLevel === 'Super Admin';
  const isPartialAdmin = myLevel === 'Admin parcial';

  const canManage = isCreator || isSuperAdmin || isPartialAdmin;

  // =========================
  // Participant check (se você quiser usar no futuro)
  // =========================
  useEffect(() => {
    let active = true;

    async function run(): Promise<void> {
      try {
        if (!uid || !event?.id) {
          if (active) setIsParticipant(false);
          return;
        }
        const parts = (await getGuestParticipationsByUserId(
          uid,
        )) as GuestParticipation[];
        if (!active) return;
        setIsParticipant(parts.some((p) => p.eventId === event.id));
      } catch {
        if (active) setIsParticipant(false);
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [uid, event?.id, getGuestParticipationsByUserId]);

  // =========================
  // Limits
  // =========================
  const myPhotosCount = useMemo<number>(() => {
    if (!uid) return 0;
    return photos.filter((p) => p.createdByUid === uid).length;
  }, [photos, uid]);

  const reachedMyLimit = myPhotosCount >= MAX_PHOTOS_PER_USER_PER_ACTIVITY;

  // =========================
  // Initial refetch
  // =========================
  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      if (!id) return;
      setInitialLoading(true);
      try {
        await refetchEventById(id);
      } finally {
        if (active) setInitialLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id, refetchEventById]);

  // =========================
  // Actions
  // =========================
  const handleAddPhoto = useCallback((): void => {
    if (!event || !program || !activity) return;

    if (!canManage) {
      Alert.alert(
        'Sem permissão',
        'Apenas administradores podem adicionar fotos.',
      );
      return;
    }

    if (reachedMyLimit) {
      Alert.alert(
        'Limite atingido',
        `Você já adicionou ${myPhotosCount}/${MAX_PHOTOS_PER_USER_PER_ACTIVITY} fotos nesta atividade.`,
      );
      return;
    }

    router.push({
      pathname:
        '/(stack)/events/[id]/program/[programId]/activity/[activityId]/add-photo',
      params: { id: event.id, programId: program.id, activityId: activity.id },
    });
  }, [event, program, activity, canManage, reachedMyLimit, myPhotosCount]);

  const handleDeletePhoto = useCallback(
    async (photoId: string): Promise<void> => {
      if (!event || !program || !activity) return;

      const photo = photos.find((p) => p.id === photoId);
      const isPhotoOwner = photo?.createdByUid === uid;

      if (!(canManage || isPhotoOwner)) {
        Alert.alert('Sem permissão', 'Você não pode excluir esta foto.');
        return;
      }

      setDeletingPhotoId(photoId);

      try {
        await deletePhoto(event.id, program.id, activity.id, photoId);
        await refetchEventById(event.id);
        // opcional:
        // Alert.alert('OK', 'Foto deletada com sucesso');
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : 'Erro ao excluir foto.';
        Alert.alert('Erro', message);
      } finally {
        setDeletingPhotoId(null);
      }
    },
    [
      event,
      program,
      activity,
      photos,
      uid,
      canManage,
      deletePhoto,
      refetchEventById,
    ],
  );

  // =========================
  // UI states
  // =========================
  if (initialLoading && !event) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>
          Carregando fotos...
        </Text>
      </View>
    );
  }

  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  if (!event || !program || !activity) {
    return (
      <LinearGradient
        colors={gradientColors}
        style={{ flex: 1 }}
        locations={[0, 0.6, 1]}
      >
        <SafeAreaView style={styles.centered}>
          <Text style={{ color: colors.text }}>
            Atividade ou dados não encontrados.
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPhotos }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Fotos',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {canManage && (
          <View style={styles.topBar}>
            <Text style={{ color: colors.textSecondary }}>
              Suas fotos: {myPhotosCount}/{MAX_PHOTOS_PER_USER_PER_ACTIVITY}
            </Text>

            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor:
                    deletingPhotoId || reachedMyLimit
                      ? colors.border
                      : colors.primary,
                  opacity: deletingPhotoId || reachedMyLimit ? 0.6 : 1,
                },
              ]}
              disabled={!!deletingPhotoId || reachedMyLimit}
              onPress={handleAddPhoto}
              activeOpacity={0.9}
            >
              <Text style={styles.addButtonText}>
                {reachedMyLimit
                  ? 'Limite atingido'
                  : deletingPhotoId
                    ? 'Aguarde...'
                    : 'Adicionar Foto'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {photos.length > 0 ? (
          <PhotoGallery
            eventId={event.id}
            programId={program.id}
            activityId={activity.id}
            photos={photos}
            onDeletePhoto={handleDeletePhoto}
            eventCreatorId={event.userId}
            currentUid={uid}
            isSuperAdmin={isSuperAdmin}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma foto nesta atividade ainda.
            </Text>

            {canManage && (
              <TouchableOpacity
                style={[
                  styles.addButton,
                  {
                    backgroundColor: reachedMyLimit
                      ? colors.border
                      : colors.primary,
                  },
                ]}
                disabled={reachedMyLimit}
                onPress={handleAddPhoto}
                activeOpacity={0.9}
              >
                <Text style={styles.addButtonText}>
                  {reachedMyLimit
                    ? 'Limite atingido'
                    : 'Adicionar primeira foto'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {!!deletingPhotoId && <LoadingOverlay message="Excluindo..." />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 24,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
