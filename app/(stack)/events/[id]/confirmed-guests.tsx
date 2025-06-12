import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { getAuth } from 'firebase/auth';
import { getGuestParticipationsByEventId } from '@/hooks/guestService';
import { useFocusEffect } from '@react-navigation/native';
import { useEvents } from '@/context/EventsContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

type GuestParticipation = {
  id: string;
  userEmail: string;
  userName?: string;
  mode: 'confirmado' | 'acompanhando';
  family?: string[];
};

export default function ConfirmedGuestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useEvents();

  const [guests, setGuests] = useState<GuestParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'confirmado' | 'acompanhando'>(
    'confirmado'
  );

  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const user = getAuth().currentUser;
  const userEmail = user?.email ?? '';
  const event = state.events.find((e) => e.id === id);

  const isCreator = event?.createdBy === userEmail;
  const isSuperAdmin = event?.subAdmins?.some(
    (admin) =>
      admin.email?.toLowerCase() === userEmail?.toLowerCase() &&
      admin.level === 'Super Admin'
  );
  const hasPermission = isCreator || isSuperAdmin;

  const confirmedTotal = useMemo(() => {
    return guests.reduce((total, guest) => {
      if (guest.mode === 'confirmado') {
        const familyCount = guest.family?.length ?? 0;
        return total + 1 + familyCount;
      }
      return total;
    }, 0);
  }, [guests]);

  const accompanyingTotal = useMemo(() => {
    return guests.reduce((total, guest) => {
      if (guest.mode === 'acompanhando') {
        const familyCount = guest.family?.length ?? 0;
        return total + 1 + familyCount;
      }
      return total;
    }, 0);
  }, [guests]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const fetchData = async () => {
        if (!id || !isActive) return;
        setLoading(true);
        try {
          const participations = await getGuestParticipationsByEventId(id);
          setGuests(participations);
        } catch (error) {
          Alert.alert('Erro', 'Falha ao buscar convidados');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
      return () => {
        isActive = false;
      };
    }, [id])
  );

  const filteredGuests = useMemo(() => {
    return hasPermission
      ? guests.filter((g) => g.mode === activeTab)
      : guests.filter(
          (g) => g.userEmail?.toLowerCase() === userEmail?.toLowerCase()
        );
  }, [guests, hasPermission, activeTab, userEmail]);

  const updateParticipationMode = async (
    guestId: string,
    newMode: 'confirmado' | 'acompanhando'
  ) => {
    try {
      const ref = doc(db, 'guestParticipations', guestId);
      await updateDoc(ref, { mode: newMode });
      Alert.alert('Sucesso', 'Sua participação foi atualizada!');
      const participations = await getGuestParticipationsByEventId(id);
      setGuests(participations);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível atualizar sua participação.');
    }
  };

  const removeParticipation = async (guestId: string) => {
    try {
      const ref = doc(db, 'guestParticipations', guestId);
      await deleteDoc(ref);
      Alert.alert('Convidado removido com sucesso');
      const participations = await getGuestParticipationsByEventId(id);
      setGuests(participations);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível remover o convidado.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <Pressable
          onPress={() => setActiveTab('confirmado')}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderBottomWidth: 2,
            borderColor:
              activeTab === 'confirmado' ? colors.primary : 'transparent',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color:
                activeTab === 'confirmado'
                  ? colors.primary
                  : colors.textSecondary,
              fontWeight: activeTab === 'confirmado' ? 'bold' : 'normal',
            }}
          >
            ✅ Convidados {hasPermission && `(${confirmedTotal})`}
          </Text>
        </Pressable>

        {hasPermission && (
          <Pressable
            onPress={() => setActiveTab('acompanhando')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderColor:
                activeTab === 'acompanhando' ? colors.primary : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color:
                  activeTab === 'acompanhando'
                    ? colors.primary
                    : colors.textSecondary,
                fontWeight: activeTab === 'acompanhando' ? 'bold' : 'normal',
              }}
            >
              👀 Interessados {hasPermission && `(${accompanyingTotal})`}
            </Text>
          </Pressable>
        )}

        {hasPermission && (
          <Pressable
            onPress={() => router.push(`/(stack)/events/${id}/add-guest`)}
            style={{
              alignSelf: 'flex-end',
              backgroundColor: colors.primary,
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            <Text>➕</Text>
          </Pressable>
        )}
      </View>

      {filteredGuests.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Nenhum convidado nesta categoria.
        </Text>
      ) : (
        <FlatList
          data={filteredGuests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.guestItem,
                {
                  backgroundColor: colors.backGroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.guestName, { color: colors.text }]}>
                {item.userName || item.userEmail}
              </Text>

              {item.family?.length &&
              (hasPermission || item.userEmail === userEmail) ? (
                <>
                  <Text
                    style={[styles.guestEmail, { color: colors.textSecondary }]}
                  >
                    Acompanhantes:
                  </Text>
                  <Text
                    style={[styles.guestEmail, { color: colors.textSecondary }]}
                  >
                    {'🤝    '}
                    {'' + item.family.join('\n🤝    ')}
                  </Text>
                  <Text
                    style={[
                      styles.guestEmail,
                      { color: colors.textSecondary, marginTop: 4 },
                    ]}
                  >
                    Total (com {item.userName || 'convidado'}):{' '}
                    {1 + (item.family?.length ?? 0)}
                  </Text>
                </>
              ) : (
                <Text
                  style={[styles.guestEmail, { color: colors.textSecondary }]}
                >
                  Sem acompanhantes
                </Text>
              )}

              {(hasPermission ||
                userEmail?.toLowerCase() === item.userEmail?.toLowerCase()) && (
                <Pressable
                  onPress={() => {
                    if (!item.userEmail) {
                      Alert.alert('Erro', 'Email do convidado ausente.');
                      return;
                    }

                    const isOwn =
                      userEmail?.toLowerCase() ===
                      item.userEmail?.toLowerCase();

                    router.push(
                      userEmail?.toLowerCase() === item.userEmail?.toLowerCase()
                        ? `/(stack)/events/${id}/edit-my-participation`
                        : `/(stack)/events/${id}/edit-participation/${item.userEmail}`
                    );
                  }}
                  style={{
                    marginTop: 8,
                    alignSelf: 'flex-start',
                    borderWidth: 1,
                    borderColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: colors.text2, fontWeight: '600' }}>
                    ✏️ Editar acompanhantes
                  </Text>
                </Pressable>
              )}

              {(hasPermission ||
                userEmail?.toLowerCase() === item.userEmail?.toLowerCase()) && (
                <>
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        item.mode === 'confirmado'
                          ? 'Mudar para Interessado?'
                          : 'Confirmar presença?',
                        item.mode === 'confirmado'
                          ? 'Você deixará de estar confirmado. Deseja continuar?'
                          : 'Você será marcado como confirmado no evento.',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Sim',
                            onPress: () =>
                              updateParticipationMode(
                                item.id,
                                item.mode === 'confirmado'
                                  ? 'acompanhando'
                                  : 'confirmado'
                              ),
                          },
                        ]
                      )
                    }
                    style={{
                      marginTop: 8,
                      alignSelf: 'flex-start',
                      borderWidth: 1,
                      borderColor: colors.primary,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: colors.text2, fontWeight: '600' }}>
                      {item.mode === 'confirmado'
                        ? '👀 Mudar para Interessado'
                        : '✅ Confirmar presença'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        'Remover convidado?',
                        'Tem certeza que deseja remover este convidado do evento?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Remover',
                            style: 'destructive',
                            onPress: () => removeParticipation(item.id),
                          },
                        ]
                      )
                    }
                    style={{
                      marginTop: 8,
                      alignSelf: 'flex-start',
                      borderWidth: 1,
                      borderColor: colors.primary,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: colors.text2, fontWeight: '600' }}>
                      🗑️ Remover
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  guestItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
  },
  guestName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
  },
  guestEmail: {
    marginLeft: 20,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  guestMode: {
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
});
