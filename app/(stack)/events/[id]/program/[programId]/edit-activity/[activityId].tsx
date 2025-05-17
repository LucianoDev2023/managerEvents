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
      setFormValues({
        time: activity.time,
        title: activity.title,
        description: activity.description ?? '',
      });

      // Parse time to set the time picker
      try {
        const timeParts = activity.time.match(/(\d+):(\d+)\s*([AP]M)/);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const period = timeParts[3];

          if (period === 'PM' && hours < 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }

          const date = new Date();
          date.setHours(hours, minutes);
          setPickerTime(date);
        }
      } catch (error) {
        console.log('Error parsing time:', error);
      }
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

  const handleUpdate = () => {
    if (!validateForm() || !activity) {
      return;
    }

    setIsSubmitting(true);

    try {
      updateActivity(id, programId, {
        ...activity,
        time: formValues.time,
        title: formValues.title,
        description: formValues.description,
      });

      Alert.alert(
        'Activity Updated',
        'The activity has been updated successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update activity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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

      // Format time
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

      const timeString = `${formattedHours}:${formattedMinutes} ${ampm}`;
      updateFormValue('time', timeString);
    }
  };

  if (!activity) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Activity not found',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>
            The activity you're looking for doesn't exist or has been deleted.
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
          headerTitle: 'Edit Activity',
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
          Edit Activity
        </Text>

        <View style={styles.timePickerContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Activity Time
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
          />
        )}

        <TextInput
          label="Activity Title"
          placeholder="Enter activity title"
          value={formValues.title}
          onChangeText={(text) => updateFormValue('title', text)}
          error={errors.title}
        />

        <TextInput
          label="Description (Optional)"
          placeholder="Enter activity description"
          value={formValues.description}
          onChangeText={(text) => updateFormValue('description', text)}
          multiline
          numberOfLines={4}
        />

        <View style={styles.buttonsContainer}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="ghost"
            style={styles.cancelButton}
          />
          <Button
            title="Update Activity"
            onPress={handleUpdate}
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
    borderRadius: 8,
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
