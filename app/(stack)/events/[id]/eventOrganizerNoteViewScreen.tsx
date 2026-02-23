import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Modal,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Edit, Plus, Trash2, X } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { logger } from '@/lib/logger';
import { auth, db } from '@/config/firebase';
import Button from '@/components/ui/Button';

type Field = { label: string; value: string };

export default function EventOrganizerNoteViewScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const { state } = useEvents();
  const user = auth.currentUser;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const event = state.events.find(e => e.id === eventId);
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editField, setEditField] = useState<Field>({ label: '', value: '' });
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const fetchFields = async () => {
      if (!user || !eventId) return;
      try {
        const ref = doc(db, 'events', eventId, 'notes', 'eventOrganizerNote');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.fields)) {
            setFields(data.fields as Field[]);
          }
        }
      } catch (error) {
        logger.error('Erro ao carregar anotações:', error);
        Alert.alert('Erro', 'Não foi possível carregar as anotações.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFields();
  }, [eventId]);

  const handleDelete = (index: number) => {
    Alert.alert('Confirmar exclusão', 'Deseja excluir esta anotação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const updatedFields = fields.filter((_, i) => i !== index);
          setFields(updatedFields);
          await saveToFirestore(updatedFields);
        },
      },
    ]);
  };

  const handleEdit = (index: number) => {
    setEditIndex(index);
    setEditField(fields[index]);
    setIsModalVisible(true);
  };

  const saveToFirestore = async (newFields: Field[]) => {
    if (!user || !eventId) return;
    const ref = doc(db, 'events', eventId, 'notes', 'eventOrganizerNote');
    try {
      await setDoc(
        ref,
        { fields: newFields, createdBy: user.uid },
        { merge: true },
      );
    } catch (error) {
      logger.error('Erro ao salvar:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    }
  };

  const handleSaveEdit = async () => {
    if (editIndex === null) return;
    setIsEditing(true);
    try {
      const updatedFields = [...fields];
      updatedFields[editIndex] = editField;
      setFields(updatedFields);
      await saveToFirestore(updatedFields);
      setIsModalVisible(false);
      setEditIndex(null);
    } catch (err) {
      logger.error('Erro ao salvar edição:', err);
      Alert.alert('Erro', 'Não foi possível salvar a edição.');
    } finally {
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>
          Carregando anotações...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Anotações' }} />

      <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          Mantenha suas ideias e anotações importantes organizadas para o:
        </Text>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
          {event?.title || '...'}
        </Text>
      </View>

      <FlatList
        data={fields}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>
            Nenhuma anotação encontrada. Toque em "Nova Anotação" para começar.
          </Text>
        }
        renderItem={({ item: field, index }) => (
          <View
            style={[
              styles.fieldCard,
              {
                borderColor: colors.border,
                backgroundColor: colors.backgroundCard,
              },
            ]}
          >
            <View style={styles.fieldHeader}>
              <Text style={[styles.label, { color: colors.primary }]}>
                {field.label}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => handleEdit(index)} style={{ padding: 4 }}>
                  <Edit size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(index)} style={{ padding: 4 }}>
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.value, { color: colors.text }]}>
              {field.value || '—'}
            </Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.extendedFab, { backgroundColor: colors.primary }]}
        onPress={() => router.push(`/events/${eventId}/eventOrganizerNoteScreen`)}
        activeOpacity={0.8}
      >
        <Plus color="#fff" size={24} />
        <Text style={styles.fabText}>Nova Anotação</Text>
      </TouchableOpacity>

      {/* Modal de edição */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.backgroundCard },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Editar anotação
            </Text>
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Título</Text>
            <RNTextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={editField.label}
              onChangeText={(text) =>
                setEditField((prev) => ({ ...prev, label: text }))
              }
              placeholderTextColor={colors.textSecondary}
            />
            
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Conteúdo</Text>
            <RNTextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border, height: 100, textAlignVertical: 'top' },
              ]}
              value={editField.value}
              multiline
              onChangeText={(text) =>
                setEditField((prev) => ({ ...prev, value: text }))
              }
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.modalButtons}>
              <Button 
                title="Cancelar" 
                variant="cancel" 
                onPress={() => setIsModalVisible(false)} 
                style={{ flex: 1 }}
              />
              <Button 
                title="Salvar" 
                onPress={handleSaveEdit} 
                loading={isEditing} 
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  extendedFab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 30, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30, 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
