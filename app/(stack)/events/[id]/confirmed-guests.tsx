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
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { getAuth } from 'firebase/auth';
import { getGuestParticipationsByEventId } from '@/hooks/guestService';
import { useEvents } from '@/context/EventsContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Edit, Trash2, CheckCircle, XCircle, UserPlus, Users, Eye, FileDown, Share } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Button from '@/components/ui/Button';
import { logger } from '@/lib/logger';

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
  const [exporting, setExporting] = useState(false);

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
      if (hasPermission) {
        // ✅ Admin: Buscar todos
        const participations = await getGuestParticipationsByEventId(eventId);
        setGuests(participations as GuestParticipation[]);
      } else {
        // ✅ Guest: Buscar apenas o meu
        // (Isso evita erro de permissão se a rule de listagem for restrita)
        // Precisamos importar getGuestParticipation se não estiver
        const { getGuestParticipation } = require('@/hooks/guestService');
        const myPart = await getGuestParticipation(myUid, eventId);
        setGuests(myPart ? [myPart as GuestParticipation] : []);
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message ?? 'Falha ao buscar convidados.');
    } finally {
      setLoading(false);
    }
  }, [eventId, hasPermission, myUid]);

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
    return guests.filter((g) => g.mode === activeTab);
  }, [guests, activeTab]);

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
        logger.error(e);
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
        logger.error(e);
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

  // ---------- PDF Export ----------
  const handleExportPDF = useCallback(async () => {
    if (guests.length === 0) return;
    try {
      setExporting(true);

      const eventTitle = event?.title ?? 'Evento';
      const eventDate = event?.startDate
        ? new Date(event.startDate).toLocaleDateString('pt-BR')
        : '';
      const eventLocation = event?.location ?? '';
      const now = new Date().toLocaleDateString('pt-BR');

      // Apenas confirmados, ordenados por nome
      const sorted = guests
        .filter((g) => g.mode === 'confirmado')
        .sort((a, b) => (a.userName ?? '').localeCompare(b.userName ?? '', 'pt-BR'));

      let tableRows = '';
      let rowNum = 1;
      for (const g of sorted) {
        const guestName = g.userName || 'Convidado';
        const statusLabel = g.mode === 'confirmado' ? 'Confirmado' : 'Acompanhando';
        const statusColor = g.mode === 'confirmado' ? '#16a34a' : '#d97706';

        // Main guest row
        tableRows += `
          <tr>
            <td style="text-align:center">${rowNum++}</td>
            <td>${guestName}</td>
            <td style="color:${statusColor};font-weight:bold">${statusLabel}</td>
            <td>—</td>
          </tr>`;

        // Family members
        if (g.family && g.family.length > 0) {
          for (const member of g.family) {
            tableRows += `
              <tr style="background:#f9f9f9">
                <td style="text-align:center">${rowNum++}</td>
                <td style="padding-left:24px">👤 ${member}</td>
                <td style="color:#6b7280">Acompanhante</td>
                <td>${guestName}</td>
              </tr>`;
          }
        }
      }

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
              h1 { text-align: center; color: #1d1d1f; margin-bottom: 4px; font-size: 22px; }
              .subtitle { text-align: center; color: #555; font-size: 13px; margin-bottom: 4px; }
              .meta { text-align: center; color: #888; font-size: 12px; margin-bottom: 20px; }
              .summary { display: flex; gap: 16px; margin-bottom: 20px; }
              .summary-box { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; }
              .summary-box .num { font-size: 28px; font-weight: bold; }
              .summary-box .label { font-size: 12px; color: #666; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; font-size: 13px; }
              th { background: #f3f4f6; text-align: left; padding: 8px 10px; border: 1px solid #e5e7eb; color: #374151; }
              td { padding: 7px 10px; border: 1px solid #e5e7eb; vertical-align: middle; }
              tr:nth-child(even) td { background: #fafafa; }
              .footer { margin-top: 24px; text-align: center; color: #aaa; font-size: 11px; }
            </style>
          </head>
          <body>
            <h1>Lista de Convidados</h1>
            <p class="subtitle">${eventTitle}</p>
            <p class="meta">${eventDate}${eventLocation ? ' &bull; ' + eventLocation : ''}</p>

            <div class="summary">
              <div class="summary-box">
                <div class="num" style="color:#16a34a">${totals.confirmado}</div>
                <div class="label">Confirmados</div>
              </div>
              <div class="summary-box">
                <div class="num" style="color:#d97706">${totals.acompanhando}</div>
                <div class="label">Acompanhando</div>
              </div>
              <div class="summary-box">
                <div class="num">${totals.confirmado + totals.acompanhando}</div>
                <div class="label">Total</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:40px">#</th>
                  <th>Nome</th>
                  <th style="width:130px">Status</th>
                  <th style="width:130px">Convidado por</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <p class="footer">Gerado em ${now} &bull; Plannix</p>
          </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Lista de Convidados' });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setExporting(false);
    }
  }, [guests, event, totals]);

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
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.cardHeader}>
             <View style={{ flex: 1 }}>
                <Text style={[styles.guestName, { color: colors.text }]}>
                    {item.userName || 'Convidado'}
                </Text>
                {/* Status Badge */}
                <View style={[
                    styles.statusBadge, 
                    { 
                        backgroundColor: item.mode === 'confirmado' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        borderColor: item.mode === 'confirmado' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'
                    }
                ]}>
                    {item.mode === 'confirmado' ? (
                        <CheckCircle size={12} color="#22c55e" />
                    ) : (
                        <Eye size={12} color="#eab308" />
                    )}
                    <Text style={[
                        styles.statusText, 
                        { color: item.mode === 'confirmado' ? '#22c55e' : '#eab308' }
                    ]}>
                        {item.mode === 'confirmado' ? 'Confirmado' : 'Acompanhando'}
                    </Text>
                </View>
             </View>

            {/* Actions Top Right */}
             <View style={{ flexDirection: 'row', gap: 8 }}>
                 {canEditOrToggle && (
                     <Pressable
                        onPress={() => goToEdit(item)}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1, backgroundColor: colors.background }]}
                     >
                         <Edit size={18} color={colors.primary} />
                     </Pressable>
                 )}
                 {canRemove && (
                     <Pressable
                        disabled={busyId === item.id}
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
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1, backgroundColor: colors.background }]}
                     >
                        {busyId === item.id ? (
                             <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                             <Trash2 size={18} color={colors.error} />
                        )}
                     </Pressable>
                 )}
             </View>
          </View>

          {hasFamily ? (
            <View style={styles.familyContainer}>
              <Text style={[styles.guestInfoLabel, { color: colors.textSecondary }]}>
                <Users size={12} color={colors.textSecondary} /> Acompanhantes ({item.family?.length}):
              </Text>
              <View style={styles.familyList}>
                {item.family!.map((member: any, index: number) => {
                    const name = typeof member === 'string' ? member : member.name;
                    const isChild = typeof member === 'object' && member.isChild;
                    const age = typeof member === 'object' ? member.age : null;

                    return (
                        <Text key={index} style={[styles.familyMember, { color: colors.textSecondary }]}>
                            • {name}
                            {isChild && ` (Criança${age ? `, ${age} anos` : ''})`}
                        </Text>
                    );
                })}
              </View>
            </View>
          ) : (
             <Text style={[styles.noFamily, { color: colors.textSecondary }]}>
                Sem acompanhantes
             </Text>
          )}

           {/* Toggle Status Button (Full Width if needed, or row) */}
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
                  style={({ pressed }) => [
                    styles.toggleStatusBtn,
                    {
                      borderColor: colors.border,
                       backgroundColor: colors.background,
                      opacity: busyId === item.id ? 0.6 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {busyId === item.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                        {item.mode === 'confirmado' ? (
                            <Eye size={16} color={colors.text} />
                        ) : (
                            <CheckCircle size={16} color={colors.text} />
                        )}
                        <Text style={[styles.toggleStatusText, { color: colors.text }]}>
                            {item.mode === 'confirmado' ? 'Mudar para Acompanhando' : 'Confirmar Presença'}
                        </Text>
                    </>
                  )}
                </Pressable>
              )}
        </View>
      );
    },
    [
      myUid,
      hasPermission,
      colors,
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
      <Stack.Screen options={{ title: 'Convidados' }} />
      
      <View style={{ marginTop: 8, marginBottom: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          Acompanhe e gerencie a lista de presença e convidados do:
        </Text>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
          {event?.title || '...'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => setActiveTab('confirmado')}
          style={[
            styles.tabBtn,
            {
              borderBottomColor:
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
            ✅ Confirmados ({totals.confirmado})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('acompanhando')}
          style={[
            styles.tabBtn,
            {
              borderBottomColor:
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
      </View>

      {filteredGuests.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Nenhum convidado nesta categoria.
        </Text>
      ) : (
        <FlatList
          data={filteredGuests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={renderItem}
        />
      )}

      {hasPermission && (
        <View style={[styles.footer, { backgroundColor: colors.backgroundCard, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Button
              title="Adicionar Convidado"
              onPress={() =>
                router.push({
                  pathname: '/(stack)/events/[id]/add-guest-manual',
                  params: { id: eventId },
                } as any)
              }
              icon={<UserPlus size={20} color="#fff" />}
              style={{ height: 48, borderRadius: 30 }}
            />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Button
              title="PDF"
              onPress={handleExportPDF}
              loading={exporting}
              variant="outline"
              disabled={guests.length === 0}
              icon={<Share size={20} color={guests.length > 0 ? colors.primary : colors.textSecondary} />}
              style={{ height: 48, borderColor: guests.length > 0 ? colors.primary : colors.border, borderRadius: 30 }}
              textStyle={{ color: guests.length > 0 ? colors.primary : colors.textSecondary }}
            />
          </View>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#33333330', // Leve separador
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    alignItems: 'center',
  },
  tabText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  
  guestItem: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
      alignSelf: 'flex-start',
      borderWidth: 1,
      gap: 6
  },
  statusText: {
      fontSize: 12,
      fontWeight: '600',
      fontFamily: 'Inter_600SemiBold',
  },
  iconBtn: {
      padding: 8,
      borderRadius: 16,
  },
  familyContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.05)',
  },
  guestInfoLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  familyList: {
      paddingLeft: 4,
  },
  familyMember: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      marginBottom: 2,
  },
  noFamily: {
      marginTop: 8,
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      fontStyle: 'italic',
  },
  toggleStatusBtn: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
  },
  toggleStatusText: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Inter_600SemiBold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
