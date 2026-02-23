import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { logger } from '@/lib/logger';
import Colors from '@/constants/Colors';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getOptimizedUrl } from '@/lib/cloudinary';
import Fonts from '@/constants/Fonts';
import { LinearGradient } from 'expo-linear-gradient';

export default function InviteGateScreen() {
  const { k, shareKey } = useLocalSearchParams<{
    k?: string;
    shareKey?: string;
  }>();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [inviteData, setInviteData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const goLogin = () => {
    router.push({
      pathname: '/(auth)/login',
      params: resolvedKey ? { k: resolvedKey } : {},
    } as any);
  };

  const goRegister = () => {
    router.push({
      pathname: '/(auth)/register',
      params: resolvedKey ? { k: resolvedKey } : {},
    } as any);
  };

  const resolvedKey = useMemo(() => {
    const a = typeof k === 'string' ? k.trim() : '';
    const b = typeof shareKey === 'string' ? shareKey.trim() : '';
    return a || b || '';
  }, [k, shareKey]);

  const toDateLocal = (v: any, options: Intl.DateTimeFormatOptions) => {
    try {
      if (!v) return '';
      let d: Date;
      if (typeof v?.toDate === 'function') {
        d = v.toDate();
      } else if (v?.seconds !== undefined) {
        d = new Date(v.seconds * 1000);
      } else {
        d = new Date(v);
      }
      if (Number.isNaN(d?.getTime())) return '';
      return d.toLocaleString('pt-BR', options);
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const fetchInvite = async () => {
      if (!resolvedKey) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'eventInviteSummaries', resolvedKey));
        let data = snap.exists() ? (snap.data() as any) : null;

        // Sempre busca no shareKey se a expiração estiver faltando no sumário
        if (!data?.expiresAt) {
          const keySnap = await getDoc(doc(db, 'eventShareKeys', resolvedKey));
          if (keySnap.exists()) {
            const keyData = keySnap.data();
            if (!data) {
              data = {
                title: 'Evento',
                expiresAt: keyData?.expiresAt,
                location: keyData?.location || '',
                startDate: keyData?.startDate || null,
              };
            } else {
              data.expiresAt = keyData?.expiresAt;
            }
          }
        }
        setInviteData(data);
      } catch (e) {
        logger.error('Error fetching invite data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [resolvedKey]);

  return (
    <LinearGradient
      colors={colors.gradients}
      style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
    >
      <View
        style={{
          width: '100%',
          backgroundColor: colors.backgroundCard,
          borderRadius: 24,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            {inviteData ? (
              <View style={{ width: '100%', alignItems: 'center' }}>
                {!!inviteData.coverImage && (
                  <View
                    style={{
                      width: '100%',
                      height: 180,
                      borderRadius: 16,
                      overflow: 'hidden',
                      marginBottom: 16,
                    }}
                  >
                    <Image
                      source={{
                        uri: getOptimizedUrl(inviteData.coverImage, {
                          width: 800,
                        }),
                      }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                )}
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontFamily: Fonts.bold,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}
                >
                  Você recebeu um convite para {inviteData.title || 'um Evento'}
                </Text>

                {!!inviteData.startDate && (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 16,
                      fontFamily: Fonts.medium,
                      marginBottom: 4,
                    }}
                  >
                    📅{' '}
                    {toDateLocal(inviteData.startDate, {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
                {!!inviteData.location && (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 16,
                      fontFamily: Fonts.medium,
                      marginBottom: 8,
                    }}
                  >
                    📍 {inviteData.location}
                  </Text>
                )}

                {inviteData.expiresAt ? (
                  <View style={{ marginTop: 4, marginBottom: 16 }}>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 14,
                        fontFamily: Fonts.medium,
                        opacity: 0.8,
                        textAlign: 'center',
                      }}
                    >
                      🕒 Link expirando em:{' '}
                      {toDateLocal(inviteData.expiresAt, {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text
                style={{
                  color: colors.text,
                  fontSize: 22,
                  fontFamily: Fonts.bold,
                  textAlign: 'center',
                  marginBottom: 20,
                }}
              >
                Você recebeu um convite
              </Text>
            )}

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                fontFamily: Fonts.regular,
                marginBottom: 24,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              Para conferir os detalhes e confirmar sua presença, entre na sua
              conta ou crie uma agora.
            </Text>

            <View style={{ width: '100%', gap: 12 }}>
              <Pressable
                onPress={goLogin}
                style={({ pressed }) => ({
                  width: '100%',
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontFamily: Fonts.bold,
                    fontSize: 16,
                  }}
                >
                  Fazer login
                </Text>
              </Pressable>

              <Pressable
                onPress={goRegister}
                style={({ pressed }) => ({
                  width: '100%',
                  paddingVertical: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: Fonts.bold,
                    fontSize: 16,
                  }}
                >
                  Criar conta
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
}
