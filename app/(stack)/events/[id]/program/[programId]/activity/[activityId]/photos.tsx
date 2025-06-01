import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import PhotoGallery from '@/components/PhotoGallery';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import LoadingOverlay from '@/components/LoadingOverlay';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ActivityPhotosScreen() {
  const { id, programId, activityId } = useLocalSearchParams<{
    id: string;
    programId: string;
    activityId: string;
  }>();

  const { state, deletePhoto } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const event = state.events.find((e) => e.id === id);
  const program = event?.programs.find((p) => p.id === programId);
  const activity = program?.activities.find((a) => a.id === activityId);
  const photos = activity?.photos ?? [];

  const authUser = getAuth().currentUser;
  const userEmail = authUser?.email?.toLowerCase() ?? '';
  const isCreator = event?.createdBy?.toLowerCase() === userEmail;

  if (!event || !program || !activity) {
    return (
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['#0b0b0f', '#1b0033', '#3e1d73']
            : ['#ffffff', '#f0f0ff', '#e9e6ff']
        }
        style={{ flex: 1 }}
        locations={[0, 0.6, 1]}
      >
        <SafeAreaView style={styles.container}>
          <Text
            style={{ color: colors.text, textAlign: 'center', marginTop: 40 }}
          >
            Atividade ou dados não encontrados.
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const handleDeletePhoto = async ({
    id,
    publicId,
  }: {
    id: string;
    publicId: string;
  }) => {
    setDeletingPhotoId(id);
    try {
      await deletePhoto(event.id, program.id, id);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <LinearGradient
      colors={
        colorScheme === 'dark'
          ? ['#0b0b0f', '#1b0033', '#3e1d73']
          : ['#ffffff', '#f0f0ff', '#e9e6ff']
      }
      style={{ flex: 1 }}
      locations={[0, 0.6, 1]}
    >
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Fotos',
            headerTitleStyle: { fontFamily: 'Inter-Bold', fontSize: 18 },
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ padding: 8 }}
              >
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {photos.length > 0 ? (
            <View style={{ position: 'relative', flex: 1 }}>
              <PhotoGallery
                photos={photos}
                eventId={event.id}
                programId={program.id}
                activityId={activity.id}
                editable
                onDeletePhoto={handleDeletePhoto}
                deletingPhotoId={deletingPhotoId}
                isCreator={isCreator}
              />

              {deletingPhotoId && <LoadingOverlay message="Excluindo..." />}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Essa atividade ainda não possui fotos.
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() =>
                  router.push({
                    pathname:
                      '/events/[id]/program/[programId]/activity/[activityId]/add-photo',
                    params: {
                      id: event.id,
                      programId: program.id,
                      activityId: activity.id,
                    },
                  })
                }
              >
                <Text style={styles.addButtonText}>Adicionar Foto</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 60,
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
});
