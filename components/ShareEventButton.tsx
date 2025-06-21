import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Share,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SendHorizontalIcon, Share2 } from 'lucide-react-native';

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
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <SendHorizontalIcon size={16} color="#fff" />
        <Text style={styles.shareText}>Compartilhar</Text>
      </TouchableOpacity>

      {showCopyLink && (
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink}>
          <Text style={styles.copyText}>Copiar link</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ShareEventButton;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 6,
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
