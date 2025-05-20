import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { ArrowLeft, Clock } from 'lucide-react-native';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ActivityFormValues {
  time: string;
  title: string;
  description: string;
}

export default function AddActivityScreen() {
  const { id, programId } = useLocalSearchParams<{
    id: string;
    programId: string;
  }>();
  const { addActivity } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [formValues, setFormValues] = useState<ActivityFormValues>({
    time: '09:00 AM',
    title: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTime, setPickerTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormValue = (key: keyof ActivityFormValues, value: string) => {
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formValues.title.trim()) {
      newErrors.title = 'Nome requerido';
    }

    if (!formValues.time.trim()) {
      newErrors.time = 'Horário requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      addActivity(id, programId, {
        programId,
        time: formValues.time,
        title: formValues.title,
        description: formValues.description,
      });

      Alert.alert(
        'Atividade adicionada',
        'A atividade foi adicionada ao programa.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Falhou, tente novamente!.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onTimeChange = (_: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');

    if (selectedTime) {
      setPickerTime(selectedTime);

      // Formata para 24h
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const timeString = `${formattedHours}:${formattedMinutes}`;

      updateFormValue('time', timeString);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Add atividade',
          headerTitleStyle: {
            fontFamily: 'Inter-Bold',
            fontSize: 18,
          },
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
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.text }]}>
          Detalhes da nova atividade
        </Text>

        <View style={styles.timePickerContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Horário da atividade
          </Text>

          <TouchableOpacity
            style={[styles.timeButton, { borderColor: colors.border }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.timeText, { color: colors.text }]}>
              {formValues.time}
            </Text>
          </TouchableOpacity>

          {errors.time && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.time}
            </Text>
          )}
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={pickerTime}
            mode="time"
            display="default"
            onChange={onTimeChange}
            is24Hour={true} // <-- adiciona isso
          />
        )}

        <TextInput
          label="Nome da atividade"
          placeholder="Insira o nome"
          value={formValues.title}
          onChangeText={(text) => updateFormValue('title', text)}
          error={errors.title}
        />

        <TextInput
          label="Descrição (Opcional)"
          placeholder="Insira a descrição"
          value={formValues.description}
          onChangeText={(text) => updateFormValue('description', text)}
          multiline
          numberOfLines={4}
        />

        <View style={styles.buttonsContainer}>
          <Button
            title="Cancelar"
            onPress={() => router.back()}
            variant="cancel"
            style={styles.cancelButton}
          />
          <Button
            title="Add atividade"
            onPress={handleSubmit}
            loading={isSubmitting}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  timePickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginBottom: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  timeText: {
    marginLeft: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
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
