import React, { useEffect, useMemo, useRef, useState } from 'react';
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

import PhotoGallery from '@/components/PhotoGallery';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import LoadingOverlay from '@/components/LoadingOverlay';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '@/context/EventsContext';
import type { PermissionLevel } from '@/types';

export default function ActivityPhotosScreen() {
  const { id, programId, activityId } = useLocalSearchParams<{
    id: string;
    programId: string;
    activityId: string;
  }>();

  const { state, deletePhoto, refetchEventById } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const uid = getAuth().currentUser?.uid ?? '';

  const event = useMemo(
    () => state.events.find((e) => e.id === id),
    [state.events, id]
  );
  const program = useMemo(
    () => event?.programs.find((p) => p.id === programId),
    [event, programId]
  );
  const activity = useMemo(
    () => program?.activities.find((a) => a.id === activityId),
    [program, activityId]
  );
  const photos = activity?.photos ?? [];

  // ✅ novo padrão de permissão: UID
  const myLevel: PermissionLevel | null = useMemo(() => {
    if (!event || !uid) return null;
    return (event.subAdminsByUid?.[uid] as PermissionLevel | undefined) ?? null;
  }, [event, uid]);

  useEffect(() => {
    let cancelled = false;

    const fetchUpdatedEvent = async () => {
      if (!id || isFetchingRef.current) return;

      isFetchingRef.current = true;

      try {
        // 👇 só mostra loading se ainda não tem evento
        if (!event) setInitialLoading(true);

        await refetchEventById(id);
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          isFetchingRef.current = false;
        }
      }
    };

    fetchUpdatedEvent();

    return () => {
      cancelled = true;
    };
  }, [id]); // ⚠️ REMOVE refetchEventById daqui

  const isCreator = !!event && !!uid && event.userId === uid;
  const isSuperAdmin = isCreator || myLevel === 'Super Admin';

  // regra de deleção (você pode ajustar)
  const canDeletePhotos = isSuperAdmin;

  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  if (initialLoading && !event) {
    return (
      <View style={styles.centeredContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>
          Carregando fotos...
        </Text>
      </View>
    );
  }

  if (!event || !program || !activity) {
    return (
      <LinearGradient
        colors={gradientColors}
        style={{ flex: 1 }}
        locations={[0, 0.6, 1]}
      >
        <SafeAreaView style={styles.notFoundContainer}>
          <Text
            style={{ color: colors.text, textAlign: 'center', marginTop: 40 }}
          >
            Atividade ou dados não encontrados.
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const handleDeletePhoto = async (photoId: string, publicId?: string) => {
    // ✅ Permissão robusta:
    // - super admin
    // - criador do evento
    // - criador da foto (se conseguir localizar)
    const photo = photos.find((p) => p.id === photoId);
    const isPhotoCreator = !!photo && photo.createdBy === uid;
    const isEventCreator = event.userId === uid;

    const canDelete = isSuperAdmin || isEventCreator || isPhotoCreator;

    if (!canDelete) {
      Alert.alert(
        'Sem permissão',
        'Apenas o criador do evento, o criador da foto ou Super Admin pode excluir fotos.'
      );
      return;
    }

    setDeletingPhotoId(photoId);

    try {
      await deletePhoto(event.id, program.id, activity.id, photoId);

      // (Opcional) se você também apaga no Cloudinary e tiver função pra isso, use publicId aqui.
      // if (publicId) await deleteFromCloudinary(publicId);

      Alert.alert('OK', 'Foto deletada com sucesso');
      await refetchEventById(event.id);
    } catch (e: any) {
      Alert.alert('Erro ao deletar', e?.message ?? String(e));
    } finally {
      setDeletingPhotoId(null);
    }
  };
  const isDeleting = !!deletingPhotoId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
        {photos.length > 0 ? (
          <PhotoGallery
            eventId={id}
            programId={programId}
            activityId={activityId}
            photos={photos}
            onDeletePhoto={handleDeletePhoto}
            eventCreatorId={event.userId} // ✅ dono do evento
            currentUid={uid} // ✅ uid logado
            isSuperAdmin={isSuperAdmin} // ✅ super admin calculado
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {isDeleting ? '' : 'Essa atividade ainda não possui fotos.'}
            </Text>

            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: isDeleting ? colors.border : colors.primary,
                  opacity: isDeleting ? 0.6 : 1,
                },
              ]}
              disabled={isDeleting}
              onPress={() => {
                if (isDeleting) return;

                router.push({
                  pathname:
                    '/(stack)/events/[id]/program/[programId]/activity/[activityId]/add-photo',
                  params: {
                    id: event.id,
                    programId: program.id,
                    activityId: activity.id,
                  },
                });
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.addButtonText}>
                {isDeleting ? 'Excluindo foto...' : 'Adicionar Foto'}
              </Text>
            </TouchableOpacity>

            {isDeleting && <LoadingOverlay message="Excluindo..." />}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  notFoundContainer: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
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
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
