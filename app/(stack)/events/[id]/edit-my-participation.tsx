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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuthListener } from '@/hooks/useAuthListener';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Button from '@/components/ui/Button';
import { Trash2, Users, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getGuestParticipation,
  updateGuestParticipation,
  updateAllParticipationsUserName,
} from '@/hooks/guestService';
import { GuestMode } from '@/types';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { auth } from '@/config/firebase';

export default function EditMyParticipationScreen() {
  const router = useRouter();
  const { id: eventId } = useLocalSearchParams<{ id: string }>();

  const { user, authLoading } = useAuthListener();
  const userId = user?.uid ?? null;

  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
  const colors = Colors[scheme];

  const gradientColors = useMemo<[string, string, string]>(() => {
    return scheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];
  }, [scheme]);

  const [family, setFamily] = useState<string[]>([]);
  const [userName, setUserName] = useState('');
  const [newName, setNewName] = useState('');

  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const canUseScreen = !!eventId && !!userId && !authLoading;

  const goBack = useCallback(() => {
    // você pediu voltar pro profile no back físico
    router.push('/(tabs)/profile');
  }, [router]);

  // Android hardware back
  useEffect(() => {
    const onBackPress = () => {
      goBack();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [goBack]);

  // Header
  const headerOptions = useMemo(() => {
    return {
      headerShown: true,
      headerTitle: 'Minha participação',
      headerTransparent: true,
      headerTintColor: colors.text,
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: scheme === 'dark' ? '#1e1630' : '#f8f8ff',
      },
      headerBlurEffect: (scheme === 'dark' ? 'dark' : 'light') as any,
      headerShadowVisible: false,
    } as any;
  }, [colors.text, scheme]);

  // Carrega participação
  useEffect(() => {
    const fetchParticipation = async () => {
      // enquanto auth carrega, não finaliza initializing (pra evitar flicker)
      if (authLoading) return;

      if (!eventId || !userId) {
        setInitializing(false);
        return;
      }

      try {
        const guest = await getGuestParticipation(userId, eventId);
        setFamily(guest?.family ?? []);
        setUserName(guest?.userName ?? user?.displayName ?? '');
        
        // Se existir, usa o mode do banco. Se não, mantemos 'confirmado'.
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

  const handleAdd = useCallback(() => {
    const trimmed = normalizedNewName;
    if (!trimmed) return;

    // normaliza comparação (case-insensitive)
    const exists = family.some(
      (n) => n.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      Alert.alert('Atenção', 'Esse nome já está na lista.');
      return;
    }

    setFamily((prev) => [...prev, trimmed]);
    setNewName('');
  }, [family, normalizedNewName]);

  const handleRemove = useCallback((name: string) => {
    Alert.alert(
      'Remover acompanhante',
      `Tem certeza que deseja remover "${name}" da lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => setFamily((prev) => prev.filter((n) => n !== name)),
        },
      ],
    );
  }, []);

  // ✅ Se o usuário ainda não existe, mode padrão = confirmado
  // Se já existe, usa o que veio do banco.
  const [mode, setMode] = useState<GuestMode>('confirmado');

  const handleSave = useCallback(async () => {
    if (!eventId || !userId) return;

    if (userName.trim().length < 2) {
      Alert.alert('Erro', 'Digite seu nome corretamente.');
      return;
    }

    setSaving(true);
    try {
      // 1. Atualiza a participação específica do evento
      await updateGuestParticipation({
        userId,
        eventId,
        updates: { 
          family, 
          userName: userName.trim(),
          mode // ✅ Garante que o mode seja enviado
        },
      });

      // 2. Sincroniza o novo nome com o Perfil (Auth + Users) e outras participações
      if (auth.currentUser) {
        // Atualiza Firebase Auth
        await updateProfile(auth.currentUser, { displayName: userName.trim() });
        
        // Atualiza Firestore Users
        await setDoc(
          doc(db, 'users', userId),
          { name: userName.trim(), updatedAt: serverTimestamp() },
          { merge: true }
        );

        // Sincroniza todas as outras participações deste usuário
        await updateAllParticipationsUserName(userId, userName.trim());
      }

      Alert.alert('✅ Sucesso', 'Participação e perfil atualizados!');
      router.replace({
        pathname: '/events/[id]/confirmed-guests',
        params: { id: eventId },
      } as any);
    } catch (error: any) {
      console.log('❌ updateGuestParticipation error:', error);
      console.log('code:', error?.code);
      console.log('message:', error?.message);
      console.log('details:', error?.details);

      Alert.alert(
        'Erro',
        `${error?.code ?? ''}\n${error?.message ?? 'Falha ao salvar.'}`,
      );
    } finally {
      setSaving(false);
    }
  }, [eventId, userId, family, userName, mode, router]);

  const handleClearAll = useCallback(() => {
    if (family.length === 0) return;

    Alert.alert(
      'Limpar lista',
      'Deseja remover todos os acompanhantes da lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover todos',
          style: 'destructive',
          onPress: () => setFamily([]),
        },
      ],
    );
  }, [family.length]);

  if (initializing) {
    return (
      <View style={[styles.full, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {/* <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando...
        </Text> */}
      </View>
    );
  }

  if (!canUseScreen) {
    return (
      <View style={[styles.full, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Não foi possível abrir esta tela.
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Faça login novamente e tente abrir o evento.
        </Text>

        <View style={{ height: 14 }} />

        <Pressable
          onPress={goBack}
          style={({ pressed }) => [
            styles.secondaryBtn,
            {
              borderColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
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
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <Users size={18} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Minha Participação
              </Text>
            </View>

            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Atualize seus dados e acompanhantes para este evento.
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Seu nome (ou como deseja ser identificado)
          </Text>

          <TextInput
            value={userName}
            onChangeText={setUserName}
            placeholder="Seu nome"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor:
                  scheme === 'dark'
                    ? 'rgba(0,0,0,0.25)'
                    : 'rgba(255,255,255,0.7)',
                marginBottom: 20,
              },
            ]}
          />

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 10,
              opacity: 0.3,
            }}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Nome do acompanhante
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Ex: Maria"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor:
                    scheme === 'dark'
                      ? 'rgba(0,0,0,0.25)'
                      : 'rgba(255,255,255,0.7)',
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />

            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                {
                  opacity: !normalizedNewName ? 0.55 : pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleAdd}
              disabled={!normalizedNewName}
            >
              <Text style={styles.addButtonText}>Adicionar</Text>
            </Pressable>
          </View>

          {family.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <View style={styles.listHeader}>
                <Text style={[styles.listTitle, { color: colors.text }]}>
                  Lista atual ({family.length})
                </Text>

                <Pressable
                  onPress={handleClearAll}
                  style={({ pressed }) => [
                    styles.clearAll,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.error,
                      fontFamily: 'Inter_500Medium',
                    }}
                  >
                    Limpar
                  </Text>
                </Pressable>
              </View>

              {family.map((name) => (
                <View
                  key={name}
                  style={[
                    styles.nameRow,
                    {
                      borderColor: colors.border,
                      backgroundColor:
                        scheme === 'dark'
                          ? 'rgba(0,0,0,0.22)'
                          : 'rgba(255,255,255,0.7)',
                    },
                  ]}
                >
                  <Text style={[styles.nameText, { color: colors.text }]}>
                    • {name}
                  </Text>

                  <Pressable
                    onPress={() => handleRemove(name)}
                    style={({ pressed }) => [
                      styles.removeButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Trash2 size={18} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum acompanhante adicionado ainda.
              </Text>
            </View>
          )}

          <View style={{ height: 18 }} />

          <View style={styles.actions}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: saving ? 0.6 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.btnRow}>
                  <Save size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Salvar alterações</Text>
                </View>
              )}
            </Pressable>

            <View style={{ height: 10 }} />

            {/* mantém seu Button custom também, se preferir:
                <Button title="Salvar alterações" onPress={handleSave} disabled={saving} />
             */}
            <Button
              title="Voltar"
              onPress={goBack}
              variant="ghost"
              fullWidth
              style={{ borderColor: colors.border }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },

  content: {
    padding: 20,
    paddingTop: 120, // por causa do header transparente (aumentado de 90)
    paddingBottom: 30,
  },

  loadingText: {
    marginTop: 12,
    fontFamily: 'Inter_400Regular',
  },

  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 26,
  },

  headerCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  headerSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },

  label: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'Inter_500Medium',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },

  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6c47ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  clearAll: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  nameText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  removeButton: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 10,
  },

  emptyBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },

  actions: {
    marginTop: 8,
  },

  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },

  secondaryBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});
