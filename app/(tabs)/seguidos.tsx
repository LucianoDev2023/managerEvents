import React from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  StyleSheet,
  Image,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Trash2, MapPin } from 'lucide-react-native';
import { useFollowedEvents } from '@/hooks/useFollowedEvents';
import { getOptimizedUrl } from '@/lib/cloudinary';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function FollowedEventsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { followedEvents, removeFollowedEvent } = useFollowedEvents();

  const gradientColors = colors.gradients;

  const handleDelete = (eventId: string) => {
    Alert.alert('Excluir', 'Deseja deixar de seguir este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sim',
        onPress: () => removeFollowedEvent(eventId),
        style: 'destructive',
      },
    ]);
  };

  const renderItem = ({ item }: any) => (
    <Pressable
      onPress={() => {
        router.push({
          pathname: '/(stack)/events/[id]',
          params: { id: item.id, from: 'seguidos' },
        } as unknown as Href);
      }}
      style={[styles.card, { backgroundColor: colors.backgroundCard }]}
    >
      <Image 
        source={{ uri: getOptimizedUrl(item.coverImage, { width: 400 }) }} 
        style={styles.image} 
      />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.location, { color: colors.textSecondary }]}>
          <MapPin size={12} color={colors.textSecondary} /> {item.location}
        </Text>
      </View>
      <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
        <Trash2 size={20} color={colors.error} />
      </Pressable>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={gradientColors}
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
          Platform.OS === 'android' && {
            paddingTop: RNStatusBar.currentHeight ?? 20,
          },
        ]}
      >
        <Text style={[styles.titleHeader, { color: colors.text }]}>
          Eventos seguidos
        </Text>

        <FlatList
          data={followedEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Nenhum evento seguido.
            </Text>
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    borderRadius: 12,
  },
  gradient2: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    fontFamily: 'Inter_700Bold',
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#222',
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
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
});
