// app/(stack)/events/[id]/edit-participation.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthListener } from '@/hooks/useAuthListener';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Button from '@/components/ui/Button';
import { Trash2 } from 'lucide-react-native';
import {
  getGuestParticipationByDocId,
  updateGuestParticipation,
} from '@/hooks/guestService';

export default function EditParticipationScreen() {
  const { id: eventId, guestId } = useLocalSearchParams<{ id: string, guestId: string }>();
  const router = useRouter();

  const { user } = useAuthListener();
  // const uid = user?.uid; // Removido: usaremos o targetUserId do guest

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [targetUserId, setTargetUserId] = useState<string>('');
  const [userName, setUserName] = useState('');
  const [family, setFamily] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // ========================
  // 🔐 Load participation
  // ========================
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!eventId || !guestId) {
        if (mounted) setInitializing(false);
        return;
      }

      try {
        const guest = await getGuestParticipationByDocId(guestId);

        if (!mounted) return;

        if (!guest) {
          Alert.alert('Erro', 'Participação não encontrada.');
          router.back();
          return;
        }

        setTargetUserId(guest.userId);
        setUserName(guest.userName ?? '');
        setFamily(Array.isArray(guest.family) ? guest.family : []);
      } catch (error: any) {
        Alert.alert('Erro', 'Não foi possível carregar a participação.');
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [eventId, guestId, router]);

  // ========================
  // 🔙 Android back handling
  // ========================
  useEffect(() => {
    const onBackPress = () => {
      router.back();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  // ========================
  // 🧠 Handlers
  // ========================
  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (family.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Atenção', 'Esse nome já está na lista.');
      return;
    }

    setFamily((prev) => [...prev, trimmed]);
    setNewName('');
  };

  const handleRemove = (name: string) => {
    Alert.alert('Remover acompanhante', `Remover "${name}" da lista?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => setFamily((prev) => prev.filter((n) => n !== name)),
      },
    ]);
  };

  const handleClearAll = () => {
    if (family.length === 0) return;

    Alert.alert('Limpar lista', 'Remover todos os acompanhantes?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover tudo',
        style: 'destructive',
        onPress: () => setFamily([]),
      },
    ]);
  };

  const handleSave = async () => {
    if (!eventId || !targetUserId) return;
    if (userName.trim().length < 2) {
      Alert.alert('Erro', 'Nome muito curto.');
      return;
    }

    setSaving(true);
    try {
      await updateGuestParticipation({
        userId: targetUserId,
        eventId,
        updates: { family, userName: userName.trim() },
      });

      Alert.alert('✅ Sucesso', 'Participação atualizada!');

      router.replace({
        pathname: '/events/[id]/confirmed-guests',
        params: { id: eventId },
      } as any);
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível atualizar a participação.');
    } finally {
      setSaving(false);
    }
  };

  // ========================
  // ⏳ Loading
  // ========================
  if (initializing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ========================
  // 🎨 UI
  // ========================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Nome do convidado
        </Text>
        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder="Nome do convidado"
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
        />

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16, opacity: 0.3 }} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Adicionar acompanhante
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Ex: Maria"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              { flex: 1, borderColor: colors.border, color: colors.text },
            ]}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />

          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { opacity: pressed ? 0.7 : 1, backgroundColor: colors.primary },
            ]}
            onPress={handleAdd}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Adicionar</Text>
          </Pressable>
        </View>

        {family.length > 0 ? (
          <View style={{ marginVertical: 16 }}>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.text }]}>
                Lista atual ({family.length})
              </Text>

              <Pressable onPress={handleClearAll}>
                <Text style={{ color: colors.error, fontWeight: '700' }}>
                  Limpar
                </Text>
              </Pressable>
            </View>

            {family.map((name, index) => (
              <View
                key={`${name}-${index}`}
                style={[
                  styles.nameRow,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.nameText, { color: colors.text }]}>
                  • {name}
                </Text>

                <Pressable onPress={() => handleRemove(name)}>
                  <Trash2 size={18} color={colors.error} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum acompanhante cadastrado.
          </Text>
        )}

        <Button
          title={saving ? 'Salvando...' : 'Salvar alterações'}
          onPress={handleSave}
          disabled={saving}
        />

        {saving && (
          <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },

  label: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'Inter_500Medium',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },

  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  listTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },

  nameText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },

  removeButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 6,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});
