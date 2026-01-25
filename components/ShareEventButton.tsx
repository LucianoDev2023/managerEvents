import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Modal,
  useColorScheme,
  Alert,
} from 'react-native';
import { SendHorizontalIcon } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

type ShareEventButtonProps = {
  shareKey: string; // ✅ único identificador de convite
  onEnsureInvite?: () => Promise<string>;
  onShowQRCode: (payload: string) => void;
  // opcional: facilita trocar o domínio sem mexer no componente
  baseUrl?: string; // default: https://planejeja.com.br/app.html
};

const ShareEventButton: React.FC<ShareEventButtonProps> = ({
  shareKey,
  onEnsureInvite,
  onShowQRCode,
  baseUrl = 'https://planejeja.com.br/app.html',
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const normalizedKey = shareKey?.trim() ?? '';

  const getKey = async () => {
    if (normalizedKey) return normalizedKey;
    if (!onEnsureInvite) {
      throw new Error('no-invite-generator');
    }
    return await onEnsureInvite();
  };

  const handleShare = async () => {
    try {
      const key = await getKey();
      const url = `${baseUrl}?k=${encodeURIComponent(key)}`;
      await Share.share({
        message: `🎉 Você está convidado! Abra no app Plannix: ${url}`,
        url,
      });
    } catch {
      Alert.alert('Erro', 'Erro ao gerar ou compartilhar o link.');
    }
  };

  const handleQRCode = async () => {
    try {
      const key = await getKey();
      onShowQRCode(JSON.stringify({ shareKey: key, v: 1 }));
    } catch {
      Alert.alert('Erro', 'Erro ao gerar QR Code.');
    }
  };

  const gradientColors: [string, string, string] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const disabled = normalizedKey.length === 0;

  return (
    <View style={styles.container}>
      <Pressable
        disabled={disabled}
        onPress={() => setShowOptions(true)}
        style={({ pressed }) => [
          styles.shareBtn,
          { backgroundColor: disabled ? '#5f6b5f' : '#09960C' },
          pressed && !disabled && { opacity: 0.8 },
          disabled && { opacity: 0.7 },
        ]}
      >
        <SendHorizontalIcon size={16} color="#fff" />
        <Text style={styles.shareText}> Compartilhar</Text>
      </Pressable>

      <Modal visible={showOptions} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={gradientColors}
            style={[styles.modalBox, { borderColor: colors.primary }]}
            locations={[0, 0.7, 1]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Compartilhar seu evento
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.text2 }]}>
              Escolha a forma:
            </Text>

            <Pressable
              style={[
                styles.optionBtn,
                { backgroundColor: colors.backgroundC },
              ]}
              onPress={() => {
                setShowOptions(false);
                handleShare();
              }}
            >
              <View style={styles.optionContent}>
                <Text style={[styles.optionIcon, { color: colors.text }]}>
                  🔗
                </Text>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Compartilhar link
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.optionBtn,
                { backgroundColor: colors.backgroundC },
              ]}
              onPress={() => {
                setShowOptions(false);
                handleQRCode();
              }}
            >
              <View style={styles.optionContent}>
                <Text style={[styles.optionIcon, { color: colors.text }]}>
                  📷
                </Text>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Enviar QR Code
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.optionBtn,
                { backgroundColor: colors.backgroundComents },
              ]}
              onPress={() => setShowOptions(false)}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>
                Cancelar
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
};

export default ShareEventButton;

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  shareText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  optionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  optionContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionIcon: { fontSize: 18 },
  optionText: { fontWeight: '600', fontSize: 15 },
});
