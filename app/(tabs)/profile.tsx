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
  BackHandler,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  signOut,
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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
import { logger } from '../../lib/logger';

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
  Flag,
  Calendar,
  Layers,
  CheckSquare,
  Camera,
  AlertTriangle,
  User,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { LEGAL_URLS } from '../../constants/Legal';

// ✅ caminhos relativos (saindo de app/(tabs))
import { auth, db } from '../../config/firebase';
import CustomDropdown from '../../components/ui/CustomDropdown';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import LoadingOverlay from '../../components/LoadingOverlay';
import DashboardCard from '../../components/DashboardCard';

import { useAuthListener } from '../../hooks/useAuthListener';
import { useEvents } from '../../context/EventsContext';
import {
  getGuestParticipationsByUserId,
  updateAllParticipationsUserName,
} from '../../hooks/guestService';

import type { Event } from '../../types/index';
import type { GuestParticipation } from '../../types/guestParticipation';

export default function ProfileScreen() {
  const { user, authLoading } = useAuthListener();
  const { state, deleteEvent, fetchEvents } = useEvents();
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

  // ✅ Detecção de usuário Google
  const isGoogleUser = useMemo(
    () =>
      auth.currentUser?.providerData.some((p) => p.providerId === 'google.com'),
    [auth.currentUser],
  );

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

        // Se o context global está vazio, força um fetch para garantir que as estatísticas
        // (totalEvents, etc) sejam calculadas corretamente baseadas no state.events.
        if (state.events.length === 0) {
          fetchEvents(); // Chamada silenciosa em background
        }
      } catch (e) {
        logger.error('Erro ao carregar participações:', e);
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
    }, [editNameVisible, deleteVisible, router]),
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

      // 2. Firestore Users & Public Profile
      const uid = auth.currentUser.uid;
      await setDoc(
        doc(db, 'users', uid),
        { name: newName, updatedAt: serverTimestamp() },
        { merge: true },
      );

      await setDoc(
        doc(db, 'publicUsers', uid),
        { name: newName, updatedAt: serverTimestamp() },
        { merge: true },
      );

      // 3. Guest Participations (Sincroniza com a lista de convidados)
      await updateAllParticipationsUserName(uid, newName);

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
    // 1. Deletar Eventos que eu Criei (usando deleteEvent p/ limpar Cloudinary tbm)
    const eventsRef = collection(db, 'events');
    const qEvents = query(eventsRef, where('userId', '==', uidToDelete));
    const eventsSnap = await getDocs(qEvents);

    for (const evDoc of eventsSnap.docs) {
      try {
        await deleteEvent(evDoc.id);
      } catch (e) {
        logger.error(`[DeleteAccount] Falha ao deletar evento ${evDoc.id}:`, e);
      }
    }

    // 2. Deletar Participações (convites que recebi)
    const colRef = collection(db, 'guestParticipations');
    const q = query(colRef, where('userId', '==', uidToDelete));
    const snap = await getDocs(q);

    const refs = snap.docs.map((d) => d.ref);

    for (let i = 0; i < refs.length; i += 450) {
      const batch = writeBatch(db);
      refs.slice(i, i + 450).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    // 3. FINALMENTE: Deletar Perfil e Usuário Público
    // Fazemos isso por último para evitar que o hook useGoogleAuth
    // ou outros listners recriem o documento enquanto limpamos os dados.
    await deleteDoc(doc(db, 'users', uidToDelete));
    await deleteDoc(doc(db, 'publicUsers', uidToDelete));

    // 💡 NOTA: Fotos que o usuário postou em eventos de OUTROS
    // precisariam de uma Collection Group Query. Por ora, limpamos o que ele é dono.
  };

  const reauthForDeletion = async () => {
    const current = auth.currentUser;
    if (!current) throw new Error('no_user');

    if (isGoogleUser) {
      // Reautenticação Google
      await GoogleSignin.hasPlayServices();

      // ✅ Sempre fazemos signOut antes de signIn para garantir
      // o seletor de contas e um idToken fresco.
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // ignora se não houver sessão
      }

      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') throw new Error('cancelled');

      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('no_id_token');

      const cred = GoogleAuthProvider.credential(idToken);
      await reauthenticateWithCredential(current, cred);
    } else {
      // Reautenticação E-mail/Senha
      if (!current.email) {
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
    }
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

      Alert.alert(
        'Conta excluída',
        'Sua conta e todos os dados foram excluídos com sucesso. Esperamos que volte em breve.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/landing') }],
      );
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
                    ? (RNStatusBar.currentHeight ?? 40) + 8
                    : 44,
              },
            ]}
          >
            <View
              style={{ paddingHorizontal: 20, marginBottom: 24, marginTop: 8 }}
            >
              <Text
                style={{ color: textSecondary, fontSize: 13, lineHeight: 18 }}
              >
                Gerencie seus dados, visualize estatísticas gerais e configure
                sua conta:
              </Text>
              <Text
                style={{
                  color: textColor,
                  fontSize: 18,
                  fontFamily: Fonts.bold,
                  marginTop: 10,
                }}
              >
                Perfil e Configurações
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <DashboardCard
                title={pluralize(totalEvents, 'Evento', 'Eventos')}
                subtitle={totalEvents.toString()}
                icon={Calendar}
                color="#FF6B6B"
                hideArrow
                style={{ width: '48%', flex: 0, paddingBottom: 4 }}
                height={130}
                verticalAlign="flex-start"
                activeOpacity={1}
                titleStyle={{
                  fontSize: 15,
                  fontFamily: Fonts.medium,
                  opacity: 0.9,
                }}
                subtitleStyle={{
                  fontSize: 18,
                  fontFamily: Fonts.bold,
                  color: textColor,
                }}
              />

              <DashboardCard
                title={pluralize(totalPrograms, 'Programa', 'Programas')}
                subtitle={totalPrograms.toString()}
                icon={Layers}
                color="#4ECDC4" // Turquesa
                hideArrow
                style={{ width: '48%', flex: 0, paddingBottom: 4 }}
                height={130}
                verticalAlign="flex-start"
                activeOpacity={1}
                titleStyle={{
                  fontSize: 15,
                  fontFamily: Fonts.medium,
                  opacity: 0.9,
                }}
                subtitleStyle={{
                  fontSize: 18,
                  fontFamily: Fonts.bold,
                  color: textColor,
                }}
              />

              <DashboardCard
                title={pluralize(totalActivities, 'Atividade', 'Atividades')}
                subtitle={totalActivities.toString()}
                icon={CheckSquare}
                color="#FFE66D" // Amarelo
                hideArrow
                style={{ width: '48%', flex: 0, paddingBottom: 4 }}
                height={130}
                verticalAlign="flex-start"
                activeOpacity={1}
                titleStyle={{
                  fontSize: 15,
                  fontFamily: Fonts.medium,
                  opacity: 0.9,
                }}
                subtitleStyle={{
                  fontSize: 18,
                  fontFamily: Fonts.bold,
                  color: textColor,
                }}
              />

              <DashboardCard
                title={pluralize(totalPhotos, 'Foto', 'Fotos')}
                subtitle={totalPhotos.toString()}
                icon={Camera}
                color="#FF9F1C" // Laranja
                hideArrow
                style={{ width: '48%', flex: 0, paddingBottom: 4 }}
                height={130}
                verticalAlign="flex-start"
                activeOpacity={1}
                titleStyle={{
                  fontSize: 15,
                  fontFamily: Fonts.medium,
                  opacity: 0.9,
                }}
                subtitleStyle={{
                  fontSize: 18,
                  fontFamily: Fonts.bold,
                  color: textColor,
                }}
              />
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

              {createdOrAdminEvents.length > 0 && (
                <Button
                  title="🛡️ Moderação"
                  icon={<Flag size={20} color={textColor} />}
                  onPress={() => router.push('/(stack)/moderation' as any)}
                  variant="ghost"
                  fullWidth
                  style={styles.menuButton}
                  textStyle={{ color: textColor }}
                />
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Suporte
            </Text>
            <View style={styles.card}>
              <Button
                title="Ajuda e Suporte"
                icon={<HelpCircle size={20} color={textColor} />}
                onPress={() => router.push('/(stack)/help')}
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
                onPress={() =>
                  WebBrowser.openBrowserAsync(LEGAL_URLS.PRIVACY_POLICY)
                }
                variant="ghost"
                fullWidth
                style={styles.menuButton}
                textStyle={{ color: textColor }}
              />
              <Button
                title="Termos de Uso"
                icon={<FileText size={20} color={textColor} />}
                onPress={() =>
                  WebBrowser.openBrowserAsync(LEGAL_URLS.TERMS_OF_USE)
                }
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
                  try {
                    router.push({
                      pathname: '/(stack)/events/[id]/edit-my-participation',
                      params: { id: event.id },
                    });
                  } catch (error) {
                    logger.error('Erro ao navegar:', error);
                    Alert.alert(
                      'Erro',
                      'Não foi possível abrir a tela de edição.',
                    );
                  }
                }}
                icon={<Bell size={20} color={textColor} />}
                backgroundColor={colors.backgroundSecondary}
                borderColor={colors.border}
                textColor={textColor}
              />
              {allAccessibleEvents.length === 0 && (
                <Text
                  style={{
                    color: textSecondary,
                    fontSize: 12,
                    marginTop: 8,
                    textAlign: 'center',
                  }}
                >
                  Você não tem eventos disponíveis.{'\n'}
                  Crie um evento ou seja convidado para um.
                </Text>
              )}
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
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.modalContentWrapper}
              >
                <LinearGradient
                  colors={gradientColors}
                  style={[styles.modalContent, { borderColor: colors.border }]}
                  locations={[0, 0.7, 1]}
                >
                  <View style={styles.modalHeader}>
                    <User size={28} color={colors.primary} />
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Editar nome
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.modalDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Como você gostaria de ser chamado no aplicativo?
                  </Text>

                  <TextInput
                    label="Nome completo"
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder="Digite seu nome"
                    autoCapitalize="words"
                    style={{ marginBottom: 20 }}
                  />

                  <View style={styles.modalActions}>
                    <Button
                      title="Cancelar"
                      onPress={() => setEditNameVisible(false)}
                      variant="cancel"
                      style={{ flex: 1 }}
                      textStyle={{ color: '#fff' }}
                    />
                    <Button
                      title={savingName ? 'Salvando...' : 'Salvar'}
                      onPress={handleSaveDisplayName}
                      style={{
                        backgroundColor: colors.primary,
                        flex: 1.5,
                      }}
                      textStyle={{ color: '#fff' }}
                      disabled={savingName}
                    />
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>
          </Modal>

          {/* MODAL: Excluir conta */}
          <Modal visible={deleteVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.modalContentWrapper}
              >
                <LinearGradient
                  colors={gradientColors}
                  style={[styles.modalContent, { borderColor: colors.error }]}
                  locations={[0, 0.7, 1]}
                >
                  <View style={styles.modalHeader}>
                    <AlertTriangle size={28} color={colors.error} />
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      Excluir conta
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.modalDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Essa ação é{' '}
                    <Text style={{ color: colors.error, fontWeight: 'bold' }}>
                      permanente
                    </Text>
                    . Todos os seus eventos, fotos e dados serão apagados
                    definitivamente.
                  </Text>

                  <View style={styles.confirmationBox}>
                    <Text
                      style={[styles.confirmationText, { color: colors.text }]}
                    >
                      Para confirmar, digite:{' '}
                      <Text style={{ fontWeight: 'bold', color: colors.error }}>
                        EXCLUIR
                      </Text>
                    </Text>
                    <TextInput
                      value={deleteConfirmText}
                      onChangeText={setDeleteConfirmText}
                      placeholder="Digite EXCLUIR"
                      autoCapitalize="characters"
                      style={{ marginTop: 8 }}
                    />
                  </View>

                  {!isGoogleUser && (
                    <View style={{ marginTop: 16 }}>
                      <Text
                        style={[
                          styles.confirmationText,
                          { color: colors.text, marginBottom: 8 },
                        ]}
                      >
                        Confirme sua senha para finalizar:
                      </Text>
                      <TextInput
                        label="Sua senha"
                        value={deletePassword}
                        onChangeText={setDeletePassword}
                        placeholder="••••••••"
                        secureTextEntry
                      />
                    </View>
                  )}

                  {isGoogleUser && (
                    <View
                      style={[
                        styles.warningInfo,
                        { backgroundColor: colors.error + '10' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.warningInfoText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Como você usa sua conta Google, solicitaremos um novo
                        login para validar sua identidade antes da exclusão.
                      </Text>
                    </View>
                  )}

                  <View style={[styles.modalActions, { marginTop: 24 }]}>
                    <Button
                      title="Cancelar"
                      onPress={() => {
                        setDeleteVisible(false);
                        setDeleteConfirmText('');
                        setDeletePassword('');
                        setShowDeletePassword(false);
                      }}
                      variant="cancel"
                      style={{ flex: 1 }}
                      textStyle={{ color: '#fff' }}
                      disabled={deletingAccount}
                    />
                    <Button
                      title={deletingAccount ? 'Excluindo...' : 'Confirmar'}
                      onPress={handleDeleteAccount}
                      style={{
                        backgroundColor:
                          deleteConfirmText.trim().toUpperCase() === 'EXCLUIR'
                            ? colors.error
                            : colors.error + '40',
                        flex: 1.5,
                      }}
                      textStyle={{ color: '#fff' }}
                      disabled={
                        deletingAccount ||
                        deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR'
                      }
                    />
                  </View>
                </LinearGradient>
              </Animated.View>
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
  profileName: { fontSize: 24, fontFamily: Fonts.bold, marginBottom: 4 },
  profileEmail: { fontSize: 16, fontFamily: Fonts.regular },

  nameRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12, // Aumentado para 12 para match com Home
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  statNumber: {
    color: 'white',
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  statLabel: { color: 'white', fontSize: 16, fontFamily: Fonts.medium },

  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    margin: 0,
    marginTop: 8,
    marginBottom: 12,
    padding: 0,
  },
  menuButton: { justifyContent: 'flex-start', paddingVertical: 12 },
  menuButtonEx: {
    justifyContent: 'flex-start',
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 30,
    marginBottom: 4,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    elevation: 0,
    shadowColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  modalDescription: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  confirmationBox: {
    marginTop: 8,
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  warningInfo: {
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  warningInfoText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  dropdownContainer: {
    marginBottom: 24,
    marginLeft: 0,
  },
  titleHelp: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Fonts.bold,
  },
  testHelp: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left',
    fontFamily: Fonts.regular,
  },
});
