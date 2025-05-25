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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { Pencil, Trash2 } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function PermissionConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useEvents();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [modalVisible, setModalVisible] = useState(false);
  const [permissionEmail, setPermissionEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'Adm' | 'Parcial'>(
    'Parcial'
  );

  const event = state.events.find((e) => e.id === id);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.text }}>Evento não encontrado.</Text>
      </View>
    );
  }

  const handleEdit = (email: string) => {
    setPermissionEmail(email);
    setModalVisible(true);
  };

  const handleRemove = (email: string) => {
    alert(`Remover permissão de: ${email}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <Card style={styles.eventCard}>
          <Text style={[styles.eventTitle, { color: colors.text }]}>
            {event.title}
          </Text>
          <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>
            {event.location}
          </Text>
        </Card>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Permissões atribuídas
        </Text>

        {!event.subAdmins || event.subAdmins.length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 20 }}>
            Nenhuma permissão cadastrada.
          </Text>
        ) : (
          event.subAdmins.map((item) => (
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
                <TouchableOpacity onPress={() => handleEdit(item.email)}>
                  <Pencil size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemove(item.email)}>
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
            />
            <View style={styles.toggleContainer}>
              <Pressable
                onPress={() => setPermissionLevel('Adm')}
                style={[
                  styles.toggleButton,
                  permissionLevel === 'Adm' && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={{
                    color: permissionLevel === 'Adm' ? 'white' : colors.text,
                  }}
                >
                  Total
                </Text>
              </Pressable>
              {/* <Pressable
                onPress={() => setPermissionLevel('Parcial')}
                style={[
                  styles.toggleButton,
                  permissionLevel === 'Parcial' && {
                    backgroundColor: colors.primary,
                  },
                ]}
              ></Pressable> */}
            </View>
            <Button
              title="Salvar"
              onPress={() => setModalVisible(false)}
              style={{ backgroundColor: colors.primary }}
              textStyle={{ color: 'white' }}
            />
            <Button
              title="Cancelar"
              onPress={() => setModalVisible(false)}
              style={{
                backgroundColor: colors.backGroundSecondary,
                marginTop: 10,
              }}
              textStyle={{ color: 'white' }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  eventCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventSubtitle: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  email: {
    fontSize: 15,
    fontWeight: '500',
  },
  level: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 10,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
});
