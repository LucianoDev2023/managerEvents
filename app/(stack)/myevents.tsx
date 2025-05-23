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
  Image,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight } from 'lucide-react-native';

export default function MyEventsScreen() {
  const { state, updateEvent } = useEvents();
  const router = useRouter();
  const auth = getAuth();
  const userEmail = auth.currentUser?.email?.toLowerCase();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

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
    router.push({ pathname: '/events/[id]', params: { id: eventId } });
  };

  const handleOpenPermissionModal = (eventId: string) => {
    setSelectedEventId(eventId);
    setModalVisible(true);
  };

  const handleSavePermission = () => {
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
      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const gradientColors =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#e6e6f0', '#f9f9ff'];

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.gradient}
      locations={[0, 0.7, 1]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />
      <View
        style={[
          styles.container,
          {
            paddingTop:
              Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Meus Eventos</Text>

        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleNavigateToEvent(item.id)}>
              <View
                style={[
                  styles.cardWrapper,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.backGroundSecondary,
                    shadowColor: colorScheme === 'dark' ? '#fff' : '#000',
                  },
                ]}
              >
                <View
                  style={[
                    styles.cardInfo,
                    {
                      backgroundColor: colors.backGroundSecondary,
                      borderRadius: 12,
                      padding: 12,
                      shadowColor: colorScheme === 'dark' ? '#000' : '#aaa',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 6,
                      elevation: 4,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    {item.coverImage && (
                      <Image
                        source={{ uri: item.coverImage }}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          marginRight: 12,
                        }}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.eventDates, { color: colors.primary }]}
                      >
                        {' '}
                        {formatDate(item.startDate)} -{' '}
                        {formatDate(item.endDate)}{' '}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={colors.textSecondary} />
                  </View>
                </View>

                <View style={styles.actions}>
                  <Button
                    title="Adicionar permissão"
                    size="small"
                    onPress={() => handleOpenPermissionModal(item.id)}
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: 20,
                      paddingHorizontal: 24,
                    }}
                    textStyle={{ color: 'white', fontWeight: 'bold' }}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
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
                {['total', 'parcial'].map((level) => (
                  <Pressable
                    key={level}
                    onPress={() =>
                      setPermissionLevel(level as 'total' | 'parcial')
                    }
                    style={[
                      styles.toggleButton,
                      permissionLevel === level && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: permissionLevel === level ? '#fff' : colors.text,
                      }}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </Pressable>
                ))}
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
                style={{ backgroundColor: '#d9534f' }}
                textStyle={{ color: 'white' }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardWrapper: {
    padding: 16,
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 24,
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingBottom: 6,
  },
  eventDates: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 12,
    gap: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
