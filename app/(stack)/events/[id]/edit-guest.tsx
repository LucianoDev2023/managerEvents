import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Guest } from '@/types';

export default function EditGuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getGuests, saveGuest } = useEvents();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const user = getAuth().currentUser;

  useEffect(() => {
    if (!id || !user?.email) return;
    (async () => {
      try {
        const guests = await getGuests(id);
        const current = guests.find((g) => g.email === user.email);
        if (current) setGuest(current);
      } catch (err) {
        console.error('Erro ao carregar convidado:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user?.email]);

  const handleRemove = (index: number) => {
    if (!guest) return;
    const updatedFamily = guest.family?.filter((_, i) => i !== index) ?? [];
    setGuest({ ...guest, family: updatedFamily });
  };

  const handleAdd = () => {
    if (!guest || !newName.trim()) return;
    const updatedFamily = [...(guest.family ?? []), newName.trim()];
    setGuest({ ...guest, family: updatedFamily });
    setNewName('');
  };

  const handleSave = async () => {
    if (!guest || !id) return;
    try {
      await saveGuest(id, guest);
      Alert.alert('Atualizado com sucesso!');
      router.back();
    } catch (err) {
      Alert.alert('Erro ao salvar', String(err));
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Carregando...
        </Text>
      </View>
    );
  }

  if (!guest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>
          Nenhum convidado encontrado para este evento.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Editar acompanhantes
      </Text>

      <FlatList
        data={guest.family ?? []}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.itemRow}>
            <Text style={[styles.name, { color: colors.text }]}>• {item}</Text>
            <Pressable onPress={() => handleRemove(index)}>
              <Text style={styles.remove}>Remover</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary }}>
            Nenhum acompanhante adicionado.
          </Text>
        }
      />

      <TextInput
        placeholder="Novo nome"
        value={newName}
        onChangeText={setNewName}
        placeholderTextColor="#aaa"
        style={[styles.input, { borderColor: colors.border }]}
      />

      <Pressable onPress={handleAdd} style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Adicionar</Text>
      </Pressable>

      <Pressable onPress={handleSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Salvar alterações</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingText: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  remove: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    marginTop: 20,
  },
  addButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#5838AD',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#5838AD',
    padding: 14,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
});
