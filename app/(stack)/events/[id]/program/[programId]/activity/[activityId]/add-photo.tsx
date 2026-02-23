import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { ArrowLeft, Edit, Image as ImageIcon, X, Info, Plus } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Fonts from '@/constants/Fonts';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import LoadingOverlay from '@/components/LoadingOverlay';
import { useEvents } from '@/context/EventsContext';
import { uploadPhotoToCloudinary } from '@/lib/uploadImageToCloudinary';
import { getAuth } from 'firebase/auth';
import { logger } from '@/lib/logger';


export default function AddActivityPhotoScreen() {
  const { id, programId, activityId } = useLocalSearchParams<{
    id: string;
    programId: string;
    activityId: string;
  }>();

  const { state, addPhoto, getGuestParticipationsByUserId } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useMemo(() => Colors[colorScheme], [colorScheme]);

  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagePickerAsset | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolicyModalVisible, setIsPolicyModalVisible] = useState(false);

  const { event, activity } = useMemo(() => {
    const event = state.events.find((e) => e.id === id);
    const program = event?.programs.find((p) => p.id === programId);
    const activity = program?.activities.find((a) => a.id === activityId);
    return { event, program, activity };
  }, [state.events, id, programId, activityId]);

  const userUid = useMemo(() => getAuth().currentUser?.uid, []);

  const [isParticipant, setIsParticipant] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!userUid || !id) return;
      try {
        const parts = await getGuestParticipationsByUserId(userUid);
        if (active) setIsParticipant(parts.some(p => p.eventId === id));
      } catch (e) {
        if (active) setIsParticipant(false);
      }
    }
    run();
    return () => { active = false; };
  }, [userUid, id, getGuestParticipationsByUserId]);

  const canUpload = useMemo(() => {
    if (!event || !userUid) return false;
    const isOwner = event.userId === userUid;
    const myLevel = event.subAdminsByUid?.[userUid];
    const isSubAdmin = myLevel === 'Super Admin' || myLevel === 'Admin parcial';
    return isOwner || isSubAdmin || isParticipant;
  }, [event, userUid, isParticipant]);

  const handleImagePickerError = useCallback((error: unknown) => {
    logger.error('Image picker error:', error);
    Alert.alert('Erro', 'Não foi possível acessar as imagens.');
  }, []);

  const requestPermissions = useCallback(
    async (requestFn: () => Promise<ImagePicker.PermissionResponse>) => {
      try {
        const permissionResult = await requestFn();
        if (!permissionResult.granted) {
          Alert.alert(
            'Permissão requerida',
            'Permissão necessária para acessar este recurso',
          );
          return false;
        }
        return true;
      } catch (error) {
        handleImagePickerError(error);
        return false;
      }
    },
    [handleImagePickerError],
  );

  const handlePickImage = useCallback(async () => {
    if (!canUpload) {
      Alert.alert('Sem permissão', 'Apenas participantes confirmados podem adicionar fotos.');
      return;
    }

    const hasPermission = await requestPermissions(
      ImagePicker.requestMediaLibraryPermissionsAsync,
    );

    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      handleImagePickerError(error);
    }
  }, [requestPermissions, handleImagePickerError, canUpload]);

  const handleSubmit = useCallback(async () => {
    if (!canUpload) {
      Alert.alert('Erro', 'Você não tem permissão para adicionar fotos.');
      return;
    }

    if (!selectedImage) {
      Alert.alert('Atenção', 'Por favor, selecione uma foto');
      return;
    }

    setIsSubmitting(true);

    try {
      const { uri, publicId } = await uploadPhotoToCloudinary(selectedImage, {
        eventId: id,
        kind: 'photo',
      });

      await addPhoto(id, programId, activityId, publicId, uri, description);

      Alert.alert(
        'Sucesso',
        'A foto foi adicionada com sucesso na atividade.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error) {
      logger.error('Erro no upload:', error);
      Alert.alert('Erro', 'Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedImage, id, programId, activityId, addPhoto, description]);

  const handleClearImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const gradientColors = useMemo<[string, string, string]>(() => {
    return colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];
  }, [colorScheme]);

  if (!activity) {
    return (
      <LinearGradient colors={gradientColors} locations={[0, 0.7, 1]} style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: '',
            headerTransparent: true,
            headerTintColor: colors.primary,
          }}
        />
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>
            A atividade que você procura não existe ou foi removida.
          </Text>
          <Button
            title="Voltar"
            onPress={() => router.back()}
            style={styles.goBackButton}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Adicionar Foto',
          headerTransparent: true,
          headerTintColor: colors.text,
          headerTitleStyle: styles.headerTitle,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Descriptive Header */}
        <View style={styles.introSection}>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Compartilhe um momento especial desta atividade com os outros convidados.
          </Text>
        </View>

        {!selectedImage && (
          <TouchableOpacity 
            onPress={() => setIsPolicyModalVisible(true)}
            style={[styles.policyBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
          >
            <Info size={14} color={colors.primary} />
            <Text style={[styles.policyBadgeText, { color: colors.primary }]}>
              Regras e limites de fotos
            </Text>
          </TouchableOpacity>
        )}
        
        {selectedImage ? (
          <Animated.View entering={FadeIn} style={styles.previewCard}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.error }]}
              onPress={handleClearImage}
            >
              <X size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePickImage}
            style={[
              styles.imagePickerCard,
              { 
                borderColor: colors.primary, 
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderStyle: 'dashed' 
              },
            ]}
          >
            <View style={[styles.pickerIconCircle, { backgroundColor: colors.primary + '20' }]}>
               <Plus size={32} color={colors.primary} />
            </View>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Selecionar Foto
            </Text>
            <Text style={[styles.pickerSub, { color: colors.textSecondary }]}>
              Toque aqui para abrir sua galeria
            </Text>
          </TouchableOpacity>
        )}

        {selectedImage && (
          <Animated.View entering={FadeIn} style={{ width: '100%' }}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Legenda (opcional)</Text>
            <TextInput
              multiline
              numberOfLines={3}
              maxLength={100}
              value={description}
              onChangeText={setDescription}
              placeholder="Diga algo sobre esta foto..."
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.descriptionInput,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                },
              ]}
            />

            <Text style={[styles.charCounter, { color: colors.textSecondary }]}>
              {description.length}/100
            </Text>

            <View style={styles.actionButtons}>
              <Button
                title="Cancelar"
                onPress={() => router.back()}
                variant="cancel"
                style={{ flex: 1 }}
              />
              <Button
                title={isSubmitting ? 'Enviando...' : 'Publicar Foto'}
                onPress={handleSubmit}
                disabled={!selectedImage || isSubmitting}
                style={{ flex: 1.5, backgroundColor: colors.primary }}
                textStyle={{ color: '#fff' }}
              />
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {isSubmitting && <LoadingOverlay />}

      <Modal
        visible={isPolicyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPolicyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeIn}
            style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <LinearGradient
              colors={gradientColors}
              locations={[0, 1]}
              style={styles.modalInner}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Regras de Fotos</Text>
                <TouchableOpacity onPress={() => setIsPolicyModalVisible(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalPolicyText, { color: colors.text }]}>
                  Ao compartilhar fotos, você ajuda a eternizar os momentos do evento. Para manter um ambiente seguro e agradável:{"\n\n"}
                  <Text style={{ fontFamily: Fonts.bold }}>1. Limites por Usuário:</Text>{"\n"}
                  • Convidados: até 3 fotos por atividade.{"\n"}
                  • Organizadores e Admins: até 5 fotos.{"\n\n"}
                  
                  <Text style={{ fontFamily: Fonts.bold }}>2. Conteúdo Permitido:</Text>{"\n"}
                  • Apenas imagens relacionadas ao evento.{"\n"}
                  • Respeite a privacidade dos outros participantes.{"\n\n"}
                  
                  <Text style={{ fontFamily: Fonts.bold }}>3. Moderação:</Text>{"\n"}
                  • Todas as fotos estão sujeitas a revisão.{"\n"}
                  • Conteúdo ofensivo será removido imediatamente sem aviso prévio.{"\n\n"}
                  
                  <Text style={{ fontFamily: Fonts.bold }}>4. Responbilidade:</Text>{"\n"}
                  • Você é o único responsável pelo conteúdo que publica.
                </Text>
              </ScrollView>
              
              <Button 
                title="Entendi" 
                onPress={() => setIsPolicyModalVisible(false)}
                style={{ marginTop: 24, backgroundColor: colors.primary }}
                textStyle={{ color: '#fff' }}
              />
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerButton: { padding: 8 },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 100 },

  introSection: { paddingHorizontal: 4, marginBottom: 20 },
  introText: { fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18, paddingTop: 10 },

  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  policyBadgeText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  modalInner: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalPolicyText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },

  imagePickerCard: {
    width: '100%',
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  pickerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  pickerSub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
  },

  previewCard: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewImage: { width: '100%', height: '100%' },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  inputLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
    marginLeft: 4,
  },
  descriptionInput: {
    height: 100,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontFamily: Fonts.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  charCounter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 6,
    marginRight: 4,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },

  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginBottom: 24,
  },
  goBackButton: { width: 120 },
});
