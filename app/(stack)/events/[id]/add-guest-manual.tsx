import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar as RNStatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuthListener } from '@/hooks/useAuthListener';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Button from '@/components/ui/Button';
import { Plus, Trash2, UserPlus } from 'lucide-react-native';
import { createManualGuest } from '@/hooks/guestService';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [family, setFamily] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
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

    if (family.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Atenção', 'Esse nome já está na lista.');
      return;
    }

    setFamily((prev) => [...prev, trimmed]);
    setNewName('');

    // (opcional) rolar para baixo depois de adicionar
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
  };

  const handleRemoveCompanion = (name: string) => {
    setFamily((prev) => prev.filter((n) => n !== name));
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
      console.error(e);
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
          // ✅ O pulo do gato: flexGrow + paddingBottom com safe-area
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

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Nome do convidado principal *
          </Text>
          <TextInput
            value={userName}
            onChangeText={setUserName}
            placeholder="Ex: Tio João"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor:
                  colorScheme === 'dark'
                    ? 'rgba(0,0,0,0.25)'
                    : 'rgba(255,255,255,0.7)',
              },
            ]}
          />

          <View style={styles.separator} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Acompanhantes (opcional)
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
                  flex: 1,
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(0,0,0,0.25)'
                      : 'rgba(255,255,255,0.7)',
                },
              ]}
              onSubmitEditing={handleAddCompanion}
              returnKeyType="done"
            />

            <Pressable
              style={({ pressed }) => [
                styles.miniBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !newName.trim() ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleAddCompanion}
              disabled={!newName.trim()}
            >
              <Plus size={18} color="#fff" />
            </Pressable>
          </View>

          {family.length > 0 && (
            <View style={styles.listContainer}>
              {family.map((item, idx) => (
                <View
                  key={`${item}-${idx}`}
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
                  <Text style={{ color: colors.text, flex: 1 }}>{item}</Text>
                  <Pressable onPress={() => handleRemoveCompanion(item)}>
                    <Trash2 size={18} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* ✅ Espaço elástico: empurra o botão para o “fim” quando não rola */}
          <View style={{ flex: 1 }} />

          <Button
            title={saving ? 'Salvando...' : 'Adicionar Convidado'}
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

  // base: paddingTop/paddingBottom serão setados dinamicamente
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

  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },

  separator: { height: 16 },

  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },

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
