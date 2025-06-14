import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  useColorScheme,
  TextInput as RNTextInput,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import Colors from '@/constants/Colors';
import { db } from '@/config/firebase';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';

export default function EventOrganizerNoteScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const user = getAuth().currentUser;
  const router = useRouter();

  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !eventId || !label.trim()) {
      Alert.alert('Erro', 'Preencha ao menos o nome do campo.');
      return;
    }

    setIsSaving(true);
    const ref = doc(db, 'events', eventId, 'notes', 'eventOrganizerNote');

    try {
      const snap = await getDoc(ref);
      const existingFields =
        snap.exists() && Array.isArray(snap.data()?.fields)
          ? snap.data()?.fields
          : [];

      const updatedFields = [...existingFields, { label: label.trim(), value }];

      await setDoc(
        ref,
        {
          fields: updatedFields,
          createdBy: snap.data()?.createdBy ?? user.uid,
        },
        { merge: true }
      );

      Alert.alert('Sucesso', 'Anotação adicionada!');
      router.push(`/events/${eventId}/eventOrganizerNoteViewScreen`);
    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
      Alert.alert('Erro', 'Não foi possível salvar a anotação.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Nova Anotação</Text>

      <RNTextInput
        placeholder="Nome do campo"
        placeholderTextColor={colors.text2}
        value={label}
        onChangeText={setLabel}
        style={[
          styles.labelInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />

      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Digite a anotação"
        inputStyle={{
          color: colors.text,
          minHeight: 100,
          textAlignVertical: 'top',
        }}
        multiline
      />

      <View style={{ height: 16 }} />
      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        style={[
          styles.saveButton,
          {
            backgroundColor: isSaving ? colors.primary + '99' : colors.primary,
            opacity: isSaving ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[styles.saveButtonText]}>
          {isSaving ? 'Salvando...' : 'Salvar anotação'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  labelInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
