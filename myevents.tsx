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
import { Share2, KeyRound, Heart } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import ShareEventButton from '@/components/ShareEventButton';
import { getOptimizedUrl } from '@/lib/cloudinary';

import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';
import RoleBadge from '@/components/ui/RoleBadge';
import type { Event, GuestMode, PermissionLevel } from '@/types/index';
import { useFollowedEvents } from '@/hooks/useFollowedEvents';
import { useEvents } from '@/context/EventsContext';
import { createInviteForEvent } from '@/hooks/inviteService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  const gradientColors = colors.gradients;

  const isFetchingRef = useRef(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [qrVisible, setQrVisible] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const qrRef = useRef<any>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [permissionUid, setPermissionUid] = useState('');
  const [permissionLevel, setPermissionLevel] =
    useState<PermissionLevel>('Admin parcial');

  // ✅ Guest Interception
  const [guestAlertVisible, setGuestAlertVisible] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<() => void>(
    () => {},
  );

  const interceptActionForGuest = (action: () => void) => {
    if (auth.currentUser?.isAnonymous) {
      setPendingShareAction(() => action);
      setGuestAlertVisible(true);
    } else {
      action();
    }
  };

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

  const goToGuests = useCallback(
    (eventId: string) => {
      const href = {
        pathname: '/events/[id]/confirmed-guests',
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
      console.error('QR Share Error:', error);
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

  // 1) Estado derivado: Filtra os eventos em tempo real
  const allUserEvents = useMemo(() => {
    if (!userUid) return state.events;

    const guestEventIds = new Set(Object.keys(myGuestModeByEventId));

    const result = state.events.filter((event) => {
      const isCreator = event.userId === userUid;
      const isSubAdmin = !!event.subAdminsByUid?.[userUid];
      const isGuest = guestEventIds.has(event.id);
      return isCreator || isSubAdmin || isGuest;
    });

    // Se a busca filtrada não achar nada, mostra tudo o que estiver no contexto 
    // (comportamento original mantido por segurança)
    const finalList = result.length ? result : state.events;

    // Remove duplicados por ID
    return Array.from(new Map(finalList.filter(Boolean).map((e) => [e.id, e])).values());
  }, [state.events, userUid, myGuestModeByEventId]);

  // 2) Ação de carregamento (refresh)
  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingEvents(true);

    try {
      // Busca eventos do Firestore para o contexto
      await fetchEvents();

      // Busca participações para saber onde sou convidado
      if (userUid) {
        const participations = await getGuestParticipationsByUserId(userUid);
        const modeMap: Record<string, GuestMode> = {};
        for (const p of participations) {
          if (p?.eventId && (p.mode === 'confirmado' || p.mode === 'acompanhando')) {
            modeMap[p.eventId] = p.mode;
          }
        }
        setMyGuestModeByEventId(modeMap);
      }
    } catch (err) {
      console.error('Erro ao carregar dados da tela Meus Eventos:', err);
    } finally {
      setLoadingEvents(false);
      isFetchingRef.current = false;
    }
  }, [userUid, fetchEvents, getGuestParticipationsByUserId]);

  // 3) Dispara refresh ao focar na tela
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const ensureInviteForEvent = useCallback(
    async (event: Event) => {
      if (event.shareKey?.trim()) return event.shareKey.trim();

      // cria no Firestore: eventShareKeys + eventInviteSummaries
      const newKey = await createInviteForEvent(event.id);

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
      const myGuestMode = myGuestModeByEventId[item.id] ?? null;
      const isGuest = !!myGuestMode;

      return (
        <AnimatedPressable
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(180)}
          onPress={() => goToEvent(item.id)}
        >
          <Animated.View style={styles.card}>
            <View style={styles.imageWrapper}>
              {!!item.coverImage ? (
                <Image
                  source={{
                    uri: getOptimizedUrl(item.coverImage, { width: 600 }),
                  }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.image, { backgroundColor: '#111' }]} />
              )}

              <View style={styles.overlay}>
                {isCreator && <RoleBadge role="Criador" />}
                {getAuth().currentUser?.isAnonymous && (
                  <Text
                    style={{ color: colors.error, fontSize: 12, marginTop: 4 }}
                  >
                    Visitante — cadastre-se para compartilhar
                  </Text>
                )}

                {!isCreator && myLevel && (
                  <RoleBadge
                    role={
                      myLevel === 'Super Admin' ? 'Super Admin' : 'Adm parcial'
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

                <Text style={styles.overlayTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={styles.overlayLocation} numberOfLines={1}>
                  {item.location}
                </Text>

                <View style={styles.eventCard}>
                  <Text style={styles.overlayDesc} numberOfLines={2}>
                    {`${new Date(item.startDate).toLocaleDateString(
                      'pt-BR',
                    )} - ${new Date(item.endDate).toLocaleDateString('pt-BR')}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonsRow}>
              <Pressable
                onPress={() => goToGuests(item.id)}
                style={[styles.mapBtn, { borderColor: colors.primary }]}
              >
                <Text
                  style={[styles.mapBtnText, { color: colors.textSecondary }]}
                >
                  Convidados
                </Text>
              </Pressable>

              {isCreator || isSuperAdmin ? (
                <>
                  <View style={{ marginRight: 8 }}>
                    <ShareEventButton
                      shareKey={item.shareKey ?? ''}
                      onEnsureInvite={() => ensureInviteForEvent(item)}
                      onPressInterceptor={(proceed) => {
                        interceptActionForGuest(proceed);
                      }}
                      onShowQRCode={(payload) => {
                        setQrPayload(payload);
                        setQrVisible(true);
                      }}
                    />
                  </View>

                  <Button
                    title="Permissão"
                    size="small"
                    onPress={() => {
                      router.push({
                        pathname: '/(stack)/events/[id]/permissions',
                        params: { id: item.id },
                      });
                    }}
                    icon={<KeyRound size={14} color="white" />}
                    style={styles.permissionBtn}
                    textStyle={styles.permissionText}
                  />
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    const wasFollowing = isFollowing(item.id);
                    toggleFollowEvent(item);

                    Alert.alert(
                      wasFollowing ? 'Removido' : 'Sucesso',
                      wasFollowing
                        ? 'Você deixou de seguir o evento.'
                        : 'Você está seguindo este evento.',
                    );
                  }}
                  style={styles.permissionBtn}
                >
                  <View
                    style={[styles.btnseguir, { borderColor: colors.primary }]}
                  >
                    <Heart
                      size={16}
                      color={colors.primary}
                      fill={
                        isFollowing(item.id) ? colors.primary : 'transparent'
                      }
                    />
                    <Text
                      style={[
                        styles.mapBtnText,
                        { color: colors.textSecondary },
                      ]}
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
    },
    [
      colors.primary,
      colors.text,
      colors.textSecondary,
      goToEvent,
      goToGuests,
      isFollowing,
      toggleFollowEvent,
      userUid,
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
        <Text style={[styles.title, { color: colors.text }]}>Meus Eventos</Text>

        <FlatList
          data={allUserEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loadingEvents ? (
              <View style={styles.centeredContent}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[
                    styles.emptyText,
                    { color: colors.textSecondary, marginTop: 12 },
                  ]}
                >
                  Carregando eventos...
                </Text>
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum evento relacionado a você encontrado.
              </Text>
            )
          }
        />

        <QRModal
          visible={qrVisible}
          onClose={() => setQrVisible(false)}
          qrRef={qrRef}
          qrPayload={qrPayload}
          onShare={handleShareQR}
        />

        {/* ✅ Modal de Conversão (Guest Intercept) */}
        <Modal
          visible={guestAlertVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setGuestAlertVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.primary }]}>
                Salve seu evento!
              </Text>
              <Text style={{ color: colors.text, marginBottom: 16 }}>
                Você está em modo visitante. Para compartilhar convites e
                garantir que você não perca o acesso a este evento, crie uma
                conta.
              </Text>

              <Button
                title="Criar conta agora"
                onPress={() => {
                  setGuestAlertVisible(false);
                  router.push('/(auth)/register');
                }}
                style={{ backgroundColor: colors.primary, marginBottom: 10 }}
                textStyle={{ color: '#fff' }}
              />

              <Button
                title="Cancelar"
                variant="ghost"
                onPress={() => {
                  setGuestAlertVisible(false);
                }}
                textStyle={{ color: colors.textSecondary, fontSize: 13 }}
              />
            </Animated.View>
          </View>
        </Modal>
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
        style={styles.animatedContainer}
      >
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.7, 1]}
          style={[styles.modalContent, { borderColor: colors.primaryDark }]}
        >
          <Text style={[styles.modalTitle, { color: colors.primary }]}>
            🔐 Permissões
          </Text>

          <Text style={[styles.modalText, { color: colors.text }]}>
            <Text style={[styles.roleHighlight, { color: colors.primary }]}>
              Super admin:
            </Text>{' '}
            Controle total (inclusive gerenciar permissões).
          </Text>

          <Text style={[styles.modalText, { color: colors.text }]}>
            <Text style={[styles.roleHighlight, { color: colors.primary }]}>
              Admin parcial:
            </Text>{' '}
            Pode adicionar programas/atividades/fotos e deletar apenas o que
            criou.
          </Text>

          <Text style={[styles.modalSubtitle, { color: colors.text }]}>
            👥 Adicionar permissão por UID
          </Text>

          <TextInput
            placeholder="Digite o UID do usuário (Firebase Auth UID)"
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
              onPress={onClose}
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
  qrRef: React.RefObject<any>;
  qrPayload: string;
  onShare: () => void;
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
          <Text style={styles.qrTitle}>Compartilhe seu evento!</Text>

          {/* ✅ Tudo dentro do ViewShot entra no PNG compartilhado */}
          <ViewShot
            ref={qrRef}
            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          >
            <View style={styles.qrShotCard}>
              <Text style={styles.qrWelcomeTitle}>Bem-vindo(a) 👋</Text>
              <Text style={styles.qrWelcomeSubtitle}>
                Você é meu convidado!
              </Text>
              <Text style={styles.qrWelcomeSubtitle}>
                Aponte a câmera para entrar no evento
              </Text>

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
                Se preferir, peça o link pelo organizador.
              </Text>
            </View>
          </ViewShot>

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
    fontFamily: 'Inter_700Bold',
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },

  listContent: { paddingBottom: 20 },

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

  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },

  modalText: { fontSize: 14, marginBottom: 12, lineHeight: 20 },

  roleHighlight: { fontWeight: 'bold' },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },

  modalLabel: { fontSize: 14, marginBottom: 8, fontWeight: '600' },

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
});
