import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { getAuth } from 'firebase/auth';
import { getGuestParticipationsByEventId } from '@/hooks/guestService';
import { useEvents } from '@/context/EventsContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

type GuestMode = 'confirmado' | 'acompanhando';

type GuestParticipation = {
  id: string;
  eventId: string;
  userId: string; // ✅ existe no seu doc
  userName?: string;
  mode: GuestMode;
  family?: string[];
};

export default function ConfirmedGuestsScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, fetchEvents } = useEvents();

  const [guests, setGuests] = useState<GuestParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<GuestMode>('confirmado');
  const [busyId, setBusyId] = useState<string | null>(null);

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const myUid = getAuth().currentUser?.uid ?? '';

  const event = useMemo(
    () => state.events.find((e) => e.id === eventId),
    [state.events, eventId],
  );

  /**
   * ✅ Regra nova (UID):
   * - Criador: event.userId === myUid
   * - Super Admin: event.subAdminsByUid?.[myUid] === 'Super Admin'
   */
  const hasPermission = useMemo(() => {
    if (!event || !myUid) return false;

    const isCreator = (event.userId ?? '') === myUid;
    const level = event.subAdminsByUid?.[myUid];
    const isSuperAdmin = level === 'Super Admin';

    return isCreator || isSuperAdmin;
  }, [event, myUid]);

  const fetchGuests = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      const participations = await getGuestParticipationsByEventId(eventId);
      setGuests(participations as GuestParticipation[]);
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Falha ao buscar convidados.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        await fetchGuests();
      })();
      return () => {
        active = false;
      };
    }, [fetchGuests]),
  );

  const totals = useMemo(() => {
    return guests.reduce(
      (acc, g) => {
        const count = 1 + (g.family?.length ?? 0);
        if (g.mode === 'confirmado') acc.confirmado += count;
        else acc.acompanhando += count;
        return acc;
      },
      { confirmado: 0, acompanhando: 0 },
    );
  }, [guests]);

  const myParticipation = useMemo(() => {
    return guests.find((g) => g.userId === myUid) ?? null;
  }, [guests, myUid]);

  const myMode: GuestMode | null = myParticipation?.mode ?? null;

  /**
   * ✅ Admin vê por aba (confirmados/acompanhando)
   * ✅ Participante sem permissão: vê apenas o próprio registro
   */
  const filteredGuests = useMemo(() => {
    if (!hasPermission) return guests.filter((g) => g.userId === myUid);
    return guests.filter((g) => g.mode === activeTab);
  }, [guests, hasPermission, activeTab, myUid]);

  /**
   * ✅ update otimista com rollback seguro
   */
  const updateParticipationMode = useCallback(
    async (guestId: string, newMode: GuestMode) => {
      setBusyId(guestId);

      const snapshot = guests.find((g) => g.id === guestId);

      // otimista
      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, mode: newMode } : g)),
      );

      try {
        await updateDoc(doc(db, 'guestParticipations', guestId), {
          mode: newMode,
          updatedAt: new Date(), // se preferir Timestamp.now(), ajuste aqui
        } as any);
      } catch (e: any) {
        console.error(e);
        Alert.alert(
          'Erro',
          e?.message ?? 'Não foi possível atualizar a participação.',
        );

        if (snapshot) {
          setGuests((prev) =>
            prev.map((g) => (g.id === guestId ? snapshot : g)),
          );
        }
      } finally {
        setBusyId(null);
      }
    },
    [guests],
  );

  /**
   * ✅ remove otimista com rollback seguro
   */
  const removeParticipation = useCallback(
    async (guestId: string) => {
      setBusyId(guestId);

      const snapshot = guests.find((g) => g.id === guestId);
      const isOwn = snapshot?.userId === myUid;

      // otimista
      setGuests((prev) => prev.filter((g) => g.id !== guestId));

      try {
        await deleteDoc(doc(db, 'guestParticipations', guestId));

        // ✅ se eu saí do evento, some de "meus eventos" imediatamente
        if (isOwn) {
          await fetchEvents();
          router.replace('/(stack)/myevents');
          return;
        }
      } catch (e: any) {
        console.error(e);
        Alert.alert(
          'Erro',
          e?.message ?? 'Não foi possível remover o convidado.',
        );

        // rollback
        if (snapshot) setGuests((prev) => [snapshot, ...prev]);
      } finally {
        setBusyId(null);
      }
    },
    [guests, myUid, fetchEvents, router],
  );

  const goToEdit = useCallback(
    (item: GuestParticipation) => {
      if (!eventId) return;

      const isOwn = item.userId === myUid;

      if (isOwn) {
        router.push({
          pathname: '/(stack)/events/[id]/edit-my-participation',
          params: { id: eventId },
        } as any);
        return;
      }

      const guestDocId = encodeURIComponent(item.id);
      router.push({
        pathname: '/(stack)/events/[id]/edit-participation/[guestId]',
        params: { id: eventId, guestId: item.id },
      } as any);
    },
    [router, eventId, myUid],
  );

  const renderItem = useCallback(
    ({ item }: { item: GuestParticipation }) => {
      const isOwn = item.userId === myUid;
      const isAdmin = hasPermission;

      // ✅ regra: NÃO exibir toggle para o próprio admin
      const canToggleStatus = hasPermission || isOwn;

      // ✅ editar e mudar status: admin OU próprio
      const canEditOrToggle = hasPermission || isOwn;

      // ✅ remover: somente admin
      const canRemove = hasPermission || isOwn;

      const hasFamily = (item.family?.length ?? 0) > 0;
      const total = 1 + (item.family?.length ?? 0);

      return (
        <View
          style={[
            styles.guestItem,
            {
              backgroundColor: colors.backGroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.guestName, { color: colors.text }]}>
            {item.userName || 'Convidado'}
          </Text>

          {hasFamily && canEditOrToggle ? (
            <>
              <Text style={[styles.guestInfo, { color: colors.textSecondary }]}>
                Acompanhantes:
              </Text>
              <Text style={[styles.guestInfo, { color: colors.textSecondary }]}>
                {'🤝    '}
                {item.family!.join('\n🤝    ')}
              </Text>
              <Text
                style={[
                  styles.guestInfo,
                  { color: colors.textSecondary, marginTop: 6 },
                ]}
              >
                Total: {total} {total > 1 ? 'pessoas' : 'pessoa'}
              </Text>
            </>
          ) : (
            <Text style={[styles.guestInfo, { color: colors.textSecondary }]}>
              Sem acompanhantes
            </Text>
          )}

          {canEditOrToggle && (
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => goToEdit(item)}
                style={[styles.actionBtn, { borderColor: colors.primary }]}
              >
                <Text style={[styles.actionText, { color: colors.text2 }]}>
                  ✏️ Editar
                </Text>
              </Pressable>

              {canToggleStatus && (
                <Pressable
                  disabled={busyId === item.id}
                  onPress={() =>
                    Alert.alert(
                      item.mode === 'confirmado'
                        ? 'Mudar para Acompanhando?'
                        : 'Confirmar presença?',
                      item.mode === 'confirmado'
                        ? 'Cancelar confirmação de presença. Deseja continuar?'
                        : 'Você será marcado como confirmado no evento.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Sim',
                          onPress: () =>
                            updateParticipationMode(
                              item.id,
                              item.mode === 'confirmado'
                                ? 'acompanhando'
                                : 'confirmado',
                            ),
                        },
                      ],
                    )
                  }
                  style={[
                    styles.actionBtn,
                    {
                      borderColor: colors.primary,
                      opacity: busyId === item.id ? 0.6 : 1,
                    },
                  ]}
                >
                  {busyId === item.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.actionText, { color: colors.text2 }]}>
                      {item.mode === 'confirmado' ? '👀 Mudar' : '✅ Confirmar'}
                    </Text>
                  )}
                </Pressable>
              )}

              <Pressable
                disabled={!canRemove || busyId === item.id}
                onPress={() =>
                  Alert.alert(
                    isOwn ? 'Sair do evento?' : 'Remover convidado?',
                    isOwn
                      ? 'Tem certeza que deseja cancelar sua participação no evento?'
                      : 'Tem certeza que deseja remover este convidado do evento?',

                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Remover',
                        style: 'destructive',
                        onPress: () => removeParticipation(item.id),
                      },
                    ],
                  )
                }
                style={[
                  styles.actionBtn,
                  {
                    borderColor: colors.primary,
                    opacity: !canRemove || busyId === item.id ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={[styles.actionText, { color: colors.text2 }]}>
                  🗑️
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      );
    },
    [
      myUid,
      hasPermission,
      colors.backGroundSecondary,
      colors.border,
      colors.primary,
      colors.text,
      colors.text2,
      colors.textSecondary,
      busyId,
      goToEdit,
      removeParticipation,
      updateParticipationMode,
    ],
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs + Add */}
      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => setActiveTab('confirmado')}
          style={[
            styles.tabBtn,
            {
              borderColor:
                activeTab === 'confirmado' ? colors.primary : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'confirmado'
                    ? colors.primary
                    : colors.textSecondary,
                fontWeight: activeTab === 'confirmado' ? '700' : '400',
              },
            ]}
          >
            ✅ Confirmados {hasPermission ? `(${totals.confirmado})` : ''}
          </Text>
        </Pressable>

        {hasPermission && (
          <Pressable
            onPress={() => setActiveTab('acompanhando')}
            style={[
              styles.tabBtn,
              {
                borderColor:
                  activeTab === 'acompanhando' ? colors.primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'acompanhando'
                      ? colors.primary
                      : colors.textSecondary,
                  fontWeight: activeTab === 'acompanhando' ? '700' : '400',
                },
              ]}
            >
              👀 Acompanhando ({totals.acompanhando})
            </Text>
          </Pressable>
        )}

        {hasPermission && (
          <Pressable
            onPress={() => router.push(`/(stack)/events/${eventId}/add-guest`)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>＋</Text>
          </Pressable>
        )}
      </View>

      {filteredGuests.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Nenhum convidado nesta categoria.
        </Text>
      ) : (
        <FlatList
          data={filteredGuests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    alignItems: 'center',
  },
  tabText: { fontSize: 14 },
  addBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  guestItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
    paddingLeft: 18,
  },
  guestInfo: {
    marginLeft: 18,
    marginTop: 6,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: 14,
  },

  actionBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionText: { fontWeight: '600', fontSize: 13 },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
});
