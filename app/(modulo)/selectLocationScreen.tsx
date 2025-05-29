import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Platform,
  StatusBar as RNStatusBar,
  Image,
} from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';
import { LocateFixed } from 'lucide-react-native';
import 'react-native-get-random-values';

const GOOGLE_PLACES_API_KEY = 'AIzaSyD_UKirzoq-kOOBaxo63sct1QbH-46zvTs';

export default function SelectLocationScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const colorScheme = 'light';
  const colors = Colors[colorScheme];
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

  const [selected, setSelected] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  const [mapRegion, setMapRegion] = useState({
    latitude: -15.793889, // Brasília
    longitude: -47.882778,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    const setupLocation = async () => {
      console.log('enviou do mode do botao', mode);
      if (mode === 'edit' && lat && lng) {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        setSelected({
          latitude,
          longitude,
          name: locationName ?? 'Local do evento',
        });
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;
          const reverse = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          const name = reverse?.[0]?.name || 'Minha localização atual';

          setSelected({ latitude, longitude, name });
          setMapRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          mapRef.current?.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }
    };

    setupLocation();
  }, []);

  const handleMapPress = (e: MapPressEvent) => {
    setSelected({
      latitude: e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
      name: 'Local no Mapa',
    });
    mapRef.current?.animateToRegion(
      {
        ...e.nativeEvent.coordinate,
        latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta,
      },
      500
    );
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
        500
      );
    }
  };

  const handleConfirmLocation = () => {
    if (!selected) {
      Alert.alert('Selecione um ponto no mapa ou pesquise um local.');
      return;
    }
    router.replace({
      pathname: '/(newevents)/event-form',
      params: {
        redirectTo: '(newevents)/event-form',
        id,
        mode,
        lat: selected.latitude.toString(),
        lng: selected.longitude.toString(),
        locationName: selected.name ?? '',
      },
    });
  };

  const handleGoToUserLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão negada',
        'Ative a localização para usar essa funcionalidade.'
      );
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
    const name = reverse?.[0]?.name || 'Minha localização';

    setSelected({ latitude, longitude, name });

    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
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
          components: 'country:br',
        }}
        fetchDetails
        styles={{
          container: {
            position: 'absolute',
            width: '90%',
            zIndex: 1,
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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
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
            color: colors.primary,
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
        debounce={300}
        enablePoweredByContainer={false}
      />

      <MapView
        ref={mapRef}
        style={styles.map}
        onPress={handleMapPress}
        initialRegion={mapRegion}
        showsUserLocation={true}
      >
        {selected && (
          <Marker
            coordinate={selected}
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
        <Text style={[styles.buttonText, { color: colors.text2 }]}>
          Confirmar Localização
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleGoToUserLocation}
      >
        <LocateFixed size={20} color="#fff" />
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
  map: { flex: 1 },
  button: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: '#6e56cf',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectionInfo: {
    position: 'absolute',
    top:
      Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 80 : 100,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectionText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
});
