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
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { ArrowLeft, Edit, Image as ImageIcon } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';

import LoadingOverlay from '@/components/LoadingOverlay';
import { useEvents } from '@/context/EventsContext';
import { uploadPhotoToCloudinary } from '@/lib/uploadImageToCloudinary';
import { getAuth } from 'firebase/auth';

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

  const { event, activity } = useMemo(() => {
    const event = state.events.find((e) => e.id === id);
    const program = event?.programs.find((p) => p.id === programId);
    const activity = program?.activities.find((a) => a.id === activityId);
    return { event, program, activity };
  }, [state.events, id, programId, activityId]);

  const userUid = useMemo(() => getAuth().currentUser?.uid, []);

  const isAdmin = useMemo(() => {
    if (!event || !userUid) return false;
    const isOwner = event.userId === userUid;
    const myLevel = event.subAdminsByUid?.[userUid];
    const isSubAdmin = myLevel === 'Super Admin' || myLevel === 'Admin parcial';
    return isOwner || isSubAdmin;
  }, [event, userUid]);

  const handleImagePickerError = useCallback((error: unknown) => {
    console.error('Image picker error:', error);
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
    if (!isAdmin) {
      Alert.alert('Sem permissão', 'Apenas administradores podem adicionar fotos.');
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
  }, [requestPermissions, handleImagePickerError, isAdmin]);

  const handleSubmit = useCallback(async () => {
    if (!isAdmin) {
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
      console.error('Erro no upload:', error);
      Alert.alert('Erro', 'Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedImage, id, programId, activityId, addPhoto, description]);

  const handleClearImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  if (!activity) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Atividade não encontrada',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Adicionar Foto',
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
      >
        {selectedImage ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.error }]}
              onPress={handleClearImage}
            >
              <Edit size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.imagePickerContainer,
              { borderColor: colors.border },
            ]}
          >
            <Text style={[styles.pickerText, { color: colors.textSecondary }]}>
              Selecione a foto desejada na galeria
            </Text>

            <View style={styles.pickerButtonsContainer}>
              <Button
                title="Escolher foto"
                onPress={handlePickImage}
                variant="secondary"
                icon={<ImageIcon size={18} color="white" />}
                style={styles.pickerButton}
              />
            </View>
          </View>
        )}

        {selectedImage && (
          <View style={{ marginTop: 2, width: '100%' }}>
            <TextInput
              multiline
              numberOfLines={4}
              scrollEnabled
              maxLength={100}
              value={description}
              onChangeText={setDescription}
              placeholder="Digite uma descrição ..."
              placeholderTextColor={colors.textSecondary}
              style={{
                height: 100,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 10,
                fontFamily: 'Inter-Regular',
                fontSize: 14,
                color: colors.text,
                backgroundColor: colors.background,
                textAlignVertical: 'top',
              }}
            />

            <Text
              style={{
                alignSelf: 'flex-end',
                color: colors.textSecondary,
                fontSize: 12,
                marginTop: 4,
                lineHeight: 20,
              }}
            >
              {description.length}/100
            </Text>

            <View style={styles.buttonsContainer}>
              <Button
                title="Cancelar"
                onPress={() => router.back()}
                variant="cancel"
                style={styles.cancelButton}
              />
              <Button
                title={isSubmitting ? 'Enviando...' : 'Adicionar Foto'}
                onPress={handleSubmit}
                accessibilityLabel="Botão para adicionar a foto selecionada"
                disabled={!selectedImage || isSubmitting}
                style={styles.submitButton}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {isSubmitting && <LoadingOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerButton: { padding: 8 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, alignItems: 'center' },

  imagePickerContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
  },
  pickerText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 24,
  },
  pickerButtonsContainer: {
    width: '100%',
    gap: 16,
  },
  pickerButton: { width: '100%' },

  previewContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  previewImage: { width: '100%', height: '100%' },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 14,
  },
  cancelButton: { flex: 0.48 },
  submitButton: { flex: 0.48 },

  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 24,
  },
  goBackButton: { width: 120 },
});
