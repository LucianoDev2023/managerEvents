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
  Image,
  TouchableOpacity,
} from 'react-native';
import { SendHorizontalIcon, MessageCircle, QrCode, Share2, Clock } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Event } from '@/types/index';
import { getOptimizedUrl } from '@/lib/cloudinary';
import Button from '@/components/ui/Button';

type ShareEventButtonProps = {
  event: Event;
  onEnsureInvite?: (ttlHours: number) => Promise<string>;
  onShowQRCode: (payload: string) => void;
  onPressInterceptor?: (proceed: () => void) => void;
  baseUrl?: string;
  size?: 'small' | 'medium' | 'large';
  minimal?: boolean;
};

// Opções de duração disponíveis para o organizador
const TTL_OPTIONS: { label: string; hours: number }[] = [
  { label: '1 hora', hours: 1 },
  { label: '6 horas', hours: 6 },
  { label: '24 horas', hours: 24 },
  { label: '3 dias', hours: 72 },
  { label: '7 dias', hours: 168 },
  { label: '30 dias', hours: 720 },
];

const ShareEventButton: React.FC<ShareEventButtonProps> = ({
  event,
  onEnsureInvite,
  onShowQRCode,
  onPressInterceptor,
  baseUrl = 'https://planejeja.com.br/app.html',
  size = 'small',
  minimal = false,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedTtlHours, setSelectedTtlHours] = useState(72); // padrão: 3 dias
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (!event) return null;

  const shareKey = event.shareKey ?? '';
  const normalizedKey = shareKey?.trim() ?? '';

  const showInviteError = (e: any) => {
    const code = e?.message || e?.code || '';
    if (code === 'anonymous-user' || code === 'anonymous-blocked') {
      Alert.alert(
        'Cadastro necessário',
        'Para compartilhar convites, crie uma conta.',
      );
      return;
    }
    Alert.alert('Erro', 'Erro ao gerar ou compartilhar o convite.');
  };

  const getKey = async (force = false) => {
    if (normalizedKey && !force) return normalizedKey;
    if (!onEnsureInvite) {
      throw new Error('no-invite-generator');
    }
    return await onEnsureInvite(selectedTtlHours);
  };

  const handleShare = async () => {
    try {
      const key = await getKey(true);
      const url = `${baseUrl}?k=${encodeURIComponent(key)}`;
      const title = event.title || 'Evento';
      const message = `🎉 Você está convidado para ${title}! Abra no app Plannix: ${url}`;

      await Share.share({
        message,
        url,
      });
    } catch (e: any) {
      showInviteError(e);
    }
  };

  const handleQRCode = async () => {
    try {
      const key = await getKey(true);
      onShowQRCode(JSON.stringify({ shareKey: key, v: 1 }));
    } catch (e: any) {
      showInviteError(e);
    }
  };

  const gradientColors: [string, string, string] =
    colorScheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const handlePress = () => {
    if (onPressInterceptor) {
      onPressInterceptor(() => setShowOptions(true));
    } else {
      setShowOptions(true);
    }
  };

  const toDateLabel = (v: any) => {
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  const start = toDateLabel(event.startDate);
  const end = toDateLabel(event.endDate);

  return (
    <View style={styles.container}>
      {minimal ? (
        <Pressable 
          onPress={handlePress}
          style={({pressed}) => ({
            padding: 8,
            backgroundColor: pressed ? colors.backgroundSecondary : 'transparent',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border
          })}
        >
          <Share2 size={20} color={colors.text} />
        </Pressable>
      ) : (
        <Button
          title="Compartilhar"
          onPress={handlePress}
          size={size}
          style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
          icon={<SendHorizontalIcon size={size === 'small' ? 14 : 16} color="#fff" />}
          textStyle={{ color: '#fff' }}
        />
      )}


      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={gradientColors}
            style={[styles.modalBox, { borderColor: colors.primary }]}
            locations={[0, 0.7, 1]}
          >
            {/* --- GUEST PREVIEW SECTION --- */}
            <View
              style={[
                styles.previewContainer,
                { backgroundColor: colorScheme === 'dark' ? '#1a1a2e' : '#fff' },
              ]}
            >
              <Text style={[styles.previewBadge, { color: colors.primary }]}>
                PRÉ-VISUALIZAÇÃO DO CONVITE
              </Text>

              {!!event.coverImage && (
                <Image
                  source={{
                    uri: getOptimizedUrl(event.coverImage, { width: 600 }),
                  }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}

              <Text style={[styles.previewTitle, { color: colors.text }]}>
                Título: {event.title}
              </Text>

              <Text
                style={[styles.previewInfo, { color: colors.textSecondary }]}
              >
                📍 Localização: {event.location}
              </Text>

              <Text
                style={[styles.previewInfo, { color: colors.textSecondary }]}
              >
                📅 Data: {start}
                {end && end !== start ? ` — ${end}` : ''}
              </Text>

              <Text
                style={[styles.previewInfo, { color: colors.textSecondary, opacity: 0.8 }]}
              >
                🕒 Link válido até: {
                  new Date(Date.now() + selectedTtlHours * 60 * 60 * 1000).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }
              </Text>

              <View style={styles.previewDivider} />
            </View>

            {/* --- TTL PICKER --- */}
            <View style={styles.ttlSection}>
              <View style={styles.ttlHeader}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.ttlLabel, { color: colors.textSecondary }]}>
                  Link válido por:
                </Text>
              </View>
              <View style={styles.ttlPillRow}>
                {TTL_OPTIONS.map((opt) => {
                  const selected = opt.hours === selectedTtlHours;
                  return (
                    <TouchableOpacity
                      key={opt.hours}
                      onPress={() => setSelectedTtlHours(opt.hours)}
                      style={[
                        styles.ttlPill,
                        {
                          backgroundColor: selected ? colors.primary : 'transparent',
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ttlPillText,
                          { color: selected ? '#fff' : colors.textSecondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Enviar convite
            </Text>

            <Pressable
              style={[styles.optionBtn, { backgroundColor: '#25D366' }]}
              onPress={() => {
                setShowOptions(false);
                handleShare();
              }}
            >
              <View style={styles.optionContent}>
                <MessageCircle size={20} color="#fff" />
                <Text style={[styles.optionText, { color: '#fff' }]}>
                  Compartilhar via WhatsApp
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.optionBtn,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => {
                setShowOptions(false);
                handleQRCode();
              }}
            >
              <View style={styles.optionContent}>
                <QrCode size={20} color={colors.text} />
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Enviar QR Code
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.cancelBtn}
              onPress={() => setShowOptions(false)}
            >
              <Text
                style={[styles.cancelText, { color: colors.textSecondary }]}
              >
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  previewBadge: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 1,
    opacity: 0.8,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  previewInfo: {
    fontSize: 13,
    marginBottom: 2,
    textAlign: 'center',
  },
  previewDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 16,
  },
  // --- TTL picker ---
  ttlSection: {
    width: '100%',
    marginBottom: 16,
  },
  ttlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  ttlLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  ttlPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ttlPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  ttlPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ---
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  optionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  optionContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionText: { fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    marginTop: 16,
    padding: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
