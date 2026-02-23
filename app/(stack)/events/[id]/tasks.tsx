import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import {
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Calendar,
  Edit,
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Task } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  ZoomIn,
  FadeOut,
} from 'react-native-reanimated';

// Componente isolado para permitir hooks de animação
const TaskItem = ({
  item,
  onToggle,
  onEdit,
  onDelete,
  colors,
}: {
  item: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  colors: any;
}) => {
  const scale = useSharedValue(1);

  // Efeito de "bounce" ao clicar
  const handleToggle = () => {
    scale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 12 }),
    );
    onToggle(item.id);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={ZoomIn.duration(300)}
      exiting={FadeOut}
      style={[
        animatedCardStyle,
        styles.itemRow,
        { backgroundColor: colors.backgroundCard, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        onPress={handleToggle}
        style={{ marginRight: 12 }}
        activeOpacity={0.7}
      >
        <Animated.View>
          {item.completed ? (
            <Animated.View entering={ZoomIn.springify()}>
              <CheckSquare size={24} color={colors.success} />
            </Animated.View>
          ) : (
            <Square size={24} color={colors.textSecondary} />
          )}
        </Animated.View>
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.itemTitle,
            {
              color: item.completed ? colors.textSecondary : colors.text,
              textDecorationLine: item.completed ? 'line-through' : 'none',
            },
          ]}
        >
          {item.title}
        </Text>
        {item.deadline && (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
          >
            <Calendar size={12} color={colors.textSecondary} />
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginLeft: 4,
              }}
            >
              {new Date(item.deadline).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
        <TouchableOpacity onPress={() => onEdit(item)} style={{ padding: 8 }}>
          <Edit size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={{ padding: 8 }}
        >
          <Trash2 size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function TaskManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, updateTasks } = useEvents();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [event, setEvent] = useState<any>(null);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      const found = state.events.find((e) => e.id === id);
      if (found) {
        setEvent(found);
        setTasks(found.tasks || []);
      }
    }
  }, [id, state.events]);

  const openAddModal = () => {
    if (tasks.length >= 10) {
      Alert.alert(
        'Limite atingido',
        'Este evento já tem 10 tarefas. Conclua ou exclua uma antes de adicionar outra.',
      );
      return;
    }
    setEditingId(null);
    setTitle('');
    setDeadline(new Date());
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDeadline(task.deadline ? new Date(task.deadline) : new Date());
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);

    try {
      let updated = [...tasks];

      if (editingId) {
        updated = updated.map((t) =>
          t.id === editingId ? { ...t, title, deadline } : t,
        );
      } else {
        const newTask: Task = {
          id: uuidv4(),
          title,
          completed: false,
          deadline,
          category: 'geral',
        };
        updated.push(newTask);
      }

      await updateTasks(id!, updated);
      setModalVisible(false);
      setTitle('');
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );
    try {
      await updateTasks(id!, updated);
    } catch (e) {}
  };

  const handleDelete = (taskId: string) => {
    Alert.alert('Excluir', 'Confirmar exclusão?', [
      { text: 'Não' },
      {
        text: 'Sim',
        onPress: async () => {
          const updated = tasks.filter((t) => t.id !== taskId);
          await updateTasks(id!, updated);
        },
      },
    ]);
  };

  const pendingTasks = tasks
    .filter((t) => !t.completed)
    .sort(
      (a, b) => (a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0),
    );
  const completedTasks = tasks.filter((t) => t.completed);

  // ... inside main component ...

  const renderItem = ({ item }: { item: Task }) => (
    <TaskItem
      item={item}
      onToggle={toggleTask}
      onEdit={openEditModal}
      onDelete={handleDelete}
      colors={colors}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Gerenciar Tarefas' }} />

      <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          Organize tudo o que precisa ser feito para o sucesso do:
        </Text>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
          {event?.title || '...'}
        </Text>
      </View>

      {/* Contador de tarefas */}
      <View style={[styles.counterBar, { borderBottomColor: colors.border }]}>
        <Text
          style={[
            styles.counterText,
            {
              color:
                tasks.length >= 10
                  ? colors.error
                  : tasks.length >= 7
                    ? (colors.warning ?? '#f59e0b')
                    : colors.textSecondary,
            },
          ]}
        >
          {tasks.length >= 10
            ? '🔴 Limite atingido'
            : `${tasks.length}/10 tarefas · restam ${10 - tasks.length}`}
        </Text>
      </View>

      <FlatList
        data={[...pendingTasks, ...completedTasks]} // Pendentes primeiro
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text
            style={{
              textAlign: 'center',
              color: colors.textSecondary,
              marginTop: 20,
            }}
          >
            Nenhuma tarefa adicionada.
          </Text>
        }
      />

      <TouchableOpacity
        style={[styles.extendedFab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Plus color="#fff" size={24} />
        <Text style={styles.fabText}>Nova Tarefa</Text>
      </TouchableOpacity>

      {/* Modal Add */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundCard },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingId ? 'Editar Tarefa' : 'Nova Tarefa'}
            </Text>

            <TextInput
              label="O que precisa ser feito?"
              value={title}
              onChangeText={setTitle}
            />

            <TouchableOpacity
              style={[styles.dateButton, { borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: colors.text }}>
                Prazo: {deadline.toLocaleDateString()}
              </Text>
              <Calendar size={20} color={colors.primary} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={deadline}
                mode="date"
                onChange={(e, date) => {
                  setShowDatePicker(false);
                  if (date) setDeadline(date);
                }}
              />
            )}

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="cancel"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Salvar"
                onPress={handleSave}
                loading={loading}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  itemTitle: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  extendedFab: {
    position: 'absolute',
    right: 20,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { padding: 20, borderRadius: 12 },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 12,
    alignItems: 'center',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  counterBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  counterText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'right',
    paddingEnd: 8,
  },
});
