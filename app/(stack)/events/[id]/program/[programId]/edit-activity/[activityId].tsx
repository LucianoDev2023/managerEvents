import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Clock, Trash2 } from 'lucide-react-native';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Activity } from '@/types';
import LoadingOverlay from '@/components/LoadingOverlay';

interface ActivityFormValues {
  time: string;
  title: string;
  description: string;
}

export default function EditActivityScreen() {
  const { id, programId, activityId } = useLocalSearchParams<{
    id: string;
    programId: string;
    activityId: string;
  }>();

  const { state, updateActivity, deleteActivity } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const event = state.events.find((e) => e.id === id);
  const program = event?.programs.find((p) => p.id === programId);
  const activity = program?.activities.find((a) => a.id === activityId) as
    | Activity
    | undefined;

  const [formValues, setFormValues] = useState<ActivityFormValues>({
    time: '09:00 AM',
    title: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTime, setPickerTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load activity data when component mounts
  useEffect(() => {
    if (activity) {
      // Parse time from activity (que pode estar em AM/PM ou 24h)
      let initialTime = activity.time;
      let initialDate = new Date();

      try {
        // Tenta parsear no formato 24h primeiro
        const time24hFormat = activity.time.match(/^(\d{1,2}):(\d{2})$/);

        if (time24hFormat) {
          // Já está no formato 24h
          const hours = parseInt(time24hFormat[1]);
          const minutes = parseInt(time24hFormat[2]);
          initialDate.setHours(hours, minutes);
        } else {
          // Tenta parsear no formato AM/PM
          const timeParts = activity.time.match(/(\d+):(\d+)\s*([AP]M)?/i);
          if (timeParts) {
            let hours = parseInt(timeParts[1]);
            const minutes = parseInt(timeParts[2]);
            const period = timeParts[3]?.toUpperCase();

            if (period === 'PM' && hours < 12) {
              hours += 12;
            } else if (period === 'AM' && hours === 12) {
              hours = 0;
            }

            initialDate.setHours(hours, minutes);
            // Converte para formato 24h para exibição
            initialTime = `${hours < 10 ? '0' + hours : hours}:${
              minutes < 10 ? '0' + minutes : minutes
            }`;
          }
        }
      } catch (error) {
        console.log('Error parsing time:', error);
        // Usa um horário padrão se houver erro
        initialDate.setHours(9, 0);
        initialTime = '09:00';
      }

      setFormValues({
        time: initialTime,
        title: activity.title,
        description: activity.description ?? '',
      });
      setPickerTime(initialDate);
    }
  }, [activity]);

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
      newErrors.title = 'Title is required';
    }

    if (!formValues.time.trim()) {
      newErrors.time = 'Time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validateForm() || !activity) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updateActivity(id, programId, {
        ...activity,
        time: formValues.time,
        title: formValues.title,
        description: formValues.description,
      });

      Alert.alert('Atualização', 'Essa atividade foi atualizada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar atividade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Deletar atividade',
      'Tem certeza que deseja deletar? Essa atividade não poderá ser desfeita.',
      [
        { text: 'Cancela', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: () => {
            deleteActivity(id, programId, activityId);
            router.back();
          },
        },
      ]
    );
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');

    if (selectedTime) {
      setPickerTime(selectedTime);

      // Format time in 24h format
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const formattedHours = hours < 10 ? `0${hours}` : hours;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

      const timeString = `${formattedHours}:${formattedMinutes}`;
      updateFormValue('time', timeString);
    }
  };

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
            Essa atividade não pode ser localizada ou não existe.
          </Text>
          <Button
            title="Go Back"
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
          headerTitle: 'Editar atividade',
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
          headerRight: () => (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.headerButton}
            >
              <Trash2 size={20} color={colors.error} />
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
          Editar atividade
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
            is24Hour={true} // Adicione esta linha
          />
        )}

        <TextInput
          label="Título da atividade"
          placeholder="Insira o título da atividade"
          value={formValues.title}
          onChangeText={(text) => updateFormValue('title', text)}
          error={errors.title}
        />

        <TextInput
          label="Descrição (Opcional)"
          placeholder="Insira uma descrição..."
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
            title="Atualizar"
            onPress={handleUpdate}
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
      {isSubmitting && <LoadingOverlay message="Salvando alterações..." />}
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
    backgroundColor: '#333',
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
