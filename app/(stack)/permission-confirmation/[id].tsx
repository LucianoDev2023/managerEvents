import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { MapPin, Pencil, Trash2 } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { getAuth } from 'firebase/auth';

export default function PermissionConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateEvent } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [modalVisible, setModalVisible] = useState(false);
  const [permissionEmail, setPermissionEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<
    'Super Admin' | 'Admin parcial'
  >('Admin parcial');

  const event = state.events.find((e) => e.id === id);

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Evento não encontrado.</Text>
      </View>
    );
  }

  const handleEdit = (
    email: string,
    level: 'Super Admin' | 'Admin parcial'
  ) => {
    setPermissionEmail(email);
    setPermissionLevel(level);
    setModalVisible(true);
  };

  const handleRemove = (email: string) => {
    Alert.alert(
      'Remover permissão',
      `Deseja remover a permissão de ${email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            const updatedEvent = {
              ...event,
              subAdmins:
                event.subAdmins?.filter((admin) => admin.email !== email) || [],
            };
            updateEvent(updatedEvent);
          },
        },
      ]
    );
  };

  const handleSavePermission = () => {
    if (isPartialAdmin && permissionLevel === 'Super Admin') {
      Alert.alert('Erro', 'Admins parciais não podem atribuir Super Admin.');
      return;
    }

    if (!permissionEmail) return;

    const existing = event.subAdmins?.find(
      (admin) => admin.email === permissionEmail
    );

    const updatedSubAdmins = existing
      ? (event.subAdmins ?? []).map((admin) =>
          admin.email === permissionEmail
            ? { ...admin, level: permissionLevel }
            : admin
        )
      : [
          ...(event.subAdmins ?? []),
          { email: permissionEmail, level: permissionLevel },
        ];

    const updatedEvent = {
      ...event,
      subAdmins: updatedSubAdmins,
    };

    updateEvent(updatedEvent);
    setModalVisible(false);
  };

  const userEmail = getAuth().currentUser?.email ?? '';
  const isCreator = userEmail === event.createdBy;
  const isSuperAdmin = event.subAdmins?.some(
    (admin) => admin.email === userEmail && admin.level === 'Super Admin'
  );
  const isPartialAdmin = event.subAdmins?.some(
    (admin) => admin.email === userEmail && admin.level === 'Admin parcial'
  );

  // Pode abrir o botão de adicionar permissões
  const canGrantPermission = isCreator || isSuperAdmin || isPartialAdmin;

  const gradientColors =
    colorScheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.gradient}
      locations={[0, 0.7, 1]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => {}}
          style={[styles.card, { backgroundColor: colors.background }]}
        >
          {event.coverImage && (
            <Image source={{ uri: event.coverImage }} style={styles.image} />
          )}
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]}>
              {event.title}
            </Text>
            <Text style={[styles.location, { color: colors.textSecondary }]}>
              <MapPin size={12} color={colors.textSecondary} /> {event.location}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Excluir evento?',
                'Função de exclusão não implementada.'
              )
            }
            style={styles.deleteBtn}
          ></Pressable>
        </Pressable>

        {/* Card das Permissões */}
        <View style={{ paddingHorizontal: 12, marginTop: 10 }}>
          {canGrantPermission && (
            <Button
              title="Add Permissão"
              onPress={() => {
                setPermissionEmail('');
                setPermissionLevel('Admin parcial');
                setModalVisible(true);
              }}
              style={{
                backgroundColor: colors.primary2,
                alignSelf: 'flex-end',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 10,
              }}
              textStyle={{ color: '#fff' }}
            />
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Permissões Atribuídas
        </Text>
        <View
          style={[
            styles.permissionsCard,
            {
              backgroundColor: colors.backGroundSecondary,
              paddingVertical: 12,
              paddingHorizontal: 16,
              // borderRadius: 16,
              // borderWidth: 1,
              // borderColor: colors.border,
              gap: 8,
            },
          ]}
        >
          {(event.subAdmins ?? []).length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  fontStyle: 'italic',
                },
              ]}
            >
              Nenhuma permissão cadastrada.
            </Text>
          ) : (
            event.subAdmins?.map((item) => (
              <View
                key={item.email}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text,
                      marginBottom: 2,
                    }}
                  >
                    {item.email}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontStyle: 'italic',
                      color: colors.textSecondary,
                    }}
                  >
                    Permissão: {item.level}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item.email, item.level)}
                    style={{ padding: 6 }}
                  >
                    <Pencil size={20} color={colors.primary} />
                  </TouchableOpacity>
                  {(isCreator || isSuperAdmin) && (
                    <TouchableOpacity
                      onPress={() => handleRemove(item.email)}
                      style={{ padding: 6 }}
                    >
                      <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.animatedContainer}
          >
            <LinearGradient
              colors={gradientColors}
              locations={[0, 0.7, 1]}
              style={[styles.modalContent, { borderColor: colors.primary2 }]}
            >
              <Text style={[styles.modalTitle, { color: colors.primary }]}>
                🔐 Permissões
              </Text>

              <Text style={[styles.modalText, { color: colors.text }]}>
                <Text style={[styles.roleHighlight, { color: colors.primary }]}>
                  Super admin:
                </Text>{' '}
                Controle total sobre todos os recursos. Pode criar, editar,
                gerenciar permissões de todos os outros usuários. Não pode
                excluir o evento principal. Permissão exclusiva do criador.
              </Text>

              <Text style={[styles.modalText, { color: colors.text }]}>
                <Text style={[styles.roleHighlight, { color: colors.primary }]}>
                  Admin parcial:
                </Text>{' '}
                Possui algumas restrições, mas pode adicionar programas,
                atividades e fotos. Não poderá deltar programas, atividade ou
                fotos do evento.
              </Text>

              <Text style={[styles.modalSubtitle, { color: colors.text }]}>
                👥 Adicionar Permissão
              </Text>

              <TextInput
                placeholder="Digite o Email"
                value={permissionEmail}
                onChangeText={setPermissionEmail}
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backGroundSecondary,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                editable={
                  !event.subAdmins?.some(
                    (admin) => admin.email === permissionEmail
                  )
                }
              />

              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Tipo de permissão
              </Text>

              <View style={styles.toggleRow}>
                {(['Super Admin', 'Admin parcial'] as const)
                  .filter((level) =>
                    isPartialAdmin
                      ? level === 'Admin parcial' || level === permissionLevel
                      : true
                  )
                  .map((level) => (
                    <Pressable
                      key={level}
                      onPress={() => setPermissionLevel(level)}
                      style={[
                        styles.toggleBtn,
                        {
                          backgroundColor:
                            permissionLevel === level
                              ? '#471C7A'
                              : 'transparent',
                          borderColor:
                            permissionLevel === level
                              ? '#471C7A'
                              : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            permissionLevel === level ? '#fff' : colors.text,
                          fontWeight: '600',
                        }}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  ))}
              </View>

              <View style={styles.buttonRow}>
                <Button
                  title="Cancelar"
                  variant="cancel"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                  textStyle={{ color: 'white' }}
                />
                <Button
                  title="Salvar"
                  onPress={handleSavePermission}
                  style={{ backgroundColor: colors.primary, flex: 1 }}
                  textStyle={{ color: '#fff' }}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 16 },
  eventCard: {
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderBottomColor: '#333',
    borderTopColor: '#333',
  },
  eventTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  eventSubtitle: { fontSize: 14 },
  subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    padding: 10,
    borderColor: '#444',
  },
  email: { fontSize: 16, fontWeight: '600' },
  level: { fontSize: 13, fontStyle: 'italic', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 16, alignItems: 'center' },

  toggleContainer: { flexDirection: 'row', gap: 10 },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    padding: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionsCard: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
    marginLeft: 4,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
  },
  location: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  deleteBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  animatedContainer: {
    width: '100%',
    maxWidth: 420,
  },

  modalContent: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },

  modalText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },

  roleHighlight: {
    fontWeight: 'bold',
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },

  modalLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },

  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
