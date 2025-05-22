import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';

import Colors from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

import {
  Settings,
  Moon,
  Sun,
  LogOut,
  Trash2,
  CircleHelp as HelpCircle,
  Bell,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const { state } = useEvents();
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;

  const userEmail = user?.email?.toLowerCase();
  const userEvents = state.events.filter(
    (event) => event.createdBy?.toLowerCase() === userEmail
  );

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const totalEvents = userEvents.length;
  const totalPrograms = userEvents.reduce(
    (sum, e) => sum + e.programs.length,
    0
  );
  const totalActivities = userEvents.reduce(
    (sum, e) =>
      sum + e.programs.reduce((pSum, p) => pSum + p.activities.length, 0),
    0
  );
  const totalPhotos = userEvents.reduce(
    (sum, e) =>
      sum +
      e.programs.reduce(
        (pSum, p) =>
          pSum +
          p.activities.reduce((aSum, a) => aSum + (a.photos?.length ?? 0), 0),
        0
      ),
    0
  );

  const handleThemeToggle = () => {
    Alert.alert(
      'Tema',
      'Aqui você pode alternar entre tema claro e escuro (não implementado).',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Deseja mesmo sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/login');
          } catch (error) {
            Alert.alert('Erro ao sair', (error as any).message);
          }
        },
      },
    ]);
  };

  const handleClearData = () => {
    Alert.alert(
      'Limpar tudo?',
      'Isso excluirá todos os eventos e programas permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir tudo',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Dados apagados',
              'Todos os eventos e programas foram removidos.'
            );
          },
        },
      ]
    );
  };

  const displayName = user?.displayName ?? 'Usuário';
  const email = user?.email ?? 'sem email';

  const pluralize = (count: number, singular: string, plural: string) =>
    count <= 1 ? singular : plural;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.profileHeader}>
        <Text style={[styles.profileName, { color: colors.text }]}>
          {displayName}
        </Text>
        <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
          {email}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.statNumber}>{totalEvents}</Text>
          <Text style={styles.statLabel}>
            {pluralize(totalEvents, 'Evento', 'Eventos')}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.secondary }]}>
          <Text style={styles.statNumber}>{totalPrograms}</Text>
          <Text style={styles.statLabel}>
            {pluralize(totalPrograms, 'Programa', 'Programas')}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
          <Text style={styles.statNumber}>{totalActivities}</Text>
          <Text style={styles.statLabel}>
            {pluralize(totalActivities, 'Atividade', 'Atividades')}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#f39c12' }]}>
          <Text style={styles.statNumber}>{totalPhotos}</Text>
          <Text style={styles.statLabel}>
            {pluralize(totalPhotos, 'Foto', 'Fotos')}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Preferências
      </Text>

      <Card>
        <Button
          title="Meu eventos"
          icon={<Settings size={24} color={colors.text} />}
          onPress={() => router.push('/(stack)/myevents')}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.text }}
        />

        <Button
          title={`Tema: ${colorScheme === 'dark' ? 'Escuro' : 'Claro'}`}
          icon={
            colorScheme === 'dark' ? (
              <Moon size={20} color={colors.text} />
            ) : (
              <Sun size={20} color={colors.text} />
            )
          }
          onPress={handleThemeToggle}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.text }}
        />

        <Button
          title="Notificações"
          icon={<Bell size={20} color={colors.text} />}
          onPress={() => {}}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.text }}
        />
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Suporte</Text>

      <Card>
        <Button
          title="Ajuda e Suporte"
          icon={<HelpCircle size={20} color={colors.text} />}
          onPress={() => {}}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.text }}
        />
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Conta</Text>

      <Card>
        <Button
          title="Limpar Tudo"
          icon={<Trash2 size={20} color={colors.error} />}
          onPress={handleClearData}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.error }}
        />

        <Button
          title="Sair da Conta"
          icon={<LogOut size={20} color={colors.error} />}
          onPress={handleLogout}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.error }}
        />
      </Card>

      <Text style={[styles.versionText, { color: colors.textSecondary }]}>
        Versão 1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },

  profileName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  statNumber: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginTop: 8,
    marginBottom: 12,
  },
  menuButton: {
    justifyContent: 'flex-start',
    paddingVertical: 12,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 24,
    marginBottom: 16,
  },
});
