import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { Calendar, MapPin, CalendarRange, Info } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FormValues } from '@/types';
import LoadingOverlay from '@/components/LoadingOverlay';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { uploadImageToCloudinary } from '@/lib/uploadImageToCloudinary';

export default function AddEventScreen() {
  const { addEvent } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [formValues, setFormValues] = useState<FormValues>({
    title: '',
    location: '',
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    description: '',
    accessCode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const updateFormValue = (key: keyof FormValues, value: any) => {
    setFormValues({
      ...formValues,
      [key]: value,
    });
    // Clear error when user types
    if (errors[key]) {
      setErrors({
        ...errors,
        [key]: '',
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formValues.title.trim()) {
      newErrors.title = 'Título obrigatório.';
    } else if (formValues.title.length < 3) {
      newErrors.title = 'O título deverá ter pelo menos 3 caracteres.';
    }

    if (!formValues.location.trim()) {
      newErrors.location = 'Localização requerida.';
    }

    if (formValues.endDate < formValues.startDate) {
      newErrors.endDate = 'Insira a data de início e fim.';
    }

    if (!formValues.accessCode.trim()) {
      newErrors.accessCode =
        'Código de acesso obrigatório (mínimo 3 caracteres).';
    } else if (formValues.accessCode.length < 3) {
      newErrors.accessCode =
        'Insira um código de acesso ao seu evento. Grave, não é possível recupera-lo.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const newEventId = await addEvent(formValues); // agora retorna o ID

      setTimeout(() => {
        Alert.alert('Evento criado', 'Seu evento foi criado com sucesso!', [
          {
            text: 'OK',
            onPress: () => router.push(`/events/${newEventId}`),
          },
        ]);
      }, 500);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateFormValue('startDate', selectedDate);

      // If end date is before start date, update it
      if (formValues.endDate < selectedDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setDate(selectedDate.getDate() + 1);
        updateFormValue('endDate', newEndDate);
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateFormValue('endDate', selectedDate);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.text }]}>
          Criar novo evento
        </Text>

        <TextInput
          label="Título do evento"
          placeholder="Insira o título do evento"
          value={formValues.title}
          onChangeText={(text) => updateFormValue('title', text)}
          error={errors.title}
        />

        <TextInput
          label="Localização"
          placeholder="Insira a localização do evento"
          value={formValues.location}
          onChangeText={(text) => updateFormValue('location', text)}
          error={errors.location}
          icon={<MapPin size={20} color={colors.textSecondary} />}
        />

        <View style={styles.dateSection}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>
            Período do evento
          </Text>

          <View style={styles.datePickersContainer}>
            <View style={styles.datePickerWrapper}>
              <Text
                style={[
                  styles.datePickerLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Data de início
              </Text>
              <View style={[styles.dateButton, { borderColor: colors.border }]}>
                <Calendar size={18} color={colors.primary} />
                <Text
                  style={[styles.dateText, { color: colors.text }]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  {formatDate(formValues.startDate)}
                </Text>
              </View>
            </View>

            <View style={styles.datePickerWrapper}>
              <Text
                style={[
                  styles.datePickerLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Data de encerramento
              </Text>
              <View style={[styles.dateButton, { borderColor: colors.border }]}>
                <CalendarRange size={18} color={colors.primary} />
                <Text
                  style={[styles.dateText, { color: colors.text }]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  {formatDate(formValues.endDate)}
                </Text>
              </View>
              {errors.endDate && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.endDate}
                </Text>
              )}
            </View>
          </View>
        </View>

        {showStartDatePicker && (
          <DateTimePicker
            value={formValues.startDate}
            mode="date"
            display="default"
            onChange={onStartDateChange}
            minimumDate={new Date()}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={formValues.endDate}
            mode="date"
            display="default"
            onChange={onEndDateChange}
            minimumDate={formValues.startDate}
          />
        )}

        <TextInput
          label="Descrição (Opcional)"
          placeholder="Insira uma descrição..."
          value={formValues.description}
          onChangeText={(text) => updateFormValue('description', text)}
          multiline
          numberOfLines={4}
          icon={<Info size={20} color={colors.textSecondary} />}
        />
        <TextInput
          label="Código de Acesso (Salve este valor)"
          placeholder="Ex: A1XD"
          value={formValues.accessCode}
          onChangeText={(text) => updateFormValue('accessCode', text)}
          error={errors.accessCode}
        />
        <Button
          variant="outline"
          title={
            formValues.coverImage
              ? 'Alterar imagem do Evento'
              : 'Selecionar imagem do Evento'
          }
          onPress={async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
              aspect: [4, 3], // proporcional ao seu card de altura 220
            });

            if (!result.canceled) {
              try {
                setIsUploadingCover(true);
                const uri = result.assets[0].uri;
                const { uri: uploadedUrl } = await uploadImageToCloudinary(uri);
                updateFormValue('coverImage', uploadedUrl);

                Alert.alert('Sucesso', 'Imagem de capa enviada com sucesso!');
              } catch (error) {
                Alert.alert('Erro', 'Não foi possível enviar a imagem.');
              } finally {
                setIsUploadingCover(false);
              }
            }
          }}
          loading={isUploadingCover}
          style={{ marginTop: 16 }}
        />

        {formValues.coverImage && (
          <Image
            source={{ uri: formValues.coverImage }}
            style={{
              width: '100%',
              height: 220,
              borderRadius: 10,
              marginTop: 12,
              marginBottom: 8,
            }}
          />
        )}

        <View style={styles.buttonsContainer}>
          <Button
            title="Cancelar"
            onPress={() => router.back()}
            variant="cancel"
            style={styles.cancelButton}
          />
          <Button
            title="Criar evento"
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
      {isSubmitting && <LoadingOverlay message="Criando evento..." />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  dateSection: {
    marginBottom: 16,
  },
  dateLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginBottom: 8,
  },
  datePickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerWrapper: {
    flex: 0.48,
  },
  datePickerLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    marginLeft: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 0.48,
  },
  submitButton: {
    flex: 0.48,
  },
});
