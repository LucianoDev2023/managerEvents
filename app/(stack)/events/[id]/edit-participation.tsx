import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthListener } from '@/hooks/useAuthListener';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Button from '@/components/ui/Button';
import { BackHandler } from 'react-native';
import {
  getGuestParticipation,
  updateParticipation,
} from '@/config/guestParticipation.ts';
import { Trash2 } from 'lucide-react-native';

export default function EditParticipationScreen() {
  const { id, guestId } = useLocalSearchParams<{
    id: string;
    guestId?: string;
  }>();

  const router = useRouter();
  const { user } = useAuthListener();
  const userEmail = user?.email?.toLowerCase();
  const targetEmail = guestId ? guestId : userEmail?.toLowerCase();

  const [family, setFamily] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  useEffect(() => {
    const fetchParticipation = async () => {
      if (!id || !targetEmail) return;
      try {
        const guest = await getGuestParticipation(id, targetEmail);
        if (guest?.family) setFamily(guest.family);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar sua participação.');
      } finally {
        setInitializing(false);
      }
    };
    fetchParticipation();
  }, [id, targetEmail]);

  useEffect(() => {
    const onBackPress = () => {
      router.push('/(tabs)/profile'); // força o retorno
      return true;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    };
  }, []);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (family.includes(trimmed)) {
      Alert.alert('Atenção', 'Esse nome já está na lista.');
      return;
    }
    setFamily((prev) => [...prev, trimmed]);
    setNewName('');
  };

  const handleRemove = (name: string) => {
    Alert.alert(
      'Remover acompanhante',
      `Tem certeza que deseja remover "${name}" da lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setFamily((prev) => prev.filter((n) => n !== name));
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!targetEmail || !id) return;
    setLoading(true);
    try {
      await updateParticipation(id, targetEmail, { family });
      Alert.alert('✅ Sucesso', 'Participação atualizada!');
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar sua participação.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
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
                flex: 1,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <Pressable style={styles.addButton} onPress={handleAdd}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Adicionar</Text>
          </Pressable>
        </View>

        {family.length > 0 && (
          <View style={{ marginVertical: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'Inter_500Medium',
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Lista atual:
            </Text>
            {family.map((name, index) => (
              <View
                key={index}
                style={[
                  styles.nameRow,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
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
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Trash2 size={18} color="red" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Button
          title="Salvar alterações"
          onPress={handleSave}
          disabled={loading}
        />
        {loading && (
          <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    fontFamily: 'Inter_700Bold',
  },
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
    backgroundColor: '#6c47ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
});
