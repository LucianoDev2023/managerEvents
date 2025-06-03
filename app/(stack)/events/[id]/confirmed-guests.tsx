import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';

export default function ConfirmedGuestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useEvents();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const event = state.events.find((event) => event.id === id);
  const confirmedGuests = event?.confirmedGuests ?? [];

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.text }]}>
          Evento não encontrado.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {confirmedGuests.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Nenhum convidado confirmou presença ainda.
        </Text>
      ) : (
        <FlatList
          data={confirmedGuests}
          keyExtractor={(item) => item.email}
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
                {item.name}
              </Text>
              <Text
                style={[styles.guestEmail, { color: colors.textSecondary }]}
              >
                {item.email}
              </Text>
              <Text style={[styles.guestMode, { color: colors.textSecondary }]}>
                {item.mode === 'confirmado'
                  ? '✅ Confirmado'
                  : '👀 Acompanhando'}
              </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
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
