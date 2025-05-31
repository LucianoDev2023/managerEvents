// app/(tabs)/my-events.tsx
import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar,
  Alert,
  Modal,
  Pressable,
  Image,
  TextInput,
  BackHandler,
  Linking,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Share2, QrCode, KeyRound } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';
import RoleBadge from '@/components/ui/RoleBadge';
import type { Event, PermissionLevel } from '@/types/index';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MyEventsScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { state, updateEvent } = useEvents();
  const auth = getAuth();
  const userEmail = auth.currentUser?.email?.toLowerCase();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [qrVisible, setQrVisible] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const qrRef = useRef<ViewShot>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [permissionEmail, setPermissionEmail] = useState('');
  const [permissionLevel, setPermissionLevel] =
    useState<PermissionLevel>('Admin parcial');

  const filteredEvents = state.events.filter(
    (event) =>
      event.createdBy?.toLowerCase() === userEmail ||
      event.subAdmins?.some((admin) => admin.email.toLowerCase() === userEmail)
  );

  const gradientColors: [string, string, ...string[]] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  // Event handlers
  const handleNavigate = (id: string) => {
    router.push({ pathname: '/events/[id]', params: { id } });
  };

  const handleOpenInMaps = (location: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location
    )}`;
    Linking.openURL(mapsUrl).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o mapa.')
    );
  };

  const handleShareQR = async () => {
    if (!qrRef.current) return;

    try {
      const uri = await qrRef.current.capture?.();
      if (!uri) return;

      const fileUri = `${FileSystem.cacheDirectory}qr_${Date.now()}.png`;
      await FileSystem.copyAsync({ from: uri, to: fileUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Compartilhamento não disponível');
      }
    } catch (error) {
      console.error('QR Share Error:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o QR Code.');
    }
  };

  const openPermissionModal = (eventId: string) => {
    setSelectedEventId(eventId);
    setModalVisible(true);
  };

  const savePermission = () => {
    if (!permissionEmail.trim() || !selectedEventId) {
      Alert.alert('Atenção', 'Insira um email válido.');
      return;
    }

    const selectedEvent = state.events.find(
      (event) => event.id === selectedEventId
    );
    if (!selectedEvent) return;

    const creatorEmail = selectedEvent.createdBy?.toLowerCase();
    const enteredEmail = permissionEmail.trim().toLowerCase();

    if (enteredEmail === creatorEmail) {
      Alert.alert(
        'Email inválido',
        'O email inserido é o mesmo do criador do evento. Não é necessário conceder permissão.'
      );
      return;
    }

    const existingAdmin = selectedEvent.subAdmins?.find(
      (admin) => admin.email.toLowerCase() === enteredEmail
    );

    if (existingAdmin) {
      Alert.alert('Atenção', 'Este usuário já tem permissão para este evento.');
      return;
    }

    const updatedEvents = state.events.map((event) => {
      if (event.id === selectedEventId) {
        return {
          ...event,
          subAdmins: [
            ...(event.subAdmins ?? []),
            {
              email: enteredEmail,
              level: permissionLevel,
            },
          ],
        };
      }
      return event;
    });

    const updatedEvent = updatedEvents.find((e) => e.id === selectedEventId);
    if (updatedEvent) updateEvent(updatedEvent);

    setPermissionEmail('');
    setModalVisible(false);
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
    }, [router])
  );

  const renderEventItem = ({ item }: { item: Event }) => {
    const isCreator = item.createdBy?.toLowerCase() === userEmail;
    const subAdmin = item.subAdmins?.find(
      (admin) => admin.email.toLowerCase() === userEmail
    );
    const isAdm = subAdmin?.level === 'Super Admin';

    return (
      <AnimatedPressable
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        onPress={() => handleNavigate(item.id)}
      >
        <Animated.View style={styles.card}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: item.coverImage }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.overlay}>
              {isCreator && <RoleBadge role="Super Admin" />}
              {subAdmin && !isCreator && (
                <RoleBadge role={isAdm ? 'Super Admin' : 'Adm parcial'} />
              )}
              <Text style={styles.overlayTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.overlayLocation} numberOfLines={1}>
                {item.location}
              </Text>
              <View>
                <Text style={styles.overlayDesc} numberOfLines={2}>
                  {`${new Date(item.startDate).toLocaleDateString(
                    'pt-BR'
                  )} - ${new Date(item.endDate).toLocaleDateString('pt-BR')}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonsRow}>
            <Pressable
              onPress={() => handleOpenInMaps(item.location)}
              style={[styles.mapBtn, { borderColor: colors.border }]}
            >
              <MapPin size={16} color={colors.primary} />
              <Text
                style={[styles.mapBtnText, { color: colors.textSecondary }]}
              >
                Mapa
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setQrPayload(
                  JSON.stringify({
                    eventTitle: item.title,
                    accessCode: item.accessCode,
                  })
                );
                setQrVisible(true);
              }}
              style={styles.shareBtn}
            >
              {/* <Share2 size={16} color="white" /> */}
              <Text style={styles.shareBtnText}> {'Enviar '}</Text>
              <QrCode size={16} color="white" />
            </Pressable>

            {(isCreator || isAdm) && (
              <Button
                title="Permissão"
                size="small"
                onPress={() => openPermissionModal(item.id)}
                icon={<KeyRound size={14} color="white" />}
                style={styles.permissionBtn}
                textStyle={styles.permissionText}
              />
            )}
          </View>
        </Animated.View>
      </AnimatedPressable>
    );
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

      <SafeAreaView style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Eventos</Text>

        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum evento disponível.
            </Text>
          }
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
        />

        <PermissionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          colors={colors}
          gradientColors={gradientColors} // 👈 adicionado
          permissionEmail={permissionEmail}
          setPermissionEmail={setPermissionEmail}
          permissionLevel={permissionLevel}
          setPermissionLevel={setPermissionLevel}
          onSave={savePermission}
        />

        <QRModal
          visible={qrVisible}
          onClose={() => setQrVisible(false)}
          qrRef={qrRef}
          qrPayload={qrPayload}
          onShare={handleShareQR}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ✅ Correção aplicada também ao componente `PermissionModal`
