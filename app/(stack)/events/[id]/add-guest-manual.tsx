import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  BackHandler,
  StatusBar as RNStatusBar,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuthListener } from '@/hooks/useAuthListener';
import { db } from '@/config/firebase';
import { logger } from '@/lib/logger';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import { Plus, Trash2, UserPlus, Baby } from 'lucide-react-native';
import { createManualGuest } from '@/hooks/guestService';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FamilyMember } from '@/types';

export default function AddManualGuestScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authLoading } = useAuthListener();

  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const gradientColors =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const [userName, setUserName] = useState('');
  const [family, setFamily] = useState<FamilyMember[]>([]);
  
  // Input states
  const [newName, setNewName] = useState('');
  const [isChild, setIsChild] = useState(false);
  const [childAge, setChildAge] = useState('');

  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const onBackPress = () => {
      router.back();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  const handleAddCompanion = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (family.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Atenção', 'Esse nome já está na lista.');
      return;
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

    setFamily((prev) => [...prev, newMember]);
    setNewName('');
    setIsChild(false);
    setChildAge('');

    // (opcional) rolar para baixo depois de adicionar
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
  };

  const handleRemoveCompanion = (nameToRemove: string) => {
    setFamily((prev) => prev.filter((m) => m.name !== nameToRemove));
  };

  const handleSave = async () => {
    if (!eventId) return;

    if (userName.trim().length < 2) {
      Alert.alert('Erro', 'O nome do convidado principal é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      await createManualGuest({
        eventId,
        userName: userName.trim(),
        family, 
      });

      Alert.alert('✅ Sucesso', 'Convidado adicionado manualmente!');
      router.back();
    } catch (e: any) {
      logger.error(e);
      Alert.alert('Erro', 'Não foi possível adicionar o convidado.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ✅ paddingTop levando em conta status bar no Android (header transparente)
  const topPad =
    Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 90 : 110;

  // ✅ paddingBottom levando em conta safe area/gesture bar
  const bottomPad = insets.bottom + 24;

  return (
    <LinearGradient
      colors={gradientColors as [string, string, string]}
      locations={[0, 0.7, 1]}
      style={styles.full}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Adicionar Convidado',
          headerTransparent: true,
          headerTintColor: colors.text,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.full}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.full}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              flexGrow: 1,
              paddingTop: topPad,
              paddingBottom: bottomPad,
            },
          ]}
        >
          {/* conteúdo */}
          <View
            style={[
              styles.headerCard,
              {
                backgroundColor:
                  colorScheme === 'dark'
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(255,255,255,0.65)',
                borderColor:
                  colorScheme === 'dark'
                    ? 'rgba(255,255,255,0.10)'
                    : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <View style={styles.headerRow}>
              <UserPlus size={20} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Cadastro Manual
              </Text>
            </View>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Use esta tela para adicionar convidados que não têm acesso ao app.
            </Text>
          </View>

          <TextInput
            label="Nome do convidado principal *"
            value={userName}
            onChangeText={setUserName}
            placeholder="Ex: Tio João"
          />

          <View style={styles.separator} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Acompanhantes (opcional)
          </Text>

            {/* Area de adição de acompanhante */}
          <View style={[styles.formCard, { borderColor: colors.border }]}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Nome do acompanhante"
              style={{ marginBottom: 12 }}
            />

            <View style={[styles.rowBetween, { marginBottom: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Baby size={20} color={colors.text} />
                    <Text style={{ color: colors.text, fontSize: 16 }}>É criança?</Text>
                </View>
                <Switch 
                    value={isChild} 
                    onValueChange={setIsChild} 
                    trackColor={{ false: '#767577', true: colors.primary }}
                    thumbColor="#f4f3f4"
                />
            </View>

            {isChild && (
                <TextInput
                    value={childAge}
                    onChangeText={setChildAge}
                    placeholder="Idade da criança"
                    keyboardType="numeric"
                    style={{ marginBottom: 12 }}
                />
            )}

            <Pressable
              style={({ pressed }) => [
                styles.miniBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !newName.trim() ? 0.5 : pressed ? 0.85 : 1,
                  alignSelf: 'stretch', // Preencher largua
                },
              ]}
              onPress={handleAddCompanion}
              disabled={!newName.trim()}
            >
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Plus size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Adicionar</Text>
               </View>
            </Pressable>
          </View>


          {family.length > 0 && (
            <View style={styles.listContainer}>
              {family.map((member, idx) => (
                <View
                  key={`${member.name}-${idx}`}
                  style={[
                    styles.listItem,
                    {
                      borderColor: colors.border,
                      backgroundColor:
                        colorScheme === 'dark'
                          ? 'rgba(0,0,0,0.2)'
                          : 'rgba(255,255,255,0.6)',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{member.name}</Text>
                    {member.isChild && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Baby size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                Criança • {member.age} anos
                            </Text>
                        </View>
                    )}
                  </View>

                  <Pressable onPress={() => handleRemoveCompanion(member.name)}>
                    <Trash2 size={18} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={{ flex: 1, minHeight: 20 }} />

          <Button
            title={saving ? 'Salvando...' : 'Salvar Convidado'}
            onPress={handleSave}
            disabled={saving}
            style={{ backgroundColor: colors.primary }}
            textStyle={{ color: '#fff' }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3333',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 40,
  },

  headerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  headerTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  label: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 8 },



  separator: { height: 16 },

  formCard: {
      padding: 12,
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 10,
  },

  rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
  },

  miniBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContainer: { marginTop: 8, marginBottom: 12 },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
});
