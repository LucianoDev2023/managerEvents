import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Text,
  Platform,
  Image,
  StyleSheet,
  StatusBar as RNStatusBar,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Calendar, CalendarRange, Info, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { eventFormSchema, EventFormValues } from '@/zod/eventFormSchema';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import LoadingOverlay from '@/components/LoadingOverlay';
import { uploadImageToCloudinary } from '@/lib/uploadImageToCloudinary';

export default function EventFormScreen() {
  const { addEvent, updateEvent, state } = useEvents();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  const {
    id,
    mode = 'create',
    lat,
    lng,
    locationName,
  } = useLocalSearchParams<{
    id?: string;
    mode: 'create' | 'edit';
    lat?: string;
    lng?: string;
    locationName?: string;
  }>();

  const user = getAuth().currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      location: '',
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      description: '',
      accessCode: '',
      coverImage: '',
      userId: user.uid,
      createdBy: user.email?.toLowerCase() ?? '',
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const coverImage = watch('coverImage');

  useEffect(() => {
    if (mode === 'edit' && id) {
      const eventToEdit = state.events.find((ev) => ev.id === id);
      if (eventToEdit) {
        reset({ ...eventToEdit });
      }
    }
  }, [mode, id]);

  useEffect(() => {
    if (lat && lng) {
      const location = locationName ?? `Lat: ${lat}, Lng: ${lng}`;
      setValue('location', location);
    }
  }, [lat, lng]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const onSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);
    try {
      if (mode === 'edit') {
        if (!id) {
          Alert.alert('Erro', 'ID do evento não encontrado');
          return;
        }

        const existingEvent = state.events.find((ev) => ev.id === id);
        if (!existingEvent) {
          Alert.alert('Erro', 'Evento não encontrado');
          return;
        }

        await updateEvent({
          ...existingEvent, // mantém programas e subAdmins
          ...data, // sobrescreve campos atualizados
          id, // por segurança
        });

        Alert.alert('Sucesso', 'Evento atualizado com sucesso!');
        router.back();
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={gradientColors}
      style={{ flex: 1 }}
      locations={[0, 0.7, 1]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 24,
          paddingTop:
            Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.text }]}>
          {mode === 'edit' ? 'Editar Evento' : 'Criar Evento'}
        </Text>

        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <TextInput
              label="Título"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.title?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/selectLocationScreen',
                  params: {
                    redirectTo: '(newevents)/event-form',
                    mode,
                    id,
                  },
                })
              }
              activeOpacity={0.9}
            >
              <TextInput
                label="Localização"
                placeholder="Toque para selecionar no mapa"
                value={field.value}
                onChangeText={field.onChange}
                editable={false}
                error={errors.location?.message}
                icon={<MapPin size={18} color={colors.primary} />}
              />
            </TouchableOpacity>
          )}
        />

        <View style={styles.dateSection}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>
            Datas do Evento
          </Text>
          <View style={styles.datePickersContainer}>
            {/* Início */}
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
                  {formatDate(startDate)}
                </Text>
              </View>
            </View>

            {/* Fim */}
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
                  {formatDate(endDate)}
                </Text>
              </View>
              {errors.endDate && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.endDate.message}
                </Text>
              )}
            </View>
          </View>
        </View>

        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              if (date) {
                setValue('startDate', date);
                if (endDate < date) {
                  const newEnd = new Date(date);
                  newEnd.setDate(newEnd.getDate() + 1);
                  setValue('endDate', newEnd);
                }
              }
              setShowStartDatePicker(false);
            }}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={(_, date) => {
              if (date) setValue('endDate', date);
              setShowEndDatePicker(false);
            }}
          />
        )}

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextInput
              label="Descrição"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              multiline
              numberOfLines={4}
              icon={<Info size={20} color={colors.primary} />}
            />
          )}
        />

        <Controller
          control={control}
          name="accessCode"
          render={({ field }) => (
            <TextInput
              label="Código de Acesso"
              placeholder="ABC123"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.accessCode?.message}
            />
          )}
        />

        <Button
          title={coverImage ? 'Alterar imagem' : 'Selecionar imagem'}
          onPress={async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
              aspect: [4, 3],
            });

            if (!result.canceled) {
              try {
                setIsUploadingCover(true);
                const { uri } = await uploadImageToCloudinary(
                  result.assets[0].uri
                );
                setValue('coverImage', uri);
              } catch {
                Alert.alert('Erro ao enviar imagem');
              } finally {
                setIsUploadingCover(false);
              }
            }
          }}
          loading={isUploadingCover}
        />

        {coverImage && (
          <Image
            source={{ uri: coverImage }}
            style={{
              width: '100%',
              height: 200,
              marginVertical: 12,
              borderRadius: 8,
            }}
          />
        )}
        {errors.coverImage && (
          <Text style={{ color: colors.error }}>
            {errors.coverImage.message}
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 24,
          }}
        >
          <Button
            title="Cancelar"
            onPress={() => router.back()}
            variant="cancel"
            style={{ flex: 0.48 }}
          />
          <Button
            title={mode === 'edit' ? 'Salvar' : 'Criar evento'}
            onPress={handleSubmit(onSubmit)}
            style={{ flex: 0.48 }}
          />
        </View>
      </ScrollView>

      {isSubmitting && <LoadingOverlay message="Salvando evento..." />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 24,
    textAlign: 'center',
  },

  datePickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateSection: {
    marginBottom: 16,
  },
  dateLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 8,
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
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    marginLeft: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
});
