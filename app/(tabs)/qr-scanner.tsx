import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Button from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react-native';

export default function QRScannerScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (!scanned) {
      setScanned(true);

      try {
        const qrData = JSON.parse(scanningResult.data);
        console.log('Dados do QR Code:', qrData);

        router.push({
          pathname: '/(tabs)',
          params: {
            accessCode: qrData.accessCode,
            title: qrData.eventTitle,
          },
        });
      } catch (error) {
        console.error('Erro ao processar QR Code:', error);
        Alert.alert('Erro', 'QR Code inválido');
        setScanned(false);
      }
    }
  };
  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
      return () => {
        setScanned(false); // também no unfocus
      };
    }, [])
  );

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.permissionText, { color: colors.text }]}>
          Precisamos da sua permissão para acessar a câmera
        </Text>
        <Button
          title="Conceder Permissão"
          onPress={requestPermission}
          style={styles.permissionButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facing}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.finder} />
          <Text style={styles.scanText}>
            Posicione o QR Code do evento no quadro
          </Text>
        </View>

        <View style={styles.header}>
          <Button
            title="Voltar"
            onPress={() => router.back()}
            icon={<ArrowLeft size={18} color="white" />}
            style={styles.backButton}
            size="small"
          />

          {/* <Button
            title={facing === 'back' ? 'Frontal' : 'Traseira'}
            onPress={() => setFacing('back')}
            style={styles.switchButton}
            size="small"
          /> */}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  finder: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#FFF',
    marginTop: 20,
    fontSize: 14,
    fontWeight: 'bold',
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  permissionButton: {
    width: 200,
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  switchButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
