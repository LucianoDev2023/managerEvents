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
import { useColorScheme } from 'react-native';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  CalendarDays,
} from 'lucide-react-native';
import ProgramItem from '@/components/ProgramItem';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import LottieView from 'lottie-react-native';

import type { Guest, Event } from '@/types';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function EventDetailScreen() {
  const { refetchEventById, deleteEvent, addProgram, getGuestsByEventId } =
    useEvents();

  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const userUid = getAuth().currentUser?.uid ?? '';

  const [event, setEvent] = useState<Event | null>(null);

  // ✅ loading só para primeira carga
  const [initialLoading, setInitialLoading] = useState(true);
  // ✅ refresh quando puxa para atualizar / volta pra tela
  const [refreshing, setRefreshing] = useState(false);

  const [isAddingProgram, setIsAddingProgram] = useState(false);
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
        setErrorMsg('Não foi possível carregar os dados do evento.');
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
              onPress={() => router.back()}
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
                                await deleteEvent(event.id);
                                router.replace('/');
                              } catch {
                                Alert.alert(
                                  'Erro',
                                  'Não foi possível excluir o evento.',
                                );
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
      {/* ✅ Header sempre consistente */}
      <Stack.Screen options={headerOptions} />

      {/* ✅ Primeira carga */}
      {initialLoading ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.centeredContent}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[
              styles.emptyText,
              { color: colors.textSecondary, marginTop: 12 },
            ]}
          >
            Carregando programação...
          </Text>
        </Animated.View>
      ) : !event ? (
        // ✅ Erro sem evento
        <View style={styles.centeredContent}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {errorMsg ?? 'Evento indisponível.'}
          </Text>

          <TouchableOpacity
            onPress={() => loadEvent({ silent: false })}
            style={{
              marginTop: 14,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.primary,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: colors.text }}>Tentar novamente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 10 }}
            activeOpacity={0.85}
          >
            <Text style={{ color: colors.textSecondary }}>Voltar</Text>
          </TouchableOpacity>
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
                    {new Date(event.startDate).toLocaleDateString('pt-BR')} até{' '}
                    {new Date(event.endDate).toLocaleDateString('pt-BR')}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleOpenInMaps(event.location)}
                  style={[styles.mapBtn, { borderColor: colors.border }]}
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
                    style={[styles.mapBtnText, { color: colors.textSecondary }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {event.location}
                  </Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
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

                  <TouchableOpacity
                    onPress={() =>
                      router.push(
                        `/events/${event.id}/eventOrganizerNoteViewScreen`,
                      )
                    }
                    style={[
                      styles.controlButton,
                      { borderColor: colors.primary },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Edit size={18} color={colors.text} />
                    <Text
                      style={[styles.controlButtonText, { color: colors.text }]}
                    >
                      Notas
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
    fontFamily: 'Inter-Bold',
    color: '#fff',
    paddingBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { color: 'white', fontSize: 13, fontFamily: 'Inter-Regular' },

  sectionHeader: {
    alignContent: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 18,
  },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-Bold' },

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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter_400Regular',
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
    fontFamily: 'Inter_500Medium',
  },
  disabled: { opacity: 0.5 },
});
