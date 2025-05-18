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
import { useEvents } from '@/context/EventsContext';
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

export default function AddActivityPhotoScreen() {
  const { id, programId, activityId } = useLocalSearchParams<{
    id: string;
    programId: string;
    activityId: string;
  }>();

  const { state, addPhoto } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useMemo(() => Colors[colorScheme], [colorScheme]);
  const [description, setDescription] = useState('');

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { event, program, activity } = useMemo(() => {
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
          console.log('Image selected with URI:', result.assets[0].uri);
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
      console.log(
        'Tentando upload com URI:',
        selectedImage.substring(0, 50) + '...'
      );
      const { uri, publicId } = await uploadImageToCloudinary(selectedImage);
      await addPhoto(id, programId, activityId, publicId, uri, description);
      console.log('Descrição recebida no EventsContext:', description);
      console.log('Função dentro do add photo');
      console.log(id, programId, activityId, publicId, uri, description);

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
        <Text style={[styles.heading, { color: colors.text }]}>
          Adicionar foto na atividade
        </Text>

        <Text style={[styles.activityTitle, { color: colors.primary }]}>
          {activity.title}
        </Text>

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
              Nenhuma imagem selecionada
            </Text>
            <View style={styles.pickerButtonsContainer}>
              <Button
                title="Abrir câmera"
                onPress={handleTakePhoto}
                icon={<Camera size={18} color="white" />}
                style={styles.pickerButton}
              />
              <Button
                title="Escolher na galeria"
                onPress={handlePickImage}
                variant="secondary"
                icon={<ImageIcon size={18} color="white" />}
                style={styles.pickerButton}
              />
            </View>
          </View>
        )}

        {selectedImage && (
          <View style={{ marginTop: 16, width: '100%', height: '20%' }}>
            <Text
              style={{
                fontFamily: 'Inter-Medium',
                fontSize: 14,
                color: colors.text,
                marginBottom: 6,
              }}
            >
              Digite uma descrição para imagem(até 50 caracteres)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 10,
                fontFamily: 'Inter-Regular',
                fontSize: 14,
                color: colors.text,
                backgroundColor: colors.backgroundAlt,
              }}
              value={description}
              onChangeText={(text) => {
                if (text.length <= 70) setDescription(text);
              }}
              placeholder="Digite uma descrição..."
              placeholderTextColor={colors.textSecondary}
              maxLength={50}
            />
            <Text
              style={{
                alignSelf: 'flex-end',
                color: colors.textSecondary,
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {description.length}/50
            </Text>
          </View>
        )}

        <View style={styles.buttonsContainer}>
          <Button
            title="Cancelar"
            onPress={() => router.back()}
            variant="ghost"
            style={styles.cancelButton}
          />
          <Button
            title="Adicionar Foto"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!selectedImage}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
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
    borderRadius: 12,
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
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
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
