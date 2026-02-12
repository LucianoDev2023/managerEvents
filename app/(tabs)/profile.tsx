// app/(tabs)/profile.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
  Modal,
  Pressable,
  TextInput,
  BackHandler,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  signOut,
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import {
  Bell,
  Edit,
  HeartHandshake,
  UserX,
  Eye,
  EyeOff,
  Settings,
  LogOut,
  CircleHelp as HelpCircle,
  ShieldCheck,
  FileText,
  Globe,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { LEGAL_URLS } from '../../constants/Legal';

// ✅ caminhos relativos (saindo de app/(tabs))
import { auth, db } from '../../config/firebase';
import CustomDropdown from '../../components/ui/CustomDropdown';
import Button from '../../components/ui/Button';
import Colors from '../../constants/Colors';
import LoadingOverlay from '../../components/LoadingOverlay';

import { useAuthListener } from '../../hooks/useAuthListener';
import { useEvents } from '../../context/EventsContext';
import { getGuestParticipationsByUserId, updateAllParticipationsUserName } from '../../hooks/guestService';

import type { Event } from '../../types/index';
import type { GuestParticipation } from '../../types/guestParticipation';

export default function ProfileScreen() {
  const { user, authLoading } = useAuthListener();
  const { state } = useEvents();
  const router = useRouter();

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const textColor = colors.text;
  const textSecondary = colors.textSecondary;
  const backgroundColor = colors.background;

  const gradientColors = colors.gradients;

  const uid = user?.uid ?? '';

  // =============================
  // UI states
  // =============================
  const [supportVisible, setSupportVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [deletingAccount, setDeletingAccount] = useState(false);

  // ✅ reauth modal
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // ✅ Editar displayName
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [localDisplayName, setLocalDisplayName] = useState(
    user?.displayName ?? 'Usuário',
  );

  // ✅ Participations (por UID)
  const [participations, setParticipations] = useState<GuestParticipation[]>(
    [],
  );
  const [loadingParticipations, setLoadingParticipations] = useState(true);

  // ✅ Loading geral
  const isLoadingEvents = state.loading;

  // =============================
  // Effects
  // =============================
  useEffect(() => {
    setNameDraft(user?.displayName ?? '');
    setLocalDisplayName(user?.displayName ?? 'Usuário');
  }, [user?.displayName]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!uid) {
        if (mounted) {
          setParticipations([]);
          setLoadingParticipations(false);
        }
        return;
      }

      try {
        setLoadingParticipations(true);
        const data = await getGuestParticipationsByUserId(uid);
        if (!mounted) return;
        setParticipations(data);
      } catch (e) {
        console.error('Erro ao carregar participações:', e);
        if (!mounted) return;
        setParticipations([]);
      } finally {
        if (!mounted) return;
        setLoadingParticipations(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (editNameVisible) {
          setEditNameVisible(false);
          return true;
        }
        if (supportVisible) {
          setSupportVisible(false);
          return true;
        }
        if (deleteVisible) {
          setDeleteVisible(false);
          return true;
        }
        router.back();
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [supportVisible, editNameVisible, deleteVisible, router]),
  );

  // =============================
  // Eventos acessíveis
  // =============================
  const createdOrAdminEvents = useMemo(() => {
    if (!uid) return [];

    return state.events.filter((event) => {
      const isCreator = event.userId === uid;
      const myLevel = event.subAdminsByUid?.[uid];
      const isSubAdmin = !!myLevel;
      return isCreator || isSubAdmin;
    });
  }, [state.events, uid]);

  const participantEvents = useMemo(() => {
    if (!participations.length) return [];

    const ids = new Set(
      participations
        .filter((p) => p.mode === 'confirmado' || p.mode === 'acompanhando')
        .map((p) => p.eventId),
    );

    return state.events.filter((e) => ids.has(e.id));
  }, [participations, state.events]);

  const allAccessibleEvents = useMemo(() => {
    const map = new Map<string, Event>();
    createdOrAdminEvents.forEach((e) => map.set(e.id, e));
    participantEvents.forEach((e) => map.set(e.id, e));
    return Array.from(map.values());
  }, [createdOrAdminEvents, participantEvents]);

  // =============================
  // Estatísticas
  // =============================
  const totalEvents = allAccessibleEvents.length;

  const totalPrograms = useMemo(() => {
    return allAccessibleEvents.reduce(
      (sum, e) => sum + (e.programs?.length ?? 0),
      0,
    );
  }, [allAccessibleEvents]);

  const totalActivities = useMemo(() => {
    return allAccessibleEvents.reduce((sum, e) => {
      const programs = e.programs ?? [];
      return (
        sum +
        programs.reduce((pSum, p: any) => pSum + (p.activities?.length ?? 0), 0)
      );
    }, 0);
  }, [allAccessibleEvents]);

  const totalPhotos = useMemo(() => {
    return allAccessibleEvents.reduce((sum, e) => {
      const programs = e.programs ?? [];
      return (
        sum +
        programs.reduce((pSum, p: any) => {
          const activities = p.activities ?? [];
          return (
            pSum +
            activities.reduce(
              (aSum: number, a: any) => aSum + (a.photos?.length ?? 0),
              0,
            )
          );
        }, 0)
      );
    }, 0);
  }, [allAccessibleEvents]);

  const pluralize = (count: number, singular: string, plural: string) =>
    count <= 1 ? singular : plural;

  // =============================
  // Actions
  // =============================

  const handleSaveDisplayName = async () => {
    const newName = nameDraft.trim();

    if (newName.length < 2) {
      Alert.alert(
        'Nome inválido',
        'Digite um nome com pelo menos 2 caracteres.',
      );
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    try {
      setSavingName(true);
      
      // 1. Firebase Auth
      await updateProfile(auth.currentUser, { displayName: newName });
      
      // 2. Firestore Users
      await setDoc(
        doc(db, 'users', auth.currentUser.uid),
        { name: newName, updatedAt: serverTimestamp() },
        { merge: true }
      );

      // 3. Guest Participations (Sincroniza com a lista de convidados)
      await updateAllParticipationsUserName(auth.currentUser.uid, newName);

      setLocalDisplayName(newName);
      Alert.alert('Sucesso', 'Seu nome foi atualizado em todo o app.');
      setEditNameVisible(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível atualizar o nome.');
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Deseja mesmo sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/(auth)/login'); // ✅ rota correta
          } catch (error) {
            Alert.alert('Erro ao sair', (error as any).message);
          }
        },
      },
    ]);
  };

  const deleteMyDataFromFirestore = async (uidToDelete: string) => {
    await deleteDoc(doc(db, 'users', uidToDelete));

    const colRef = collection(db, 'guestParticipations');
    const q = query(colRef, where('userId', '==', uidToDelete));
    const snap = await getDocs(q);

    const refs = snap.docs.map((d) => d.ref);

    for (let i = 0; i < refs.length; i += 450) {
      const batch = writeBatch(db);
      refs.slice(i, i + 450).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  };

  const reauthForDeletion = async () => {
    const current = auth.currentUser;
    if (!current?.email) {
      Alert.alert('Erro', 'Sua conta não possui e-mail para reautenticação.');
      throw new Error('no_email');
    }

    const pass = deletePassword.trim();
    if (pass.length < 6) {
      Alert.alert(
        'Senha necessária',
        'Digite sua senha para confirmar a exclusão.',
      );
      throw new Error('missing_password');
    }

    const cred = EmailAuthProvider.credential(current.email, pass);
    await reauthenticateWithCredential(current, cred);
  };

  const handleDeleteAccount = async () => {
    const current = auth.currentUser;
    if (!current) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    const uidToDelete = current.uid;
    setDeletingAccount(true);

    try {
      await reauthForDeletion();
      await deleteMyDataFromFirestore(uidToDelete);
      await deleteUser(auth.currentUser!);

      setDeleteVisible(false);
      setDeleteConfirmText('');
      setDeletePassword('');
      setShowDeletePassword(false);
      router.replace('/(auth)/login');
    } catch (e: any) {
      const code = e?.code || '';
      const msg = e?.message || 'Não foi possível excluir sua conta.';

      if (
        code.includes('wrong-password') ||
        code.includes('invalid-credential')
      ) {
        Alert.alert(
          'Senha incorreta',
          'A senha informada está incorreta. Tente novamente.',
        );
        return;
      }

      if (code.includes('requires-recent-login')) {
        Alert.alert(
          'Confirmação necessária',
          'Por segurança, confirme sua senha novamente para excluir.',
        );
        return;
      }

      Alert.alert('Erro ao excluir conta', msg);
    } finally {
      setDeletingAccount(false);
    }
  };

  // =============================
  // Loading
  // =============================
  const isScreenLoading =
    isLoadingEvents || authLoading || loadingParticipations;

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <Animated.View
        entering={FadeIn.duration(50)}
        exiting={FadeOut.duration(50)}
        style={{ flex: 1, backgroundColor: gradientColors[0] }}
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

          {isScreenLoading && (
            <LoadingOverlay message="Atualizando perfil..." />
          )}

          <ScrollView
            contentContainerStyle={[
              styles.contentContainer,
              {
                paddingTop:
                  Platform.OS === 'android'
                    ? (RNStatusBar.currentHeight ?? 40)
                    : 0,
              },
            ]}
          >
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
                style={[styles.statCard, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.statNumber}>{totalPrograms}</Text>
                <Text style={styles.statLabel}>
                  {pluralize(totalPrograms, 'Programa', 'Programas')}
                </Text>
              </View>

              <View
                style={[styles.statCard, { backgroundColor: colors.primary }]}
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
              {auth.currentUser?.isAnonymous && (
                <Button
                  title="Criar conta"
                  icon={<Settings size={20} color={textColor} />}
                  onPress={() => router.push('/(auth)/register')}
                  variant="ghost"
                  fullWidth
                  style={styles.menuButton}
                  textStyle={{ color: textColor }}
                />
              )}
              <Button
                title="Lista de eventos"
                icon={<Settings size={20} color={textColor} />}
                onPress={() => router.push({ pathname: '/(stack)/myevents' })}
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
                  items={createdOrAdminEvents}
                  placeholder="-- Escolha um evento --"
                  getItemLabel={(event) => event.title}
                  onSelect={(event) => {
                    router.push({
                      pathname: '/(stack)/events/[id]/permissions',
                      params: { id: event.id },
                    });
                  }}
                  icon={<Bell size={20} color={textColor} />}
                  backgroundColor={colors.backgroundSecondary}
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
              Informações Legais
            </Text>
            <View style={styles.card}>
              <Button
                title="Política de Privacidade"
                icon={<ShieldCheck size={20} color={textColor} />}
                onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.PRIVACY_POLICY)}
                variant="ghost"
                fullWidth
                style={styles.menuButton}
                textStyle={{ color: textColor }}
              />
              <Button
                title="Termos de Uso"
                icon={<FileText size={20} color={textColor} />}
                onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.TERMS_OF_USE)}
                variant="ghost"
                fullWidth
                style={styles.menuButton}
                textStyle={{ color: textColor }}
              />
              {/* <Button
                title="Visite nosso site"
                icon={<Globe size={20} color={textColor} />}
                onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.WEBSITE)}
                variant="ghost"
                fullWidth
                style={styles.menuButton}
                textStyle={{ color: textColor }}
              /> */}
            </View>

            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Editar acompanhantes
            </Text>
            <View style={styles.dropdownContainer}>
              <CustomDropdown
                items={allAccessibleEvents}
                placeholder="-- Escolha um evento --"
                getItemLabel={(event) => event.title}
                onSelect={(event) => {
                  router.push({
                    pathname: '/(stack)/events/[id]/edit-my-participation',
                    params: { id: event.id },
                  });
                }}
                icon={<Bell size={20} color={textColor} />}
                backgroundColor={colors.backgroundSecondary}
                borderColor={colors.border}
                textColor={textColor}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Conta
            </Text>
            <View style={styles.card}>
              <Button
                title="Apoiar o App "
                icon={<HeartHandshake size={20} color={textColor} />}
                onPress={() => router.push('/(stack)/donate')}
                variant="ghost"
                fullWidth
                style={styles.menuButton}
                textStyle={{ color: textColor }}
              />

              <Button
                title="Editar nome"
                icon={<Edit size={20} color={textColor} />}
                onPress={() => setEditNameVisible(true)}
                variant="ghost"
                fullWidth
                style={styles.menuButton}
                textStyle={{ color: textColor }}
              />

              <Button
                title="Sair da Conta"
                icon={<LogOut size={20} color={textColor} />}
                onPress={handleLogout}
                variant="ghost"
                fullWidth
                style={styles.menuButton}
                textStyle={{ color: textColor }}
              />

              <Button
                title="Excluir minha conta"
                icon={<UserX size={10} color="#f44336" />}
                onPress={() => {
                  setDeleteConfirmText('');
                  setDeletePassword('');
                  setShowDeletePassword(false);
                  setDeleteVisible(true);
                }}
                variant="ghost"
                fullWidth
                style={styles.menuButtonEx}
                textStyle={{ color: '#f44336', fontSize: 11 }}
              />
            </View>

            <Text style={[styles.versionText, { color: textSecondary }]}>
              Versão 1.0.0
            </Text>
          </ScrollView>

          {/* MODAL: Editar nome */}
          <Modal visible={editNameVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={gradientColors}
                style={styles.modalContent}
                locations={[0, 0.7, 1]}
              >
                <Text style={[styles.titleHelp, { color: colors.primary }]}>
                  Editar nome
                </Text>

                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder="Digite seu nome"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                  style={[
                    styles.nameInput,
                    {
                      color: textColor,
                      borderColor: colors.border,
                      backgroundColor: colors.backgroundSecondary,
                    },
                  ]}
                />

                <Button
                  title={savingName ? 'Salvando...' : 'Salvar'}
                  onPress={handleSaveDisplayName}
                  style={{
                    backgroundColor: colors.primary,
                    width: '100%',
                    marginTop: 12,
                  }}
                  textStyle={{ color: '#fff' }}
                />

                <Button
                  title="Cancelar"
                  onPress={() => setEditNameVisible(false)}
                  variant="cancel"
                  style={{ width: '100%', marginTop: 10 }}
                  textStyle={{ color: '#fff' }}
                />
              </LinearGradient>
            </View>
          </Modal>

          {/* MODAL: Suporte */}
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

          {/* MODAL: Excluir conta */}
          <Modal visible={deleteVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={gradientColors}
                style={styles.modalContent}
                locations={[0, 0.7, 1]}
              >
                <Text style={[styles.titleHelp, { color: colors.primary }]}>
                  Excluir conta
                </Text>

                <Text style={[styles.testHelp, { color: colors.text }]}>
                  Essa ação é permanente. Seus dados de conta e participações
                  serão apagados.
                </Text>

                <Text
                  style={[
                    styles.testHelp,
                    { color: colors.text, marginTop: 12 },
                  ]}
                >
                  Para confirmar, digite:{' '}
                  <Text style={styles.bold}>EXCLUIR</Text>
                </Text>

                <TextInput
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                  placeholder="Digite EXCLUIR"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  style={[
                    styles.nameInput,
                    {
                      marginTop: 12,
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.backgroundSecondary,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.testHelp,
                    { color: colors.text, marginTop: 12 },
                  ]}
                >
                  Confirme sua senha para finalizar:
                </Text>

                <View style={styles.passwordRow}>
                  <TextInput
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    placeholder="Sua senha"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showDeletePassword}
                    style={[
                      styles.passwordInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundSecondary,
                      },
                    ]}
                  />

                  <Pressable
                    onPress={() => setShowDeletePassword((p) => !p)}
                    style={styles.eyeBtn}
                  >
                    {showDeletePassword ? (
                      <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} />
                    )}
                  </Pressable>
                </View>

                <Button
                  title={
                    deletingAccount ? 'Excluindo...' : 'Confirmar exclusão'
                  }
                  onPress={handleDeleteAccount}
                  style={{
                    backgroundColor:
                      deleteConfirmText.trim().toUpperCase() === 'EXCLUIR'
                        ? '#f44336'
                        : 'rgba(244,67,54,0.35)',
                    width: '100%',
                    marginTop: 12,
                  }}
                  textStyle={{ color: '#fff' }}
                  disabled={
                    deletingAccount ||
                    deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR'
                  }
                />

                <Button
                  title="Cancelar"
                  onPress={() => {
                    setDeleteVisible(false);
                    setDeleteConfirmText('');
                    setDeletePassword('');
                    setShowDeletePassword(false);
                  }}
                  variant="cancel"
                  style={{ width: '100%', marginTop: 10 }}
                  textStyle={{ color: '#fff' }}
                  disabled={deletingAccount}
                />
              </LinearGradient>
            </View>
          </Modal>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  gradient: { flex: 1 },

  profileHeader: { alignItems: 'flex-start', marginBottom: 20 },
  profileName: { fontSize: 24, fontFamily: 'Inter-Bold', marginBottom: 4 },
  profileEmail: { fontSize: 16, fontFamily: 'Inter-Regular' },

  nameRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  nameInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },

  passwordRow: {
    width: '100%',
    position: 'relative',
    marginTop: 10,
  },
  passwordInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 44,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
  },

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
  menuButtonEx: {
    justifyContent: 'flex-start',
    paddingVertical: 12,
    marginTop: 16,
  },
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
    padding: 16,
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
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
  modalBody: { width: '100%', marginTop: 16 },
  bold: { fontWeight: 'bold', color: '#7c3aed' },
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
