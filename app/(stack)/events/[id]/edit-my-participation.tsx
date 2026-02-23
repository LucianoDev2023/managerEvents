import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  BackHandler,
  Switch,
  LayoutAnimation,
  UIManager,
  Modal,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuthListener } from '@/hooks/useAuthListener';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Button from '@/components/ui/Button';
import { Trash2, Users, Save, Baby, ChevronDown, ChevronUp, Plus, X, Edit, Shield, UserPlus } from 'lucide-react-native';
import Fonts from '@/constants/Fonts';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '@/context/EventsContext';
import { getMyAdminLevel } from '@/src/helpers/eventPermissions';

import {
  getGuestParticipation,
  updateGuestParticipation,
  updateAllParticipationsUserName,
} from '@/hooks/guestService';
import { GuestMode, FamilyMember } from '@/types';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { auth } from '@/config/firebase';
import { logger } from '@/lib/logger';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EditMyParticipationScreen() {
  const router = useRouter();
  const { id: eventId } = useLocalSearchParams<{ id: string }>();

  const { user, authLoading } = useAuthListener();
  const userId = user?.uid ?? null;

  const { state } = useEvents();
  const event = useMemo(() => state.events.find((e) => e.id === eventId), [state.events, eventId]);

  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
  const colors = Colors[scheme];

  const gradientColors = useMemo<[string, string, string]>(() => {
    return scheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];
  }, [scheme]);

  // ✅ family is list of objects
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [userName, setUserName] = useState('');
  
  // ✅ Form states
  const [newName, setNewName] = useState('');
  const [isChild, setIsChild] = useState(false);
  const [childAge, setChildAge] = useState('');
  
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const canUseScreen = !!eventId && !!userId && !authLoading;

  const goBack = useCallback(() => {
    router.push('/(tabs)/profile');
  }, [router]);

  useEffect(() => {
    const onBackPress = () => {
      goBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [goBack]);

  const headerOptions = useMemo(() => {
    return {
      headerShown: true,
      headerTitle: 'Minha participação',
      headerTransparent: true,
      headerTintColor: colors.text,
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: 'transparent',
      },
      headerShadowVisible: false,
    } as any;
  }, [colors.text]);

  const toggleAddForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAddFormOpen(!isAddFormOpen);
  };

  useEffect(() => {
    const fetchParticipation = async () => {
      if (authLoading) return;

      if (!eventId || !userId) {
        setInitializing(false);
        return;
      }

      try {
        const guest = await getGuestParticipation(userId, eventId);
        
        const rawFamily = guest?.family ?? [];
        const formattedFamily: FamilyMember[] = rawFamily.map((item: any) => {
            if (typeof item === 'string') {
                return { name: item, isChild: false };
            }
            return item;
        });

        setFamily(formattedFamily);
        setUserName(guest?.userName ?? user?.displayName ?? '');

        if (guest?.mode) {
          setMode(guest.mode);
        }
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar sua participação.');
      } finally {
        setInitializing(false);
      }
    };

    fetchParticipation();
  }, [authLoading, eventId, userId, user?.displayName]);

  const normalizedNewName = useMemo(() => newName.trim(), [newName]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAdd = useCallback(() => {
    const trimmed = normalizedNewName;
    if (!trimmed) return;

    // Check for duplicates only if name changed or adding new
    const isNameChanged = editingIndex !== null && family[editingIndex].name.toLowerCase() !== trimmed.toLowerCase();
    
    const exists = family.some(m => m.name.toLowerCase() === trimmed.toLowerCase());
    
    if (editingIndex === null || isNameChanged) {
        if (exists) {
          Alert.alert('Atenção', 'Esse nome já está na lista.');
          return;
        }
    }

    // Limit check
    if (editingIndex === null) {
        const myLevel = getMyAdminLevel(event, userId);
        const isSuperAdmin = myLevel === 'Super Admin';
        const isCreator = event?.userId === userId;
        
        if (!isSuperAdmin && !isCreator && family.length >= 10) {
            Alert.alert('Limite atingido', 'Você só pode adicionar até 10 acompanhantes.');
            return;
        }
    }

    // Age check for children
    if (isChild) {
      const age = parseInt(childAge);
      if (isNaN(age) || age < 0 || age > 12) {
        Alert.alert('Idade inválida', 'Para ser considerado criança, a idade deve ser entre 0 e 12 anos.');
        return;
      }
    }

    const newMember: FamilyMember = {
        name: trimmed,
        isChild,
        age: isChild && childAge ? parseInt(childAge) : undefined
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (editingIndex !== null) {
        // Update existing
        const newFamily = [...family];
        newFamily[editingIndex] = newMember;
        setFamily(newFamily);
        setEditingIndex(null);
        setIsAddFormOpen(false);
    } else {
        // Add new
        setFamily((prev) => [...prev, newMember]);
    }
    
    setNewName('');
    setIsChild(false);
    setChildAge('');
    // Optionally keep form open or close it. Closing it for now as per previous logic.
    if (editingIndex === null) setIsAddFormOpen(false); 
  }, [family, normalizedNewName, isChild, childAge, editingIndex]);

  const handleEdit = useCallback((index: number) => {
      const member = family[index];
      setNewName(member.name);
      setIsChild(member.isChild ?? false);
      setChildAge(member.age ? member.age.toString() : '');
      setEditingIndex(index);
      setIsAddFormOpen(true);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [family]);

  const cancelEdit = useCallback(() => {
    setNewName('');
    setIsChild(false);
    setChildAge('');
    setEditingIndex(null);
    setIsAddFormOpen(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const handleRemove = useCallback((nameToRemove: string) => {
    Alert.alert(
      'Remover acompanhante',
      `Tem certeza que deseja remover "${nameToRemove}" da lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setFamily((prev) => prev.filter((m) => m.name !== nameToRemove));
            if (editingIndex !== null) cancelEdit(); // Cancel edit if removing
          },
        },
      ],
    );
  }, [editingIndex, cancelEdit]);

  const [mode, setMode] = useState<GuestMode>('confirmado');

  const handleSave = useCallback(async () => {
    if (!eventId || !userId) return;

    if (userName.trim().length < 2) {
      Alert.alert('Erro', 'Digite seu nome corretamente.');
      return;
    }

    setSaving(true);
    try {
      await updateGuestParticipation({
        userId,
        eventId,
        updates: {
          family,
          userName: userName.trim(),
          mode, 
        },
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: userName.trim() });
        await setDoc(
          doc(db, 'users', userId),
          { name: userName.trim(), updatedAt: serverTimestamp() },
          { merge: true },
        );
        await updateAllParticipationsUserName(userId, userName.trim());
      }

      Alert.alert('✅ Sucesso', 'Participação atualizada!');
      router.replace({
        pathname: '/(stack)/events/[id]',
        params: { id: eventId },
      } as any);
    } catch (error: any) {
      logger.error('❌ updateGuestParticipation error:', error);
      Alert.alert('Erro', 'Falha ao salvar participação.');
    } finally {
      setSaving(false);
    }
  }, [eventId, userId, family, userName, mode, router]);

  const handleClearAll = useCallback(() => {
    if (family.length === 0) return;
    Alert.alert(
      'Limpar lista',
      'Deseja remover todos os acompanhantes?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover todos',
          style: 'destructive',
          onPress: () => {
             LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
             setFamily([]);
          },
        },
      ],
    );
  }, [family.length]);

  if (initializing) {
    return (
      <View style={[styles.full, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!canUseScreen) {
    return (
      <View style={[styles.full, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Não foi possível abrir esta tela.
        </Text>
        <Pressable onPress={goBack} style={[styles.secondaryBtn, { borderColor: colors.primary }]}>
          <Text style={{ color: colors.text }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.7, 1]}
      style={styles.full}
    >
      <Stack.Screen options={headerOptions} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.full}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Compacto */}
          <View style={[styles.headerCard, { borderColor: 'rgba(255,255,255,0.1)' }]}>
             <View style={styles.headerRow}>
               <Users size={18} color={colors.primary} />
               <Text style={[styles.headerTitle, { color: colors.text }]}>Minha Participação</Text>
             </View>
             
             {/* Nome do Usuário Principal Compacto */}
             <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder="Seu nome"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.compactInput,
                  {
                    color: colors.text,
                    backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                    borderColor: userName.length < 2 ? colors.error : colors.border,
                  },
                ]}
              />
              {userName.length < 2 && (
                  <Text style={{ color: colors.error, fontSize: 10, marginTop: 2, marginLeft: 4 }}>Nome obrigatório</Text>
              )}
          </View>


          {/* Seção Acompanhantes */}
          <View style={styles.sectionHeader}>
             <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Acompanhantes ({family.length})
             </Text>
             {family.length > 0 && (
                <Pressable onPress={handleClearAll}>
                    <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>Limpar</Text>
                </Pressable>
             )}
          </View>

          {/* Lista de Acompanhantes (Compacta) */}
          <View style={{ gap: 8, marginBottom: 16 }}>
            {family.map((member, index) => (
                <View
                  key={`${member.name}-${index}`}
                  style={[
                    styles.memberCard,
                    {
                      backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
                      borderColor: editingIndex === index ? colors.primary : 'rgba(255,255,255,0.05)',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                    {member.isChild && (
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                            👶 {member.age ? `${member.age} anos` : 'Criança'}
                        </Text>
                    )}
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Pressable
                        onPress={() => handleEdit(index)}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
                    >
                        <Edit size={16} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                        onPress={() => handleRemove(member.name)}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
                    >
                        <X size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
            ))}
          </View>

          {/* Botão para Abrir Modal */}
          <Pressable
            onPress={() => {
              setEditingIndex(null);
              setNewName('');
              setIsChild(false);
              setChildAge('');
              setIsAddFormOpen(true);
            }}
            style={[styles.addTriggerBtn, { borderColor: colors.primary, borderStyle: 'dashed' }]}
          >
            <Plus size={18} color={colors.primary} />
            <Text style={[styles.addTriggerText, { color: colors.primary }]}>Adicionar acompanhante</Text>
          </Pressable>
          {/* Modal para Adicionar/Editar Acompanhante */}
          <Modal
            visible={isAddFormOpen}
            transparent
            animationType="fade"
            onRequestClose={cancelEdit}
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
                  <View style={styles.modalHeader}>
                    <UserPlus size={28} color={colors.primary} />
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {editingIndex !== null ? 'Editar Acompanhante' : 'Novo Acompanhante'}
                    </Text>
                  </View>

                  <Text style={[styles.modalLabel, { color: colors.text }]}>Nome</Text>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Ex: Maria Silva"
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                    style={[
                      styles.compactInput,
                      {
                        color: colors.text,
                        backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
                        borderColor: colors.border,
                        marginBottom: 20
                      },
                    ]}
                  />

                  <View style={[styles.rowBetween, { marginBottom: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Baby size={20} color={colors.textSecondary} />
                      <View>
                         <Text style={{ color: colors.text, fontSize: 15, fontFamily: Fonts.semiBold }}>É criança?</Text>
                         <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: Fonts.regular }}>Até 12 anos</Text>
                      </View>
                    </View>
                    <Switch 
                      value={isChild} 
                      onValueChange={setIsChild} 
                      trackColor={{ false: '#767577', true: colors.primary }}
                      thumbColor="#f4f3f4"
                    />
                  </View>

                  {isChild && (
                    <Animated.View entering={FadeIn} exiting={FadeOut}>
                        <Text style={[styles.modalLabel, { color: colors.text }]}>Idade</Text>
                        <TextInput
                          value={childAge}
                          onChangeText={setChildAge}
                          placeholder="0"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          style={[
                            styles.compactInput,
                            {
                                color: colors.text,
                                backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
                                borderColor: colors.border,
                                marginBottom: 24,
                                width: 80,
                                textAlign: 'center'
                            },
                          ]}
                        />
                    </Animated.View>
                  )}

                  <View style={styles.modalActions}>
                    <Button 
                      title="Cancelar"
                      onPress={cancelEdit}
                      variant="cancel"
                      style={{ flex: 1 }}
                    />
                    <Button 
                      title={editingIndex !== null ? "Salvar" : "Adicionar"}
                      onPress={handleAdd}
                      disabled={!normalizedNewName}
                      style={{ flex: 1.5, backgroundColor: colors.primary }}
                      textStyle={{ color: '#fff' }}
                    />
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>
          </Modal>

          <View style={{ height: 40 }} />
          
          {/* Actions Footer */}
          <View style={styles.footerActions}>
            <Button
                title="Salvar tudo"
                onPress={handleSave}
                style={{ backgroundColor: colors.primary, flex: 1 }}
                textStyle={{ color: '#fff' }}
                loading={saving}
                icon={<Save size={16} color="#fff" />}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  content: { padding: 16, paddingTop: 100, paddingBottom: 40 },
  title: { fontSize: 18, fontFamily: Fonts.bold, textAlign: 'center' },
  
  headerCard: { 
      borderRadius: 20, 
      padding: 16, 
      marginBottom: 24, 
      backgroundColor: 'rgba(255,255,255,0.03)', 
      borderWidth: 1, 
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  headerTitle: { fontSize: 14, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 1 },
  
  compactInput: {
      borderWidth: 1, 
      borderRadius: 12, 
      paddingHorizontal: 12, 
      paddingVertical: 12, 
      fontSize: 15, 
      fontFamily: Fonts.regular
  },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13, fontFamily: Fonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 8,
  },
  memberName: { fontSize: 15, fontFamily: Fonts.semiBold },
  
  addTriggerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      gap: 8,
      backgroundColor: 'rgba(0,0,0,0.05)',
      marginTop: 8,
  },
  addTriggerText: { fontSize: 14, fontFamily: Fonts.bold },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  formTitle: { fontSize: 14, fontFamily: Fonts.bold },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  iconBtn: { 
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  
  secondaryBtn: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'center', marginTop: 10 },
  footerActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
