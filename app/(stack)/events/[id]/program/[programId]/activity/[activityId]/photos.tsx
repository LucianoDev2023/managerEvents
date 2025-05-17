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
          headerTitle: `Fotos - ${activity.title}`,
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
          <Text
            style={{
              textAlign: 'center',
              fontSize: 16,
              fontFamily: 'Inter-Regular',
              color: colors.textSecondary,
            }}
          >
            Essa atividade ainda não possui fotos.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
