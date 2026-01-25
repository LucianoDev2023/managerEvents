import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { MapPin, Pencil, Trash2 } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { getAuth } from 'firebase/auth';

import { getGuestParticipationsByEventId } from '@/hooks/guestService';
import type { GuestParticipation } from '@/types/guestParticipation';
import type { Event } from '@/types';

// ✅ util de permissões do seu projeto
import {
  canDeleteEvent,
  canEditEvent,
  canManagePermissions,
  getMyAdminLevel,
  normalizeSubAdminsByUid,
  canAssignLevel,
  type AdminPermissionLevel,
} from '@/src/helpers/eventPermissions';

function shortUid(uid: string) {
  return uid.length > 10 ? `${uid.slice(0, 6)}…${uid.slice(-4)}` : uid;
}

/**
 * ✅ UI: rótulo do papel exibido na lista
 * - Se for criador: sempre "Super Admin"
 * - Se for subadmin: usa o nível salvo
 */
function getDisplayRoleLabel(
  event: Event,
  uid: string,
  level?: AdminPermissionLevel,
) {
  if (event.userId === uid) return 'Super Admin';
  return (
    level ??
    (event.subAdminsByUid?.[uid] as AdminPermissionLevel) ??
    'Convidado'
  );
}

/**
 * ✅ regra pedida:
 * - Se a linha for o usuário logado, NÃO mostra edição (só mostra a role)
 * - Se não for o usuário logado: respeita canManage
 */
function canEditRow(
  canManage: boolean,
  userUid: string | null,
  rowUid: string,
) {
  if (!canManage) return false;
  if (!userUid) return false;
  return userUid !== rowUid; // 🔥 aqui é a regra principal
}

