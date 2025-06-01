import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import Button from '@/components/ui/Button';

const { width, height } = Dimensions.get('window');

export default function AddEventWithAutocomplete() {
  const [region, setRegion] = useState({
    latitude: -23.55052,
    longitude: -46.633308,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [marker, setMarker] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<MapView>(null);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Digite o endereço do evento:</Text>

      <GooglePlacesAutocomplete
        placeholder="Buscar endereço"
        fetchDetails
        onPress={(data, details = null) => {
          const location = details?.geometry?.location;
          if (location) {
            const newRegion = {
              latitude: location.lat,
              longitude: location.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            setRegion(newRegion);
            setMarker({ latitude: location.lat, longitude: location.lng });
            mapRef.current?.animateToRegion(newRegion, 1000);
          }
        }}
        query={{
          key: 'AIzaSyD_UKirzoq-kOOBaxo63sct1QbH-46zvTs',
          language: 'pt-BR',
        }}
        styles={{
          container: styles.autocompleteContainer,
          textInput: styles.textInput,
        }}
      />

      <MapView ref={mapRef} style={styles.map} region={region}>
        {marker && <Marker coordinate={marker} />}
      </MapView>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Endereço selecionado:</Text>
        <Text style={styles.coords}>
          {marker ? `${marker.latitude}, ${marker.longitude}` : 'Nenhum'}
        </Text>
        <Button
          title="Confirmar localização"
          onPress={() => {
            // lógica para salvar localização ou continuar fluxo
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  autocompleteContainer: {
    zIndex: 1,
    width: '100%',
    paddingHorizontal: 16,
  },
  textInput: {
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  map: {
    width: width,
    height: height * 0.4,
  },
  infoContainer: {
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  coords: {
    fontSize: 14,
    marginBottom: 16,
  },
});
