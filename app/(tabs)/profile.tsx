import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Pressable,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { Bell, HeartHandshake } from 'lucide-react-native';
import { BackHandler } from 'react-native';
import Animated from 'react-native-reanimated';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { useGuestEvents } from '@/hooks/useGuestEvents';

import Colors from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import Button from '@/components/ui/Button';

import {
  Settings,
  LogOut,
  Trash2,
  CircleHelp as HelpCircle,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@/config/firebase';
import { useAuthListener } from '@/hooks/useAuthListener';
import LottieView from 'lottie-react-native';
import {
  getGuestParticipationsByEmail,
  GuestParticipation,
} from '@/config/guestParticipation.ts';

export default function ProfileScreen() {
  const { user, authLoading } = useAuthListener();
  const { state } = useEvents();
  const router = useRouter();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { guestEvents } = useGuestEvents();

  const [supportVisible, setSupportVisible] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const textColor = colorScheme === 'dark' ? '#fff' : '#1a1a1a';
  const textSecondary = colorScheme === 'dark' ? '#aaa' : '#555';
  const backgroundColor = colorScheme === 'dark' ? '#0b0b0f' : '#e9e6ff';
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoadingEvents(false);
    }, 10000); // 10 segundos

    if (state.events.length > 0) {
      setIsLoadingEvents(false); // já carregou
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [state.events]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (supportVisible) {
          setSupportVisible(false); // Fecha o modal se estiver aberto
          return true; // Impede o comportamento padrão
        }

        router.back(); // Voltar para a tela anterior
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [supportVisible])
  );

  const [participations, setParticipations] = useState<GuestParticipation[]>(
    []
  );
  const [loadingParticipations, setLoadingParticipations] = useState(true);
  const userEmail = user?.email?.toLowerCase();

  useEffect(() => {
    if (!userEmail) return;

    const fetch = async () => {
      const data = await getGuestParticipationsByEmail(userEmail);
      setParticipations(data);
      setLoadingParticipations(false);
    };

    fetch();
  }, [userEmail]);

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

  // Eventos criados ou administrados
  const createdOrAdminEvents = state.events.filter(
    (event) =>
      event.createdBy?.toLowerCase() === userEmail ||
      event.subAdmins?.some((admin) => admin.email.toLowerCase() === userEmail)
  );

  // Eventos em que o usuário participa
  const participantEvents = guestEvents.filter((event) =>
    participations.some(
      (p) =>
        p.eventId === event.id &&
        p.userEmail.toLowerCase() === userEmail &&
        (p.mode === 'confirmado' || p.mode === 'acompanhando')
    )
  );

  const allAccessibleEvents = [
    ...createdOrAdminEvents,
    ...participantEvents.filter(
      (event) => !createdOrAdminEvents.some((e) => e.id === event.id)
    ),
  ];

  const followedEvents = guestEvents.filter(
    (event) =>
      event.createdBy?.toLowerCase() !== userEmail &&
      !event.subAdmins?.some((admin) => admin.email.toLowerCase() === userEmail)
  );

  const totalEvents = allAccessibleEvents.length;
  const totalPrograms = allAccessibleEvents.reduce(
    (sum, e) => sum + e.programs.length,
    0
  );
  const totalActivities = allAccessibleEvents.reduce(
    (sum, e) =>
      sum + e.programs.reduce((pSum, p) => pSum + p.activities.length, 0),
    0
  );
  const totalPhotos = allAccessibleEvents.reduce(
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

  const handleGoToPermissions = (eventId: string) => {
    router.push({
      pathname: '/(stack)/permission-confirmation/[id]',
      params: { id: eventId },
    });
  };

  const displayName = user?.displayName ?? 'Usuário';

  const pluralize = (count: number, singular: string, plural: string) =>
    count <= 1 ? singular : plural;

  if (isLoadingEvents) {
    return (
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.7, 1]}
        style={styles.container}
      >
        <StatusBar
          translucent
          backgroundColor="transparent"
          style={scheme === 'dark' ? 'light' : 'dark'}
        />
        <View
          style={[
            styles.content,
            {
              paddingTop:
                Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
            },
          ]}
        >
          <View style={[styles.gradient, styles.center]}>
            <Text style={[styles.statLabel, { color: theme.text }]}>
              Atualizando perfil...
            </Text>
            <LottieView
              source={require('../../assets/images/loading.json')}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: backgroundColor }}>
      <Animated.View
        entering={FadeIn.duration(50)}
        exiting={FadeOut.duration(50)}
        style={{
          flex: 1,
          backgroundColor: gradientColors[0],
        }}
      >
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
                  Platform.OS === 'android'
                    ? RNStatusBar.currentHeight ?? 40
                    : 0,
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
              <View
                style={[styles.statCard, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.statNumber}>{totalEvents}</Text>
                <Text style={styles.statLabel}>
                  {pluralize(totalEvents, 'Evento', 'Eventos')}
                </Text>
              </View>
              <View
                style={[styles.statCard, { backgroundColor: colors.primary2 }]}
              >
                <Text style={styles.statNumber}>{totalPrograms}</Text>
                <Text style={styles.statLabel}>
                  {pluralize(totalPrograms, 'Programa', 'Programas')}
                </Text>
              </View>
              <View
                style={[styles.statCard, { backgroundColor: colors.primary2 }]}
              >
                <Text style={styles.statNumber}>{totalActivities}</Text>
                <Text style={styles.statLabel}>
                  {pluralize(totalActivities, 'Atividade', 'Atividades')}
                </Text>
              </View>
              <View
                style={[styles.statCard, { backgroundColor: colors.primary }]}
              >
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
                title="Lista de eventos"
                icon={<Settings size={20} color={textColor} />}
                onPress={() =>
                  router.push({
                    pathname: '/(stack)/myevents',
                  })
                }
                variant="ghost"
                fullWidth
                style={styles.menuButton}
                textStyle={{ color: textColor }}
              />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Administrar Permissões
              </Text>
              <View style={styles.dropdownContainer}>
                <CustomDropdown
                  items={state.events.filter((event) => {
                    const isAuthorized =
                      event.createdBy?.toLowerCase() === userEmail ||
                      event.subAdmins?.some(
                        (admin) =>
                          admin.email.toLowerCase() === userEmail &&
                          ['Super Admin', 'Admin parcial'].includes(admin.level)
                      );
                    return isAuthorized;
                  })}
                  placeholder="-- Escolha um evento --"
                  getItemLabel={(event) => event.title}
                  onSelect={(event) => {
                    router.push({
                      pathname: '/(stack)/permission-confirmation/[id]',
                      params: { id: event.id },
                    });
                  }}
                  icon={<Bell size={20} color={textColor} />}
                  backgroundColor={colors.backGroundSecondary}
                  borderColor={colors.border}
                  textColor={textColor}
                />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Suporte
            </Text>
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
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Editar acompanhantes
            </Text>
            <View style={styles.dropdownContainer}>
              <CustomDropdown
                items={participantEvents}
                placeholder="-- Escolha um evento --"
                getItemLabel={(event) => event.title}
                onSelect={(event) => {
                  router.push({
                    pathname: '/(stack)/events/[id]/edit-my-participation',
                    params: { id: event.id },
                  });
                }}
                icon={<Bell size={20} color={textColor} />}
                backgroundColor={colors.backGroundSecondary}
                borderColor={colors.border}
                textColor={textColor}
              />
              {/* {followedEvents.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Eventos que você acompanha
                  </Text>
                  <View style={styles.dropdownContainer}>
                    <CustomDropdown
                      items={followedEvents}
                      placeholder="-- Acompanhando --"
                      getItemLabel={(event) => event.title}
                      onSelect={(event) => {
                        router.push({
                          pathname: '/(stack)/events/[id]',
                          params: { id: event.id },
                        });
                      }}
                      icon={<Bell size={20} color={textColor} />}
                      backgroundColor={colors.backGroundSecondary}
                      borderColor={colors.border}
                      textColor={textColor}
                    />
                  </View>
                </>
              )} */}
            </View>

            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Conta
            </Text>
            <View style={styles.card}>
              {/* <Button
                title="Limpar Tudo"
                icon={<Trash2 size={20} color="#f44336" />}
                onPress={handleClearData}
                variant="ghost"
                fullWidth
                style={styles.menuButton}
                textStyle={{ color: '#f44336' }}
              /> */}
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
            <Button
              title="Apoiar o App 💜"
              icon={<HeartHandshake size={20} color={textColor} />}
              onPress={() => router.push('/donate')}
              variant="ghost"
              fullWidth
              style={styles.menuButton}
              textStyle={{ color: textColor }}
            />

            <Text style={[styles.versionText, { color: textSecondary }]}>
              Versão 1.0.0
            </Text>
          </ScrollView>

          <Modal visible={supportVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={gradientColors}
                style={styles.modalContent}
                locations={[0, 0.7, 1]}
              >
                <Text style={[styles.titleHelp, { color: colors.primary }]}>
                  Ajuda e Suporte
                </Text>

                <View style={styles.modalBody}>
                  <Text style={[styles.testHelp, { color: colors.text }]}>
                    🔹 <Text style={styles.bold}>Controle</Text>: acesse todos
                    os eventos aos quais você está vinculado, seja como
                    proprietário ou por permissão.
                  </Text>
                  <Text style={[styles.testHelp, { color: colors.text }]}>
                    🔹 <Text style={styles.bold}>Eventos com permissões</Text>:
                    visualize todos os eventos criados por você e gerencie as
                    permissões de outros usuários.
                  </Text>
                  <Text style={[styles.testHelp, { color: colors.text }]}>
                    💬 Em caso de dúvidas ou necessidade de suporte, entre em
                    contato com nossa equipe.
                  </Text>
                  <Text selectable style={styles.supportEmail}>
                    📩 planejejasuporte@gmail.com
                  </Text>
                  <Button
                    title="Fechar"
                    onPress={() => setSupportVisible(false)}
                    style={styles.closeButton}
                    textStyle={{ color: '#fff' }}
                  />
                </View>
              </LinearGradient>
            </View>
          </Modal>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  gradient: { flex: 1 },
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
  statLabel: { color: 'white', fontSize: 16, fontFamily: 'Inter-Medium' },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    margin: 0,
    marginTop: 8,
    marginBottom: 12,
    padding: 0,
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
    elevation: 0,
    shadowColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: '#444',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  dropdownContainer: {
    marginBottom: 24,
    marginLeft: 40,
  },
  testHelp: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left',
    fontFamily: 'Inter_400Regular',
  },
  titleHelp: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter_700Bold',
  },
  suporte: {
    marginTop: 24,
    marginBottom: 10,
  },
  lottie: {
    width: 150,
    height: 150,
  },
  modalBody: {
    width: '100%',
    marginTop: 16,
  },

  bold: {
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  supportEmail: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#facc15',
  },
  closeButton: {
    backgroundColor: '#7c3aed',
    marginTop: 20,
    width: '100%',
  },
});
