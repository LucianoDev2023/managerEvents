import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { Calendar, MapPin, CalendarRange, Info } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Event, FormValues } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '@/lib/uploadImageToCloudinary';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useEffect } from 'react';
import { getAuth } from 'firebase/auth';

export default function EditEventScreen() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  const userEmail = user.email?.toLowerCase() ?? '';
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, updateEvent } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { lat, lng, locationName } = useLocalSearchParams();

  useEffect(() => {
    if (lat && lng) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      updateFormValue(
        'location',
        (locationName as string) ?? `Lat: ${latitude}, Lng: ${longitude}`
      );
      console.log('Atualizando location para:', locationName);

      // Limpa os parâmetros após aplicar
      router.setParams({
        lat: undefined,
        lng: undefined,
        locationName: undefined,
      });
    }
  }, [lat, lng, locationName]);

  const existingEvent = state.events.find((e) => e.id === id);

  const getInitialFormValues = (event?: Event): FormValues => {
    return event
      ? {
          title: event.title,
          location: event.location,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          description: event.description,
          accessCode: event.accessCode ?? '',
          coverImage: event.coverImage ?? '',
          userId: user.uid,
          createdBy: event.createdBy ?? userEmail,
        }
      : {
          title: '',
          location: '',
          startDate: new Date(),
          endDate: new Date(),
          description: '',
          accessCode: '',
          coverImage: '',
          userId: '',
          createdBy: userEmail,
        };
  };

  const [formValues, setFormValues] = useState<FormValues>(() =>
    getInitialFormValues(existingEvent)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const updateFormValue = (key: keyof FormValues, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formValues.title.trim()) newErrors.title = 'Título é obrigatório';
    if (!formValues.location.trim()) newErrors.location = 'Local é obrigatório';
    if (!formValues.accessCode.trim())
      newErrors.accessCode = 'Código de acesso obrigatório';
    if (formValues.endDate < formValues.startDate)
      newErrors.endDate = 'Data final inválida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!existingEvent || !id)
      return Alert.alert('Erro', 'Evento não encontrado.');
    setIsSubmitting(true);
    try {
      await updateEvent({
        id,
        ...formValues,
        programs: existingEvent.programs,
        userId: existingEvent.userId,
      });
      Alert.alert('Evento Atualizado', 'Seu evento foi salvo com sucesso!', [
        { text: 'OK', onPress: () => router.replace(`/events/${id}`) },
      ]);
    } catch {
      Alert.alert('Erro', 'Falha ao salvar o evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const onStartDateChange = (_: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateFormValue('startDate', selectedDate);
      if (formValues.endDate < selectedDate) {
        const newEnd = new Date(selectedDate);
        newEnd.setDate(newEnd.getDate() + 1);
        updateFormValue('endDate', newEnd);
      }
    }
  };

  const onEndDateChange = (_: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) updateFormValue('endDate', selectedDate);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.text }]}>
          Editar Evento
        </Text>

        <TextInput
          label="Título"
          placeholder="Digite o título"
          value={formValues.title}
          onChangeText={(text) => updateFormValue('title', text)}
          error={errors.title}
        />

        <TextInput
          key={formValues.location}
          label="Local"
          editable={false}
          placeholder="Digite o local"
          value={formValues.location}
          onChangeText={(text) => updateFormValue('location', text)}
          error={errors.location}
          icon={<MapPin size={20} color={colors.textSecondary} />}
        />
        <Button
          title="Selecionar no mapa"
          onPress={() =>
            router.push({
              pathname: '/selectLocationScreen',
              params: { id }, // <- envia o id do evento
            })
          }
          style={{ marginTop: 8, marginBottom: 12 }}
        />

        <View style={styles.dateSection}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>
            Datas do Evento
          </Text>
          <View style={styles.datePickersContainer}>
            <View style={styles.datePickerWrapper}>
              <Text
                style={[
                  styles.datePickerLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Início
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
                Fim
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
          label="Descrição"
          placeholder="Descreva o evento..."
          value={formValues.description}
          onChangeText={(text) => updateFormValue('description', text)}
          multiline
          numberOfLines={4}
          icon={<Info size={20} color={colors.textSecondary} />}
        />

        <TextInput
          label="Código de Acesso"
          placeholder="Ex: A1B2"
          value={formValues.accessCode}
          onChangeText={(text) => updateFormValue('accessCode', text)}
          error={errors.accessCode}
        />

        <Button
          variant="outline"
          title={
            formValues.coverImage
              ? 'Alterar imagem do evento'
              : 'Selecionar imagem do evento'
          }
          onPress={async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
              aspect: [4, 3],
            });
            if (!result.canceled) {
              try {
                setIsUploadingCover(true);
                const uri = result.assets[0].uri;
                const { uri: uploadedUrl } = await uploadImageToCloudinary(uri);
                updateFormValue('coverImage', uploadedUrl);
                Alert.alert('Sucesso', 'Imagem de capa atualizada!');
              } catch {
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
              height: 240,
              borderRadius: 12,
              marginTop: 12,
            }}
          />
        )}

        <View style={styles.buttonsContainer}>
          <Button
            title="Cancelar"
            onPress={() => router.back()}
            style={styles.cancelButton}
          />
          <Button
            title="Salvar Alterações"
            onPress={handleSubmit}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
      {isSubmitting && <LoadingOverlay message="Salvando evento..." />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  heading: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  dateSection: { marginBottom: 16 },
  dateLabel: { fontFamily: 'Inter-Medium', fontSize: 16, marginBottom: 8 },
  datePickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerWrapper: { flex: 0.48 },
  datePickerLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dateText: { marginLeft: 8, fontFamily: 'Inter-Regular', fontSize: 13 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 12, marginTop: 4 },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: { flex: 0.48, backgroundColor: '#333' },
  submitButton: { flex: 0.48 },
});
