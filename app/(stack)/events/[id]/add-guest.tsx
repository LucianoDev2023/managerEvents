import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function AddGuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [mode, setMode] = useState<'confirmado' | 'acompanhando'>('confirmado');
  const [familyInput, setFamilyInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const userEmail = `manual-${Date.now()}@convite.local`;

    if (!name.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório.');
      return;
    }

    setLoading(true);

    const family = familyInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const participationId = `${id}_${userEmail}`;
    const participation = {
      id: participationId,
      eventId: id,
      userEmail,
      userName: name.trim(),
      mode,
      family,
    };

    try {
      await setDoc(
        doc(db, 'guestParticipations', participationId),
        participation,
        { merge: true }
      );
      Alert.alert('Convidado adicionado!');
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível adicionar o convidado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Adicionar Convidado
      </Text>

      <TextInput
        placeholder="Nome do convidado"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
        value={name}
        onChangeText={setName}
      />

      {/* <TextInput
        placeholder="Email do convidado"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      /> */}

      <View style={styles.modeContainer}>
        <Pressable
          onPress={() => setMode('confirmado')}
          style={[
            styles.modeButton,
            {
              backgroundColor:
                mode === 'confirmado' ? colors.primary : 'transparent',
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={{ color: mode === 'confirmado' ? '#fff' : colors.text }}>
            ✅ Confirmado
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('acompanhando')}
          style={[
            styles.modeButton,
            {
              backgroundColor:
                mode === 'acompanhando' ? colors.primary : 'transparent',
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={{ color: mode === 'acompanhando' ? '#fff' : colors.text }}
          >
            👀 Interessado
          </Text>
        </Pressable>
      </View>

      <TextInput
        placeholder="Acompanhantes (separados por vírgula)"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
        value={familyInput}
        onChangeText={setFamilyInput}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 20,
          backgroundColor: colors.primary,
          padding: 14,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
          {loading ? 'Salvando...' : '➕ Adicionar Convidado'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
