import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import EventCard from '@/components/EventCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Button from '@/components/ui/Button';
import { KeyRound, Plus, SearchCheck } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LoadingOverlay from '@/components/LoadingOverlay';

export default function EventsScreen() {
  const { state } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

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

  // Efeito para busca via QR Code
  useEffect(() => {
    if (accessCode && title) {
      // Busca diretamente sem preencher os inputs
      setSearchQuery(title);
      setConfirmedAccessCode(accessCode);
      setShowResults(true);
      setIsSearching(true);

      setTimeout(() => {
        setIsSearching(false);
      }, 500);
    }
  }, [accessCode, title]);

  // Busca manual pelos inputs
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

  const handleAddEvent = () => {
    router.push('/add');
  };

  const renderEmptyState = () => (
    <View
      style={[styles.emptyContainer, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {searchQuery
          ? 'Nenhum evento encontrado'
          : 'Pesquisar evento existente'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Insira nome e código de acesso ou pesquise utilizando um QRcode criado
        para o evento
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
      <View style={{ paddingHorizontal: 16, paddingTop: 3, paddingBottom: 3 }}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomWidth: 1,
              borderBottomColor: colorScheme === 'dark' ? '#333' : '#ccc',
            },
          ]}
        >
          {/* Nome do evento */}
          <View style={styles.inputRow}>
            <View
              style={[
                styles.searchInputContainer,
                {
                  backgroundColor: colors.backgroundAlt,
                  borderColor: colors.border,
                  flex: 1,
                },
              ]}
            >
              <TouchableOpacity>
                <SearchCheck
                  size={20}
                  color={colors.primary}
                  style={styles.searchIcon}
                />
              </TouchableOpacity>
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

          {/* Código de acesso */}
          <View style={styles.inputRow}>
            <View
              style={[
                styles.searchInputContainer,
                {
                  backgroundColor: colors.backgroundAlt,
                  borderColor: colors.border,
                  flex: 1,
                },
              ]}
            >
              <TouchableOpacity>
                <KeyRound
                  size={20}
                  color={colors.primary}
                  style={styles.searchIcon}
                />
              </TouchableOpacity>
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
        </View>
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
                <View
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}
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
                </View>
              </Animated.View>
            )}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 40,
              paddingTop: 10,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        ) : (
          renderEmptyState()
        )
      ) : (
        renderEmptyState()
      )}
    </View>
  );
}

// Mantenha os mesmos estilos
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 10,
    paddingHorizontal: 5,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 4,
    marginBottom: 8,
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
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    minHeight: 40,
  },
  actionButton: {
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginLeft: 10,
    width: 100,
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
  createButton: {
    width: 200,
  },
});
