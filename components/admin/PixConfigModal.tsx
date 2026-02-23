import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, QrCode, MessageSquare, Info } from 'lucide-react-native';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { useColorScheme } from 'react-native';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { Event } from '@/types';

interface PixConfigModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
}

export default function PixConfigModal({ visible, onClose, event }: PixConfigModalProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { updatePixInfo } = useEvents();

  const [pixKey, setPixKey] = useState(event.pixKey || '');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>(event.pixKeyType || 'cpf');
  const [pixMessage, setPixMessage] = useState(event.pixMessage || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setPixKey(event.pixKey || '');
      setPixKeyType(event.pixKeyType || 'cpf');
      setPixMessage(event.pixMessage || '');
    }
  }, [visible, event]);

  const handleSave = async () => {
    try {
      setLoading(true);
      await updatePixInfo(event.id, {
        pixKey,
        pixKeyType,
        pixMessage,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar Pix:', error);
    } finally {
      setLoading(false);
    }
  };

  const types: { label: string; value: typeof pixKeyType }[] = [
    { label: 'CPF', value: 'cpf' },
    { label: 'CNPJ', value: 'cnpj' },
    { label: 'E-mail', value: 'email' },
    { label: 'Celular', value: 'phone' },
    { label: 'Aleatória', value: 'random' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <QrCode size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Vaquinha / Presentes</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Info size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Configure sua chave PIX para que os convidados possam contribuir com o evento ou enviar presentes virtuais.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo de Chave</Text>
            <View style={styles.typesGrid}>
              {types.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: pixKeyType === type.value ? colors.primary : colors.backgroundSecondary,
                      borderColor: pixKeyType === type.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPixKeyType(type.value)}
                >
                  <Text
                    style={[
                      styles.typeLabel,
                      { color: pixKeyType === type.value ? '#fff' : colors.text },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label="Chave PIX"
              placeholder="Digite sua chave"
              value={pixKey}
              onChangeText={setPixKey}
              style={{ marginBottom: 16 }}
            />

            <TextInput
              label="Mensagem para os Convidados"
              placeholder="Ex: Contribua para nossa Lua de Mel!"
              value={pixMessage}
              onChangeText={setPixMessage}
              multiline
              numberOfLines={3}
              style={{ marginBottom: 24 }}
              icon={<MessageSquare size={20} color={colors.textSecondary} />}
            />

            <Button
              title="Salvar Configuração"
              onPress={handleSave}
              loading={loading}
              style={styles.saveButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    padding: 24,
    borderRadius: 20,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    flex: 1,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginBottom: 10,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  saveButton: {
    marginTop: 8,
  },
});