const PermissionModal = ({
  visible,
  onClose,
  colors,
  gradientColors,
  permissionEmail,
  setPermissionEmail,
  permissionLevel,
  setPermissionLevel,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  colors: typeof Colors.dark | typeof Colors.light;
  gradientColors: [string, string, ...string[]]; // <- AQUI ESTÁ O FIX
  permissionEmail: string;
  setPermissionEmail: (email: string) => void;
  permissionLevel: PermissionLevel;
  setPermissionLevel: (level: PermissionLevel) => void;
  onSave: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.animatedContainer}
      >
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.7, 1]}
          style={[styles.modalContent, { borderColor: colors.primary2 }]}
        >
          <Text style={[styles.modalTitle, { color: colors.primary }]}>
            🔐 Permissões
          </Text>

          <Text style={[styles.modalText, { color: colors.text }]}>
            <Text style={styles.roleHighlight}>Super admin:</Text> Controle
            total sobre todos os recursos. Pode criar, editar, gerenciar
            permissões de todos os outros usuários. Não pode excluir o evento
            principal. Permissão exclusiva do criador.
          </Text>

          <Text style={[styles.modalText, { color: colors.text }]}>
            <Text style={styles.roleHighlight}>Admin parcial:</Text> Com algumas
            restrições, pode adicionar programas, atividades e fotos. Só pode
            deletar o que criou.
          </Text>

          <Text style={[styles.modalSubtitle, { color: colors.text }]}>
            👥 Adicionar Permissão
          </Text>

          <TextInput
            placeholder="Digite o Email"
            value={permissionEmail}
            onChangeText={setPermissionEmail}
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[
              styles.input,
              {
                backgroundColor: colors.backGroundSecondary,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />

          <Text style={[styles.modalLabel, { color: colors.text }]}>
            Tipo de permissão
          </Text>
          <View style={styles.toggleRow}>
            {(['Super Admin', 'Admin parcial'] as const).map((level) => (
              <Pressable
                key={level}
                onPress={() => setPermissionLevel(level)}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor:
                      permissionLevel === level
                        ? colors.primary
                        : 'transparent',
                    borderColor:
                      permissionLevel === level
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: permissionLevel === level ? '#fff' : colors.text,
                    fontWeight: '600',
                  }}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <Button
              title="Cancelar"
              variant="cancel"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
              textStyle={{ color: 'white' }}
            />
            <Button
              title="Salvar"
              onPress={onSave}
              style={{ backgroundColor: colors.primary, flex: 1 }}
              textStyle={{ color: '#fff' }}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  </Modal>
);

const QRModal = ({
  visible,
  onClose,
  qrRef,
  qrPayload,
  onShare,
}: {
  visible: boolean;
  onClose: () => void;
  qrRef: React.RefObject<ViewShot>;
  qrPayload: string;
  onShare: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.qrBox}
      >
        <Text style={styles.qrTitle}>Compartilhe seu evento!</Text>
        <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }}>
          <QRCode
            value={qrPayload}
            size={200}
            backgroundColor="white"
            color="black"
          />
        </ViewShot>
        <Button
          title="Enviar QR Code"
          onPress={onShare}
          style={styles.qrShareBtn}
          icon={<Share2 size={16} color="white" />}
        />
        <Button title="Fechar" onPress={onClose} style={styles.qrCloseBtn} />
      </Animated.View>
    </View>
  </Modal>
);

const SafeAreaView = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => (
  <View
    style={[
      styles.container,
      style,
      Platform.OS === 'android' && {
        paddingTop: RNStatusBar.currentHeight ?? 40,
      },
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    fontFamily: 'Inter_700Bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  listContent: {
    paddingBottom: 20,
  },

  // Event Card Styles
  card: {
    marginBottom: 24,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#555',
    padding: 6,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 22 / 9,
    backgroundColor: '#111',
    overflow: 'hidden',
    borderRadius: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
    borderRadius: 12,
    gap: 6,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  overlayLocation: {
    fontSize: 14,
    color: '#ccc',
    fontFamily: 'Inter_400Regular',
  },
  overlayDesc: {
    fontSize: 12,
    color: '#ddd',
    fontFamily: 'Inter_400Regular',
  },
  animatedContainer: {
    width: '90%',
  },

  // Button Styles
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  mapBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  shareBtnText: {
    fontSize: 13,
    color: 'white',
    fontFamily: 'Inter_500Medium',
  },
  permissionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 6,
  },
  permissionText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: 'Inter_700Bold',
  },
  modalSubtitle: {
    fontSize: 16,
    marginTop: 20,
    marginBottom: 8,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  bold: {
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 16,
    marginTop: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  input: {
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 40,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 60,
    marginBottom: 20,
  },

  // QR Modal Styles
  qrBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '90%',
    maxWidth: 300,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  qrShareBtn: {
    marginTop: 16,
    backgroundColor: '#25D366',
    width: '100%',
  },
  qrCloseBtn: {
    marginTop: 12,
    backgroundColor: '#333',
    width: '100%',
  },
  roleHighlight: {
    fontSize: 17, // Aumenta o tamanho apenas do título da permissão
    fontWeight: 'bold',
  },
});
