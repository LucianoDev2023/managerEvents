// app/select-location.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants'; // Apenas para Expo Managed Workflow
import Colors from '@/constants/Colors'; // Assumindo que você tem Colors definido
import 'react-native-get-random-values';

// Obtenha sua chave de API do Google Places do Constants.expoConfig
const GOOGLE_PLACES_API_KEY = 'AIzaSyD_UKirzoq-kOOBaxo63sct1QbH-46zvTs';

export default function SelectLocationScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null); // Ref para controlar o MapView
  const colorScheme = 'light'; // Ou use useColorScheme() ?? 'dark'; se relevante
  const colors = Colors[colorScheme];
  const { id } = useLocalSearchParams();

  // Estado para a localização selecionada, pode ser por toque no mapa ou pelo autocomplete
  const [selected, setSelected] = useState<{
    latitude: number;
    longitude: number;
    name?: string; // Nome opcional do local, útil para exibir
  } | null>(null);

  // Estado para a região inicial do mapa (pode ser a localização atual do usuário ou uma padrão)
  const [mapRegion, setMapRegion] = useState({
    latitude: -23.55052, // São Paulo, Brasil (Latitude padrão)
    longitude: -46.633308, // São Paulo, Brasil (Longitude padrão)
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // useEffect para verificar a chave da API
  useEffect(() => {
    if (!GOOGLE_PLACES_API_KEY) {
      Alert.alert(
        'Erro de Configuração',
        'A chave de API do Google Places não está configurada no app.json ou nos arquivos nativos. Verifique a documentação.'
      );
    }
  }, []);

  // Lidar com o toque no mapa
  const handleMapPress = (e: MapPressEvent) => {
    setSelected({
      latitude: e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
      name: 'Local no Mapa', // Nome genérico para um toque manual
    });
    // Opcional: Animar o mapa para o ponto selecionado
    mapRef.current?.animateToRegion(
      {
        ...e.nativeEvent.coordinate,
        latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta,
      },
      500
    );
  };

  // Lidar com a seleção de um local no autocomplete
  const handlePlaceSelect = (data: any, details: any | null = null) => {
    if (details) {
      const { lat, lng } = details.geometry.location;
      setSelected({
        latitude: lat,
        longitude: lng,
        name: data.description, // Nome completo do local
      });
      // Animar o mapa para a localização selecionada
      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005, // Zoom maior para o local específico
          longitudeDelta: 0.005,
        },
        500
      );
    }
  };

  // Lidar com a confirmação da localização
  const handleConfirmLocation = () => {
    if (!selected) {
      Alert.alert('Selecione um ponto no mapa ou pesquise um local.');
      return;
    }
    // Volta para a tela anterior e define os parâmetros
    router.back();
    router.push({
      pathname: '/(stack)/events/[id]/edit_event', // ou o caminho correto da tela
      params: {
        id: id?.toString(),
        lat: selected.latitude.toString(),
        lng: selected.longitude.toString(),
        locationName: selected.name ?? '',
      },
    });
  };

  if (!GOOGLE_PLACES_API_KEY) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Chave de API do Google Places não configurada.
        </Text>
        <Text style={styles.errorDetails}>
          Verifique seu app.json ou arquivos nativos.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GooglePlacesAutocomplete
        placeholder="Pesquisar localização..."
        onPress={handlePlaceSelect}
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: 'pt-BR',
          components: 'country:br', // Opcional: restringir a um país
        }}
        fetchDetails={true} // Importante para obter latitude e longitude
        styles={{
          container: {
            position: 'absolute',
            width: '90%', // Ajuste para ficar dentro do padding
            zIndex: 1, // Garante que o autocomplete fique sobre o mapa
            alignSelf: 'center', // Centraliza o container
            marginTop:
              Platform.OS === 'android'
                ? (RNStatusBar.currentHeight ?? 0) + 10
                : 50,
          },
          textInputContainer: {
            width: '100%',
            backgroundColor: colors.background, // Fundo do campo de texto
            padding: 10,
            borderRadius: 20,
            marginTop: 10,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 3,
            paddingVertical: 0, // Remover padding extra
          },
          textInput: {
            height: 50,
            color: colors.text,

            fontSize: 16,
            paddingHorizontal: 15,
            backgroundColor: colors.background, // Fundo do texto input
          },
          listView: {
            backgroundColor: colors.background,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          },
          description: {
            color: colors.text,
            fontWeight: 'bold',
          },
          predefinedPlacesDescription: {
            color: colors.primary, // Cor para locais predefinidos
          },
          row: {
            padding: 13,
            height: 44,
            flexDirection: 'row',
          },
          separator: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.border,
          },
        }}
        debounce={300} // Atraso para evitar muitas requisições
        enablePoweredByContainer={false} // Opcional: remove o "Powered by Google"
      />

      <MapView
        ref={mapRef} // Atribui a ref ao MapView
        style={styles.map}
        onPress={handleMapPress}
        initialRegion={mapRegion}
        showsUserLocation={true} // Mostra a localização do usuário no mapa
      >
        {selected && (
          <Marker
            coordinate={selected}
            title={selected.name || 'Local Selecionado'}
          />
        )}
      </MapView>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleConfirmLocation}
      >
        <Text style={[styles.buttonText, { color: colors.text2 }]}>
          Confirmar Localização
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
  },
  map: {
    flex: 1,
  },
  button: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 25,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
