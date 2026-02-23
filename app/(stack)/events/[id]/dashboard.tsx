import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme, SafeAreaView } from 'react-native';
import { useAuthListener } from '@/hooks/useAuthListener';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SolvedItemsWidget,
  DeadlinesWidget,
  FinancialSummaryWidget,
} from '@/components/admin/DashboardWidgets';
import Button from '@/components/ui/Button';
import {
  Share2,
  Plus,
  Wallet,
  CheckSquare,
  NotebookPen,
  Users,
  Shield,
  Settings,
} from 'lucide-react-native';
import DashboardCard from '@/components/DashboardCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { canManagePermissions } from '@/src/helpers/eventPermissions';

const DashboardSkeleton = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Header Skeleton */}
      <View style={{ marginTop: 8, marginBottom: 20 }}>
        <Skeleton width="80%" height={20} borderRadius={4} />
      </View>

      {/* Widgets Skeletons */}
      <View style={{ gap: 16, marginBottom: 24 }}>
        <Skeleton width="100%" height={160} borderRadius={16} />
        <Skeleton width="100%" height={120} borderRadius={16} />
        <Skeleton width="100%" height={100} borderRadius={16} />
      </View>

      {/* Grid Skeletons */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
        <Skeleton width="48%" height={130} borderRadius={16} />
        <Skeleton width="48%" height={130} borderRadius={16} />
        <Skeleton width="48%" height={130} borderRadius={16} />
        <Skeleton width="48%" height={130} borderRadius={16} />
      </View>
    </View>
  );
};

export default function EventDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, refetchEventById } = useEvents();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  // ✅ Reactive: always get the latest from context
  const event = state.events.find((e) => e.id === id);
  const { user } = useAuthListener();
  const [initialLoading, setInitialLoading] = useState(true);

  const canManage = canManagePermissions(event, user?.uid ?? null);

  useEffect(() => {
    if (id) {
      // Fetch fresh data in background, but show what we have immediately
      refetchEventById(id!).finally(() => setInitialLoading(false));
    }
  }, [id]);

  if (initialLoading && !event) {
    return (
      <LinearGradient
        colors={colors.gradients}
        style={{ flex: 1 }}
        locations={[0, 0.7, 1]}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ title: 'Gerenciamento' }} />
          <DashboardSkeleton />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Evento não encontrado</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={colors.gradients}
      style={{ flex: 1 }}
      locations={[0, 0.7, 1]}
    >
      <Stack.Screen
        options={{
          title: 'Gerenciamento',
        }}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Descriptive Header */}
        <View style={{ paddingHorizontal: 4, marginBottom: 16 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Inter-Medium' }}>
            Gerencie todos os aspectos do seu evento em um só lugar:
          </Text>
        </View>

        {/* Widgets Principais */}
        <View style={styles.section}>
          {/* 1. Resumo Financeiro */}
          <FinancialSummaryWidget
            financials={event.financials}
            targetBudget={event.targetBudget}
          />

          {/* 2. Prazos Próximos */}
          <DeadlinesWidget tasks={event.tasks} financials={event.financials} />
        </View>

        <View style={styles.section}>
          {/* 3. Tarefas / Itens Solucionados */}
          <SolvedItemsWidget tasks={event.tasks} />

          {/* 4. Buffet */}
        </View>

        {/* Action Buttons Grid */}
        <View style={styles.grid}>
          {/* 1. Financeiro */}
          <DashboardCard
            title="Financeiro"
            subtitle="Orçamento e gastos"
            icon={Wallet}
            color="#4ECDC4" // Turquesa
            onPress={() =>
              router.push(`/(stack)/events/${id}/financials` as any)
            }
            delay={100}
            style={{ width: '48%', flex: 0 }}
            height={130}
            verticalAlign="flex-start"
          />

          {/* 2. Tarefas */}
          <DashboardCard
            title="Tarefas"
            subtitle="Checklist e prazos"
            icon={CheckSquare}
            color="#A18CD1" // Roxo suave
            onPress={() => router.push(`/(stack)/events/${id}/tasks` as any)}
            delay={200}
            style={{ width: '48%', flex: 0 }}
            height={130}
            verticalAlign="flex-start"
          />

          {/* 3. Anotações */}
          <DashboardCard
            title="Anotações"
            subtitle="Ideias e notas"
            icon={NotebookPen}
            color="#FFE66D" // Amarelo
            onPress={() =>
              router.push(
                `/(stack)/events/${id}/eventOrganizerNoteViewScreen` as any,
              )
            }
            delay={300}
            style={{ width: '48%', flex: 0 }}
            height={130}
            verticalAlign="flex-start"
          />

          {/* 4. Convidados */}
          <DashboardCard
            title="Convidados"
            subtitle="Lista de presença"
            icon={Users}
            color="#FF6B6B" // Coral
            onPress={() =>
              router.push(`/(stack)/events/${id}/confirmed-guests` as any)
            }
            delay={400}
            style={{ width: '48%', flex: 0 }}
            height={130}
            verticalAlign="flex-start"
          />

          {/* 5. Permissões (Só se for Super Admin / Admin do evento) */}
          {canManage && (
            <DashboardCard
              title="Permissões"
              subtitle="Administrar equipe"
              icon={Shield}
              color="#A18CD1" // Roxo
              onPress={() =>
                router.push(`/(stack)/events/${id}/permissions` as any)
              }
              delay={500}
              style={{ width: '48%', flex: 0 }}
              height={130}
              verticalAlign="flex-start"
            />
          )}

          {/* 6. Editar Evento */}
          <DashboardCard
            title="Editar Evento"
            subtitle="Alterar detalhes"
            icon={Settings}
            color="#6E56CF" // Roxo Plannix
            onPress={() =>
              router.push({
                pathname: '/(stack)/events/new',
                params: { mode: 'edit', id: event.id },
              })
            }
            delay={600}
            style={{ width: '48%', flex: 0 }}
            height={130}
            verticalAlign="flex-start"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 4,
    gap: 10,
  },
  grid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 24,
    columnGap: 10,
    justifyContent: 'space-between',
  },
});
