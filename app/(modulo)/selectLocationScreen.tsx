import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import MapView, {
  Marker,
  MapPressEvent,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

import Colors from '@/constants/Colors';
import 'react-native-get-random-values';

// ✅ env lida fora do componente (mais estável)
const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

export default function SelectLocationScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const colorScheme = 'light';
  const colors = Colors[colorScheme];

  const [selected, setSelected] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  const [mapRegion, setMapRegion] = useState({
    latitude: -15.793889,
    longitude: -47.882778,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // ✅ para mostrar na tela o erro real do Places
  const [placesError, setPlacesError] = useState<string | null>(null);

  const {
    id,
    mode = 'create',
    lat,
    lng,
    locationName,
  } = useLocalSearchParams<{
    id?: string;
    mode?: 'create' | 'edit';
    lat?: string;
    lng?: string;
    locationName?: string;
  }>();

  useEffect(() => {
    if (mode === 'edit' && lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      setSelected({
        latitude,
        longitude,
        name: locationName ?? 'Local do evento',
      });

      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setMapRegion(region);
      mapRef.current?.animateToRegion(region);
    }
  }, [mode, lat, lng, locationName]);

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelected({ latitude, longitude, name: 'Local no Mapa' });
    setMapRegion((prev) => ({ ...prev, latitude, longitude }));
  };

  const handlePlaceSelect = (data: any, details: any | null = null) => {
    if (details) {
      const { lat, lng } = details.geometry.location;
      setSelected({ latitude: lat, longitude: lng, name: data.description });

      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      );
    }
  };

  const handleConfirmLocation = () => {
    if (!selected) {
      Alert.alert('Selecione um ponto no mapa ou pesquise um local.');
      return;
    }
    router.replace({
      pathname: '/(stack)/events/new',
      params: {
        redirectTo: 'events/new',
        id,
        mode,
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
          Chave do Google Places não configurada.
        </Text>
        <Text style={styles.errorDetails}>
          Defina EXPO_PUBLIC_GOOGLE_PLACES_API_KEY no .env e no EAS
          (env/secrets).
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ banner de erro do Places */}
      {placesError ? (
        <View style={styles.placesErrorBanner}>
          <Text style={styles.placesErrorTitle}>Erro no Google Places</Text>
          <Text style={styles.placesErrorMsg}>{placesError}</Text>
        </View>
      ) : null}

      <GooglePlacesAutocomplete
        placeholder="Pesquisar localização..."
        onPress={handlePlaceSelect}
        fetchDetails
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: 'pt-BR',
          location: '-15.793889,-47.882778',
          radius: 2000000,
        }}
        onFail={(error) => {
          // 👇 aqui vem a verdade: REQUEST_DENIED, ApiNotActivatedMapError, etc.
          const msg =
            typeof error === 'string' ? error : JSON.stringify(error, null, 2);
          setPlacesError(msg);
        }}
        onNotFound={() => {
          setPlacesError('Nenhum resultado encontrado.');
        }}
        textInputProps={{
          onFocus: () => setPlacesError(null),
        }}
        styles={{
          container: {
            position: 'absolute',
            width: '90%',
            zIndex: 10,
            alignSelf: 'center',
            marginTop:
              Platform.OS === 'android'
                ? (RNStatusBar.currentHeight ?? 0) + 10
                : 50,
          },
          textInputContainer: {
            width: '100%',
            backgroundColor: colors.background,
            padding: 10,
            borderRadius: 20,
            marginTop: 10,
            borderWidth: 1,
            borderColor: colors.border,
            elevation: 3,
            paddingVertical: 0,
          },
          textInput: {
            height: 50,
            color: colors.text,
            fontSize: 16,
            paddingHorizontal: 15,
            backgroundColor: colors.background,
          },
          listView: {
            backgroundColor: colors.background,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            elevation: 3,
          },
          description: { color: colors.text, fontWeight: 'bold' },
          row: { padding: 13, height: 44, flexDirection: 'row' },
          separator: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.border,
          },
        }}
        debounce={300}
        enablePoweredByContainer={false}
      />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        onPress={handleMapPress}
        region={mapRegion}
      >
        {selected && (
          <Marker
            coordinate={{
              latitude: selected.latitude,
              longitude: selected.longitude,
            }}
            title={selected.name || 'Local Selecionado'}
          />
        )}
      </MapView>

      {selected && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            📍 Local selecionado: {selected.name}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleConfirmLocation}
      >
        <Text style={[styles.buttonText, { color: colors.textMaps }]}>
          Confirmar Localização
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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

  placesErrorBanner: {
    position: 'absolute',
    top:
      Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 70 : 100,
    alignSelf: 'center',
    width: '90%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff3f3',
    borderWidth: 1,
    borderColor: '#ffb3b3',
    zIndex: 20,
  },
  placesErrorTitle: { fontWeight: '800', color: '#b00020', marginBottom: 4 },
  placesErrorMsg: { color: '#333', fontSize: 12 },

  map: { flex: 1 },
  button: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 25,
    elevation: 4,
  },
  buttonText: { fontWeight: 'bold', fontSize: 16 },

  selectionInfo: {
    position: 'absolute',
    top:
      Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 120 : 140,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 3,
  },
  selectionText: { color: '#333', fontSize: 14, fontWeight: '500' },
});
