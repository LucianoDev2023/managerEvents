import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';

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
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@/config/firebase';
import { useAuthListener } from '@/hooks/useAuthListener';

export default function ProfileScreen() {
  const { user, authLoading } = useAuthListener();
  const { state } = useEvents();
  const router = useRouter();

  const [supportVisible, setSupportVisible] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const textColor = colorScheme === 'dark' ? '#fff' : '#1a1a1a';
  const textSecondary = colorScheme === 'dark' ? '#aaa' : '#555';
  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <View style={[styles.gradient, styles.center]}>
        <ActivityIndicator size="large" color="#6e56cf" />
      </View>
    );
  }

  const userEmail = user?.email?.toLowerCase();
  const userEvents = state.events.filter(
    (event) =>
      event.createdBy?.toLowerCase() === userEmail ||
      event.subAdmins?.some((admin) => admin.email.toLowerCase() === userEmail)
  );

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
            Alert.alert('Dados apagados', 'Todos os eventos foram removidos.');
          },
        },
      ]
    );
  };

  const displayName = user?.displayName ?? 'Usuário';

  const pluralize = (count: number, singular: string, plural: string) =>
    count <= 1 ? singular : plural;

  return (
    <LinearGradient
      colors={gradientColors}
      style={[styles.gradient, { backgroundColor: gradientColors[0] }]}
      locations={[0, 0.7, 1]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop:
              Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
          },
        ]}
      >
        <View style={styles.profileHeader}>
          <Text style={[styles.profileName, { color: textColor }]}>
            {displayName}
          </Text>
          <Text style={[styles.profileEmail, { color: textColor }]}>
            {userEmail}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.statNumber}>{totalEvents}</Text>
            <Text style={styles.statLabel}>
              {pluralize(totalEvents, 'Evento', 'Eventos')}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primary2 }]}>
            <Text style={styles.statNumber}>{totalPrograms}</Text>
            <Text style={styles.statLabel}>
              {pluralize(totalPrograms, 'Programa', 'Programas')}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primary2 }]}>
            <Text style={styles.statNumber}>{totalActivities}</Text>
            <Text style={styles.statLabel}>
              {pluralize(totalActivities, 'Atividade', 'Atividades')}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.statNumber}>{totalPhotos}</Text>
            <Text style={styles.statLabel}>
              {pluralize(totalPhotos, 'Foto', 'Fotos')}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Controle
        </Text>
        <View style={styles.card}>
          <Button
            title="Meus eventos"
            icon={<Settings size={24} color={textColor} />}
            onPress={() => router.push('/(stack)/myevents')}
            variant="ghost"
            fullWidth
            style={styles.menuButton}
            textStyle={{ color: textColor }}
          />
          <Button
            title="Notificações"
            icon={<Bell size={20} color={textColor} />}
            onPress={() => {}}
            variant="ghost"
            fullWidth
            style={styles.menuButton}
            textStyle={{ color: textColor }}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: textColor }]}>Suporte</Text>
        <View style={styles.card}>
          <Button
            title="Ajuda e Suporte"
            icon={<HelpCircle size={20} color={textColor} />}
            onPress={() => setSupportVisible(true)}
            variant="ghost"
            fullWidth
            style={styles.menuButton}
            textStyle={{ color: textColor }}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: textColor }]}>Conta</Text>
        <View style={styles.card}>
          <Button
            title="Limpar Tudo"
            icon={<Trash2 size={20} color="#f44336" />}
            onPress={handleClearData}
            variant="ghost"
            fullWidth
            style={styles.menuButton}
            textStyle={{ color: '#f44336' }}
          />
          <Button
            title="Sair da Conta"
            icon={<LogOut size={20} color="#f44336" />}
            onPress={handleLogout}
            variant="ghost"
            fullWidth
            style={styles.menuButton}
            textStyle={{ color: '#f44336' }}
          />
        </View>

        <Text style={[styles.versionText, { color: textSecondary }]}>
          Versão 1.0.0
        </Text>
      </ScrollView>

      <Modal visible={supportVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Ajuda e Suporte
            </Text>
            <Text style={{ color: colors.text, marginBottom: 20 }}>
              Em caso de dúvidas, entre em contato:
            </Text>
            <Text
              selectable
              style={{
                color: colors.primary,
                fontWeight: 'bold',
                fontSize: 16,
              }}
            >
              planejejasuporte@gmail.com
            </Text>
            <Button
              title="Fechar"
              onPress={() => setSupportVisible(false)}
              style={{ backgroundColor: colors.primary, marginTop: 24 }}
              textStyle={{ color: '#fff' }}
            />
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, backgroundColor: '#0b0b0f' },
  center: { justifyContent: 'center', alignItems: 'center' },
  contentContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  profileHeader: { alignItems: 'flex-start', marginBottom: 20 },
  profileName: { fontSize: 24, fontFamily: 'Inter-Bold', marginBottom: 4 },
  profileEmail: { fontSize: 16, fontFamily: 'Inter-Regular' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  statCard: {
    width: '48%',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#666',
  },
  statNumber: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: { color: 'white', fontSize: 14, fontFamily: 'Inter-Medium' },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginTop: 8,
    marginBottom: 12,
  },
  menuButton: { justifyContent: 'flex-start', paddingVertical: 12 },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 30,
    marginBottom: 4,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    elevation: 0,
    shadowColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
});
