import React, { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUpdatedEvent = async () => {
      setIsLoading(true);
      await refetchEventById(id);
      setIsLoading(false);
    };
    fetchUpdatedEvent();
  }, [id]);

  const event = state.events.find((e) => e.id === id);
  const program = event?.programs.find((p) => p.id === programId);
  const activity = program?.activities.find((a) => a.id === activityId);
  const photos = activity?.photos ?? [];

  const authUser = getAuth().currentUser;
  const userEmail = authUser?.email?.toLowerCase() ?? '';
  const isCreator = event?.createdBy?.toLowerCase() === userEmail;
  console.log('activity.photos para debugar:', activity?.photos);

  if (isLoading) {
    return (
      <View style={styles.centeredContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={[
            styles.emptyText,
            { color: colors.textSecondary, marginTop: 12 },
          ]}
        >
          Carregando programação...
        </Text>
      </View>
    );
  }

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

  const handleDeletePhoto = async (photo: { id: string; publicId: string }) => {
    setDeletingPhotoId(photo.id);
    try {
      await deletePhoto(event.id, program.id, photo.id);
      await refetchEventById(event.id); // atualiza a lista após exclusão
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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

      <ScrollView
        contentContainerStyle={{
          padding: 0,
          paddingBottom: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {photos.length > 0 ? (
          <PhotoGallery
            photos={photos}
            eventId={event.id}
            programId={program.id}
            activityId={activity.id}
            editable
            isCreator={isCreator}
            onDeletePhoto={handleDeletePhoto}
            deletingPhotoId={deletingPhotoId}
            refetchEventById={() => refetchEventById(event.id)}
          />
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
                    '/(stack)/events/[id]/program/[programId]/activity/[activityId]/add-photo',
                  params: {
                    id: event.id,
                    programId: program.id,
                    activityId: activity.id,
                  },
                })
              }
            >
              {deletingPhotoId && <LoadingOverlay message="Excluindo..." />}
              <Text style={styles.addButtonText}>Adicionar Foto</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    backgroundColor: '#345677',
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
