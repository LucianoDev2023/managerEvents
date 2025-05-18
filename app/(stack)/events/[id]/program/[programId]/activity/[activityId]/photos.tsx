import React from 'react';
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

export default function ActivityPhotosScreen() {
  const { id, programId, activityId } = useLocalSearchParams<{
    id: string;
    programId: string;
    activityId: string;
  }>();

  const { state, deletePhoto } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const event = state.events.find((e) => e.id === id);
  const program = event?.programs.find((p) => p.id === programId);
  const activity = program?.activities.find((a) => a.id === activityId);
  const photos = activity?.photos ?? [];

  if (!event || !program || !activity) {
    return (
      <View style={styles.container}>
        <Text>Atividade ou dados não encontrados.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Fotos',
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
          <PhotoGallery
            photos={photos}
            eventId={event.id}
            programId={program.id}
            activityId={activity.id}
            editable
            onDeletePhoto={({ id, publicId }) =>
              deletePhoto(event.id, program.id, id)
            }
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
    </View>
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
    borderRadius: 8,
  },

  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});
