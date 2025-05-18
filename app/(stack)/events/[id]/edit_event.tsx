import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
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

export default function AddOrEditEventScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addEvent, updateEvent } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const existingEvent = state.events.find((e) => e.id === id);

  const getInitialFormValues = (event?: Event): FormValues => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    return event
      ? {
          title: event.title,
          location: event.location,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          description: event.description,
          accessCode: event.accessCode ?? '',
        }
      : {
          title: '',
          location: '',
          startDate: now,
          endDate: tomorrow,
          description: '',
          accessCode: '',
        };
  };

  const [formValues, setFormValues] = useState<FormValues>(() =>
    getInitialFormValues(existingEvent)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormValue = (key: keyof FormValues, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formValues.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    } else if (formValues.title.length < 3) {
      newErrors.title = 'O título deve ter pelo menos 3 caracteres';
    }

    if (!formValues.location.trim()) {
      newErrors.location = 'Local é obrigatório';
    }

    if (formValues.endDate < formValues.startDate) {
      newErrors.endDate = 'Data final deve ser após a data inicial';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (!existingEvent || !id) {
        Alert.alert('Erro', 'Evento não encontrado.');
        return;
      }

      updateEvent({ id, ...formValues, programs: existingEvent.programs });

      Alert.alert('Evento Atualizado', 'Seu evento foi salvo com sucesso!', [
        { text: 'OK', onPress: () => router.push('/') },
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar o evento. Tente novamente.');
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
        const newEndDate = new Date(selectedDate);
        newEndDate.setDate(selectedDate.getDate() + 1);
        updateFormValue('endDate', newEndDate);
      }
    }
  };

  const onEndDateChange = (_: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateFormValue('endDate', selectedDate);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.heading, { color: colors.text }]}>
        {existingEvent ? 'Editar Evento' : 'Criar Novo Evento'}
      </Text>

      <TextInput
        label="Título do Evento"
        placeholder="Digite o título"
        value={formValues.title}
        onChangeText={(text) => updateFormValue('title', text)}
        error={errors.title}
      />

      <TextInput
        label="Local"
        placeholder="Digite o local"
        value={formValues.location}
        onChangeText={(text) => updateFormValue('location', text)}
        error={errors.location}
        icon={<MapPin size={20} color={colors.textSecondary} />}
      />

      <View style={styles.dateSection}>
        <Text style={[styles.dateLabel, { color: colors.text }]}>
          Datas do Evento
        </Text>

        <View style={styles.datePickersContainer}>
          <View style={styles.datePickerWrapper}>
            <Text
              style={[styles.datePickerLabel, { color: colors.textSecondary }]}
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
              style={[styles.datePickerLabel, { color: colors.textSecondary }]}
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
        placeholder="Descreva o evento..."
        value={formValues.description}
        onChangeText={(text) => updateFormValue('description', text)}
        multiline
        numberOfLines={4}
        icon={<Info size={20} color={colors.textSecondary} />}
      />

      <View style={styles.buttonsContainer}>
        <Button
          title="Cancelar"
          onPress={() => router.back()}
          variant="ghost"
          style={styles.cancelButton}
        />
        <Button
          title={existingEvent ? 'Salvar Alterações' : 'Criar Evento'}
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
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
  dateLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginBottom: 8,
  },
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
    backgroundColor: '#333',
  },
  submitButton: {
    flex: 0.48,
  },
});
