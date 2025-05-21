import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import EventCard from '@/components/EventCard';
import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';
import { KeyRound, Plus, SearchCheck } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function EventsScreen() {
  const { state } = useEvents();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [inputValue, setInputValue] = useState('');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmedAccessCode, setConfirmedAccessCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { accessCode, title } = useLocalSearchParams<{
    accessCode?: string;
    title?: string;
  }>();

  useEffect(() => {
    if (accessCode && title) {
      setSearchQuery(title);
      setConfirmedAccessCode(accessCode);
      setShowResults(true);
      setIsSearching(true);

      setTimeout(() => {
        setIsSearching(false);
      }, 500);
    }
  }, [accessCode, title]);

  const handleManualSearch = () => {
    Keyboard.dismiss();

    if (!inputValue.trim() || !accessCodeInput.trim()) {
      alert('Por favor, preencha o nome do evento e o código de acesso.');
      return;
    }

    setIsSearching(true);
    setSearchQuery(inputValue.trim());
    setConfirmedAccessCode(accessCodeInput.trim());
    setInputValue('');
    setAccessCodeInput('');

    setTimeout(() => {
      setIsSearching(false);
      setShowResults(true);
    }, 500);
  };

  const filteredEvents =
    searchQuery === '' || confirmedAccessCode === ''
      ? []
      : state.events.filter(
          (event) =>
            event.title.toLowerCase().trim() === searchQuery.toLowerCase() &&
            event.accessCode?.toLowerCase().trim() ===
              confirmedAccessCode.toLowerCase()
        );

  const handleAddEvent = () => router.push('/add');

  const renderEmptyState = () => (
    <View
      style={[styles.emptyContainer, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {searchQuery
          ? 'Nenhum evento encontrado'
          : 'Pesquisar evento existente'}
      </Text>
      <Text style={[styles.emptySubtitle2, { color: colors.textSecondary }]}>
        Insira nome e código de acesso ou utilize um QR Code
      </Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Crie seu próprio evento
      </Text>
      <Button
        title="Criar evento"
        onPress={handleAddEvent}
        style={styles.createButton}
        icon={<Plus size={18} color="white" />}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#6e56cf', '#a26bfa']} style={styles.header}>
        <StatusBar translucent backgroundColor="transparent" style="light" />

        <Image
          source={require('@/assets/images/loginpage.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Gerenciador de eventos
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Inputs */}
        <View style={styles.inputRow}>
          <View
            style={[
              styles.searchInputContainer,
              {
                backgroundColor: colors.backgroundAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <SearchCheck
              size={20}
              color={colors.primary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Nome do evento"
              placeholderTextColor={colors.textSecondary}
              value={inputValue}
              onChangeText={setInputValue}
            />
          </View>

          <Button
            title="Novo"
            icon={<Plus size={16} color="white" />}
            onPress={handleAddEvent}
            size="small"
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          />
        </View>

        <View style={styles.inputRow}>
          <View
            style={[
              styles.searchInputContainer,
              {
                backgroundColor: colors.backgroundAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <KeyRound
              size={20}
              color={colors.primary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Código de acesso"
              placeholderTextColor={colors.textSecondary}
              value={accessCodeInput}
              onChangeText={setAccessCodeInput}
            />
          </View>

          <Button
            title="Buscar"
            icon={<SearchCheck size={16} color="white" />}
            onPress={handleManualSearch}
            size="small"
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          />
        </View>

        {isSearching ? (
          <LoadingOverlay message="Buscando..." />
        ) : showResults ? (
          filteredEvents.length > 0 ? (
            <FlatList
              data={filteredEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <Animated.View
                  entering={FadeInDown.delay(index * 100).springify()}
                >
                  <Pressable
                    onPress={() => router.push(`/events/${item.id}`)}
                    android_ripple={{ color: colors.primary }}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <EventCard event={item} />
                  </Pressable>
                </Animated.View>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            renderEmptyState()
          )
        ) : (
          renderEmptyState()
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 80,
    paddingRight: 30,
    borderBottomRightRadius: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 80,
    height: 80,
    position: 'absolute',
    top: 20,
    right: 10,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 5,
    minHeight: 40,
  },
  searchIcon: {
    marginRight: 10,
    marginLeft: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  actionButton: {
    marginLeft: 10,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginTop: 30,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptySubtitle2: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    width: 220,
  },
});
