import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ImageBackground,
  Platform,
  Image,
  Linking,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  CalendarDays,
  MapPin,
} from 'lucide-react-native';
import ProgramItem from '@/components/ProgramItem';
import Button from '@/components/ui/Button';
import LoadingOverlay from '@/components/LoadingOverlay';
import { Event, Guest } from '@/types';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeInDown } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

export default function EventDetailScreen() {
  const { state, deleteEvent, addProgram, refetchEventById } = useEvents();

  const { id } = useLocalSearchParams<{ id: string }>();
  const event = state.events.find((e) => e.id === id) as Event | undefined;
  console.log('print do evento:', event),
    useEffect(() => {
      const fetchData = async () => {
        setIsLoading(true);
        await refetchEventById(id);
        setIsLoading(false);
      };

      if (id) {
        fetchData();
      }
    }, [id]);

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const authUser = getAuth().currentUser;
  const userEmail = authUser?.email?.toLowerCase() ?? '';
  const isCreator = event?.createdBy?.toLowerCase() === userEmail;
  const isSubAdmin = event?.subAdmins?.some(
    (admin) =>
      admin.email.toLowerCase() === userEmail &&
      (admin.level.toLowerCase() === 'super admin' ||
        admin.level.toLowerCase() === 'admin parcial')
  );
  const hasPermission = isCreator || isSubAdmin;
  console.log('event:', event);
  console.log('event.programs:', event?.programs);

  const confirmed =
    event?.confirmedGuests?.filter((g) => g.mode === 'confirmado') || [];
  const interested =
    event?.confirmedGuests?.filter((g) => g.mode === 'acompanhando') || [];

  if (!event) {
    return (
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['#0b0b0f', '#1b0033', '#3e1d73']
            : ['#ffffff', '#f0f0ff', '#e9e6ff']
        }
        style={styles.container}
        locations={[0.2, 0.2, 0]}
      >
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Evento não encontrado',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <Text style={[styles.notFoundText, { color: colors.text }]}>
          O evento não existe ou foi deletado.
        </Text>
        <Button title="Voltar" onPress={() => router.back()} />
      </LinearGradient>
    );
  }

  const handleEditEvent = () => {
    router.push({
      pathname: '/(newevents)/event-form',
      params: {
        mode: 'edit',
        id: event.id,
      },
    });
  };

  const handleDeleteEvent = () => {
    Alert.alert('Deletar evento', 'Deseja excluir este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: () => {
          deleteEvent(event.id);
          router.replace('/');
        },
      },
    ]);
  };

  const handleAddProgramPress = () => {
    setSelectedDate(event.startDate);
    setShowDatePicker(true);
  };

  const handleDateChange = (e: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (e.type === 'dismissed') return;
    if (date) {
      setSelectedDate(date);
      if (Platform.OS === 'ios') return;
      confirmAddProgram(date);
    }
  };

  const confirmAddProgram = async (date: Date) => {
    const exists = event.programs.some(
      (p) => p.date.toDateString() === date.toDateString()
    );
    if (exists) {
      Alert.alert('Erro', 'Já existe um programa para esta data.');
      return;
    }
    setIsAddingProgram(true);
    try {
      await addProgram(event.id, date);
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar o dia.');
    } finally {
      setIsAddingProgram(false);
    }
  };

  const handleOpenInMaps = (location: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location
    )}`;
    Linking.openURL(mapsUrl).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o mapa.')
    );
  };

  return (
    <LinearGradient
      colors={
        colorScheme === 'dark'
          ? ['#0b0b0f', '#1b0033', '#3e1d73']
          : ['#ffffff', '#f0f0ff', '#e9e6ff']
      }
      style={styles.container}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Detalhes do evento',
          headerTitleStyle: { fontFamily: 'Inter-Bold', fontSize: 18 },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() =>
                router.replace({
                  pathname: '/',
                  params: { title: event.title, accessCode: event.accessCode },
                })
              }
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            hasPermission ? (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={handleEditEvent}
                  style={styles.headerButton}
                >
                  <Edit size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteEvent}
                  style={styles.headerButton}
                >
                  {isCreator && <Trash2 size={20} color={colors.error} />}
                </TouchableOpacity>
              </View>
            ) : null,
        }}
      />

      {event.coverImage && (
        <ImageBackground
          source={{ uri: event.coverImage }}
          style={styles.coverImage}
        >
          <View style={styles.overlayBottom}>
            <Text style={styles.coverTitle}>{event.title}</Text>
            <View style={styles.row}>
              <CalendarDays size={16} color="#fff" />
              <Text style={styles.meta}>
                {new Date(event.startDate).toLocaleDateString('pt-BR')} até{' '}
                {new Date(event.endDate).toLocaleDateString('pt-BR')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleOpenInMaps(event.location)}
              style={[styles.mapBtn, { borderColor: colors.border }]}
            >
              <View style={styles.animaps}>
                <LottieView
                  source={require('@/assets/images/animaps.json')}
                  autoPlay
                  loop
                  style={styles.lottieIcon}
                />
              </View>
              <Text
                style={[styles.mapBtnText, { color: colors.textSecondary }]}
              >
                {event.location}
              </Text>
            </TouchableOpacity>

            {event.description && (
              <Text style={styles.overlayDescription}>{event.description}</Text>
            )}
          </View>
        </ImageBackground>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Programação diária
        </Text>
        {hasPermission && (
          <Button
            title="Add Dia"
            icon={<Plus size={16} color="white" />}
            onPress={handleAddProgramPress}
            size="small"
          />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading || event.programs.length === 0 ? (
          <View style={styles.centeredContent}>
            {isLoading ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[
                    styles.emptyText,
                    { color: colors.textSecondary, marginTop: 12 },
                  ]}
                >
                  Carregando programação...
                </Text>
              </>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum dia adicionado ainda.
              </Text>
            )}
          </View>
        ) : (
          event.programs
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .map((program) => (
              <ProgramItem
                key={program.id}
                program={program}
                eventId={event.id}
              />
            ))
        )}

        {isCreator && (confirmed.length > 0 || interested.length > 0) && (
          <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginBottom: 8 },
              ]}
            >
              Presenças Confirmadas
            </Text>
            {confirmed.length === 0 ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: 'Inter-Regular',
                }}
              >
                Nenhuma presença confirmada ainda.
              </Text>
            ) : (
              confirmed.map((guest, idx) => (
                <Text
                  key={idx}
                  style={{ color: colors.text, fontFamily: 'Inter-Regular' }}
                >
                  • {guest.name} ({guest.email})
                </Text>
              ))
            )}

            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, marginVertical: 8 },
              ]}
            >
              Acompanhando Evento
            </Text>
            {interested.length === 0 ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: 'Inter-Regular',
                }}
              >
                Nenhum convidado acompanhando o evento.
              </Text>
            ) : (
              interested.map((guest, idx) => (
                <Text
                  key={idx}
                  style={{ color: colors.text, fontFamily: 'Inter-Regular' }}
                >
                  • {guest.name} ({guest.email})
                </Text>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {isAddingProgram && <LoadingOverlay message="Adicionando dia..." />}

      {/* Date Picker Modal */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal visible={showDatePicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.datepicker}>
              <Text style={styles.titlepicker}>Selecione o dia do evento</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                minimumDate={event.startDate}
                maximumDate={event.endDate}
                onChange={handleDateChange}
                locale="pt-BR"
              />
              <View style={styles.iosButtonsContainer}>
                <Button
                  title="Cancelar"
                  onPress={() => {
                    setShowDatePicker(false);
                    setSelectedDate(event.startDate);
                  }}
                  style={styles.iosButton}
                />
                <Button
                  title="Confirmar"
                  onPress={() => {
                    setShowDatePicker(false);
                    confirmAddProgram(selectedDate);
                  }}
                  style={styles.iosButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={event.startDate}
          maximumDate={event.endDate}
          onChange={handleDateChange}
          locale="pt-BR"
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 10 },
  headerButton: { padding: 8 },
  headerActions: { flexDirection: 'row' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginHorizontal: 24,
  },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-Bold' },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datepicker: { backgroundColor: 'transparent' },
  titlepicker: { backgroundColor: 'transparent' },
  iosButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  iosButton: { width: '48%' },
  qrContainer: {
    backgroundColor: '#ddd',
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  qrTitle: { fontSize: 16, fontFamily: 'Inter-Medium', marginBottom: 12 },
  shareButton: { marginTop: 16, width: 200, backgroundColor: '#25D366' },
  closeButton: { marginTop: 12, width: 120, backgroundColor: '#333' },
  notFoundText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#25D366',
    marginBottom: 12,
    marginTop: 10,
    gap: 8,
    borderWidth: 1,
  },
  actionText: { color: 'white', fontFamily: 'Inter-Medium', fontSize: 13 },
  coverImage: {
    width: '100%',
    height: 250,
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  overlayBottom: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    paddingLeft: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  coverTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    textAlign: 'left',
    paddingVertical: 5,
  },
  overlayText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#eee',
    textAlign: 'left',
    marginBottom: 2,
  },
  overlayDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#ccc',
    marginTop: 10,
    textAlign: 'left',
  },
  programsSection: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  meta: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    borderColor: Colors.dark.primary,
  },
  mapBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  lottieIcon: {
    width: 30,
    height: 30,
  },
  animaps: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: '#fefefe',
    borderRadius: 50,
    justifyContent: 'flex-start',
    alignItems: 'center', // centraliza horizontalmente
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
