import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { EventAdminCard } from '@/components/admin/EventAdminCard';
import Button from '@/components/ui/Button';

import { getAuth } from 'firebase/auth';
import { useMemo } from 'react';

export default function AdminEventsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { state, fetchEvents } = useEvents();

  const { events, loading } = state;
  const auth = getAuth();
  const userUid = auth.currentUser?.uid;

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRefresh = () => {
    fetchEvents();
  };

  // ✅ Filtra apenas eventos onde é Criador ou Super Admin
  const managementEvents = useMemo(() => {
    if (!userUid) return [];
    return events.filter((event) => {
      const isCreator = event.userId === userUid;
      const myRole = event.subAdminsByUid?.[userUid];
      const isSuperAdmin = myRole === 'Super Admin';
      
      return isCreator || isSuperAdmin;
    });
  }, [events, userUid]);

  const handleEventPress = (eventId: string) => {
    router.push({
      pathname: '/(stack)/events/[id]/dashboard',
      params: { id: eventId },
    } as unknown as Href);
  };

  return (
    <LinearGradient
      colors={colors.gradients}
      locations={[0, 0.7, 1]}
      style={styles.gradient2}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />

      <View
        style={[
          styles.container,
          {
            paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 40) + 8 : 44,
          },
        ]}
      >
        <View style={{ marginBottom: 20, marginTop: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18, paddingHorizontal: 4 }}>
            Crie, edite e acompanhe o progresso de todos os eventos que você organiza:
          </Text>
          <View style={[styles.header, { marginTop: 12 }]}>
              <Text style={[styles.titleHeader, { color: colors.text }]}>
              Gestão de Eventos
              </Text>
              <Button 
                  title="Criar novo" 
                  size="small" 
                  onPress={() => router.push('/(stack)/events/new' as Href)}
              />
          </View>
        </View>

        {loading && managementEvents.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={managementEvents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                Você não possui eventos para gerenciar.
              </Text>
            }
            renderItem={({ item }) => (
              <EventAdminCard
                event={item}
                onPress={() => handleEventPress(item.id)}
              />
            )}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient2: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  titleHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
});
