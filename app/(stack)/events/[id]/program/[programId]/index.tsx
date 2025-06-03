import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { ArrowLeft, Calendar, Plus, Trash2 } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import ActivityItem from '@/components/ActivityItem';
import { Event, Program } from '@/types';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProgramDetailScreen() {
  const { id, programId } = useLocalSearchParams<{
    id: string;
    programId: string;
  }>();

  const { state, deleteProgram, refetchEventById } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (id) refetchEventById(id);
  }, [id]);

  const event = state.events.find((e) => e.id === id) as Event | undefined;
  const program = event?.programs.find((p) => p.id === programId) as
    | Program
    | undefined;

  const authUser = getAuth().currentUser;
  const userEmail = authUser?.email?.toLowerCase() ?? '';
  const isCreator = event?.createdBy?.toLowerCase() === userEmail;
  const isSubAdmin = event?.subAdmins?.some(
    (admin) =>
      admin.email.toLowerCase() === userEmail &&
      (admin.level.toLowerCase() === 'super admin' ||
        admin.level.toLowerCase() === 'admin parcial')
  );
  const hasPermission = isCreator || isSubAdmin;

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
            O programa não foi encontrado.
          </Text>
          <Button title="Voltar" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDeleteProgram = () => {
    Alert.alert(
      'Excluir Programação',
      'Tem certeza que deseja excluir esta programação? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
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

  return (
    <LinearGradient
      colors={
        colorScheme === 'dark'
          ? ['#0b0b0f', '#1b0033', '#3e1d73']
          : ['#ffffff', '#f0f0ff', '#e9e6ff']
      }
      style={styles.container}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Detalhes da Programação',
          headerTitleStyle: {
            fontFamily: 'Inter-Bold',
            fontSize: 18,
            color: colors.text,
          },
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            hasPermission ? (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleDeleteProgram}
              >
                <Trash2 size={20} color={colors.error} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
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
            {hasPermission && (
              <Button
                title="Adicionar"
                size="small"
                icon={<Plus size={16} color="#fff" />}
                onPress={handleAddActivity}
              />
            )}
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
                Adicione as atividades e suas fotos
              </Text>
            </View>
          ) : (
            program.activities
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((activity) => (
                <Animated.View key={activity.id} style={styles.activityCard}>
                  <ActivityItem
                    activity={activity}
                    eventId={event.id}
                    programId={program.id}
                    createdBy={event.createdBy}
                    subAdmins={event.subAdmins}
                  />
                </Animated.View>
              ))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32, paddingTop: 100 },
  headerButton: { padding: 12 },
  card: {
    backgroundColor: 'rgba(87, 6, 6, 0.05)',
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  eventTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  section: { marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  emptyContainer: {
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  activityCard: {
    marginBottom: 2,
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
});
