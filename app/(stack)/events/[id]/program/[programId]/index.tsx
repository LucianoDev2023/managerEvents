import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { ArrowLeft, Calendar, Plus, Trash2 } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import ActivityItem from '@/components/ActivityItem';
import { Event, Program } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@/config/firebase';
import { Skeleton } from '@/components/ui/Skeleton';
import Animated, { FadeIn } from 'react-native-reanimated';
import Fonts from '@/constants/Fonts';

const ProgramSkeleton = () => {
    const colorScheme = useColorScheme() ?? 'dark';
    const colors = Colors[colorScheme];

    return (
        <View style={{ flex: 1, padding: 16, paddingTop: 100 }}>
            <Skeleton width="100%" height={100} borderRadius={16} style={{ marginBottom: 24 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 }}>
                <Skeleton width={120} height={24} />
                <Skeleton width={60} height={20} />
            </View>
            {[1, 2, 3].map(i => (
                <Skeleton key={i} width="100%" height={90} borderRadius={16} style={{ marginBottom: 12 }} />
            ))}
        </View>
    );
};

export default function ProgramDetailScreen() {
  const { id, programId } = useLocalSearchParams<{
    id: string;
    programId: string;
  }>();

  const { state, deleteProgram, refetchEventById } = useEvents();
  const lastIdRef = useRef<string | null>(null);
  const colorScheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (!id) return;
    if (lastIdRef.current === id) return;
    lastIdRef.current = id;
    refetchEventById(id);
  }, [id, refetchEventById]);

  const event = state.events.find((e) => e.id === id) as Event | undefined;
  const program = event?.programs.find((p: any) => p.id === programId) as
    | Program
    | undefined;

  const authUser = auth.currentUser;
  const myUid = authUser?.uid ?? '';

  const isCreator = (event?.userId ?? '') !== '' && event?.userId === myUid;
  const level = event?.subAdminsByUid?.[myUid]; 
  const isSubAdmin =
    level &&
    (String(level).toLowerCase() === 'super admin' ||
      String(level).toLowerCase() === 'admin parcial');

  const hasPermission = isCreator || isSubAdmin;

  const gradientColors = useMemo<[string, string, string]>(() => {
    return colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];
  }, [colorScheme]);

  if (!event || !program) {
    return (
      <LinearGradient colors={gradientColors} locations={[0, 0.7, 1]} style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: '',
            headerTransparent: true,
            headerTintColor: colors.primary,
          }}
        />
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>
            O programa não foi encontrado ou foi removido.
          </Text>
          <Button title="Voltar" onPress={() => router.back()} />
        </View>
      </LinearGradient>
    );
  }

  const formatDate = (dateValue: string | Date) => {
    const date = new Date(dateValue);
    const day = date.getDate();
    const month = date.toLocaleString('pt-BR', { month: 'long' });
    const weekday = date.toLocaleString('pt-BR', { weekday: 'long' });
    const year = date.getFullYear();

    return {
      full: `${weekday}, ${day} de ${month} de ${year}`,
      day,
      month: month.charAt(0).toUpperCase() + month.slice(1),
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    };
  };

  const dateDetails = formatDate(program.date);

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
      ],
    );
  };

  const handleAddActivity = () => {
    router.push({
      pathname: '/(stack)/events/[id]/program/[programId]/add-activity',
      params: { id: event.id, programId: program.id },
    } as any);
  };

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Programação',
          headerTransparent: true,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={colors.primary} />
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Confira todas as atividades e horários planejados para este dia:
          </Text>
        </View>

        {/* Modern Date Card */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.topCard}>
          <LinearGradient
            colors={colorScheme === 'dark' ? ['rgba(110, 86, 207, 0.15)', 'rgba(110, 86, 207, 0.05)'] : ['rgba(110, 86, 207, 0.08)', 'rgba(110, 86, 207, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.dateBanner, { borderColor: colors.primary + '20' }]}
          >
            <View style={[styles.calendarIconBg, { backgroundColor: colors.primary }]}>
              <Calendar size={28} color="white" />
            </View>
            <View style={styles.dateInfo}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Programação do Dia</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {dateDetails.full}
              </Text>
            </View>
          </LinearGradient>
          
          <View style={styles.eventContext}>
            <Text style={[styles.eventContextTitle, { color: colors.textSecondary }]}>
              Evento: {event.title}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Atividades
            </Text>
            <View style={[styles.activityCountBadge, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.activityCount, { color: colors.primary }]}>
                    {program.activities.length} {program.activities.length === 1 ? 'item' : 'itens'}
                </Text>
            </View>
          </View>

          {program.activities.length === 0 ? (
            <Animated.View entering={FadeIn.delay(200)} style={[styles.emptyContainer, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
              <View style={styles.emptyIconContainer}>
                <Calendar size={64} color={colors.textSecondary} opacity={0.2} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                Nenhuma atividade ainda
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Este dia ainda não tem atividades planejadas. Que tal começar a preencher agora?
              </Text>
              {hasPermission && (
                <Button 
                  title="Criar Primeira Atividade" 
                  onPress={handleAddActivity}
                  style={{ marginTop: 24, paddingHorizontal: 24 }}
                />
              )}
            </Animated.View>
          ) : (
            <View style={styles.activityList}>
              {program.activities
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    eventId={event.id}
                    programId={program.id}
                    creatorUid={event.userId}
                    subAdminsByUid={event.subAdminsByUid}
                    programDate={program.date}
                  />
                ))
              }
            </View>
          )}
        </View>
        
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action Button */}
      {hasPermission && program.activities.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleAddActivity}
          activeOpacity={0.8}
        >
          <Plus size={24} color="white" />
          <Text style={styles.fabText}>Nova Atividade</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 100 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18 },
  headerButton: { padding: 8, marginHorizontal: 4 },
  
  introSection: { paddingHorizontal: 20, marginBottom: 20 },
  introText: { fontSize: 14, fontFamily: Fonts.medium, lineHeight: 20, opacity: 0.8 },

  topCard: {
    marginHorizontal: 16,
    marginBottom: 28,
  },
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  calendarIconBg: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    opacity: 0.7,
  },
  dateValue: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    textTransform: 'capitalize',
    lineHeight: 22,
  },
  eventContext: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  eventContextTitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    fontStyle: 'italic',
  },

  section: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
  },
  activityCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activityCount: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  activityList: {
    gap: 0,
  },
  emptyContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.6,
    paddingHorizontal: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    gap: 10,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notFoundText: {
    fontSize: 17,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginBottom: 24,
  },
});
