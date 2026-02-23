import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  Platform,
  Linking,
  Alert,
  RefreshControl,
  BackHandler,
} from 'react-native';
import {
  useFocusEffect,
  useLocalSearchParams,
  router,
  Stack,
} from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { useColorScheme } from 'react-native';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Users,
} from 'lucide-react-native';
import ProgramItem from '@/components/ProgramItem';
import Button from '@/components/ui/Button';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import LottieView from 'lottie-react-native';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { getFriendlyErrorMessage } from '@/lib/utils/errors';

import type { Guest, Event } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const EventDetailSkeleton = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Skeleton width="100%" height={220} borderRadius={12} style={{ marginBottom: 20 }} />
      <View style={{ padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 20 }}>
        <Skeleton width={120} height={20} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={60} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        <Skeleton width={150} height={24} />
      </View>
      {[1, 2].map(i => (
        <Skeleton key={i} width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
};

export default function EventDetailScreen() {
  const { refetchEventById, deleteEvent, addProgram, getGuestsByEventId } =
    useEvents();

  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const userUid = getAuth().currentUser?.uid ?? '';

  const [event, setEvent] = useState<Event | null>(null);

  // ✅ loading só para primeira carga
  const [initialLoading, setInitialLoading] = useState(true);
  // ✅ refresh quando puxa para atualizar / volta pra tela
  const [refreshing, setRefreshing] = useState(false);

  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletionFinished, setIsDeletionFinished] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [confirmed, setConfirmed] = useState<Guest[]>([]);
  const [interested, setInterested] = useState<Guest[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🔒 trava concorrência de fetch
  const isFetchingRef = useRef(false);

  // ✅ retry (race condition pós-confirmar presença)
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // ✅ Esconde a seta e ações durante carga + refresh
  const isHeaderBusy = initialLoading || refreshing;

  const hasPermission = useMemo(() => {
    if (!event) return false;

    const isCreator = event.userId === userUid;

    const myLevel =
      userUid && event.subAdminsByUid?.[userUid]
        ? event.subAdminsByUid[userUid]
        : null;

    const isAdmin = myLevel === 'Super Admin' || myLevel === 'Admin parcial';

    return isCreator || isAdmin;
  }, [event, userUid]);

  const isGuest = useMemo(() => {
    if (!userUid) return false;
    return (
      confirmed.some((g) => g.userId === userUid) ||
      interested.some((g) => g.userId === userUid)
    );
  }, [confirmed, interested, userUid]);

  const loadEvent = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!id) return;

      // 🔒 trava concorrência
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const silent = opts?.silent ?? false;

      // ✅ se já tem evento, NÃO volta pra tela de loading
      if (!silent && !event) setInitialLoading(true);
      setRefreshing(!!event);

      setErrorMsg(null);

      // ✅ reset do retry em chamadas "normais" (não-silent)
      if (!silent) retryRef.current = 0;

      try {
        const updatedEvent = await refetchEventById(id);

        if (!updatedEvent) {
          setEvent(null);
          setErrorMsg('Evento não encontrado ou você não tem permissão.');
          return;
        }

        setEvent(updatedEvent);

        // convidados: falha não derruba tela
        try {
          const guests = await getGuestsByEventId(updatedEvent.id);
          setConfirmed(guests.filter((g) => g.mode === 'confirmado'));
          setInterested(guests.filter((g) => g.mode === 'acompanhando'));
        } catch {
          setConfirmed([]);
          setInterested([]);
        }
      } catch (e: any) {
        const code = e?.code;
        // ✅ retry automático para race condition pós-confirmar presença
        if (code === 'permission-denied' && retryRef.current < 3) {
          retryRef.current += 1;

          const delay =
            retryRef.current === 1 ? 250 : retryRef.current === 2 ? 600 : 1200;

          // 🔓 MUITO IMPORTANTE: liberar o lock antes de agendar retry
          isFetchingRef.current = false;

          // mantém estado visual suave
          setInitialLoading(false);
          setRefreshing(true);

          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            loadEvent({ silent: true });
          }, delay);

          return; // ✅ sai sem cair no "erro final"
        }

        // ❌ outros erros: aí sim derruba
        setEvent(null);
        setErrorMsg(getFriendlyErrorMessage(e));
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [id, refetchEventById, getGuestsByEventId, event],
  );

  useFocusEffect(
    useCallback(() => {
      loadEvent({ silent: false });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]),
  );

  // ✅ (Opcional) trava o botão físico do Android durante loading/refresh
  useFocusEffect(
    useCallback(() => {
      if (!isHeaderBusy) return;

      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, [isHeaderBusy]),
  );

  const { handleGoBack } = useSmartNavigation(from);

  // ✅ Placeholder para manter header estável (evita “pulos”)
  const HeaderRightPlaceholder = useCallback(
    () => <View style={{ width: 64 }} />,
    [],
  );

  const HeaderLeftPlaceholder = useCallback(
    () => <View style={{ width: 48 }} />,
    [],
  );

  const headerOptions = useMemo(() => {
    return {
      headerShown: true,
      headerTitle: 'Detalhes do evento',

      // ✅ Sem seta durante carga + refresh (mas mantém espaço)
      headerLeft: isHeaderBusy
        ? HeaderLeftPlaceholder
        : () => (
            <TouchableOpacity
              onPress={handleGoBack}
              style={{ paddingHorizontal: 12 }}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),

      // ✅ Sem Edit/Trash durante carga + refresh (mas mantém espaço)
      headerRight: isHeaderBusy
        ? HeaderRightPlaceholder
        : () =>
            hasPermission && event ? (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/(stack)/events/new',
                      params: { mode: 'edit', id: event.id },
                    })
                  }
                  style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                >
                  <Edit size={20} color={colors.text} />
                </TouchableOpacity>

                {event.userId === userUid && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Excluir Evento',
                        'Tem certeza que deseja excluir este evento? Essa ação não poderá ser desfeita.',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Excluir',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                setIsDeleting(true);
                                await deleteEvent(event.id);
                                setIsDeletionFinished(true);
                              } catch {
                                Alert.alert(
                                  'Erro',
                                  'Não foi possível excluir o evento.',
                                );
                              } finally {
                                setIsDeleting(false);
                              }
                            },
                          },
                        ],
                      );
                    }}
                    style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                  >
                    <Trash2 size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              HeaderRightPlaceholder()
            ),
    };
  }, [
    isHeaderBusy,
    HeaderLeftPlaceholder,
    HeaderRightPlaceholder,
    handleGoBack,
    colors.primary,
    colors.text,
    colors.error,
    hasPermission,
    event,
    userUid,
    deleteEvent,
  ]);

  const handleOpenInMaps = (location: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location,
    )}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o mapa.'),
    );
  };

  const confirmAddProgram = async (date: Date) => {
    const exists = event?.programs?.some(
      (p) => new Date(p.date).toDateString() === date.toDateString(),
    );

    if (!event) return;

    if (exists) {
      Alert.alert('Erro', 'Já existe um programa para esta data.');
      return;
    }

    setIsAddingProgram(true);
    try {
      await addProgram(event.id, date);
      await loadEvent({ silent: true }); // ✅ atualiza sem piscar
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar o dia.');
    } finally {
      setIsAddingProgram(false);
    }
  };

  const handleDateChange = (e: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (e.type === 'dismissed') return;
    if (!date) return;

    setSelectedDate(date);
    if (Platform.OS !== 'ios') confirmAddProgram(date);
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
      {/* ⏳ Overlay de Exclusão */}
      {isDeleting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Excluindo evento...</Text>
        </View>
      )}

      {/* 🎉 Sucesso na Exclusão */}
      {isDeletionFinished && (
        <View style={styles.loadingOverlay}>
          <CheckCircle size={80} color="#4CAF50" />
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Evento Excluído!
          </Text>
          <Text style={[styles.successSub, { color: colors.textSecondary }]}>
            O evento foi removido de todos os registros.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={[styles.finishBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.finishBtnText}>Ir para Meus Eventos</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ Header sempre consistente */}
      <Stack.Screen options={headerOptions} />

      {/* Header Descritivo */}
      {!initialLoading && event && (
        <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Veja as informações completas e acompanhe a programação do evento:
          </Text>
        </View>
      )}

      {/* ✅ Primeira carga */}
      {initialLoading ? (
        <EventDetailSkeleton />
      ) : !event ? (
        // ✅ Erro sem evento
        <View style={styles.centeredContent}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {errorMsg ?? 'Evento indisponível.'}
          </Text>

          <Button 
            title="Tentar novamente" 
            variant="outline"
            onPress={() => loadEvent({ silent: false })}
            style={{ marginTop: 14 }}
          />

          <Button 
            title="Voltar" 
            variant="ghost"
            onPress={() => router.back()}
            style={{ marginTop: 10 }}
            textStyle={{ color: colors.textSecondary }}
          />
        </View>
      ) : (
        // ✅ Tela normal
        <>
          {event.coverImage && (
            <ImageBackground
              source={{ uri: event.coverImage }}
              style={styles.coverImage}
            >
              <View style={styles.overlayBottom}>
                <Text style={styles.coverTitle}>{event.title}</Text>

                <View style={styles.row}>
                  <CalendarDays size={16} color="#fff" />
                  <Text style={styles.meta}>
                    {(() => {
                      const start = new Date(event.startDate).toLocaleDateString('pt-BR');
                      const end = new Date(event.endDate).toLocaleDateString('pt-BR');
                      return start === end ? start : `${start} até ${end}`;
                    })()}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleOpenInMaps(event.location)}
                  style={[styles.mapBtn, { borderColor: 'rgba(255,255,255,0.3)' }]}
                  activeOpacity={0.85}
                >
                  <View style={styles.animaps}>
                    <LottieView
                      source={require('@/assets/images/animaps.json')}
                      autoPlay
                      loop
                      style={styles.lottieIcon}
                    />
                  </View>

                  <Text
                    style={[styles.mapBtnText, { color: '#f0f0f0' }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {event.location}
                  </Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          )}

          {!!event.description && (
            <View style={styles.descriptionCard}>
              <Text style={[styles.descriptionHeader, { color: colors.text }]}>
                Sobre o evento
              </Text>
              <Text
                style={[
                  styles.eventDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {event.description}
              </Text>
            </View>
          )}

          {isGuest && !hasPermission && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(stack)/events/[id]/edit-my-participation',
                  params: { id: event.id },
                })
              }
              activeOpacity={0.8}
              style={[
                styles.guestActionCard,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.primary,
                },
              ]}
            >
              <View style={styles.guestActionIconWrap}>
                <Users size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.guestActionTitle, { color: colors.text }]}>
                  Minha Participação
                </Text>
                <Text
                  style={[
                    styles.guestActionSub,
                    { color: colors.textSecondary },
                  ]}
                >
                  Editar seus dados e acompanhantes
                </Text>
              </View>
              <ChevronRight
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Programação diária
            </Text>

            {hasPermission && (
              <View style={{ flexDirection: 'row' }}>
                <View style={[styles.buttonRow, { marginBottom: 10 }]}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={[
                      styles.controlButton,
                      { borderColor: colors.primary },
                      isAddingProgram && styles.disabled,
                    ]}
                    disabled={isAddingProgram}
                    activeOpacity={0.8}
                  >
                    <Plus size={18} color={colors.text} />
                    <Text
                      style={[styles.controlButtonText, { color: colors.text }]}
                    >
                      Dia
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadEvent({ silent: true })}
              />
            }
          >
            {event.programs?.length ? (
              event.programs
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime(),
                )
                .map((program) => (
                  <ProgramItem
                    key={program.id}
                    program={program}
                    eventId={event.id}
                  />
                ))
            ) : (
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 20,
                }}
              >
                {isAddingProgram ? '' : 'Nenhuma programação ainda.'}
              </Text>
            )}

          </ScrollView>

          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              minimumDate={new Date(event.startDate)}
              maximumDate={new Date(event.endDate)}
              onChange={handleDateChange}
            />
          )}
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,10,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginTop: 20,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    marginTop: 8,
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  finishBtn: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  finishBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },

  coverImage: {
    width: '100%',
    height: 220,
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  overlayBottom: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    paddingLeft: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  coverTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#fff',
    paddingBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { color: 'white', fontSize: 13, fontFamily: Fonts.regular },

  descriptionCard: {
    marginHorizontal: 18,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(87, 6, 6, 0.05)',
  },
  descriptionHeader: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    textAlign: 'justify',
  },

  sectionHeader: {
    alignContent: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 18,
  },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold },

  headerActions: { flexDirection: 'row', gap: 12 },

  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'stretch',
    width: '96%',
  },
  mapBtnText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    flexShrink: 1,
    textAlign: 'center',
    lineHeight: 16,
  },

  lottieIcon: { width: 30, height: 30 },
  animaps: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: '#fefefe',
    borderRadius: 50,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },

  buttonRow: { flexDirection: 'row', gap: 16 },
  controlButton: {
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  controlButtonText: {
    fontSize: 14,
    justifyContent: 'center',
    fontFamily: Fonts.medium,
  },
  disabled: { opacity: 0.5 },
  footerActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  guestActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    gap: 12,
  },
  guestActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestActionTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  guestActionSub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
});
