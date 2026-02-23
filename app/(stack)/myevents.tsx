import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  ActivityIndicator,
  Share,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/lib/logger';
import { Share2, KeyRound, Heart, LayoutDashboard, Settings, CalendarX2, CheckSquare, Shield } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import ShareEventButton from '@/components/ShareEventButton';
import EmptyState from '@/components/EmptyState';
import Fonts from '@/constants/Fonts';
import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';
import RoleBadge from '@/components/ui/RoleBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Event, GuestMode, PermissionLevel } from '@/types/index';
import { useFollowedEvents } from '@/hooks/useFollowedEvents';
import { useEvents } from '@/context/EventsContext';
import { createInviteForEvent } from '@/hooks/inviteService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MyEventsSkeleton = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={{ paddingHorizontal: 4 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border, padding: 8 }]}>
           <Skeleton width="100%" height={140} borderRadius={12} style={{ marginBottom: 12 }} />
           <View style={{ flexDirection: 'row', gap: 10 }}>
              <Skeleton width="45%" height={36} borderRadius={20} />
              <Skeleton width="45%" height={36} borderRadius={20} />
           </View>
        </View>
      ))}
    </View>
  );
};

export default function MyEventsScreen() {
  const router = useRouter();

  const {
    state,
    updateEvent,
    getGuestParticipationsByEventId,
    getGuestParticipationsByUserId,
    fetchEvents,
  } = useEvents();

  const { toggleFollowEvent, isFollowing } = useFollowedEvents();

  const auth = getAuth();
  const userUid = auth.currentUser?.uid ?? '';
  const [myGuestModeByEventId, setMyGuestModeByEventId] = useState<
    Record<string, GuestMode>
  >({});

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const isFetchingRef = useRef(false);
  const [allUserEvents, setAllUserEvents] = useState<Event[]>([]);
  // Inicia em true apenas se não houver eventos no state
  const [loadingEvents, setLoadingEvents] = useState(state.events.length === 0);

  const [qrVisible, setQrVisible] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const [qrTitle, setQrTitle] = useState<string | undefined>();
  const [qrLocation, setQrLocation] = useState<string | undefined>();
  const [qrDates, setQrDates] = useState<string | undefined>();
  const qrRef = useRef<any>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [permissionUid, setPermissionUid] = useState('');
  const [permissionLevel, setPermissionLevel] =
    useState<PermissionLevel>('Admin parcial');

  // ---------- Navigation (sem "any") ----------
  const goToEvent = useCallback(
    (eventId: string) => {
      const href = {
        pathname: '/(stack)/events/[id]',
        params: { id: eventId },
      } as const satisfies Href;

      router.push(href);
    },
    [router],
  );

  // ---------- QR Share ----------
  const handleShareQR = useCallback(async () => {
    if (!qrRef.current?.capture) return;

    try {
      const uri = await qrRef.current.capture();
      if (!uri) return;

      const fileUri = `${FileSystem.cacheDirectory}qr_${Date.now()}.png`;
      await FileSystem.copyAsync({ from: uri, to: fileUri });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Compartilhamento não disponível');
        return;
      }

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      logger.error('QR Share Error:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o QR Code.');
    }
  }, []);

  // ---------- Android back ----------
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push('/' as Href);
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [router]),
  );

  // ---------- Fetch & Filter ----------
  useEffect(() => {
    let active = true;

    const load = async () => {
      // 1) Se já temos eventos, atualizamos a lista local imediatamente
      if (state.events.length > 0) {
        setAllUserEvents(state.events);
        
        const modeMap: Record<string, GuestMode> = {};
        state.events.forEach(ev => {
          if (ev.myGuestMode) {
            modeMap[ev.id] = ev.myGuestMode;
          }
        });
        setMyGuestModeByEventId(modeMap);
        
        if (active) setLoadingEvents(false);
      }

      // 2) Se não temos eventos, chamamos fetchEvents APENAS SE não estivermos buscando
      // E usamos isFetchingRef para garantir que não entramos em loop
      if (state.events.length === 0 && !isFetchingRef.current) {
        isFetchingRef.current = true;
        if (active) setLoadingEvents(true);

        try {
          await fetchEvents();
        } catch (err) {
          logger.error('Erro ao buscar eventos em MyEvents:', err);
        } finally {
          isFetchingRef.current = false;
          // Mesmo se retornar 0 eventos, paramos o skeleton
          if (active) setLoadingEvents(false);
        }
      } else if (state.events.length === 0 && !state.loading && !isFetchingRef.current) {
        // Caso especial: já buscou e retornou vazio
        if (active) setLoadingEvents(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [userUid, state.events, state.loading, fetchEvents]);

  const ensureInviteForEvent = useCallback(
    async (event: Event, ttlHours: number) => {
      // cria no Firestore: eventShareKeys + eventInviteSummaries
      const newKey = await createInviteForEvent(event.id, ttlHours);

      // salva no próprio evento para não gerar outro depois
      await updateEvent({
        ...event,
        shareKey: newKey,
      });

      return newKey;
    },
    [updateEvent],
  );

  const renderEventItem = useCallback(
    ({ item }: { item: Event }) => {
      const isCreator = item.userId === userUid;
      const myLevel = userUid ? (item.subAdminsByUid?.[userUid] ?? null) : null;
      const isSuperAdmin = isCreator || myLevel === 'Super Admin';
      const isPartialAdmin = myLevel === 'Admin parcial';
      const isManagementAuthorized = isSuperAdmin || isPartialAdmin;

      const myGuestMode = myGuestModeByEventId[item.id] ?? null;
      const isGuest = !!myGuestMode;

      // ✅ Lógica de Pendências
      const pendingTasks = item.tasks?.filter((t) => !t.completed) || [];
      const pendingCount = pendingTasks.length;
      const hasUrgent = pendingTasks.some((t) => {
        if (!t.deadline) return false;
        const deadline = new Date(t.deadline);
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        return deadline <= threeDaysFromNow;
      });

      return (
        <AnimatedPressable
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(180)}
          onPress={() => goToEvent(item.id)}
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.imageWrapper}>
              {!!item.coverImage ? (
                <Image
                  source={{ uri: item.coverImage }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.image, { backgroundColor: '#111' }]} />
              )}

              <View style={styles.overlay}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  {isCreator && <RoleBadge role="Criador" />}

                  {!isCreator && myLevel && (
                    <RoleBadge
                      role={
                        myLevel === 'Super Admin'
                          ? 'Super Admin'
                          : 'Adm parcial'
                      }
                    />
                  )}

                  {!isCreator && !myLevel && isGuest && (
                    <RoleBadge
                      role="Convidado"
                      label={
                        myGuestMode === 'confirmado'
                          ? 'Convidado ✅'
                          : 'Convidado 👀'
                      }
                    />
                  )}
                </View>

                <View style={{ marginTop: 'auto' }}>
                  <Text style={styles.overlayTitle} numberOfLines={1}>
                    {item.title}
                  </Text>

                  <Text style={styles.overlayLocation} numberOfLines={1}>
                    {item.location}
                  </Text>

                  <View style={styles.eventCard}>
                    <Text style={styles.overlayDesc} numberOfLines={2}>
                      {(() => {
                        const start = new Date(
                          item.startDate,
                        ).toLocaleDateString('pt-BR');
                        const end = new Date(item.endDate).toLocaleDateString(
                          'pt-BR',
                        );
                        return start === end ? start : `${start} - ${end}`;
                      })()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.buttonsRow}>
              {/* ✅ Botão Share (Minimal) */}
              {isManagementAuthorized && (
                <View style={styles.iconButtonWrapper}>
                  <ShareEventButton
                    event={item}
                    minimal
                    onEnsureInvite={(ttlHours) =>
                      ensureInviteForEvent(item, ttlHours)
                    }
                    onShowQRCode={(payload) => {
                      setQrPayload(payload);
                      setQrTitle(item.title);
                      setQrLocation(item.location);
                      setQrDates(
                        `${new Date(item.startDate).toLocaleDateString(
                          'pt-BR',
                        )} - ${new Date(item.endDate).toLocaleDateString(
                          'pt-BR',
                        )}`,
                      );
                      setQrVisible(true);
                    }}
                  />
                </View>
              )}

              {/* ✅ Indicador de Pendências (Clicável para ir direto para tarefas) */}
              {isManagementAuthorized && (
                <Pressable
                  onPress={() => router.push({ pathname: '/(stack)/events/[id]/tasks', params: { id: item.id } })}
                  style={({ pressed }) => [
                    styles.pendingIndicator,
                    { 
                      borderColor: colors.border,
                      backgroundColor: pressed ? colors.backgroundSecondary : 'rgba(255,255,255,0.03)'
                    },
                  ]}
                >
                  <CheckSquare
                    size={16}
                    color={
                      pendingCount > 0
                        ? hasUrgent
                          ? colors.error
                          : colors.warning
                        : colors.success
                    }
                  />
                  <Text
                    style={[
                      styles.pendingText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {pendingCount}
                  </Text>
                </Pressable>
              )}

              {/* ✅ Botão Gestão (Principal - Flex 2) */}
              {(isManagementAuthorized || isGuest) && (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: isManagementAuthorized 
                        ? '/(stack)/events/[id]/dashboard'
                        : '/(stack)/events/[id]/edit-my-participation',
                      params: { id: item.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.primaryActionBtn,
                    {
                      backgroundColor: pressed
                        ? colors.backgroundSecondary
                        : 'transparent',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <LayoutDashboard size={18} color={colors.text} />
                  <Text style={[styles.primaryActionBtnText, { color: colors.text }]}>
                    {isManagementAuthorized ? 'Gerenciar' : 'Gestão'}
                  </Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        </AnimatedPressable>
      );
    },
    [
      colors.border,
      colors.primary,
      colors.text,
      colors.backgroundCard,
      colors.backgroundSecondary,
      goToEvent,
      myGuestModeByEventId,
      userUid,
      ensureInviteForEvent,
      router,
    ],
  );

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

      <ScreenSafeArea style={styles.container}>
        <View style={{ paddingHorizontal: 8, marginTop: 8, marginBottom: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Aqui estão os eventos que você criou ou foi convidado para participar:
          </Text>
          <Text style={{ color: colors.text, fontSize: 18, fontFamily: Fonts.bold, marginTop: 10 }}>
            Meus Eventos
          </Text>
        </View>

        <FlatList
          data={allUserEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loadingEvents ? (
              <MyEventsSkeleton />
            ) : (
                <EmptyState
                    icon={CalendarX2}
                    title="Nenhum evento aqui"
                    description="Você ainda não criou nem foi convidado para nenhum evento."
                    actionLabel="Criar Evento"
                    onAction={() => router.push('/events/new?mode=create')}
                />
            )
          }
        />

        <QRModal
          visible={qrVisible}
          onClose={() => setQrVisible(false)}
          qrRef={qrRef}
          qrPayload={qrPayload}
          onShare={handleShareQR}
          eventTitle={qrTitle}
          eventLocation={qrLocation}
          eventDates={qrDates}
        />
      </ScreenSafeArea>
    </LinearGradient>
  );
}

// -------------------- Modals --------------------

const PermissionModal = ({
  visible,
  onClose,
  colors,
  gradientColors,
  permissionUid,
  setPermissionUid,
  permissionLevel,
  setPermissionLevel,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  colors: typeof Colors.dark | typeof Colors.light;
  gradientColors: [string, string, ...string[]];
  permissionUid: string;
  setPermissionUid: (uid: string) => void;
  permissionLevel: PermissionLevel;
  setPermissionLevel: (level: PermissionLevel) => void;
  onSave: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.modalContentWrapper}
      >
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.7, 1]}
          style={[styles.modalContent, { borderColor: colors.primary }]}
        >
          <View style={styles.modalHeader}>
            <Shield size={28} color={colors.primary} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Permissões
            </Text>
          </View>

          <View style={[styles.roleInfoBox, { backgroundColor: colors.backgroundSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border }]}>
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Shield size={16} color={colors.primary} />
                <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 14 }}>Super Admin</Text>
              </View>
              <Text style={[styles.roleInfoText, { color: colors.textSecondary, fontSize: 13 }]}>
                • Controle total e gestão de equipe{"\n"}
                • <Text style={{ fontWeight: '600', color: colors.text }}>Pode editar</Text> tudo: título, local, datas, desc. e capa{"\n"}
                • <Text style={{ fontWeight: '600', color: colors.error }}>Não pode apagar</Text> o evento
              </Text>
            </View>

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Shield size={16} color={colors.primary} opacity={0.6} />
                <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 14, opacity: 0.8 }}>Admin Parcial</Text>
              </View>
              <Text style={[styles.roleInfoText, { color: colors.textSecondary, fontSize: 13 }]}>
                • Gestão de programação e fotos{"\n"}
                • <Text style={{ fontWeight: '600', color: colors.text }}>Pode editar</Text> info básica: título, local, datas e capa{"\n"}
                • <Text style={{ fontWeight: '600', color: colors.error }}>Sem permissão</Text> para apagar o evento
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 20, width: '100%' }} />

          <Text style={{ fontSize: 16, fontFamily: Fonts.bold, color: colors.text, marginBottom: 12, textAlign: 'center' }}>
            ✨ Atribuir Novo Acesso
          </Text>

          <TextInput
            placeholder="Digite o UID do usuário"
            value={permissionUid}
            onChangeText={setPermissionUid}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          <Text style={[styles.modalLabel, { color: colors.text, marginTop: 12 }]}>
            Tipo de acesso
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
                      permissionLevel === level ? colors.primary : 'transparent',
                    borderColor:
                      permissionLevel === level ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: permissionLevel === level ? '#fff' : colors.text,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.modalActions, { marginTop: 24 }]}>
            <Button
              title="Cancelar"
              variant="cancel"
              onPress={onClose}
              style={{ flex: 1 }}
              textStyle={{ color: 'white' }}
            />
            <Button
              title="Salvar"
              onPress={onSave}
              style={{ backgroundColor: colors.primary, flex: 1.5 }}
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
  eventTitle,
  eventLocation,
  eventDates,
}: {
  visible: boolean;
  onClose: () => void;
  qrRef: React.RefObject<any>;
  qrPayload: string;
  onShare: () => void;
  eventTitle?: string;
  eventLocation?: string;
  eventDates?: string;
}) => {
  const isLinkPayload =
    typeof qrPayload === 'string' && /^https?:\/\//i.test(qrPayload);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.qrBox}
        >
          {/* ✅ Tudo isso é só UI do modal (não entra na imagem) */}
          <Text style={styles.qrTitle}>
            {'Compartilhe seu evento!'}
          </Text>

          {/* ✅ Tudo dentro do ViewShot entra no PNG compartilhado */}
          <ViewShot
            ref={qrRef}
            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          >
            <View style={styles.qrShotCard}>
              <Text style={styles.qrWelcomeTitle}>
                {eventTitle ? `Título: ${eventTitle}` : 'Bem-vindo(a) 👋'}
              </Text>
              
              {eventLocation && (
                <Text style={styles.qrWelcomeSubtitle}>
                  Localização: {eventLocation}
                </Text>
              )}

              {eventDates && (
                <Text style={styles.qrWelcomeSubtitle}>
                  Data: {eventDates}
                </Text>
              )}

              <Text style={styles.qrWelcomeSubtitle}>
                {eventTitle ? 'Você é meu convidado!' : 'Aponte a câmera para entrar no evento'}
              </Text>
              {eventTitle && (
                <Text style={styles.qrWelcomeSubtitle}>
                  Aponte a câmera para entrar no evento
                </Text>
              )}

              <View style={styles.qrCodeWrap}>
                <QRCode
                  value={qrPayload}
                  size={150} // ✅ menor (mude aqui: 130-180)
                  quietZone={10} // ✅ margem pro leitor
                  backgroundColor="white"
                  color="black"
                />
              </View>

              {/* opcional: uma dica pequena no rodapé da imagem */}
              <Text style={styles.qrHint}>
                Se preferir, peça o link para o organizador.
              </Text>
            </View>
          </ViewShot>

          <Text style={styles.qrUsageTip}>
            💡 Dica: Você pode imprimir este QR Code e disponibilizá-lo na entrada
            do evento ou recepção para que todos acompanhem a programação.
          </Text>

          {isLinkPayload && (
            <Button
              title="Enviar Link"
              onPress={async () => {
                try {
                  await Share.share({ message: qrPayload });
                } catch {
                  Alert.alert('Erro', 'Não foi possível compartilhar o link');
                }
              }}
              style={styles.qrShareBtn}
            />
          )}

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
};

