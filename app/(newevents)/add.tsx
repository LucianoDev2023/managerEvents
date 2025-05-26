import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Image,
  StatusBar as RNStatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import {
  Calendar,
  MapPin,
  CalendarRange,
  Info,
  Map,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FormValues } from '@/types';
import LoadingOverlay from '@/components/LoadingOverlay';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '@/lib/uploadImageToCloudinary';
import { getAuth } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function AddEventScreen() {
  const { addEvent } = useEvents();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  const user = getAuth().currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  const userEmail = user.email?.toLowerCase() ?? '';

  const [formValues, setFormValues] = useState<FormValues>({
    title: '',
    location: '',
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    description: '',
    accessCode: '',
    userId: user.uid,
    createdBy: userEmail,
  });

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const { lat, lng, locationName } = useLocalSearchParams();
  useEffect(() => {
    if (lat && lng) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      setSelectedLocation({ latitude, longitude });
      setFormValues((prev) => ({
        ...prev,
        location:
          (locationName as string) ?? `Lat: ${latitude}, Lng: ${longitude}`,
      }));
    }
  }, [lat, lng]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const updateFormValue = (key: keyof FormValues, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formValues.title.trim()) newErrors.title = 'Título obrigatório.';
    else if (formValues.title.length < 3)
      newErrors.title = 'O título deve ter pelo menos 3 caracteres.';
    if (!formValues.location.trim())
      newErrors.location = 'Localização obrigatória.';
    if (formValues.endDate < formValues.startDate)
      newErrors.endDate = 'Data de fim não pode ser anterior à de início.';
    if (!formValues.accessCode.trim())
      newErrors.accessCode = 'Código de acesso obrigatório.';
    else if (formValues.accessCode.length < 3)
      newErrors.accessCode = 'Código deve ter pelo menos 3 caracteres.';
    if (!formValues.coverImage)
      newErrors.coverImage = 'Imagem do evento é obrigatória.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const newEventId = await addEvent({ ...formValues });
      setTimeout(() => {
        Alert.alert('Sucesso', 'Evento criado com sucesso!', [
          { text: 'OK', onPress: () => router.push(`/events/${newEventId}`) },
        ]);
      }, 400);
    } catch {
      Alert.alert('Erro', 'Não foi possível criar o evento.');
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

  const onStartDateChange = (event: any, selectedDate?: Date) => {
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

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) updateFormValue('endDate', selectedDate);
  };

  return (
    <LinearGradient
      colors={gradientColors}
      style={{ flex: 1 }}
      locations={[0, 0.7, 1]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          padding: 24,
          paddingTop:
            Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.text }]}>
          Criar seus evento
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
          placeholder="Selecione no mapa..."
          value={formValues.location}
          onChangeText={() => {}} // <- necessário mesmo se não for editável
          editable={false}
          error={errors.location}
        />

        <Button
          title={
            selectedLocation
              ? 'Alterar Localização no Mapa'
              : 'Selecionar Localização no Mapa'
          }
          onPress={() => router.push('/selectLocationScreen')}
          icon={<MapPin size={20} color={colors.text} />}
          style={{ marginTop: 4, marginBottom: 12 }}
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
          label="Descrição (opcional)"
          placeholder="Insira uma descrição..."
          value={formValues.description}
          onChangeText={(text) => updateFormValue('description', text)}
          multiline
          numberOfLines={4}
          icon={<Info size={20} color={colors.textSecondary} />}
        />

        <TextInput
          label="Código de Acesso"
          placeholder="Ex: ABC123"
          value={formValues.accessCode}
          onChangeText={(text) => updateFormValue('accessCode', text)}
          error={errors.accessCode}
        />

        <Button
          title={
            formValues.coverImage
              ? 'Alterar imagem do Evento'
              : 'Selecionar imagem do Evento'
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
                Alert.alert('Sucesso', 'Imagem enviada com sucesso!');
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
              height: 200,
              borderRadius: 10,
              marginTop: 12,
              marginBottom: 8,
            }}
          />
        )}
        {errors.coverImage && (
          <Text style={{ color: colors.error, fontSize: 12 }}>
            {errors.coverImage}
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
          }}
        >
          <Button
            title="Cancelar"
            onPress={() => router.back()}
            variant="cancel"
            style={{ flex: 0.48 }}
          />
          <Button
            title="Criar evento"
            onPress={handleSubmit}
            style={{ flex: 0.48 }}
          />
        </View>
      </ScrollView>

      {isSubmitting && <LoadingOverlay message="Criando evento..." />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
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
});
