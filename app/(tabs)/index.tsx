import React, { useEffect, useRef, useState } from 'react';
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
  StatusBar as RNStatusBar,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import EventCard from '@/components/EventCard';
import Button from '@/components/ui/Button';
import Colors from '@/constants/Colors';
import { KeyRound, Plus, SearchCheck } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useColorScheme } from 'react-native';

export default function EventsScreen() {
  const lastQueryRef = useRef('');
  const lastCodeRef = useRef('');
  useFocusEffect(
    React.useCallback(() => {
      if (lastQueryRef.current && lastCodeRef.current) {
        setSearchQuery(lastQueryRef.current);
        setConfirmedAccessCode(lastCodeRef.current);
        setShowResults(true);
      }
    }, [])
  );

  const { state } = useEvents();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const gradientColors =
    scheme === 'dark'
      ? (['#0b0b0f', '#1b0033', '#3e1d73'] as const)
      : (['#ffffff', '#f0f0ff', '#e9e6ff'] as const);

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
      setTimeout(() => setIsSearching(false), 500);
    }
  }, [accessCode, title]);

  const handleManualSearch = () => {
    Keyboard.dismiss();
    if (!inputValue.trim() || !accessCodeInput.trim()) {
      alert('Por favor, preencha o nome do evento e o c\u00f3digo de acesso.');
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
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {' '}
        {searchQuery
          ? 'Nenhum evento encontrado'
          : 'Pesquisar evento existente'}
      </Text>
      <Text style={[styles.emptySubtitle2, { color: colors.textSecondary }]}>
        Insira nome e código de acesso ou utilize um QR Code
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
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={scheme === 'dark' ? 'light' : 'dark'}
      />

      <View
        style={[
          styles.header,
          {
            paddingTop:
              Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
          },
        ]}
      >
        <Image
          source={require('@/assets/images/loginpage.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Gerenciador de eventos
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputRow}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: scheme === 'dark' ? '#1f1f25' : '#e0e0ec' },
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
            style={styles.actionButton}
          />
        </View>

        <View style={styles.inputRow}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: scheme === 'dark' ? '#1f1f25' : '#e0e0ec' },
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
            style={styles.actionButton}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 110,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 70,
    height: 70,
    position: 'absolute',
    left: 20,
    top: 37,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 42,
  },
  searchIcon: {
    marginRight: 10,
    marginLeft: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    height: 42,
  },
  actionButton: {
    marginLeft: 10,
    height: 42,
    paddingHorizontal: 12,
    backgroundColor: '#b18aff',
    borderRadius: 10,
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
    marginBottom: 8,
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
