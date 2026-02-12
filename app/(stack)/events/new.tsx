import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  Calendar,
  CalendarRange,
  Info,
  MapPin,
  Camera,
  Pencil,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Href } from 'expo-router';

import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { eventFormSchema, EventFormValues } from '@/zod/eventFormSchema';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import LoadingOverlay from '@/components/LoadingOverlay';
import { uploadPhotoToCloudinary } from '@/lib/uploadImageToCloudinary';
import { getOptimizedUrl } from '@/lib/cloudinary';

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
    mode?: 'create' | 'edit';
    lat?: string;
    lng?: string;
    locationName?: string;
  }>();

  const auth = getAuth();
  const user = auth.currentUser;

  // ✅ Não “explode” a tela com throw durante render
  useEffect(() => {
    if (!user) {
      Alert.alert('Sessão expirada', 'Faça login novamente.');
      router.replace('/(auth)/login' as Href);
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [localCoverUri, setLocalCoverUri] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: {
      title: '',
      location: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(),
      coverImage: '',
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const coverImage = watch('coverImage');
  const previewCover = coverImage || localCoverUri || '';

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const eventToEdit = useMemo(() => {
    if (mode !== 'edit' || !id) return null;
    return state.events.find((ev) => ev.id === id) ?? null;
  }, [mode, id, state.events]);

  // ✅ Carrega dados no edit
  useEffect(() => {
    if (mode === 'edit' && id && eventToEdit) {
      reset({
        ...eventToEdit,
        // garante que datas sejam Date caso venham como Timestamp/string
        startDate:
          typeof (eventToEdit as any).startDate?.toDate === 'function'
            ? (eventToEdit as any).startDate.toDate()
            : new Date((eventToEdit as any).startDate),
        endDate:
          typeof (eventToEdit as any).endDate?.toDate === 'function'
            ? (eventToEdit as any).endDate.toDate()
            : new Date((eventToEdit as any).endDate),
      } as any);
    }
  }, [mode, id, eventToEdit, reset]);

  // ✅ Atualiza localização via params
  useEffect(() => {
    if (lat && lng) {
      const location = locationName ?? `Lat: ${lat}, Lng: ${lng}`;
      setValue('location', location, { shouldValidate: true });
    }
  }, [lat, lng, locationName, setValue]);

  const onInvalid = useCallback(
    (err: any) => {
      const fieldNames = Object.keys(err);
      if (fieldNames.length > 0) {
        Alert.alert(
          'Campos incompletos',
          'Por favor, revise os campos destacados em vermelho antes de salvar.',
        );
      }
    },
    [mode, id],
  );

  const handleNavigate = useCallback((eventId: string) => {
    router.replace({
      pathname: '/(stack)/events/[id]',
      params: { id: eventId },
    } as unknown as Href);
  }, []);

  // =========================
  // ✅ COVER PICKER REUTILIZÁVEL
  // =========================
  const ensureGalleryPermission = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permissão requerida',
        'Permita acesso à galeria para escolher uma imagem.',
      );
      return false;
    }
    return true;
  }, []);

  const pickAndUploadCover = useCallback(async () => {
    if (isUploadingCover) return;

    const ok = await ensureGalleryPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      aspect: [2, 1],
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    // ✅ sempre mostra preview local imediatamente
    setLocalCoverUri(asset.uri);

    // ✅ se estiver editando, já tem id → faz upload agora
    if (mode === 'edit' && id) {
      try {
        setIsUploadingCover(true);

        const uploaded = await uploadPhotoToCloudinary(asset as any, {
          eventId: id,
          kind: 'cover',
        });

        setValue('coverImage', uploaded.uri, { shouldValidate: true });
        setLocalCoverUri(null); // já virou remota
      } catch (e) {
        Alert.alert('Erro', 'Erro ao enviar imagem de capa');
      } finally {
        setIsUploadingCover(false);
      }
    }
  }, [
    ensureGalleryPermission,
    isUploadingCover,
    mode,
    id,
    setValue,
    uploadPhotoToCloudinary,
  ]);

  // =========================
  // ✅ SUBMIT
  // =========================
  const onSubmit = useCallback(
    async (data: EventFormValues) => {
      if (!user) return;

      if (isUploadingCover) {
        Alert.alert('Aguarde', 'A imagem ainda está sendo enviada.');
        return;
      }

      // ✅ capa obrigatória: aceita URL (edit) OU preview local (create)
      const hasCover = !!data.coverImage || !!localCoverUri;
      if (!hasCover) {
        Alert.alert(
          'Capa obrigatória',
          'Adicione uma foto de capa para continuar.',
        );
        return;
      }

      setIsSubmitting(true);
      try {
        if (mode === 'edit') {
          if (!id) {
            Alert.alert('Erro', 'ID do evento não encontrado');
            return;
          }
          if (!eventToEdit) {
            Alert.alert('Erro', 'Evento não encontrado');
            return;
          }

          await updateEvent({
            ...eventToEdit,
            ...data,
            id,
          } as any);

          Alert.alert('Sucesso', 'Evento atualizado com sucesso!', [
            { text: 'OK', onPress: () => handleNavigate(id) },
          ]);

          return;
        }

        // ===== CREATE =====

        // 1) cria evento sem capa (por enquanto)
        const newId = await addEvent({
          title: data.title,
          location: data.location,
          startDate: data.startDate,
          endDate: data.endDate,
          description: data.description,
          coverImage: '', // vazio inicialmente
          userId: user.uid,
        } as any);

        // 2) se tem capa local, sobe agora com newId e atualiza evento
        if (localCoverUri) {
          setIsUploadingCover(true);
          try {
            const fakeAsset = {
              uri: localCoverUri,
              mimeType: 'image/jpeg',
              fileName: `cover_${Date.now()}.jpg`,
            } as any;

            const uploaded = await uploadPhotoToCloudinary(fakeAsset, {
              eventId: newId,
              kind: 'cover',
            });

            await updateEvent({
              id: newId,
              title: data.title,
              location: data.location,
              description: data.description,
              startDate: data.startDate,
              endDate: data.endDate,
              coverImage: uploaded.uri,
              userId: user.uid,
            } as any);

            setValue('coverImage', uploaded.uri, { shouldValidate: false });
            setLocalCoverUri(null);
          } finally {
            setIsUploadingCover(false);
          }
        }

        Alert.alert('Sucesso', 'Evento criado com sucesso!', [
          { text: 'OK', onPress: () => handleNavigate(newId) },
        ]);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível salvar o evento.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      user,
      isUploadingCover,
      mode,
      id,
      eventToEdit,
      updateEvent,
      addEvent,
      handleNavigate,
      localCoverUri,
      setValue,
      setLocalCoverUri,
      state.events,
    ],
  );

  if (!user) {
    // enquanto redireciona
    return (
      <LinearGradient
        colors={gradientColors}
        style={{ flex: 1 }}
        locations={[0, 0.7, 1]}
      >
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.text }}>
            Carregando...
          </Text>
        </View>
      </LinearGradient>
    );
  }

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
            Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 40) : 0,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.text }]}>
          {mode === 'edit' ? 'Editar Evento' : 'Criar Evento'}
        </Text>

        {/* ======== Localização ======== */}
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <TouchableOpacity
              onPress={() =>
                router.replace({
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
                inputStyle={{ color: colors.textSecondary }}
              />
            </TouchableOpacity>
          )}
        />

        {/* ======== Título ======== */}
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <TextInput
              label="Título"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.title?.message}
              inputStyle={{ color: colors.textSecondary }}
            />
          )}
        />

        {/* ======== Datas ======== */}
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
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowStartDatePicker(true)}
                style={[styles.dateButton, { borderColor: colors.border }]}
              >
                <Calendar size={18} color={colors.primary} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowEndDatePicker(true)}
                style={[styles.dateButton, { borderColor: colors.border }]}
              >
                <CalendarRange size={18} color={colors.primary} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>

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
              setShowStartDatePicker(false);
              if (!date) return;

              setValue('startDate', date, { shouldValidate: true });

              // garante consistência: endDate >= startDate
              if (endDate < date) {
                const newEnd = new Date(date);
                newEnd.setDate(newEnd.getDate() + 1);
                setValue('endDate', newEnd, { shouldValidate: true });
              }
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
              setShowEndDatePicker(false);
              if (!date) return;
              setValue('endDate', date, { shouldValidate: true });
            }}
          />
        )}

        {/* ======== Descrição ======== */}
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
              inputStyle={{ color: colors.textSecondary }}
            />
          )}
        />

        {/* ======== Cover Image ======== */}
        <View style={{ marginBottom: 20 }}>
          {!previewCover ? (
            <TouchableOpacity
              style={[
                styles.minimalSelector,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
              disabled={isUploadingCover}
              onPress={pickAndUploadCover}
            >
              {isUploadingCover ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <Camera size={20} color={colors.primary} />
                  <Text
                    style={[styles.minimalSelectorText, { color: colors.text }]}
                  >
                    Adicionar foto de capa
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View>
              <Image
                source={{ 
                  uri: previewCover.startsWith('http') 
                    ? getOptimizedUrl(previewCover, { width: 800, quality: 'auto' }) 
                    : previewCover 
                }}
                style={styles.coverPreview}
              />

              <TouchableOpacity
                style={[styles.editBadge, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                disabled={isUploadingCover}
                onPress={pickAndUploadCover}
              >
                {isUploadingCover ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Pencil size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {errors.coverImage && (
          <Text style={{ color: colors.error }}>
            {errors.coverImage.message}
          </Text>
        )}

        {/* ======== Ações ======== */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 24,
          }}
        >
          <Button
            title="Cancelar"
            onPress={() => {
              if (mode === 'edit' && id) {
                router.replace(`/(stack)/events/${id}` as Href);
              } else {
                router.back();
              }
            }}
            variant="cancel"
            style={{ flex: 0.48 }}
          />
          <Button
            title={mode === 'edit' ? 'Salvar' : 'Criar evento'}
            onPress={handleSubmit(onSubmit, onInvalid)}
            style={{ flex: 0.48 }}
            disabled={isSubmitting || isUploadingCover}
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

  coverPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  minimalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'flex-start',
  },
  minimalSelectorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  editBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    padding: 10,
    borderRadius: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});
