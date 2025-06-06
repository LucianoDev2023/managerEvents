import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Guest } from '@/types';

export default function MyCompanionsScreen() {
  const { getGuests } = useEvents();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const user = getAuth().currentUser;
  const userEmail = user?.email;
  const router = useRouter();

  const [availableEvents, setAvailableEvents] = useState<
    {
      id: string;
      title: string;
      startDate: Date;
      guestDocId: string;
      companions: string[];
    }[]
  >([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [guestDocId, setGuestDocId] = useState<string | null>(null);
  const [companions, setCompanions] = useState<string[]>([]);
  const [newCompanion, setNewCompanion] = useState('');

  useEffect(() => {
    if (!userEmail) return;

    const fetchConfirmedEvents = async () => {
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const result: {
        id: string;
        title: string;
        startDate: Date;
        guestDocId: string;
        companions: string[];
      }[] = [];

      for (const docSnap of eventsSnapshot.docs) {
        const eventId = docSnap.id;
        const eventData = docSnap.data();
        const guests = await getGuests(eventId);

        const matchingGuest = guests.find(
          (g) => g.email === userEmail && g.mode === 'confirmado'
        );

        if (matchingGuest) {
          result.push({
            id: eventId,
            title: eventData.title,
            startDate: new Date(
              eventData.startDate.toDate?.() ?? eventData.startDate
            ),
            guestDocId: matchingGuest.email,
            companions: matchingGuest.family ?? [],
          });
        }
      }

      setAvailableEvents(result);
    };

    fetchConfirmedEvents();
  }, [userEmail]);

  const handleSelectEvent = (eventId: string) => {
    const event = availableEvents.find((e) => e.id === eventId);
    if (event) {
      setSelectedEventId(event.id);
      setGuestDocId(event.guestDocId);
      setCompanions(event.companions);
    }
  };

  const handleAddCompanion = () => {
    if (newCompanion.trim()) {
      setCompanions((prev) => [...prev, newCompanion.trim()]);
      setNewCompanion('');
    }
  };

  const handleRemoveCompanion = (index: number) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    if (!selectedEventId || !guestDocId) return;

    try {
      const guestRef = doc(db, 'events', selectedEventId, 'guests', guestDocId);
      await setDoc(guestRef, { family: companions }, { merge: true });

      Alert.alert('Sucesso', 'Acompanhantes atualizados.');
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Meus Acompanhantes
      </Text>

      {!selectedEventId ? (
        <>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Selecione o evento para editar os acompanhantes:
          </Text>
          <FlatList
            data={availableEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectEvent(item.id)}
                style={[styles.eventItem, { borderColor: colors.border }]}
              >
                <Text style={[styles.eventTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Início: {item.startDate.toLocaleDateString('pt-BR')}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={{ color: colors.textSecondary, marginTop: 20 }}>
                Nenhum evento confirmado encontrado.
              </Text>
            }
          />
        </>
      ) : (
        <>
          <TextInput
            placeholder="Nome do acompanhante"
            value={newCompanion}
            onChangeText={setNewCompanion}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            placeholderTextColor={colors.textSecondary}
          />

          <Pressable style={styles.addButton} onPress={handleAddCompanion}>
            <Text style={styles.addButtonText}>Adicionar</Text>
          </Pressable>

          <FlatList
            data={companions}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.itemRow}>
                <Text style={{ color: colors.text }}>• {item}</Text>
                <Pressable onPress={() => handleRemoveCompanion(index)}>
                  <Text style={{ color: 'red' }}>Excluir</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ color: colors.textSecondary, marginTop: 20 }}>
                Nenhum acompanhante adicionado.
              </Text>
            }
          />

          <Pressable style={styles.saveButton} onPress={handleSaveChanges}>
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
  eventItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#6C47FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: '#38A169',
    padding: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
});