export default function PermissionConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateEvent } = useEvents();

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const auth = getAuth();
  const userUid = auth.currentUser?.uid ?? null;

  const event = useMemo(
    () => (state.events.find((e) => e.id === id) as Event | undefined) ?? null,
    [state.events, id],
  );

  // gradiente padrão do app
  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  // =========================================
  // Permissões do usuário atual
  // =========================================
  const myAdminLevel = useMemo(
    () => getMyAdminLevel(event, userUid),
    [event, userUid],
  );

  const canManage = useMemo(
    () => canManagePermissions(event, userUid),
    [event, userUid],
  );
  const canEdit = useMemo(() => canEditEvent(event, userUid), [event, userUid]);
  const canDelete = useMemo(
    () => canDeleteEvent(event, userUid),
    [event, userUid],
  );

  // =========================================
  // Subadmins (normalizados)
  // =========================================
  const { subAdminsByUid } = useMemo(() => {
    if (!event)
      return { subAdminsByUid: {} as Record<string, AdminPermissionLevel> };
    return normalizeSubAdminsByUid({ subAdminsByUid: event.subAdminsByUid });
  }, [event]);

  const entries = useMemo(
    () =>
      Object.entries(subAdminsByUid) as Array<[string, AdminPermissionLevel]>,
    [subAdminsByUid],
  );

  // =========================================
  // Guests / participations
  // =========================================
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [guestParts, setGuestParts] = useState<GuestParticipation[]>([]);
  const [selectGuestModal, setSelectGuestModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const guestNameByUid = useMemo(() => {
    const map = new Map<string, string>();
    guestParts.forEach((p) => {
      if (!p.userId) return;
      const label =
        (p.userName ?? '').trim() || `Usuário ${shortUid(p.userId)}`;
      map.set(p.userId, label);
    });
    return map;
  }, [guestParts]);

  const loadGuests = useCallback(async () => {
    if (!event?.id) return;

    setGuestsLoading(true);
    try {
      const parts = await getGuestParticipationsByEventId(event.id);

      const normalized = (parts ?? [])
        // ✅ tem userId e do evento certo
        .filter((p) => !!p?.userId && p.eventId === event.id)

        // ✅ remove criador
        .filter((p) => p.userId !== event.userId)

        // ✅ aceita os modes do seu app + legado
        .filter(
          (p) =>
            p.mode === 'confirmado' ||
            p.mode === 'acompanhando' ||
            p.mode === 'confirmed' ||
            p.mode === 'interested',
        )

        // ✅ sempre tem label
        .map((p) => ({
          ...p,
          userName:
            (p.userName ?? '').trim() || `Usuário ${shortUid(p.userId)}`,
        }))

        // ✅ ordena: confirmado antes
        .sort((a, b) => {
          const rank = (m?: string) =>
            m === 'confirmado' || m === 'confirmed' ? 0 : 1;
          const r = rank(a.mode) - rank(b.mode);
          if (r !== 0) return r;
          return (a.userName ?? '').localeCompare(b.userName ?? '');
        });

      setGuestParts(normalized);
    } catch (e) {
      console.error('loadGuests:', e);
      Alert.alert('Erro', 'Não foi possível carregar os convidados.');
      setGuestParts([]);
    } finally {
      setGuestsLoading(false);
    }
  }, [event?.id, event?.userId]);

  const [guestQuery, setGuestQuery] = useState('');

  const filteredGuestParts = useMemo(() => {
    const q = guestQuery.trim().toLowerCase();
    if (!q) return guestParts;

    return guestParts.filter((p) => {
      const name = (p.userName ?? '').toLowerCase();
      const uid = (p.userId ?? '').toLowerCase();
      const mode = (p.mode ?? '').toLowerCase();

      const isConfirmado = p.mode === 'confirmado';
      const isAcompanhando = p.mode === 'acompanhando';

      return (
        name.includes(q) ||
        uid.includes(q) ||
        mode.includes(q) ||
        (q === 'confirmado' && isConfirmado) ||
        (q === 'acompanhando' && isAcompanhando)
      );
    });
  }, [guestParts, guestQuery]);

  // ===============================
  // ETAPA 1 — convidados elegíveis
  // ===============================
  const selectableGuests = useMemo(() => {
    return filteredGuestParts
      .filter((p) => p.userId !== userUid) // remove eu mesmo
      .filter((p) => p.userId !== event?.userId) // remove criador (segurança extra)
      .filter((p) => !subAdminsByUid[p.userId]); // remove quem já tem permissão
  }, [filteredGuestParts, userUid, event?.userId, subAdminsByUid]);

  const allGuestsCount = filteredGuestParts.length;
  const selectableCount = selectableGuests.length;

  // =========================================
  // UI state: modais / edição
  // =========================================
  const [modalVisible, setModalVisible] = useState(false);

  const [permissionLevel, setPermissionLevel] =
    useState<AdminPermissionLevel>('Admin parcial');

  const [editingUid, setEditingUid] = useState<string | null>(null);

  const [selectedGuestUid, setSelectedGuestUid] = useState<string | null>(null);
  const [selectedGuestLabel, setSelectedGuestLabel] = useState('');

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Evento não encontrado.</Text>
      </View>
    );
  }

  // =========================================
  // Ações
  // =========================================
  const openAdd = async () => {
    if (!canManage) return;

    setEditingUid(null);
    setPermissionLevel('Admin parcial');
    setSelectedGuestUid(null);
    setSelectedGuestLabel('');
    setGuestQuery('');

    setSelectGuestModal(true);
    await loadGuests();
  };

  const openEdit = (uid: string, level: AdminPermissionLevel) => {
    if (!canManage) return;

    // ✅ regra do pedido: se for o usuário logado, não edita
    if (userUid && uid === userUid) return;

    setEditingUid(uid);
    setSelectedGuestUid(null);
    setSelectedGuestLabel('');
    setPermissionLevel(level);
    setModalVisible(true);
  };

  const handleRemove = (uidToRemove: string) => {
    if (!canManage) return;

    // ✅ regra do pedido: se for o usuário logado, não remove
    if (userUid && uidToRemove === userUid) return;

    Alert.alert('Remover permissão', 'Deseja remover esta permissão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            const next = { ...subAdminsByUid };
            delete next[uidToRemove];

            await updateEvent({
              ...event,
              subAdminsByUid: next,
            } as any);
          } catch (e: any) {
            Alert.alert(
              'Erro',
              `${e?.code ?? ''} ${e?.message ?? 'Não foi possível remover.'}`,
            );
          }
        },
      },
    ]);
  };

  const closePermissionModal = () => {
    setModalVisible(false);
    setEditingUid(null);
  };

  const handleSavePermission = () => {
    if (!canAssignLevel(myAdminLevel, permissionLevel)) {
      Alert.alert(
        'Permissão inválida',
        'Admins parciais não podem atribuir Super Admin.',
      );
      return;
    }

    const uidToApply = editingUid ?? selectedGuestUid;

    if (!uidToApply) {
      Alert.alert('Atenção', 'Selecione um convidado.');
      return;
    }

    if (!editingUid) {
      if (uidToApply === event.userId) {
        Alert.alert('Atenção', 'O criador do evento já possui controle total.');
        return;
      }
      if (subAdminsByUid[uidToApply]) {
        Alert.alert('Atenção', 'Este convidado já possui uma permissão.');
        return;
      }
    }

    const label =
      selectedGuestLabel ||
      guestNameByUid.get(uidToApply) ||
      shortUid(uidToApply);

    const doSave = async () => {
      if (saving) return; // evita duplo clique

      setSaving(true);
      try {
        await updateEvent({
          ...event,
          subAdminsByUid: {
            ...subAdminsByUid,
            [uidToApply]: permissionLevel,
          },
        } as any);

        // fecha só se salvou
        setSelectedGuestUid(null);
        setSelectedGuestLabel('');
        setModalVisible(false);
        setSelectGuestModal(false);
        setEditingUid(null);

        Alert.alert('Sucesso', `Permissão atribuída para ${label}.`);
      } catch (e: any) {
        Alert.alert(
          'Erro ao salvar permissão',
          `${e?.code ?? ''} ${e?.message ?? 'Tente novamente.'}`.trim(),
        );
      } finally {
        setSaving(false);
      }
    };

    // confirmação só quando é adição (não edição)
    if (!editingUid) {
      Alert.alert(
        'Confirmar permissão',
        `Tem certeza que deseja atribuir "${permissionLevel}" para "${label}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Confirmar', style: 'default', onPress: doSave },
        ],
      );
      return;
    }

    // edição: salva direto
    void doSave();
  };

  // =========================================
  // Render
  // =========================================
  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.gradient}
      locations={[0, 0.7, 1]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {!!event.coverImage && (
            <Image source={{ uri: event.coverImage }} style={styles.image} />
          )}

          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]}>
              {event.title}
            </Text>

            <Text style={[styles.location, { color: colors.textSecondary }]}>
              <MapPin size={12} color={colors.textSecondary} /> {event.location}
            </Text>

            {/* Debug (remova quando quiser) */}
            <Text
              style={{
                marginTop: 6,
                color: colors.textSecondary,
                fontSize: 12,
              }}
            >
              Meu nível: {myAdminLevel ?? '—'} | Editar:{' '}
              {canEdit ? 'sim' : 'não'} | Deletar: {canDelete ? 'sim' : 'não'}
            </Text>
          </View>
        </Pressable>

        {/* Header Permissões */}
        <View style={{ paddingHorizontal: 12, marginTop: 10 }}>
          {canManage && (
            <Button
              title="Add Permissão"
              onPress={openAdd}
              style={{
                backgroundColor: colors.primary2,
                alignSelf: 'flex-end',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 10,
              }}
              textStyle={{ color: '#fff' }}
            />
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Permissões Atribuídas
        </Text>

        <View
          style={[
            styles.permissionsCard,
            {
              backgroundColor: colors.backGroundSecondary,
              paddingVertical: 12,
              paddingHorizontal: 16,
            },
          ]}
        >
          {entries.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                { color: colors.textSecondary, fontStyle: 'italic' },
              ]}
            >
              Nenhum convidado com permissão.
            </Text>
          ) : (
            entries.map(([uid, level]) => {
              const isMe = !!userUid && uid === userUid;
              const canEditThisRow = canEditRow(canManage, userUid, uid);

              const displayRole = getDisplayRoleLabel(event, uid, level);

              return (
                <View
                  key={uid}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {guestNameByUid.get(uid) ?? `Usuário ${shortUid(uid)}`}
                      {isMe ? ' (Você)' : ''}
                    </Text>

                    <Text
                      style={{
                        fontSize: 14,
                        fontStyle: 'italic',
                        color: colors.textSecondary,
                      }}
                    >
                      Permissão: {displayRole}
                    </Text>
                  </View>

                  {canEditThisRow ? (
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <TouchableOpacity
                        onPress={() => openEdit(uid, level)}
                        style={{ padding: 6 }}
                      >
                        <Pencil size={20} color={colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleRemove(uid)}
                        style={{ padding: 6 }}
                      >
                        <Trash2 size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ width: 52 }} />
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal: escolher nível + salvar */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) closePermissionModal();
        }}
      >
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
                Controle total e gerenciamento de permissões.
              </Text>

              <Text style={[styles.modalText, { color: colors.text }]}>
                <Text style={[styles.roleHighlight, { color: colors.primary }]}>
                  Admin parcial:
                </Text>{' '}
                Pode adicionar programas, atividades e fotos (conforme regras do
                app).
              </Text>

              <Text style={[styles.modalSubtitle, { color: colors.text }]}>
                👥 {editingUid ? 'Editar permissão' : 'Adicionar permissão'}
              </Text>

              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Tipo de permissão
              </Text>

              <View style={styles.toggleRow}>
                {(['Super Admin', 'Admin parcial'] as const)
                  .filter((lvl) =>
                    canAssignLevel(
                      event.userId === userUid ? 'Super Admin' : myAdminLevel,
                      lvl,
                    ),
                  )
                  .map((lvl) => (
                    <Pressable
                      key={lvl}
                      onPress={() => setPermissionLevel(lvl)}
                      style={[
                        styles.toggleBtn,
                        {
                          backgroundColor:
                            permissionLevel === lvl ? '#471C7A' : 'transparent',
                          borderColor:
                            permissionLevel === lvl ? '#471C7A' : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: permissionLevel === lvl ? '#fff' : colors.text,
                          fontWeight: '600',
                        }}
                      >
                        {lvl}
                      </Text>
                    </Pressable>
                  ))}
              </View>

              <View style={styles.buttonRow}>
                <Button
                  title="Cancelar"
                  variant="cancel"
                  onPress={closePermissionModal}
                  disabled={saving}
                  style={{ flex: 1, marginRight: 8, opacity: saving ? 0.7 : 1 }}
                  textStyle={{ color: 'white' }}
                />

                <Button
                  title={saving ? 'Salvando...' : 'Salvar'}
                  onPress={handleSavePermission}
                  disabled={saving}
                  style={{
                    backgroundColor: colors.primary,
                    flex: 1,
                    opacity: saving ? 0.7 : 1,
                  }}
                  textStyle={{ color: '#fff' }}
                />
              </View>

              {saving && (
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator size="large" color="#fff" />
                  <Text
                    style={{ color: '#fff', marginTop: 10, fontWeight: '600' }}
                  >
                    Salvando…
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal: selecionar convidado */}
      <Modal visible={selectGuestModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.selectCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Selecionar convidado
            </Text>

            <View
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: colors.backGroundSecondary,
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  marginBottom: 6,
                  fontWeight: '600',
                }}
              >
                Buscar por nome / status
              </Text>

              <TextInput
                value={guestQuery}
                onChangeText={setGuestQuery}
                placeholder="Ex: João, confirmado..."
                placeholderTextColor={colors.textSecondary}
                style={{ fontSize: 14, paddingVertical: 6, color: colors.text }}
              />
            </View>

            {guestsLoading ? (
              <View style={{ marginTop: 16 }}>
                <ActivityIndicator />
              </View>
            ) : allGuestsCount === 0 ? (
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                Nenhum convidado encontrado. (Somente quem confirmou/acompanhou
                aparece aqui.)
              </Text>
            ) : selectableCount === 0 ? (
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                Não há usuários disponíveis para adicionar permissões.
                {'\n'}
                Todos os convidados listados já possuem permissão (veja em
                “Permissões Atribuídas” para editar/remover).
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 340, marginTop: 12 }}>
                {selectableGuests.map((p) => {
                  const label =
                    p.userName?.trim() || `Usuário ${shortUid(p.userId)}`;

                  const subtitle =
                    p.mode === 'confirmado'
                      ? 'Confirmado'
                      : p.mode === 'acompanhando'
                        ? 'Acompanhando'
                        : 'Interessado';

                  const selected = selectedGuestUid === p.userId;

                  const selectedBg =
                    colorScheme === 'dark'
                      ? 'rgba(177, 138, 255, 0.12)'
                      : 'rgba(110, 86, 207, 0.08)';

                  return (
                    <Pressable
                      key={p.userId}
                      onPress={() => {
                        setSelectedGuestUid(p.userId);
                        setSelectedGuestLabel(label);
                      }}
                      style={[
                        styles.guestRow,
                        {
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                          backgroundColor: selected
                            ? selectedBg
                            : 'transparent',
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ color: colors.text, fontWeight: '700' }}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                        <Text
                          style={{ color: colors.textSecondary, marginTop: 2 }}
                        >
                          {subtitle}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: selected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {!!selectedGuestUid && (
              <View
                style={[
                  styles.selectedGuestBox,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  Selecionado:
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                  {selectedGuestLabel ||
                    `Usuário ${shortUid(selectedGuestUid)}`}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button
                title="Cancelar"
                variant="cancel"
                onPress={() => setSelectGuestModal(false)}
                style={{ flex: 1 }}
                textStyle={{ color: '#fff' }}
              />
              <Button
                title="Continuar"
                onPress={() => {
                  if (selectableGuests.length === 0) return;

                  if (!selectedGuestUid) {
                    Alert.alert('Atenção', 'Selecione um convidado.');
                    return;
                  }

                  setSelectGuestModal(false);
                  setEditingUid(null);
                  setPermissionLevel('Admin parcial');
                  setModalVisible(true);
                }}
                style={{
                  flex: 1,
                  backgroundColor:
                    selectableGuests.length === 0
                      ? colors.border
                      : colors.primary,
                  opacity: selectableGuests.length === 0 ? 0.6 : 1,
                }}
                textStyle={{ color: '#fff' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 16 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 10,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
  },

  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
    marginLeft: 4,
  },

  info: { flex: 1 },

  title: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
  },

  location: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },

  sectionTitle: {
    fontSize: 18,
    padding: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },

  permissionsCard: {
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 20,
  },

  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  animatedContainer: { width: '100%', maxWidth: 420 },

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

  selectCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },

  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },

  selectedGuestBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
});
