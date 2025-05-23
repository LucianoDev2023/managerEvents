import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Button from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function QRScannerScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

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
      return () => setScanned(false);
    }, [])
  );

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <LinearGradient
        colors={['#0b0b0f', '#1b0033', '#3e1d73']}
        locations={[0, 0.7, 1]}
        style={styles.container}
      >
        <StatusBar
          style={colorScheme === 'dark' ? 'light' : 'dark'}
          translucent
          backgroundColor="transparent"
        />
        <View
          style={[
            styles.permissionContent,
            {
              paddingTop:
                Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 40 : 0,
            },
          ]}
        >
          <Text style={styles.permissionText}>
            Precisamos da sua permissão para acessar a câmera
          </Text>
          <Button
            title="Conceder Permissão"
            onPress={requestPermission}
            style={styles.permissionButton}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        translucent
        backgroundColor="transparent"
      />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facing}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
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
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Inter-Medium',
  },
  permissionButton: {
    width: 200,
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
    borderColor: '#b18aff',
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#FFF',
    marginTop: 20,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter-Medium',
  },
  header: {
    position: 'absolute',
    top: Platform.select({
      ios: 60,
      android: (RNStatusBar.currentHeight ?? 24) + 16,
    }),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
