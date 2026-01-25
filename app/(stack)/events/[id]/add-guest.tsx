import React, { useMemo, useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { auth } from '@/config/firebase';
import { upsertGuestParticipation } from '@/hooks/guestService';
import { GuestMode } from '@/types';

export default function AddGuestScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const scheme = (useColorScheme() ?? 'dark') as 'light' | 'dark';
  const colors = Colors[scheme];

  const [familyInput, setFamilyInput] = useState('');
  const [mode] = useState<GuestMode>('confirmado'); // ✅ seu tipo (PT-BR)
  const [loading, setLoading] = useState(false);

  const family = useMemo(() => {
    // separa por vírgula, remove vazios e duplicados (case-insensitive)
    const raw = familyInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const unique: string[] = [];
    for (const name of raw) {
      if (!unique.some((n) => n.toLowerCase() === name.toLowerCase())) {
        unique.push(name);
      }
    }
    return unique;
  }, [familyInput]);

  const handleSubmit = async () => {
    const current = auth.currentUser;

    if (!current) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!eventId) {
      Alert.alert('Erro', 'EventId inválido.');
      return;
    }

    setLoading(true);

    try {
      const userId = current.uid;
      const userName = current.displayName?.trim() || 'Convidado';

      await upsertGuestParticipation({
        eventId,
        userId,
        userName,
        mode,
        family,
      });

      Alert.alert('Salvo!', 'Seus acompanhantes foram registrados.');
      router.back();
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível salvar os acompanhantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Adicionar acompanhantes',
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Meus acompanhantes
        </Text>

        <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>
          Digite os nomes separados por vírgula (ex: Ana, João, Maria).
        </Text>

        <TextInput
          placeholder="Acompanhantes (separados por vírgula)"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border },
          ]}
          value={familyInput}
          onChangeText={setFamilyInput}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[
            styles.button,
            { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>✅ Salvar acompanhantes</Text>
          )}
        </Pressable>

        {!!family.length && (
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>
            Será salvo: {family.join(', ')}
          </Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    marginTop: 4,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
