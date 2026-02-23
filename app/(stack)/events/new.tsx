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
  Edit,
  Plus,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Href } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Fonts from '@/constants/Fonts';

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
    pTitle,
    pDesc,
    pCover,
    pStart,
    pEnd,
  } = useLocalSearchParams<{
    id?: string;
    mode?: 'create' | 'edit';
    lat?: string;
    lng?: string;
    locationName?: string;
    pTitle?: string;
    pDesc?: string;
    pCover?: string;
    pStart?: string;
    pEnd?: string;
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

  // ✅ Restaura estado preservado ao voltar da seleção de local
  useEffect(() => {
    if (pTitle) setValue('title', pTitle);
    if (pDesc) setValue('description', pDesc);
    if (pCover) {
      setLocalCoverUri(pCover);
      setValue('coverImage', pCover);
    }
    if (pStart) setValue('startDate', new Date(pStart));
    if (pEnd) setValue('endDate', new Date(pEnd));
  }, [pTitle, pDesc, pCover, pStart, pEnd, setValue]);

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

  const onDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      // No Android, o picker fecha sozinho ao selecionar ou cancelar
      if (Platform.OS === 'android') {
        setShowStartDatePicker(false);
        setShowEndDatePicker(false);
      }

      if (event.type === 'set' && selectedDate) {
        if (showStartDatePicker) {
          setValue('startDate', selectedDate, { shouldValidate: true });
        } else if (showEndDatePicker) {
          setValue('endDate', selectedDate, { shouldValidate: true });
        }
      }
    },
    [showStartDatePicker, showEndDatePicker, setValue],
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
      aspect: [16, 9],
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
          paddingBottom: 24,
          paddingTop:
            Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 40) : 0,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ======== Cover Image Banner ======== */}
        <View style={styles.bannerContainer}>
          {previewCover ? (
            <Animated.View entering={FadeIn} style={styles.previewCard}>
              <Image
                source={{
                  uri: previewCover.startsWith('http')
                    ? getOptimizedUrl(previewCover, { width: 800, quality: 'auto' })
                    : previewCover,
                }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: colors.error }]}
                onPress={() => {
                  setLocalCoverUri(null);
                  setValue('coverImage', '', { shouldValidate: true });
                }}
              >
                <X size={20} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.editOverlayButton, { backgroundColor: colors.primary }]}
                onPress={pickAndUploadCover}
                disabled={isUploadingCover}
              >
                {isUploadingCover ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Edit size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isUploadingCover}
              onPress={pickAndUploadCover}
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
                {isUploadingCover ? (
                  <ActivityIndicator color={colors.primary} size="large" />
                ) : (
                  <Plus size={32} color={colors.primary} />
                )}
              </View>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                Adicionar Capa
              </Text>
              <Text style={[styles.pickerSub, { color: colors.textSecondary }]}>
                Toque aqui para escolher uma imagem
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {errors.coverImage && (
          <Text style={{ color: colors.error, textAlign: 'center', marginTop: -10, marginBottom: 10 }}>
            {errors.coverImage.message}
          </Text>
        )}

        <View style={styles.formContent}>
          <Text style={[styles.heading, { color: colors.text }]}>
            {mode === 'edit' ? 'Editar Evento' : 'Novo Evento'}
          </Text>

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
                style={{ marginBottom: 12 }}
              />
            )}
          />

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
                      pTitle: watch('title'),
                      pDesc: watch('description'),
                      pCover: previewCover,
                      pStart: watch('startDate')?.toISOString(),
                      pEnd: watch('endDate')?.toISOString(),
                    },
                  })
                }
                activeOpacity={0.9}
              >
                <TextInput
                  label="Localização"
                  placeholder="Selecionar no mapa"
                  value={field.value}
                  onChangeText={field.onChange}
                  editable={false}
                  error={errors.location?.message}
                  icon={<MapPin size={18} color={colors.primary} />}
                  inputStyle={{ color: colors.textSecondary }}
                  style={{ marginBottom: 12 }}
                />
              </TouchableOpacity>
            )}
          />

          {/* ======== Datas ======== */}
          <View style={styles.dateSection}>
            <View style={styles.datePickersContainer}>
              {/* Início de: Fim em Row compacta */}
              <View style={[styles.datePickerWrapper, { marginRight: 8 }]}>
                <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Início</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowStartDatePicker(true)}
                  style={[
                    styles.dateInput,
                    { borderColor: colors.border, backgroundColor: colors.background }
                  ]}
                >
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formatDate(startDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.datePickerWrapper}>
                <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Fim</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowEndDatePicker(true)}
                  style={[
                    styles.dateInput,
                    { borderColor: colors.border, backgroundColor: colors.background }
                  ]}
                >
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formatDate(endDate)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {errors.endDate && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.endDate.message}
                </Text>
              )}
          </View>

          {/* ======== Descrição ======== */}
          <View style={{ marginBottom: 16 }}>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <TextInput
                  label="Descrição"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  multiline
                  numberOfLines={2}
                  maxLength={110}
                  inputStyle={{ color: colors.textSecondary, textAlign: 'justify', minHeight: 60 }}
                  style={{ marginBottom: 4 }}
                />
              )}
            />
            <Text style={[styles.charCounter, { color: colors.textSecondary }]}>
              {110 - (watch('description')?.length || 0)}
            </Text>
          </View>

          {/* ======== Ações ======== */}
          <View style={styles.actionRow}>
            <Button
              title="Cancelar"
              onPress={() => {
                if (mode === 'edit' && id) {
                  router.replace(`/(stack)/events/${id}` as Href);
                } else {
                  router.back();
                }
              }}
              variant="ghost"
              style={{ flex: 1, marginRight: 12 }}
            />
            <Button
              title={mode === 'edit' ? 'Salvar' : 'Criar'}
              onPress={handleSubmit(onSubmit, onInvalid)}
              style={{ flex: 1 }}
              disabled={isSubmitting || isUploadingCover}
            />
          </View>
        </View>
      </ScrollView>

      {isSubmitting && <LoadingOverlay message="Salvando evento..." />}

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={startDate || new Date()}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  formContent: {
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Banner Styles
  bannerContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  imagePickerCard: {
    width: '100%',
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    aspectRatio: 16 / 9,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
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
  editOverlayButton: {
    position: 'absolute',
    bottom: 12,
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

  bannerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bannerText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },

  // Dates
  dateSection: {
    marginBottom: 12,
  },
  datePickersContainer: {
    flexDirection: 'row',
  },
  datePickerWrapper: {
    flex: 1,
  },
  miniLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
    marginLeft: 2,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40, 
    justifyContent: 'center',
  },
  dateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },

  charCounter: {
    fontSize: 11,
    textAlign: 'right',
    fontFamily: 'Inter-Regular',
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },

  editBadge: {
    padding: 8,
    borderRadius: 20,
    elevation: 3,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
