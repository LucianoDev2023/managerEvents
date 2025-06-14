import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Modal,
  TextInput as RNTextInput,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Edit, Pencil, Plus, Trash2, X } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { db } from '@/config/firebase';
import Button from '@/components/ui/Button';

type Field = { label: string; value: string };

export default function EventOrganizerNoteViewScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const user = getAuth().currentUser;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

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
        console.error('Erro ao carregar anotações:', error);
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
        { merge: true }
      );
    } catch (error) {
      console.error('Erro ao salvar:', error);
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
      console.error('Erro ao salvar edição:', err);
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
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.heading, { color: colors.text }]}>
        Anotações da organização
      </Text>

      {fields.length > 0 ? (
        fields.map((field, index) => (
          <View
            key={index}
            style={[
              styles.fieldCard,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <View style={styles.fieldHeader}>
              <Text style={[styles.label, { color: colors.primary }]}>
                {field.label}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={() => handleEdit(index)}>
                  <Edit size={18} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => handleDelete(index)}>
                  <Trash2 size={18} color="red" />
                </Pressable>
              </View>
            </View>
            <Text style={[styles.value, { color: colors.text }]}>
              {field.value || '—'}
            </Text>
          </View>
        ))
      ) : (
        <Text style={{ color: colors.textSecondary }}>
          Nenhuma anotação encontrada.
        </Text>
      )}

      <View style={{ height: 20, justifyContent: 'flex-start' }} />
      <Pressable
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() =>
          router.push(`/events/${eventId}/eventOrganizerNoteScreen`)
        }
      >
        <Plus size={16} color={colors.text} />
        <Text
          style={[styles.addButtonText, { color: colors.text, marginLeft: 8 }]}
        >
          Adicionar anotação
        </Text>
      </Pressable>

      {/* Modal de edição */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Editar anotação
            </Text>
            <RNTextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Título"
              value={editField.label}
              onChangeText={(text) =>
                setEditField((prev) => ({ ...prev, label: text }))
              }
              placeholderTextColor={colors.text2}
            />
            <RNTextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border, height: 100 },
              ]}
              placeholder="Anotação"
              value={editField.value}
              multiline
              onChangeText={(text) =>
                setEditField((prev) => ({ ...prev, value: text }))
              }
              placeholderTextColor={colors.text2}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                style={({ pressed }) => [
                  styles.cancelButton,
                  {
                    opacity: pressed ? 0.6 : 1,
                    backgroundColor: colors.backgroundComents,
                  },
                ]}
              >
                <Text
                  style={[styles.cancelButtonText, { color: colors.text2 }]}
                >
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSaveEdit}
                disabled={isEditing}
                style={[
                  styles.saveButton,
                  {
                    opacity: isEditing ? 0.6 : 1,
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                {isEditing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar</Text>
                )}
              </Pressable>
            </View>
            <Pressable
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
