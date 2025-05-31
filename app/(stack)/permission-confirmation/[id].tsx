import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { Pencil, Trash2 } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';

export default function PermissionConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateEvent } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [modalVisible, setModalVisible] = useState(false);
  const [permissionEmail, setPermissionEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<
    'Super Admin' | 'Admin parcial'
  >('Admin parcial');

  const event = state.events.find((e) => e.id === id);

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Evento não encontrado.</Text>
      </View>
    );
  }

  const handleEdit = (
    email: string,
    level: 'Super Admin' | 'Admin parcial'
  ) => {
    setPermissionEmail(email);
    setPermissionLevel(level);
    setModalVisible(true);
  };

  const handleRemove = (email: string) => {
    Alert.alert(
      'Remover permissão',
      `Deseja remover a permissão de ${email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            const updatedEvent = {
              ...event,
              subAdmins:
                event.subAdmins?.filter((admin) => admin.email !== email) || [],
            };
            updateEvent(updatedEvent);
          },
        },
      ]
    );
  };

  const handleSavePermission = () => {
    if (!permissionEmail) return;
    const updatedEvent = {
      ...event,
      subAdmins: (event.subAdmins ?? []).map((admin) =>
        admin.email === permissionEmail
          ? { ...admin, level: permissionLevel }
          : admin
      ),
    };
    updateEvent(updatedEvent);
    setModalVisible(false);
  };

  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.gradient}
      locations={[0, 0.7, 1]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.eventCard,
            { backgroundColor: colors.backGroundSecondary },
          ]}
        >
          <Text style={[styles.eventTitle, { color: colors.text }]}>
            {event.title}
          </Text>
          <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>
            {event.location}
          </Text>
        </View>

        {/* Card das Permissões */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Permissões Atribuídas
        </Text>
        <View
          style={[
            styles.permissionsCard,
            { backgroundColor: colors.backGroundSecondary },
          ]}
        >
          {(event.subAdmins ?? []).length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma permissão cadastrada.
            </Text>
          ) : (
            event.subAdmins?.map((item) => (
              <View
                key={item.email}
                style={[styles.card, { borderColor: colors.border }]}
              >
                <View>
                  <Text style={[styles.email, { color: colors.text }]}>
                    {item.email}
                  </Text>
                  <Text style={[styles.level, { color: colors.textSecondary }]}>
                    Permissão: {item.level}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item.email, item.level)}
                  >
                    <Pencil size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemove(item.email)}>
                    <Trash2 size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Editar Permissão
            </Text>

            <TextInput
              placeholder="Email do usuário"
              value={permissionEmail}
              onChangeText={setPermissionEmail}
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholderTextColor={colors.textSecondary}
              editable={false}
            />

            <View style={styles.toggleContainer}>
              {(['Super Admin', 'Admin parcial'] as const).map((level) => (
                <Pressable
                  key={level}
                  onPress={() => setPermissionLevel(level)}
                  style={[
                    styles.toggleButton,
                    {
                      borderColor: colors.border,
                      backgroundColor:
                        permissionLevel === level
                          ? colors.primary
                          : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: permissionLevel === level ? '#fff' : colors.text,
                      fontWeight: 'bold',
                    }}
                  >
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Button
              title="Salvar"
              onPress={handleSavePermission}
              style={{ backgroundColor: colors.primary }}
              textStyle={{ color: '#fff' }}
            />
            <Button
              variant="cancel"
              title="Cancelar"
              onPress={() => setModalVisible(false)}
              style={{
                backgroundColor: colors.backGroundSecondary,
                marginTop: 10,
              }}
              textStyle={{ color: '#fff' }}
            />
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 16 },
  eventCard: {
    padding: 20,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderBottomColor: '#333',
    borderTopColor: '#333',
  },
  eventTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  eventSubtitle: { fontSize: 14 },
  subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  email: { fontSize: 16, fontWeight: '600' },
  level: { fontSize: 13, fontStyle: 'italic', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { width: '90%', padding: 24, borderRadius: 16, gap: 16 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  toggleContainer: { flexDirection: 'row', gap: 10 },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    padding: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionsCard: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
  },
});
