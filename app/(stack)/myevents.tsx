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
import { ChevronRight, KeyRoundIcon, MapPin } from 'lucide-react-native';
import { Linking } from 'react-native';
import RoleBadge from '@/components/ui/RoleBadge';

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
  const [permissionLevel, setPermissionLevel] = useState<'Adm' | 'Parcial'>(
    'Parcial'
  );

  const filteredEvents = state.events.filter(
    (event) =>
      event.createdBy?.toLowerCase() === userEmail ||
      event.subAdmins?.some((admin) => admin.email.toLowerCase() === userEmail)
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
        router.push('/');
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

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const handleOpenInMaps = (location: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location
    )}`;
    Linking.openURL(mapsUrl);
  };

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
          renderItem={({ item }) => {
            const isCreator = item.createdBy?.toLowerCase() === userEmail;
            const isAdm = item.subAdmins?.some(
              (admin) =>
                (admin.email.toLowerCase() === userEmail &&
                  admin.level === 'Adm') ||
                admin.level === 'Parcial'
            );

            return (
              <TouchableOpacity
                onPress={() => handleNavigateToEvent(item.id)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.cardWrapper,
                    {
                      backgroundColor: colors.backGroundSecondary,
                      shadowColor: colorScheme === 'dark' ? '#000' : '#ccc',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {item.coverImage && (
                      <Image
                        source={{ uri: item.coverImage }}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 12,
                          marginRight: 12,
                        }}
                      />
                    )}

                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={[
                            styles.cardTitle,
                            { color: colors.text, flex: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>

                      <Text
                        style={[styles.cardDate, { color: colors.primary }]}
                      >
                        {formatDate(item.startDate)} -{' '}
                        {formatDate(item.endDate)}
                      </Text>
                      <Text
                        style={[
                          styles.location,
                          { color: colors.text, flex: 1 },
                        ]}
                      >
                        {item.location}
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleOpenInMaps(item.location)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: colors.primary,
                        }}
                      >
                        <MapPin size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary, marginLeft: 4 }}>
                          Ver no mapa
                        </Text>
                      </TouchableOpacity>
                      {(isCreator || isAdm) && (
                        <View>
                          <Button
                            title="Adicionar permissão"
                            size="small"
                            onPress={() => handleOpenPermissionModal(item.id)}
                            icon={<KeyRoundIcon size={14} color="white" />} // ✅ aqui está o ícone
                            style={[
                              styles.permissionButton,
                              { backgroundColor: colors.primary },
                            ]}
                            textStyle={styles.permissionButtonText}
                          />
                        </View>
                      )}
                    </View>

                    <ChevronRight size={20} color={colors.primary} />
                  </View>
                  {(() => {
                    if (isCreator) return <RoleBadge role="Criador" />;

                    const subAdmin = item.subAdmins?.find(
                      (admin) => admin.email.toLowerCase() === userEmail
                    );

                    if (subAdmin) {
                      return (
                        <RoleBadge
                          role={
                            subAdmin.level === 'Adm' ? 'Admin' : 'Adm parcial'
                          }
                        />
                      );
                    }
                  })()}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum evento disponível.
              </Text>
            </View>
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
                {['Adm', 'Parcial'].map((level) => (
                  <Pressable
                    key={level}
                    onPress={() =>
                      setPermissionLevel(level as 'Adm' | 'Parcial')
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
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  cardWrapper: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b18aff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardDate: { fontSize: 14, fontWeight: '500', marginRight: 10 },
  permissionButton: {
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  emptyText: { marginTop: 20, textAlign: 'center' },
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
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
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
  badgeContainer: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#4C610C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#AEDE1C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  location: {
    fontSize: 12,
    paddingVertical: 5,
  },
});
