// app/(tabs)/my-events.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar,
  Alert,
  Modal,
  Pressable,
  Image,
  TextInput,
  BackHandler,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import ShareEventButton from '@/components/ShareEventButton';

import {
  MapPin,
  Share2,
  QrCode,
  KeyRound,
  HeartOff,
  Heart,
} from 'lucide-react-native';
import LoadingOverlay from '@/components/LoadingOverlay';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';
import RoleBadge from '@/components/ui/RoleBadge';
import type { Event, PermissionLevel } from '@/types/index';
import LottieView from 'lottie-react-native';
import { useFollowedEvents } from '@/hooks/useFollowedEvents';
import { useEvents } from '@/context/EventsContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

import {
  getGuestParticipationsByEmail,
  getGuestParticipationsByEventId,
} from '@/hooks/guestService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MyEventsScreen() {
  const [invitedEvents, setInvitedEvents] = useState<Event[]>([]);
  const [allUserEvents, setAllUserEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const {
    toggleFollowEvent,
    isFollowing,
    followedEvents,
    removeFollowedEvent,
  } = useFollowedEvents();

  const router = useRouter();
  const { state, updateEvent } = useEvents();
  const auth = getAuth();
  const userEmail = auth.currentUser?.email?.toLowerCase();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  // const [isLoading, setIsLoading] = useState(false);

  // useEffect(() => {
  //   const timeout = setTimeout(() => {
  //     setIsLoading(false); // garante encerramento após X tempo
  //   }, 8000);

  //   if (state.events) {
  //     setIsLoading(false);
  //     clearTimeout(timeout);
  //   }

  //   return () => clearTimeout(timeout);
  // }, [state.events]);

  const [qrVisible, setQrVisible] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const qrRef = useRef<ViewShot>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [permissionEmail, setPermissionEmail] = useState('');
  const [permissionLevel, setPermissionLevel] =
    useState<PermissionLevel>('Admin parcial');

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  // Event handlers
  const handleNavigate = (id: string) => {
    router.push({ pathname: '/events/[id]', params: { id } });
  };
  const handleOpenGuests = async (eventId: string) => {
    try {
      const guests = await getGuestParticipationsByEventId(eventId);
      // se quiser salvar no contexto:
      // dispatch({ type: 'SET_EVENT_GUESTS', payload: { eventId, guests } });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os convidados.');
    }
  };

  const handleShareQR = async () => {
    if (!qrRef.current) return;

    try {
      const uri = await qrRef.current.capture?.();
      if (!uri) return;

      const fileUri = `${FileSystem.cacheDirectory}qr_${Date.now()}.png`;
      await FileSystem.copyAsync({ from: uri, to: fileUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Compartilhamento não disponível');
      }
    } catch (error) {
      console.error('QR Share Error:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o QR Code.');
    }
  };

  const openPermissionModal = (eventId: string) => {
    setSelectedEventId(eventId);
    setModalVisible(true);
  };

  const savePermission = () => {
    if (!permissionEmail.trim() || !selectedEventId) {
      Alert.alert('Atenção', 'Insira um email válido.');
      return;
    }

    const selectedEvent = state.events.find(
      (event) => event.id === selectedEventId
    );
    if (!selectedEvent) return;

    const creatorEmail = selectedEvent.createdBy?.toLowerCase();
    const enteredEmail = permissionEmail.trim().toLowerCase();

    if (enteredEmail === creatorEmail) {
      Alert.alert(
        'Email inválido',
        'O email inserido é o mesmo do criador do evento. Não é necessário conceder permissão.'
      );
      return;
    }

    const existingAdmin = selectedEvent.subAdmins?.find(
      (admin) => admin.email.toLowerCase() === enteredEmail
    );

    if (existingAdmin) {
      Alert.alert('Atenção', 'Este usuário já tem permissão para este evento.');
      return;
    }

    const updatedEvents = state.events.map((event) => {
      if (event.id === selectedEventId) {
        return {
          ...event,
          subAdmins: [
            ...(event.subAdmins ?? []),
            {
              email: enteredEmail,
              level: permissionLevel,
            },
          ],
        };
      }
      return event;
    });

    const updatedEvent = updatedEvents.find((e) => e.id === selectedEventId);
    if (updatedEvent) updateEvent(updatedEvent);

    setPermissionEmail('');
    setModalVisible(false);
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push('/');
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [router])
  );

  const renderEventItem = ({ item }: { item: Event }) => {
    const isCreator = item.createdBy?.toLowerCase() === userEmail;
    const subAdmin = item.subAdmins?.find(
      (admin) => admin.email.toLowerCase() === userEmail
    );
    const isAdm = subAdmin?.level === 'Super Admin';

    return (
      <AnimatedPressable
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        onPress={() => handleNavigate(item.id)}
      >
        <Animated.View style={styles.card}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: item.coverImage }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.overlay}>
              {isCreator && <RoleBadge role="Super Admin" />}
              {subAdmin && !isCreator && (
                <RoleBadge role={isAdm ? 'Super Admin' : 'Adm parcial'} />
              )}

              <Text style={styles.overlayTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.overlayLocation} numberOfLines={1}>
                {item.location}
              </Text>
              <View style={styles.eventCard}>
                <Text style={styles.overlayDesc} numberOfLines={2}>
                  {`${new Date(item.startDate).toLocaleDateString(
                    'pt-BR'
                  )} - ${new Date(item.endDate).toLocaleDateString('pt-BR')}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonsRow}>
            <Pressable
              onPress={async () => {
                await handleOpenGuests(item.id);
                router.push({
                  pathname: '/events/[id]/confirmed-guests',
                  params: { id: item.id },
                });
              }}
              style={[styles.mapBtn, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.mapBtnText, { color: colors.textSecondary }]}
              >
                Convidados
              </Text>
            </Pressable>

            {/* <Pressable
              onPress={() => {
                setQrPayload(
                  JSON.stringify({
                    eventTitle: item.title,
                    accessCode: item.accessCode,
                  })
                );
                setQrVisible(true);
              }}
              style={styles.shareBtn}
            >
              {/* <Share2 size={16} color="white" /> */}
            {/* <Text style={styles.shareBtnText}> {'Enviar '}</Text>
              <QrCode size={16} color="white" />
            </Pressable> */}
            {item.accessCode && (
              <ShareEventButton
                title={item.title}
                accessCode={item.accessCode}
                showCopyLink={false}
              />
            )}

            {isCreator || isAdm ? (
              <Button
                title="Permissão"
                size="small"
                onPress={() => openPermissionModal(item.id)}
                icon={<KeyRound size={14} color="white" />}
                style={styles.permissionBtn}
                textStyle={styles.permissionText}
              />
            ) : (
              <Pressable
                onPress={() => {
                  const wasFollowing = isFollowing(item.id);
                  toggleFollowEvent(item);

                  if (wasFollowing) {
                    Alert.alert('Removido', 'Você deixou de seguir o evento.');
                  } else {
                    Alert.alert(
                      'Sucesso',
                      'Você está agora seguindo este evento e poderá acompanhar no menu principal,"Seguindo"'
                    );
                  }
                }}
                style={styles.permissionBtn}
              >
                <View style={styles.btnseguir}>
                  <Heart size={16} color={colors.primary} />
                  <Text
                    style={[styles.mapBtnText, { color: colors.textSecondary }]}
                  >
                    {isFollowing(item.id) ? 'Seguindo' : 'Seguir'}
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </AnimatedPressable>
    );
  };

  useEffect(() => {
    const fetchUserEvents = async () => {
      if (!userEmail) return;

      setLoadingEvents(true);
      const start = Date.now(); // marca o início

      try {
        const participations = await getGuestParticipationsByEmail(userEmail);
        const eventIdsFromGuests = participations.map((p) => p.eventId);

        const result = state.events.filter((event) => {
          const isCreator = event.createdBy?.toLowerCase() === userEmail;
          const isSubAdmin = event.subAdmins?.some(
            (admin) => admin.email.toLowerCase() === userEmail
          );
          const isGuest = eventIdsFromGuests.includes(event.id);

          return isCreator || isSubAdmin || isGuest;
        });

        const uniqueEvents = Array.from(
          new Map(result.map((e) => [e.id, e])).values()
        );

        setAllUserEvents(uniqueEvents);
      } catch (err) {
        console.error('Erro ao buscar eventos relacionados:', err);
      } finally {
        // garante ao menos 1 segundo de exibição do loading
        const elapsed = Date.now() - start;
        const delay = Math.max(0, 1000 - elapsed);

        setTimeout(() => setLoadingEvents(false), delay);
      }
    };

    fetchUserEvents();
  }, [state.events, userEmail]);

  // if (isLoading) {
  //   return (
  //     <View style={styles.centeredContent}>
  //       <ActivityIndicator size="large" color={colors.primary} />
  //       <Text
  //         style={[
  //           styles.emptyText,
  //           { color: colors.textSecondary, marginTop: 12 },
  //         ]}
  //       >
  //         Carregando programação...
  //       </Text>
  //     </View>
  //   );
  // }
  // if (loadingEvents) {
  //   return (
  //     <View style={styles.centeredContent}>
  //       <ActivityIndicator size="large" color={colors.primary} />
  //       <Text
  //         style={[
  //           styles.emptyText,
  //           { color: colors.textSecondary, marginTop: 12 },
  //         ]}
  //       >
  //         Carregando eventos...
  //       </Text>
  //     </View>
  //   );
  // }

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.gradient}
      locations={[0, 0.7, 1]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />

      <SafeAreaView style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Meus Eventos</Text>

        <FlatList
          data={allUserEvents}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum evento relacionado a você encontrado.
            </Text>
          }
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
        />

        <PermissionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          colors={colors}
          gradientColors={gradientColors}
          permissionEmail={permissionEmail}
          setPermissionEmail={setPermissionEmail}
          permissionLevel={permissionLevel}
          setPermissionLevel={setPermissionLevel}
          onSave={savePermission}
        />

        <QRModal
          visible={qrVisible}
          onClose={() => setQrVisible(false)}
          qrRef={qrRef}
          qrPayload={qrPayload}
          onShare={handleShareQR}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const PermissionModal = ({
  visible,
  onClose,
  colors,
  gradientColors,
  permissionEmail,
  setPermissionEmail,
  permissionLevel,
  setPermissionLevel,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  colors: typeof Colors.dark | typeof Colors.light;
  gradientColors: [string, string, ...string[]];
  permissionEmail: string;
  setPermissionEmail: (email: string) => void;
  permissionLevel: PermissionLevel;
  setPermissionLevel: (level: PermissionLevel) => void;
  onSave: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.animatedContainer}
      >
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.7, 1]}
          style={[styles.modalContent, { borderColor: colors.primary2 }]}
        >
          <Text style={[styles.modalTitle, { color: colors.primary }]}>
            🔐 Permissões
          </Text>

          <Text style={[styles.modalText, { color: colors.text }]}>
            <Text style={[styles.roleHighlight, { color: colors.primary }]}>
              Super admin:
            </Text>{' '}
            Controle total sobre todos os recursos. Pode criar, editar,
            gerenciar permissões de todos os outros usuários. Não pode excluir o
            evento principal. Permissão exclusiva do criador.
          </Text>

          <Text style={[styles.modalText, { color: colors.text }]}>
            <Text style={[styles.roleHighlight, { color: colors.primary }]}>
              Admin parcial:
            </Text>{' '}
            Com algumas restrições, pode adicionar programas, atividades e
            fotos. Só pode deletar o que criou.
          </Text>

          <Text style={[styles.modalSubtitle, { color: colors.text }]}>
            👥 Adicionar Permissão
          </Text>

          <TextInput
            placeholder="Digite o Email"
            value={permissionEmail}
            onChangeText={setPermissionEmail}
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[
              styles.input,
              {
                backgroundColor: colors.backGroundSecondary,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          <Text style={[styles.modalLabel, { color: colors.text }]}>
            Tipo de permissão
          </Text>

          <View style={styles.toggleRow}>
            {(['Super Admin', 'Admin parcial'] as const).map((level) => (
              <Pressable
                key={level}
                onPress={() => setPermissionLevel(level)}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor:
                      permissionLevel === level ? '#471C7A' : 'transparent',
                    borderColor:
                      permissionLevel === level ? '#471C7A' : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: permissionLevel === level ? '#fff' : colors.text,
                    fontWeight: '600',
                  }}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <Button
              title="Cancelar"
              variant="cancel"
              onPress={onClose ?? (() => {})}
              style={{ flex: 1, marginRight: 8 }}
              textStyle={{ color: 'white' }}
            />
            <Button
              title="Salvar"
              onPress={onSave}
              style={{ backgroundColor: colors.primary, flex: 1 }}
              textStyle={{ color: '#fff' }}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  </Modal>
);

const QRModal = ({
  visible,
  onClose,
  qrRef,
  qrPayload,
  onShare,
}: {
  visible: boolean;
  onClose: () => void;
  qrRef: React.RefObject<ViewShot>;
  qrPayload: string;
  onShare: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.qrBox}
      >
        <Text style={styles.qrTitle}>Compartilhe seu evento!</Text>
        <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }}>
          <QRCode
            value={qrPayload}
            size={200}
            backgroundColor="white"
            color="black"
          />
        </ViewShot>
        <Button
          title="Enviar QR Code"
          onPress={onShare}
          style={styles.qrShareBtn}
          icon={<Share2 size={16} color="white" />}
        />
        <Button title="Fechar" onPress={onClose} style={styles.qrCloseBtn} />
      </Animated.View>
    </View>
  </Modal>
);

const SafeAreaView = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => (
  <View
    style={[
      styles.container,
      style,
      Platform.OS === 'android' && {
        paddingTop: RNStatusBar.currentHeight ?? 40,
      },
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  gradient: { flex: 1 },

  container: {
    flex: 1,
    paddingHorizontal: 6,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingLeft: 8,
    marginVertical: 16,
    fontFamily: 'Inter_700Bold',
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },

  listContent: {
    paddingBottom: 20,
  },

  card: {
    backgroundColor: '#1f1f25',
    marginBottom: 24,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderColor: '#555',
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 6,
  },

  imageWrapper: {
    width: '100%',
    aspectRatio: 22 / 9,
    backgroundColor: '#111',
    overflow: 'hidden',
    borderRadius: 12,
  },

  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
    borderRadius: 12,
    justifyContent: 'flex-end',
  },

  blurOverlay: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
    borderRadius: 12,
    gap: 6,
  },

  overlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },

  overlayLocation: {
    fontSize: 14,
    color: '#ccc',
    fontFamily: 'Inter_400Regular',
  },

  overlayDesc: {
    fontSize: 12,
    color: '#ddd',
    fontFamily: 'Inter_400Regular',
  },

  eventTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },

  meta: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },

  animatedContainer: {
    width: '100%',
    maxWidth: 420,
  },

  mapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },

  mapBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },

  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 6,
    borderRadius: 10,
  },

  shareBtnText: {
    fontSize: 13,
    color: 'white',
    fontFamily: 'Inter_500Medium',
  },

  permissionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 6,
  },

  permissionText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },

  btnseguir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444',
  },

  button: {
    backgroundColor: '#5838AD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },

  buttonSecondary: {
    backgroundColor: '#aaa',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },

  // Modal (mantido o mais completo e por último)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalContent: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },

  modalText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },

  roleHighlight: {
    fontWeight: 'bold',
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },

  modalLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '90%',
    maxWidth: 300,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: 'Inter_600SemiBold',
  },

  qrShareBtn: {
    marginTop: 16,
    backgroundColor: '#25D366',
    width: '100%',
  },
  qrCloseBtn: {
    marginTop: 12,
    backgroundColor: '#333',
    width: '100%',
  },
  eventCard: {
    flexDirection: 'column',
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