// -------------------- Safe Area wrapper --------------------

const ScreenSafeArea = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => (
  <View
    style={[
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
  container: { flex: 1, paddingHorizontal: 6 },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingLeft: 8,
    marginVertical: 16,
    fontFamily: Fonts.bold,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },

  listContent: { paddingBottom: 10, padding:10 },

  card: {
    marginBottom: 20,
    marginHorizontal: 4,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
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
    borderRadius: 12,
    justifyContent: 'flex-end',
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
    fontFamily: Fonts.semiBold,
  },

  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  pendingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  iconButtonWrapper: {
    height: 40,
    justifyContent: 'center',
  },

  overlayLocation: {
    fontSize: 14,
    color: '#ccc',
    fontFamily: Fonts.regular,
  },

  overlayDesc: {
    fontSize: 12,
    color: '#ddd',
    fontFamily: Fonts.regular,
  },

  eventCard: { flexDirection: 'column' },

  buttonsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  animatedContainer: { width: '100%', maxWidth: 420 },

  mapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },

  mapBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    padding: 1.5,
  },

  permissionBtn: { flex: 1, borderRadius: 10, paddingVertical: 3 },

  permissionText: {
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 6,
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },

  minimalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  minimalBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },

  primaryActionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },

  btnseguir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },

  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalContent: { borderRadius: 18, padding: 20, borderWidth: 1 },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  roleInfoBox: {
    marginBottom: 8,
  },
  roleInfoText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  buttonRow: { flexDirection: 'row', marginTop: 8 },

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

  qrShareBtn: { marginTop: 16, backgroundColor: '#25D366', width: '100%' },
  qrCloseBtn: { marginTop: 12, backgroundColor: '#333', width: '100%' },
  qrUsageTip: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  qrShotCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    width: 260, // ✅ tamanho “fixo” da imagem do QR (fica bonito no WhatsApp)
  },

  qrWelcomeTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: 'Inter_600SemiBold',
  },

  qrWelcomeSubtitle: {
    fontSize: 12,
    opacity: 0.75,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
  },

  qrCodeWrap: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    // sombra leve (iOS)
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    // sombra (Android)
    elevation: 2,
  },

  qrHint: {
    marginTop: 10,
    fontSize: 10,
    opacity: 0.65,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
});
