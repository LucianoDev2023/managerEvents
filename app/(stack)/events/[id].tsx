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
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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

  const handleAddProgram = async () => {
    setIsAddingProgram(true);
    try {
      await addProgram(event.id, new Date());
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
          <Text style={[styles.title, { color: colors.text }]}>
            {event.title}
          </Text>
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

          {/* Botão para abrir QR Code */}
          <Button
            title="Gerar QR Code"
            onPress={() => setShowQR(true)}
            style={{ marginTop: 16, width: 200, alignSelf: 'center' }}
          />
        </View>

        <View style={styles.programsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Programação diária
            </Text>
            <Button
              title="Add Dia"
              icon={<Plus size={16} color="white" />}
              onPress={handleAddProgram}
              size="small"
            />
          </View>

          {event.programs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum dia adicionado ainda.
            </Text>
          ) : (
            event.programs.map((program) => (
              <ProgramItem
                key={program.id}
                program={program}
                eventId={event.id}
              />
            ))
          )}
        </View>
      </ScrollView>

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
              title="Compartilhar QR Code"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerButton: { padding: 8 },
  headerActions: { flexDirection: 'row' },
  headerInfo: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontFamily: 'Inter-Bold', marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 2 },
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
  qrContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  shareButton: {
    marginTop: 16,
    width: 200,
    backgroundColor: '#25D366',
  },
  closeButton: {
    marginTop: 12,
    width: 120,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
