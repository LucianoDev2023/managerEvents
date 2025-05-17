import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { ArrowLeft, Calendar, Plus, Trash2 } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import ActivityItem from '@/components/ActivityItem';
import PhotoGallery from '@/components/PhotoGallery';
import { Event, Program } from '@/types';

export default function ProgramDetailScreen() {
  const { id, programId, activityId } = useLocalSearchParams<{
    id: string;
    programId: string;
    activityId: string;
  }>();

  const { state, deleteProgram, deletePhoto } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const event = state.events.find((e) => e.id === id) as Event | undefined;
  const program = event?.programs.find((p) => p.id === programId) as
    | Program
    | undefined;

  if (!event || !program) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Program not found',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>
            The program you're looking for doesn't exist or has been deleted.
          </Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            style={styles.goBackButton}
          />
        </View>
      </View>
    );
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handleDeleteProgram = () => {
    Alert.alert(
      'Delete Program',
      'Are you sure you want to delete this program? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProgram(event.id, program.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleAddActivity = () => {
    router.push({
      pathname: '/(stack)/events/[id]/program/[programId]/add-activity',
      params: { id: event.id, programId: program.id },
    });
  };

  const handleAddPhoto = () => {
    router.push({
      pathname:
        '/(stack)/events/[id]/program/[programId]/activity/[activityId]/add-photo',
      params: {
        id: event.id,
        programId: program.id,
        activityId: activityId, // certifique-se que activityId está acessível
      },
    });
  };

  const handlePhotoDelete = (photoId: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (activityId) {
            deletePhoto(event.id, program.id, activityId, photoId);
          } else {
            Alert.alert('Error', 'Activity ID not found.');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Detalhes da programação',
          headerTitleStyle: {
            fontFamily: 'Inter-Bold',
            fontSize: 18,
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleDeleteProgram}
              style={styles.headerButton}
            >
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[styles.header, { backgroundColor: colors.backgroundAlt }]}
        >
          <View style={styles.dateContainer}>
            <Calendar size={20} color={colors.primary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDate(program.date)}
            </Text>
          </View>

          <Text style={[styles.eventTitle, { color: colors.text }]}>
            {event.title}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Atividades
            </Text>

            <Button
              title="Add Atividade"
              size="small"
              icon={<Plus size={16} color="white" />}
              onPress={handleAddActivity}
            />
          </View>

          {program.activities.length === 0 ? (
            <View
              style={[styles.emptyContainer, { borderColor: colors.border }]}
            >
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhuma atividade registrada
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.textSecondary }]}
              >
                Adicione uma atividade e comece os registros diários
              </Text>
              {/* <Button
                title="Add Activity"
                onPress={handleAddActivity}
                icon={<Plus size={18} color="white" />}
                style={styles.addButton}
              /> */}
            </View>
          ) : (
            program.activities.map((activity) => (
              <View key={activity.id}>
                <ActivityItem
                  activity={activity}
                  eventId={event.id}
                  programId={program.id}
                  photos={program.photos.filter(
                    (p) => p.activityId === activity.id
                  )}
                />

                {/* <PhotoGallery
                  photos={program.photos.filter(
                    (p) => p.activityId === activity.id
                  )}
                  eventId={event.id}
                  programId={program.id}
                  activityId={activity.id}
                  onDeletePhoto={deletePhoto}
                  editable
                /> */}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerButton: {
    padding: 8,
  },
  header: {
    padding: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 18,
    fontFamily: 'Inter-Medium',
  },
  eventTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  emptyContainer: {
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 16,
    textAlign: 'center',
  },

  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },

  addButton: {
    width: 160,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 24,
  },
  goBackButton: {
    width: 120,
  },
});
