import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Share,
  ImageBackground,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

import {
  CalendarDays,
  MapPin,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Share2,
  LucideQrCode,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import ProgramItem from '@/components/ProgramItem';
import Button from '@/components/ui/Button';
import LoadingOverlay from '@/components/LoadingOverlay';
import { Event } from '@/types';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, deleteEvent, addProgram } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const qrRef = useRef<ViewShot>(null);

  const event = state.events.find((e) => e.id === id) as Event | undefined;

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
    if (!qrRef.current) {
      Alert.alert('Erro', 'QR Code ainda não está pronto.');
      return;
    }

    try {
      const uri = await qrRef.current.capture?.();

      if (!uri) {
        Alert.alert('Erro', 'Erro ao capturar QR Code.');
        return;
      }

      const fileUri = FileSystem.cacheDirectory + `qrcode_${Date.now()}.png`;

      // Copia o QR para local temporário
      await FileSystem.copyAsync({ from: uri, to: fileUri });

      // Verifica se o dispositivo suporta compartilhamento de arquivos
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Erro',
          'Compartilhamento de arquivo não suportado neste dispositivo.'
        );
        return;
      }

      // Compartilha a imagem diretamente
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: `QR Code do evento ${event.title}`,
      });
    } catch (error) {
      console.error(error);
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

  const handleDateChange = (event: any, date?: Date) => {
    // Fecha o datepicker no Android quando o usuário cancela ou seleciona
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    // Se o usuário cancelou (event.type === 'dismissed')
    if (event.type === 'dismissed') {
      return;
    }

    // Se selecionou uma data válida
    if (date) {
      setSelectedDate(date);
      if (Platform.OS === 'ios') {
        return; // No iOS, vamos esperar o usuário confirmar
      }
      confirmAddProgram(date);
    }
  };

  const confirmAddProgram = async (date: Date) => {
    // Verifica se já existe um programa para esta data
    const dateAlreadyHasProgram = event.programs.some((program) => {
      return program.date.toDateString() === date.toDateString();
    });

    if (dateAlreadyHasProgram) {
      Alert.alert(
        'Erro',
        'Já existe um programa para esta data, você poder adicionar em outro dia, ou atividades para o programa já criado.'
      );
      return;
    }

    setIsAddingProgram(true);
    try {
      await addProgram(event.id, date);
      await new Promise((res) => setTimeout(res, 500));
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
    const startFormatted = start.toLocaleDateString('pt-BR', options);
    const endFormatted = end.toLocaleDateString('pt-BR', options);
    return startFormatted === endFormatted
      ? startFormatted
      : `${startFormatted} - ${endFormatted}`;
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
              onPress={() => router.back()}
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerInfo}>
          {event.coverImage && (
            <ImageBackground
              source={{ uri: event.coverImage }}
              style={styles.coverImage}
              imageStyle={{ borderRadius: 12 }}
            >
              <View style={styles.overlay}>
                <Text style={styles.coverTitle}>{event.title}</Text>
              </View>
            </ImageBackground>
          )}

          {!event.coverImage && (
            <Text style={[styles.title, { color: colors.text }]}>
              {event.title}
            </Text>
          )}

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {formatDateRange(event.startDate, event.endDate)}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {event.location}
          </Text>

          {event.description && (
            <Text style={[styles.description, { color: colors.text }]}>
              {event.description}
            </Text>
          )}
        </View>

        <View style={styles.programsSection}>
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

          {event.programs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum dia adicionado ainda.
            </Text>
          ) : (
            [...event.programs]
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

      <TouchableOpacity
        onPress={() => setShowQR(true)}
        style={[styles.actionButton]}
      >
        <Text style={styles.actionText}>Compartilhar evento</Text>
        <LucideQrCode size={14} color="white" />
      </TouchableOpacity>

      {isAddingProgram && <LoadingOverlay message="Adicionando dia..." />}

      {/* Modal QR Code */}
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

      {/* Date Picker */}
      {showDatePicker && (
        <Modal visible={showDatePicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.datepicker, { padding: 16 }]}>
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
                      setSelectedDate(event.startDate); // Reseta para a data inicial
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
  container: {
    flex: 1,
  },
  scrollContent: { padding: 16, paddingBottom: 40 },

  headerButton: { padding: 8 },
  headerActions: { flexDirection: 'row' },
  headerInfo: {
    alignItems: 'flex-start',
    marginBottom: 24,
    width: '100%',
    borderWidth: 2,
    borderColor: '#222',
    padding: 5,
    borderRadius: 10,
  },

  title: { fontSize: 22, fontFamily: 'Inter-Bold', marginBottom: 4 },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
    textAlign: 'left',
  },
  description: { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 12 },
  programsSection: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  datepicker: {
    backgroundColor: 'transparent',
  },
  titlepicker: {
    backgroundColor: 'transparent',
  },
  qrContainer: {
    backgroundColor: '#ddd',
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  shareButton: {
    marginTop: 16,
    fontSize: 10,
    width: 200,
    backgroundColor: '#25D366',
  },
  closeButton: {
    marginTop: 12,
    width: 120,
    backgroundColor: '#333',
  },
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
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    marginBottom: 10,
    gap: 5,
    marginTop: 10,
  },
  actionText: {
    color: 'white',
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    backgroundColor: '#25D366',
  },
  coverImage: {
    width: '100%',
    height: 180,
    marginBottom: 16,
    justifyContent: 'flex-end',
  },

  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },

  coverTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    textAlign: 'center',
  },
  iosButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  iosButton: {
    width: '48%',
  },
});
