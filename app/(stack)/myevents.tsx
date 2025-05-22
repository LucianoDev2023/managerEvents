import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';

export default function MyEventsScreen() {
  const { state, updateEvent } = useEvents();
  const router = useRouter();
  const auth = getAuth();
  const userEmail = auth.currentUser?.email?.toLowerCase();
  const userId = auth.currentUser?.uid;
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [permissionEmail, setPermissionEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'total' | 'parcial'>(
    'parcial'
  );

  const filteredEvents = state.events.filter(
    (event) => event.createdBy?.toLowerCase() === userEmail
  );

  const handleNavigateToEvent = (eventId: string) => {
    router.push({
      pathname: '/events/[id]',
      params: { id: eventId },
    });
  };

  const handleOpenPermissionModal = (eventId: string) => {
    setSelectedEventId(eventId);
    setModalVisible(true);
  };

  const handleSavePermission = () => {
    console.log('clicado em salvar permissão');
    if (!permissionEmail.trim()) {
      alert('Insira um email válido');
      return;
    }

    const updatedEvents = state.events.map((event) => {
      if (event.id === selectedEventId) {
        return {
          ...event,
          subAdmins: [
            ...(event.subAdmins ?? []),
            {
              email: permissionEmail.toLowerCase().trim(),
              level: permissionLevel,
            },
          ],
        };
      }
      return event;
    });

    const updatedEvent = updatedEvents.find((e) => e.id === selectedEventId);
    if (updatedEvent) updateEvent(updatedEvent);

    setModalVisible(false);
    setPermissionEmail('');
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push('/profile');
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [])
  );
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Meus Eventos</Text>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              flex: 1,
              padding: 16,
              alignContent: 'center',
              gap: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.backgroundAlt,
              shadowColor: scheme === 'dark' ? '#fff' : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 6,
              marginBottom: 24,
              flexDirection: 'column',
              justifyContent: 'space-between',
              // alignItems: 'center',
            }}
          >
            <View style={styles.cardInfo}>
              <Text style={[styles.eventTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.eventDates, { color: colors.primary }]}>
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </Text>
            </View>

            <View style={styles.actions}>
              <Button
                title="Abrir evento"
                size="small"
                onPress={() => handleNavigateToEvent(item.id)}
                style={{
                  backgroundColor:
                    colorScheme === 'dark'
                      ? colors.primaryDark
                      : colors.primaryLight,
                }}
                textStyle={{ color: colors.text }}
              />

              <Button
                title="Adicionar permissão"
                size="small"
                onPress={() => handleOpenPermissionModal(item.id)}
                style={{
                  backgroundColor:
                    colorScheme === 'dark'
                      ? colors.primary
                      : colors.primaryDark,
                }}
                textStyle={{ color: colors.text }}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text
            style={{
              color: colors.textSecondary,
              marginTop: 20,
              textAlign: 'center',
            }}
          >
            Nenhum evento disponível.
          </Text>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nova Permissão
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
                onPress={() => setPermissionLevel('total')}
                style={[
                  styles.toggleButton,
                  permissionLevel === 'total' && {
                    backgroundColor: colors.primaryDark,
                  },
                ]}
              >
                <Text
                  style={{
                    color: permissionLevel === 'total' ? 'white' : colors.text,
                  }}
                >
                  Total
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPermissionLevel('parcial')}
                style={[
                  styles.toggleButton,
                  permissionLevel === 'parcial' && {
                    backgroundColor: colors.primaryDark,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      permissionLevel === 'parcial' ? 'white' : colors.text,
                  }}
                >
                  Parcial
                </Text>
              </Pressable>
            </View>
            <Button
              title="Salvar"
              size="small"
              onPress={handleSavePermission}
              style={{ backgroundColor: colors.primary }}
              textStyle={{ color: 'white' }}
            />

            <Button
              title="Cancelar"
              size="small"
              onPress={() => setModalVisible(false)}
              style={{ backgroundColor: colors.secondary }}
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
    justifyContent: 'center',
    alignContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
    shadowColor: '#222',
    backgroundColor: '#222',
  },
  eventDates: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },

  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignContent: 'center',
    marginTop: 20,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 10,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    height: '50%',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    justifyContent: 'center',
    gap: 15,
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
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  salvarButton: {
    marginTop: 20,
  },
});
