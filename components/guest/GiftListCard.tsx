import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { QrCode, Copy, CheckCircle2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { useColorScheme } from 'react-native';

interface GiftListCardProps {
  pixKey: string;
  pixKeyType: string;
  pixMessage?: string;
}

export default function GiftListCard({ pixKey, pixKeyType, pixMessage }: GiftListCardProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível copiar a chave Pix.');
    }
  };

  const getPixTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      cpf: 'CPF',
      cnpj: 'CNPJ',
      email: 'E-mail',
      phone: 'Celular',
      random: 'Chave Aleatória',
    };
    return types[type] || 'Pix';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <QrCode size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Vaquinha / Presentes</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Contribua com os noivos/anfitriões
          </Text>
        </View>
      </View>

      {pixMessage ? (
        <Text style={[styles.message, { color: colors.text }]}>{pixMessage}</Text>
      ) : null}

      <View style={[styles.pixBox, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.pixInfo}>
          <Text style={[styles.pixLabel, { color: colors.textSecondary }]}>
            {getPixTypeLabel(pixKeyType)}
          </Text>
          <Text style={[styles.pixKey, { color: colors.text }]} numberOfLines={1} ellipsizeMode="middle">
            {pixKey}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.copyButton, { backgroundColor: copied ? '#4CAF50' : colors.primary }]}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          {copied ? (
            <CheckCircle2 size={18} color="#fff" />
          ) : (
            <Copy size={18} color="#fff" />
          )}
          <Text style={styles.copyButtonText}>{copied ? 'Copiado' : 'Copiar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    lineHeight: 20,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  pixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  pixInfo: {
    flex: 1,
  },
  pixLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pixKey: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
});
