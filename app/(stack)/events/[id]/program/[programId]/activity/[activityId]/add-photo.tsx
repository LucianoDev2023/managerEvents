import React, { useState, useMemo, useCallback } from 'react';
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
import {
  ArrowLeft,
  Camera,
  Edit,
  Image as ImageIcon,
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '@/lib/uploadImageToCloudinary';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useEvents } from '@/context/EventsContext';

export default function AddActivityPhotoScreen() {
  const { id, programId, activityId } = useLocalSearchParams<{
    id: string;
    programId: string;
    activityId: string;
  }>();

  const { state, addPhoto, refetchEventById } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useMemo(() => Colors[colorScheme], [colorScheme]);
  const [description, setDescription] = useState('');

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { activity } = useMemo(() => {
    const event = state.events.find((e) => e.id === id);
    const program = event?.programs.find((p) => p.id === programId);
    const activity = program?.activities.find((a) => a.id === activityId);
    return { event, program, activity };
  }, [state.events, id, programId, activityId]);

  const handleImagePickerError = useCallback((error: unknown) => {
    console.error('Image picker error:', error);
    Alert.alert('Erro', 'Não foi possível acessar as imagens.');
  }, []);

  const requestPermissions = useCallback(
    async (requestFn: typeof ImagePicker.requestCameraPermissionsAsync) => {
      try {
        const permissionResult = await requestFn();
        if (!permissionResult.granted) {
          Alert.alert(
            'Permissão requerida',
            'Permissão necessária para acessar este recurso'
          );
          return false;
        }
        return true;
      } catch (error) {
        handleImagePickerError(error);
        return false;
      }
    },
    [handleImagePickerError]
  );

  const handleImageSelection = useCallback(
    async (launchFn: typeof ImagePicker.launchCameraAsync) => {
      try {
        const result = await launchFn({
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
          setSelectedImage(result.assets[0].uri);
        }
      } catch (error) {
        handleImagePickerError(error);
      }
    },
    [handleImagePickerError]
  );

  const handleTakePhoto = useCallback(async () => {
    const hasPermission = await requestPermissions(
      ImagePicker.requestCameraPermissionsAsync
    );
    if (hasPermission) {
      await handleImageSelection(ImagePicker.launchCameraAsync);
    }
  }, [requestPermissions, handleImageSelection]);

  const handlePickImage = useCallback(async () => {
    const hasPermission = await requestPermissions(
      ImagePicker.requestMediaLibraryPermissionsAsync
    );
    if (hasPermission) {
      await handleImageSelection(ImagePicker.launchImageLibraryAsync);
    }
  }, [requestPermissions, handleImageSelection]);

  const handleSubmit = useCallback(async () => {
    if (!selectedImage) {
      Alert.alert('Atenção', 'Por favor, selecione ou tire uma foto');
      return;
    }

    setIsSubmitting(true);

    try {
      const { uri, publicId } = await uploadImageToCloudinary(selectedImage);
      await addPhoto(id, programId, activityId, publicId, uri, description);
      await refetchEventById(id);

      Alert.alert(
        'Sucesso',
        'A foto foi adicionada com sucesso na atividade.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Erro no upload:', error);
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
                <ArrowLeft size={24} color={colors.text} />
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
              <ArrowLeft size={24} color={colors.text} />
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
              source={{ uri: selectedImage }}
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
            <Text
              style={{
                fontFamily: 'Inter-Medium',
                fontSize: 14,
                color: colors.text,
              }}
            ></Text>
            <TextInput
              multiline
              numberOfLines={4}
              scrollEnabled
              maxLength={150}
              value={description}
              onChangeText={(text) => {
                if (text.length <= 100) setDescription(text);
              }}
              placeholder="Digite uma descrição ..."
              placeholderTextColor={colors.textSecondary}
              style={{
                height: 100, // altura fixa
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
                title="Adicionar Foto"
                onPress={handleSubmit}
                accessibilityLabel="Botão para adicionar a foto selecionada"
                disabled={!selectedImage}
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
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  activityTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    marginBottom: 24,
    textAlign: 'center',
  },
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
  pickerButton: {
    width: '100%',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
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
  cancelButton: {
    flex: 0.48,
  },
  submitButton: {
    flex: 0.48,
  },
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
  goBackButton: {
    width: 120,
  },
});
