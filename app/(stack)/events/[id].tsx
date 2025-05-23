import React, { useState, useRef } from 'react';
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
  LucideQrCode,
  CalendarDays,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import ProgramItem from '@/components/ProgramItem';
import Button from '@/components/ui/Button';
import LoadingOverlay from '@/components/LoadingOverlay';
import { Event } from '@/types';
import { getAuth } from 'firebase/auth';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, deleteEvent, addProgram } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const textColor = colors.text;
  const overlayColor = colorScheme === 'dark' ? '#1a1a1a' : '#f2f2f2';

  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const qrRef = useRef<ViewShot>(null);

  const event = state.events.find((e) => e.id === id) as Event | undefined;

  const authUserId = getAuth().currentUser?.uid;

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
      </View>
    );
  }

  const qrPayload = JSON.stringify({
    eventTitle: event.title,
    accessCode: event.accessCode,
  });

  const handleShareQR = async () => {
    if (!qrRef.current) return;
    try {
      const uri = await qrRef.current.capture?.();
      if (!uri) return;
      const fileUri = FileSystem.cacheDirectory + `qrcode_${Date.now()}.png`;
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) return;
      await Sharing.shareAsync(fileUri);
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o QR Code.');
    }
  };

  const handleEditEvent = () => {
    router.push({
      pathname: '/(stack)/events/[id]/edit_event',
      params: { id: event.id },
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

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const s = start.toLocaleDateString('pt-BR', options);
    const e = end.toLocaleDateString('pt-BR', options);
    return s === e ? s : `${s} - ${e}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          headerRight: () => (
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
                <Trash2 size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View>
        {event.coverImage && (
          <ImageBackground
            source={{ uri: event.coverImage }}
            style={styles.coverImage}
          >
            <View style={styles.overlayBottom}>
              <Text style={styles.coverTitle}>{event.title}</Text>
              <Text style={styles.overlayText}>
                {formatDateRange(event.startDate, event.endDate)}
              </Text>
              <Text style={styles.overlayText}>{event.location}</Text>
              {event.description && (
                <Text style={styles.overlayDescription}>
                  {event.description}
                </Text>
              )}
            </View>
          </ImageBackground>
        )}
      </View>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Programação diária
        </Text>
        <Button
          title="Add Dia"
          icon={<Plus size={16} color="white" />}
          onPress={handleAddProgramPress}
          size="small"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.programsSection}>
          {event.programs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum dia adicionado ainda.
            </Text>
          ) : (
            event.programs
              .sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime()
              )
              .map((program) => (
                <ProgramItem
                  key={program.id}
                  program={program}
                  eventId={event.id}
                />
              ))
          )}
        </View>
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: '#6e56cf',
          marginHorizontal: 26,
        }}
      >
        <TouchableOpacity
          onPress={() => setShowQR(true)}
          style={styles.actionButton}
        >
          <Text style={styles.actionText}>Compartilhar evento</Text>
          <LucideQrCode size={16} color="white" />
        </TouchableOpacity>
      </View>

      {isAddingProgram && <LoadingOverlay message="Adicionando dia..." />}

      <Modal visible={showQR} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>Compartilhe seu evento!</Text>
            <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }}>
              <QRCode value={qrPayload} size={200} />
            </ViewShot>
            <Button
              title="Enviar QR Code"
              onPress={handleShareQR}
              style={styles.shareButton}
            />
            <Button
              title="Fechar"
              onPress={() => setShowQR(false)}
              style={styles.closeButton}
            />
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <Modal visible={showDatePicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.datepicker}>
              <Text style={styles.titlepicker}>Selecione o dia do evento</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={event.startDate}
                maximumDate={event.endDate}
                onChange={handleDateChange}
                locale="pt-BR"
              />
              {Platform.OS === 'ios' && (
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
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },

  headerButton: { padding: 8 },
  headerActions: { flexDirection: 'row' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginHorizontal: 16,
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
    marginBottom: 10,
  },
  overlayBottom: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  coverTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    textAlign: 'left',
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
    marginTop: 4,
    textAlign: 'left',
  },
  programsSection: { marginTop: 16 },
});
