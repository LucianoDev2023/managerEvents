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
import { MapPin, Edit, Trash2, Shield, Search, Users, X, Plus } from 'lucide-react-native';
import Fonts from '@/constants/Fonts';
import Button from '@/components/ui/Button';
import { logger } from '@/lib/logger';
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

    // 1. Nome do usuário atual (via Auth)
    if (userUid && auth.currentUser?.displayName) {
      map.set(userUid, auth.currentUser.displayName);
    }

    // 2. Nomes vindos das participações (que já são atualizados pelo Perfil)
    guestParts.forEach((p) => {
      if (!p.userId) return;
      const label = (p.userName ?? '').trim();
      if (label && !map.has(p.userId)) {
        map.set(p.userId, label);
      }
    });

    return map;
  }, [guestParts, userUid, auth.currentUser?.displayName]);

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
          userName: (p.userName ?? '').trim(),
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
      logger.error('loadGuestsaas', e);
      Alert.alert('Erro', 'Não foi possível carregar os convidados.');
      setGuestParts([]);
    } finally {
      setGuestsLoading(false);
    }
  }, [event?.id, event?.userId]);

  const [guestQuery, setGuestQuery] = useState('');

  // ✅ Carrega as participações (nomes) ao montar a tela
  React.useEffect(() => {
    if (event?.id) {
      loadGuests();
    }
  }, [event?.id, loadGuests]);

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
      (uidToApply === userUid ? '(Você)' : 'Usuário');

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


        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Permissões Atribuídas
        </Text>

        <View
          style={[
            styles.permissionsCard,
            {
              backgroundColor: colors.backgroundSecondary,
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
                      {guestNameByUid.get(uid) || (isMe ? '(Você)' : 'Usuário')}
                      {isMe && guestNameByUid.get(uid) ? ' (Você)' : ''}
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
                        <Edit size={20} color={colors.primary} />
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

      {/* Floating Action Button */}
      {canManage && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={openAdd}
          activeOpacity={0.8}
        >
          <Plus size={24} color="white" />
          <Text style={styles.fabText}>Novo</Text>
        </TouchableOpacity>
      )}

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
            style={styles.modalContentWrapper}
          >
            <LinearGradient
              colors={gradientColors}
              locations={[0, 0.7, 1]}
              style={[styles.modalContent, { borderColor: colors.primary }]}
            >
                <View style={[styles.roleInfoBox, { backgroundColor: colors.background + '80', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border }]}>
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
                   {editingUid ? '⚙️ Ajustar Acesso' : '✨ Atribuir Novo Acesso'}
                </Text>

              <Text style={[styles.modalLabel, { color: colors.text, marginTop: 12 }]}>
                Nível de acesso
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
                            permissionLevel === lvl ? colors.primary : 'transparent',
                          borderColor:
                            permissionLevel === lvl ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: permissionLevel === lvl ? '#fff' : colors.text,
                          fontWeight: '600',
                          fontSize: 13,
                        }}
                      >
                        {lvl}
                      </Text>
                    </Pressable>
                  ))}
              </View>

              <View style={[styles.modalActions, { marginTop: 24 }]}>
                <Button
                  title="Cancelar"
                  variant="cancel"
                  onPress={closePermissionModal}
                  disabled={saving}
                  style={{ flex: 1 }}
                  textStyle={{ color: 'white' }}
                />

                <Button
                  title={saving ? 'Salvando...' : 'Salvar'}
                  onPress={handleSavePermission}
                  disabled={saving}
                  style={{
                    backgroundColor: colors.primary,
                    flex: 1.5,
                  }}
                  textStyle={{ color: '#fff' }}
                />
              </View>

              {saving && (
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal: selecionar convidado */}
      <Modal visible={selectGuestModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeIn} 
            exiting={FadeOut}
            style={styles.modalContentWrapper}
          >
            <View
              style={[
                styles.selectCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  padding: 24,
                  borderRadius: 24,
                  width: '100%',
                },
              ]}
            >
              <View style={[styles.modalHeader, { justifyContent: 'space-between', width: '100%' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Users size={24} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                    Convidados
                  </Text>
                </View>
                <Pressable onPress={() => setSelectGuestModal(false)}>
                  <X size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View
                style={{
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: colors.backgroundSecondary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Search size={18} color={colors.textSecondary} />
                <TextInput
                  value={guestQuery}
                  onChangeText={setGuestQuery}
                  placeholder="Buscar por nome ou status..."
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, fontSize: 14, color: colors.text, fontFamily: Fonts.regular }}
                />
              </View>

              {guestsLoading ? (
                <View style={{ marginTop: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : allGuestsCount === 0 ? (
                <Text style={{ color: colors.textSecondary, marginTop: 20, textAlign: 'center', fontFamily: Fonts.regular }}>
                  Nenhum convidado encontrado.
                </Text>
              ) : selectableCount === 0 ? (
                <Text style={{ color: colors.textSecondary, marginTop: 20, textAlign: 'center', fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 }}>
                  Não há mais convidados disponíveis para adicionar permissões.
                </Text>
              ) : (
                <ScrollView style={{ maxHeight: 300, marginTop: 16 }} showsVerticalScrollIndicator={false}>
                  {selectableGuests.map((p) => {
                    const label =
                      p.userName?.trim() ||
                      (p.userId === userUid ? '(Você)' : 'Usuário');

                    const subtitle =
                      p.mode === 'confirmado'
                        ? 'Confirmado'
                        : p.mode === 'acompanhando'
                          ? 'Acompanhando'
                          : 'Pendente';

                    const selected = selectedGuestUid === p.userId;
                    const selectedBg = colorScheme === 'dark' ? 'rgba(177, 138, 255, 0.1)' : 'rgba(110, 86, 207, 0.05)';

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
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? selectedBg : 'transparent',
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, fontFamily: Fonts.semiBold }}>
                            {label}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: Fonts.regular }}>
                            {subtitle}
                          </Text>
                        </View>
                        {selected && (
                          <View style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 2 }}>
                             <Shield size={12} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <View style={[styles.modalActions, { marginTop: 24 }]}>
                <Button
                  title="Fechar"
                  variant="cancel"
                  onPress={() => setSelectGuestModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Continuar"
                  onPress={() => {
                    if (!selectedGuestUid) {
                      Alert.alert('Aviso', 'Selecione um convidado primeiro.');
                      return;
                    }
                    setSelectGuestModal(false);
                    setModalVisible(true);
                  }}
                  style={{ backgroundColor: colors.primary, flex: 1.5 }}
                  disabled={!selectedGuestUid}
                />
              </View>
            </View>
          </Animated.View>
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
    fontFamily: Fonts.bold,
  },
  qrHint: {
    marginTop: 10,
    fontSize: 10,
    opacity: 0.65,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },

  location: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: Fonts.regular,
  },

  sectionTitle: {
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.bold,
    marginTop: 10,
  },

  permissionsCard: {
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 20,
  },

  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 14, fontFamily: Fonts.regular },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalContentWrapper: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },

  modalContent: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },

  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },

  modalSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },

  modalLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
  },

  roleInfoBox: {
    marginBottom: 8,
  },

  roleInfoText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
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

  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },

  buttonRow: { flexDirection: 'row', marginTop: 8 },

  selectCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 24,
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
    marginBottom: 8,
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
