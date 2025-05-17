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
import { FormValues } from '@/types';

export default function AddOrEditEventScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, addEvent, updateEvent } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const existingEvent = state.events.find((e) => e.id === id);

  const [formValues, setFormValues] = useState<FormValues>(() =>
    existingEvent
      ? {
          title: existingEvent.title,
          location: existingEvent.location,
          startDate: new Date(existingEvent.startDate),
          endDate: new Date(existingEvent.endDate),
          description: existingEvent.description,
        }
      : {
          title: '',
          location: '',
          startDate: new Date(),
          endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
          description: '',
        }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormValue = (key: keyof FormValues, value: any) => {
    setFormValues({
      ...formValues,
      [key]: value,
    });
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
      newErrors.title = 'Title is required';
    } else if (formValues.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formValues.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (formValues.endDate < formValues.startDate) {
      newErrors.endDate = 'End date must be after start date';
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

      Alert.alert(
        'Evento Atualizado',
        'Seu evento foi atualizado com sucesso!',
        [{ text: 'OK', onPress: () => router.push('/') }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar o evento. Tente novamente.');
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
        placeholder="Digite o título do evento"
        value={formValues.title}
        onChangeText={(text) => updateFormValue('title', text)}
        error={errors.title}
      />

      <TextInput
        label="Local"
        placeholder="Digite o local do evento"
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
        placeholder="Descreva o evento"
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
  },
  submitButton: {
    flex: 0.48,
  },
});
