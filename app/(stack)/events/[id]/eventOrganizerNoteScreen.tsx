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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import Colors from '@/constants/Colors';
import { auth, db } from '@/config/firebase';
import Fonts from '@/constants/Fonts';
import { logger } from '@/lib/logger';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';

export default function EventOrganizerNoteScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const user = auth.currentUser;
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

      // Limite de 10 anotações por evento
      if (existingFields.length >= 10) {
        Alert.alert(
          'Limite atingido',
          'Você já tem 10 anotações neste evento. Remova uma antes de adicionar outra.',
        );
        return;
      }

      const updatedFields = [...existingFields, { label: label.trim(), value }];

      await setDoc(
        ref,
        {
          fields: updatedFields,
          createdBy: snap.data()?.createdBy ?? user.uid,
        },
        { merge: true },
      );

      Alert.alert('Sucesso', 'Anotação adicionada!');
      router.push(`/events/${eventId}/eventOrganizerNoteViewScreen`);
    } catch (error) {
      logger.error('Erro ao salvar anotação:', error);
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
      <Stack.Screen options={{ title: 'Nova Anotação' }} />
      
      <View style={styles.formCard}>
        <TextInput
          label="Título"
          placeholder="Ex: Reunião com Buffet"
          value={label}
          onChangeText={setLabel}
        />

        <TextInput
          label="Conteúdo"
          value={value}
          onChangeText={setValue}
          placeholder="Digite os detalhes da anotação..."
          multiline
          numberOfLines={6}
          inputStyle={{
            minHeight: 120,
            textAlignVertical: 'top',
          }}
        />

        <View style={{ marginTop: 24 }}>
          <Button 
            title="Salvar Anotação" 
            onPress={handleSave} 
            loading={isSaving} 
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  formCard: {
    marginTop: 10,
  },
});
