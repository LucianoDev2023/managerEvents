import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  Pressable,
  Clipboard,
  Alert,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';
import { StatusBar } from 'expo-status-bar';

export default function DonateScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [showModal, setShowModal] = useState(false);

  const gradientColors: [string, string, string] =
    scheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const cpfPix = 'lucianoeconcursos@gmail.com'; // Altere para seu CPF real

  const handleCopy = () => {
    Clipboard.setString(cpfPix);
    Alert.alert('Copiado!', 'Chave PIX copiada para a área de transferência.');
  };

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
      locations={[0, 0.7, 1]}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} translucent />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>
          Apoie o Plannix
        </Text>
        <Text style={[styles.description, { color: colors.text }]}>
          Este aplicativo foi criado para facilitar o planejamento de eventos.
          Se você gostou da experiência e deseja apoiar esse projeto
          independente, considere fazer uma doação simbólica.
        </Text>

        <Button
          title="Fazer uma doação"
          onPress={() => setShowModal(true)}
          style={styles.donateButton}
          textStyle={{ fontWeight: 'bold', fontSize: 16 }}
        />

        <Text style={[styles.thankYou, { color: colors.textSecondary }]}>
          Qualquer valor é muito bem-vindo. Obrigado pelo apoio! 🙏
        </Text>
      </ScrollView>

      {/* Modal de Doação com CPF PIX */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={gradientColors}
            style={styles.modalContent}
            locations={[0, 0.7, 1]}
          >
            <Text style={[styles.modalTitle, { color: colors.primary }]}>
              Faça uma doação via PIX
            </Text>

            <Text selectable style={[styles.modalCpf, { color: colors.text }]}>
              {cpfPix}
            </Text>

            <Button
              title="Copiar"
              onPress={handleCopy}
              style={styles.copyButton}
              textStyle={{ color: '#fff' }}
            />

            <Pressable onPress={() => setShowModal(false)}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>
                Fechar
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
  content: {
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  donateButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  thankYou: {
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalCpf: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  copyButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 16,
  },
  closeText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
