import React, { useState, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export default function QRScannerScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ANIMAÇÕES
  const pulse = useSharedValue(1);
  const scannerY = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    scannerY.value = withRepeat(
      withTiming(210, {
        duration: 2000,
        easing: Easing.inOut(Easing.linear),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const scannerLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scannerY.value }],
  }));

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    const qrData = JSON.parse(scanningResult.data);
    if (scanned) return;

    setScanned(true);
    try {
      router.push({
        pathname: '/(newevents)/search',
        params: {
          accessCode: qrData.accessCode,
          title: qrData.eventTitle,
        },
      });
    } catch (error) {
      Alert.alert('Erro', 'QR Code inválido');
    } finally {
      scanTimeoutRef.current = setTimeout(() => {
        setScanned(false);
      }, 1000);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
      return () => {
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
      };
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
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        <View style={styles.header}>
          <Button
            title="Voltar"
            onPress={() => router.back()}
            icon={<ArrowLeft size={18} color="white" />}
            style={styles.backButton}
            size="small"
          />
        </View>

        <View style={styles.overlay}>
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          >
            <Animated.View style={[styles.lFrameContainer, animatedStyle]}>
              {/* Cantos L */}
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopLeftVertical} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerTopRightVertical} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomLeftVertical} />
              <View style={styles.cornerBottomRight} />
              <View style={styles.cornerBottomRightVertical} />

              {/* Linha do scanner */}
              <Animated.View style={[styles.scannerLine, scannerLineStyle]} />
            </Animated.View>

            <Text style={styles.scanText}>
              Posicione o QR Code do evento no quadro
            </Text>
          </LinearGradient>
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
  },
  gradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  lFrameContainer: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scannerLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#b18aff',
    shadowColor: '#b18aff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 4,
    backgroundColor: '#b18aff',
    borderTopLeftRadius: 4,
    shadowColor: '#b18aff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cornerTopLeftVertical: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: 30,
    backgroundColor: '#b18aff',
    borderTopLeftRadius: 4,
    shadowColor: '#b18aff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 4,
    backgroundColor: '#b18aff',
    borderTopRightRadius: 4,
    shadowColor: '#b18aff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cornerTopRightVertical: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: 30,
    backgroundColor: '#b18aff',
    borderTopRightRadius: 4,
    shadowColor: '#b18aff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 4,
    backgroundColor: '#b18aff',
    borderBottomLeftRadius: 4,
    shadowColor: '#b18aff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cornerBottomLeftVertical: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 4,
    height: 30,
    backgroundColor: '#b18aff',
    borderBottomLeftRadius: 4,
    shadowColor: '#b18aff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 4,
    backgroundColor: '#b18aff',
    borderBottomRightRadius: 4,
    shadowColor: '#b18aff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  cornerBottomRightVertical: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 4,
    height: 30,
    backgroundColor: '#b18aff',
    borderBottomRightRadius: 4,
    shadowColor: '#b18aff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  scanText: {
    color: '#ffffff',
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
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
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
