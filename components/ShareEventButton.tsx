import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Share,
  Alert,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SendHorizontalIcon } from 'lucide-react-native';

type ShareEventButtonProps = {
  title: string;
  accessCode: string;
  showCopyLink?: boolean;
};

const ShareEventButton: React.FC<ShareEventButtonProps> = ({
  title,
  accessCode,
  showCopyLink = true,
}) => {
  const encodedTitle = encodeURIComponent(title);
  const encodedCode = encodeURIComponent(accessCode);

  const link = `https://planejeja.com.br/app.html?title=${encodedTitle}&code=${encodedCode}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎉 Você está convidado! Acesse os detalhes do evento no app Plannix: ${link}`,
        url: link,
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar o link.');
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(link);
    Alert.alert(
      'Link copiado!',
      'Agora você pode colar no WhatsApp ou navegador.'
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleShare}
        style={({ pressed }) => [
          styles.shareBtn,
          pressed && { opacity: 0.7 }, // exemplo de feedback visual
        ]}
      >
        <SendHorizontalIcon size={16} color="#fff" />
        <Text style={styles.shareText}> Compartilhar</Text>
      </Pressable>

      {/* 
      {showCopyLink && (
        <Pressable style={styles.copyBtn} onPress={handleCopyLink}>
          <Text style={styles.copyText}>Copiar link</Text>
        </Pressable>
      )} */}
    </View>
  );
};

export default ShareEventButton;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  shareBtn: {
    flexDirection: 'row',
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  shareText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 13,
  },

  copyBtn: {
    marginTop: 4,
  },
  copyText: {
    color: Platform.OS === 'ios' ? '#007aff' : '#2196f3',
    fontSize: 14,
  },
});
