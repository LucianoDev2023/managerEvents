import React, { useState } from 'react';
import { Image } from 'react-native';

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
import {
  CalendarDays,
  MapPin,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
} from 'lucide-react-native';
import ProgramItem from '@/components/ProgramItem';
import Button from '@/components/ui/Button';
import { Event } from '@/types';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, deleteEvent, addProgram } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [isAddingProgram, setIsAddingProgram] = useState(false);

  const event = state.events.find((e) => e.id === id) as Event | undefined;

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Evento não encontrado',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>
            O evento não existe ou foi deletado.
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

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const startFormatted = start.toLocaleDateString('en-US', options);
    const endFormatted = end.toLocaleDateString('en-US', options);

    if (startFormatted === endFormatted) {
      return startFormatted;
    }

    return `${startFormatted} - ${endFormatted}`;
  };

  const handleEditEvent = () => {
    // In a real app, navigate to edit screen
    router.push({
      pathname: `/(stack)/events/[id]/edit_event`,
      params: { id: event.id },
    });
    console.log(id);
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      'Deletar evento',
      'Você tem certeza que deseja excluir? Essa ação não poderá ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: () => {
            deleteEvent(event.id);
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleAddProgram = () => {
    setIsAddingProgram(true);

    // Add a new program with today's date
    // In a real app, you'd show a date picker
    addProgram(event.id, new Date());

    setTimeout(() => {
      setIsAddingProgram(false);
    }, 500);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Detalhes do evento',
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
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleEditEvent}
                style={styles.headerButton}
              >
                <Edit size={20} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteEvent}
                style={styles.headerButton}
              >
                <Trash2 size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.eventHeader,
            {
              backgroundColor: colors.backgroundAlt,
              borderColor: colorScheme === 'dark' ? '#333' : '#ccc',
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.eventTitle, { color: colors.text }]}>
              {event.title}
            </Text>

            <View style={styles.eventMeta}>
              <View style={styles.metaItem}>
                <CalendarDays size={18} color={colors.primary} />
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  {formatDateRange(event.startDate, event.endDate)}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <MapPin size={18} color={colors.primary} />
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  {event.location}
                </Text>
              </View>
            </View>

            {event.description && (
              <Text style={[styles.description, { color: colors.text }]}>
                Descrição: {event.description}
              </Text>
            )}
          </View>

          <Image
            source={require('@/assets/images/splash1.png')}
            style={styles.eventImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.programsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Programação diária
            </Text>

            <Button
              title="Add Dia"
              size="small"
              icon={<Plus size={16} color="white" />}
              onPress={handleAddProgram}
              loading={isAddingProgram}
            />
          </View>

          {event.programs.length === 0 ? (
            <View
              style={[styles.emptyPrograms, { borderColor: colors.border }]}
            >
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Evento ainda sem programação
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.textSecondary }]}
              >
                Adicione um dia e depois inicie o planejamento referente ao dia
                do seu evento
              </Text>
              {/* <Button
                title="Add programa"
                onPress={handleAddProgram}
                icon={<Plus size={18} color="white" />}
                style={styles.addProgramButton}
              /> */}
            </View>
          ) : (
            event.programs.map((program) => (
              <ProgramItem
                key={program.id}
                program={program}
                eventId={event.id}
              />
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
  headerActions: {
    flexDirection: 'row',
  },
  eventHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    // margin: 16,
    borderWidth: 1,
  },
  eventTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  eventMeta: {
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  programsSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  emptyPrograms: {
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  addProgramButton: {
    width: 180,
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

  eventImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginLeft: 12,
  },
});
