import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Image as ImageIcon } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import PhotoGallery from '@/components/PhotoGallery';
import LoadingOverlay from '@/components/LoadingOverlay';
import Colors from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import type { Event, Program, Activity, Photo, PermissionLevel } from '@/types';

const MAX_PHOTOS_ADMIN = 5;
const MAX_PHOTOS_GUEST = 3;

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

const PhotoSkeleton = () => {
    const colorScheme = useColorScheme() ?? 'dark';
    const colors = Colors[colorScheme];

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Skeleton width={100} height={20} />
                <Skeleton width={120} height={40} borderRadius={10} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} width="31%" style={{ aspectRatio: 1 }} borderRadius={8} />
                ))}
            </View>
        </View>
    );
};

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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

  const myLimit = canManage ? MAX_PHOTOS_ADMIN : MAX_PHOTOS_GUEST;
  const reachedMyLimit = myPhotosCount >= myLimit;

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
        `Você já adicionou ${myPhotosCount}/${myLimit} fotos nesta atividade.`,
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
    async (photoId: string, publicId?: string): Promise<void> => {
      if (!event || !program || !activity) return;

      const photo = photos.find((p) => p.id === photoId);
      const isPhotoOwner = photo?.createdByUid === uid;

      if (!(canManage || isPhotoOwner)) {
        Alert.alert('Sem permissão', 'Você não pode excluir esta foto.');
        return;
      }

      setDeletingPhotoId(photoId);

      try {
        await deletePhoto(event.id, program.id, activity.id, photoId, publicId);
        await refetchEventById(event.id);
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
    const loadingGradientColors =
      colorScheme === 'dark'
        ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
        : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

    return (
        <LinearGradient colors={loadingGradientColors} style={{ flex: 1 }} locations={[0, 0.6, 1]}>
             <SafeAreaView style={{ flex: 1 }}>
                <Stack.Screen options={{ headerTitle: 'Fotos' }} />
                <PhotoSkeleton />
             </SafeAreaView>
        </LinearGradient>
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
          headerTitle: 'Galeria de Fotos',
          headerTitleStyle: { fontFamily: 'Inter-Bold', fontSize: 17 },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
                 <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'Inter-Medium' }}>
                    {myPhotosCount}/{myLimit} fotos
                 </Text>
            </View>
          )
        }}
      />


      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >

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
            <ImageIcon size={64} color={colors.textSecondary} opacity={0.2} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma foto nesta atividade ainda. Faça o primeiro registro!
            </Text>
          </View>
        )}
      </ScrollView>

      {(canManage || isParticipant) && !isKeyboardVisible && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: reachedMyLimit ? colors.border : colors.primary,
              shadowColor: colors.primary,
            },
          ]}
          disabled={reachedMyLimit || !!deletingPhotoId}
          onPress={handleAddPhoto}
          activeOpacity={0.8}
        >
          {deletingPhotoId ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Plus size={24} color="#fff" />
              <Text style={styles.fabText}>
                {reachedMyLimit ? 'Limite' : 'Foto'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

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
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});
