// app/(auth)/invite-preview.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  upsertGuestParticipation,
  getGuestParticipation,
} from '@/hooks/guestService';
import { useAuthListener } from '@/hooks/useAuthListener';
import { createInviteSummary } from '@/hooks/inviteService';
import { useEvents } from '@/context/EventsContext';
import { getOptimizedUrl } from '@/lib/cloudinary';
import { logger } from '@/lib/logger';
import Fonts from '@/constants/Fonts';

type GuestMode = 'confirmado' | 'acompanhando';

type InviteSummary = {
  v: number;
  shareKey: string;
  eventId: string;
  title?: string;
  coverImage?: string;
  location?: string;
  startDate?: any;
  endDate?: any;
  ownerName?: string;
  expiresAt?: any;
};

function toDateLabel(v: any) {
  try {
    const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function InvitePreviewScreen() {
  const { k } = useLocalSearchParams<{ k?: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const shareKey = useMemo(() => (typeof k === 'string' ? k.trim() : ''), [k]);

  // ✅ Auth reativo (não use getAuth().currentUser direto aqui)
  const { user, authLoading } = useAuthListener();
  const uid = user?.uid ?? '';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InviteSummary | null>(null);
  const [busy, setBusy] = useState<GuestMode | null>(null);

  // ✅ trava pra não redirecionar em loop
  const redirectedForKey = useRef<string | null>(null);
  // ✅ trava fetch pra não rodar repetido por remount/re-render
  const fetchedForKey = useRef<string | null>(null);
  // ✅ trava navegação pro evento (pós-check de participação)
  const navigatedToEvent = useRef<string | null>(null);

  // ✅ Context (precisa estar antes do useEffect que usa)
  const { refetchEventById } = useEvents();

  // 1) Key inválida => landing (só 1x)
  useEffect(() => {
    if (!shareKey) {
      router.replace('/(auth)/landing');
    }
  }, [shareKey]);

  // 2) Espera auth estabilizar, depois decide: gate ou preview
  useEffect(() => {
    if (!shareKey) return;
    if (authLoading) return;

    // evita repetir redirect pra mesma chave
    if (redirectedForKey.current === shareKey) return;

    if (!uid) {
      redirectedForKey.current = shareKey;
      router.replace({
        pathname: '/(auth)/invite-gate',
        params: { k: shareKey },
      } as any);
    }
  }, [shareKey, uid, authLoading]);

  // helper: navegar pro evento
  const goEvent = useCallback(
    (eventId: string) => {
      const key = `${shareKey}:detail:${eventId}:${uid}`;
      if (navigatedToEvent.current === key) return;
      navigatedToEvent.current = key;

      router.replace({
        pathname: '/(stack)/events/[id]',
        params: { id: eventId },
      } as any);
    },
    [shareKey, uid],
  );

  // helper: navegar para "Minha participação"
  const goMyParticipation = useCallback(
    (eventId: string) => {
      const key = `${shareKey}:part:${eventId}:${uid}`;
      if (navigatedToEvent.current === key) return;
      navigatedToEvent.current = key;

      router.replace({
        pathname: '/(stack)/events/[id]/edit-my-participation',
        params: { id: eventId },
      } as any);
    },
    [shareKey, uid],
  );

  // 3) Carrega summary (uma vez por key) e depois checa participação existente
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!shareKey) return;

      // não tenta preview enquanto auth não estabilizou
      if (authLoading) return;

      // se não tá logado, não carrega summary aqui (gate cuida disso)
      if (!uid) return;

      // trava: não refaz fetch sem necessidade
      if (fetchedForKey.current === shareKey) {
        if (summary) setLoading(false);
        return;
      }
      fetchedForKey.current = shareKey;

      setLoading(true);
      setSummary(null);

      try {
        // 🔥 Pequeno delay para garantir que o Firestore Auth propagou as regras
        // (especialmente após um redirect rápido de login/register)
        await new Promise((resolve) => setTimeout(resolve, 200));

        let snap;
        try {
          snap = await getDoc(doc(db, 'eventInviteSummaries', shareKey));
        } catch (e: any) {
          logger.debug(
            '[InviteDiag] ⚠️ Erro na leitura primária (summary):',
            e.code,
          );
          // se for permissão negada, tenta mais uma vez após um delay menor
          if (e.code === 'permission-denied') {
            await new Promise((resolve) => setTimeout(resolve, 300));
            snap = await getDoc(doc(db, 'eventInviteSummaries', shareKey));
          } else {
            throw e;
          }
        }

        if (cancelled) return;
        let data: InviteSummary | null = null;
        let usedFallback = false;

        if (snap?.exists()) {
          const raw = snap.data() as InviteSummary;
          if (raw?.shareKey === shareKey && raw?.v === 1 && raw?.eventId) {
            data = raw;
            if (!data.expiresAt) {
              try {
                const keySnap = await getDoc(
                  doc(db, 'eventShareKeys', shareKey),
                );
                if (keySnap.exists()) {
                  data.expiresAt = keySnap.data()?.expiresAt;
                }
              } catch (keyErr) {
                // ignore
              }
            }
          }
        }

        // Fallback: se não há summary válido, resolve eventId via eventShareKeys
        if (!data) {
          try {
            const keySnap = await getDoc(doc(db, 'eventShareKeys', shareKey));
            if (cancelled) return;
            if (keySnap.exists()) {
              const eventId = (keySnap.data() as any)?.eventId;
              if (typeof eventId === 'string' && eventId) {
                data = { v: 1, shareKey, eventId, title: 'Convite' };
                usedFallback = true;
              }
            }
          } catch (keyErr: any) {
            logger.debug(
              '[InviteDiag] ❌ Erro ao ler eventShareKeys (fallback):',
              keyErr.code,
            );
          }
        }

        if (!data) {
          setSummary(null);
          return;
        }

        try {
          const evSnap = await getDoc(doc(db, 'events', data!.eventId));
          if (evSnap.exists()) {
            const evData: any = evSnap.data();
            const isOwner = evData?.userId === uid;
            if (isOwner) {
              if (usedFallback) {
                try {
                  await createInviteSummary(shareKey, data!.eventId);
                } catch (healErr: any) {
                  logger.debug(
                    '[InviteDiag] ⚠️ Erro ao curar summary:',
                    healErr.message,
                  );
                }
              }
              goEvent(data!.eventId);
              return;
            }
          }
        } catch (checkErr: any) {
          logger.debug(
            '[InviteDiag] ❌ Erro ao ler evento (ignorável pro preview):',
            checkErr.code,
          );
        }

        setSummary(data);

        // Se já for logado, checa se já participa
        if (uid) {
          try {
            const existing = await getGuestParticipation(uid, data.eventId);
            if (cancelled) return;

            if (
              existing?.mode === 'confirmado' ||
              existing?.mode === 'acompanhando'
            ) {
              await refetchEventById(data.eventId);
              goMyParticipation(data.eventId);
              return;
            }
          } catch (partErr: any) {
            const code = partErr.code || '';
            const msg = partErr.message || '';
            // 💡 Conforme solicitado: se der acesso negado, consideramos que o registro não existe
            if (
              code.includes('permission-denied') ||
              msg.includes('permission-denied')
            ) {
              logger.debug(
                '[InviteDiag] ℹ️ Acesso negado na participação (tratado como inexistente).',
              );
            } else {
              logger.debug(
                '[InviteDiag] ⚠️ Erro ao checar participação:',
                code || msg,
              );
            }
            // Não interrompe o fluxo de preview
          }
        }
      } catch (e: any) {
        logger.error('[InviteDiag] 🚨 ERRO FATAL no fluxo:', e.code, e.message);
        setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [shareKey, uid, authLoading]);

  const handleChoose = async (mode: GuestMode) => {
    if (!uid || !summary?.eventId) return;

    setBusy(mode);
    try {
      await upsertGuestParticipation({
        userId: uid,
        eventId: summary.eventId,
        mode,
        // opcional:
        // userName: user?.displayName ?? 'Convidado',
      });

      // ✅ Garante que o evento esteja carregado no contexto antes de navegar
      await refetchEventById(summary.eventId);

      goMyParticipation(summary.eventId);
    } catch (e) {
      Alert.alert('Não foi possível confirmar', 'Tente novamente.');
    } finally {
      setBusy(null);
    }
  };

  // Loading
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>
          Carregando detalhes do convite…
        </Text>
      </View>
    );
  }

  // Invalid
  if (!summary) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          Convite inválido ou indisponível
        </Text>
        <Pressable
          onPress={() => router.replace('/(auth)/landing')}
          style={{
            marginTop: 16,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textSecondary }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const start = toDateLabel(summary.startDate);
  const end = toDateLabel(summary.endDate);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      {!!summary.coverImage && (
        <Image
          source={{ uri: getOptimizedUrl(summary.coverImage, { width: 800 }) }}
          style={{
            width: '100%',
            height: 200,
            borderRadius: 16,
            marginBottom: 16,
          }}
          resizeMode="cover"
        />
      )}

      <Text
        style={{
          color: colors.text,
          fontSize: 20,
          fontWeight: '800',
          marginBottom: 6,
        }}
      >
        {summary.title ?? 'Evento'}
      </Text>

      {!!summary.location && (
        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>
          Local: {summary.location}
        </Text>
      )}

      {(start || end) && (
        <Text
          style={{
            color: colors.textSecondary,
            marginBottom: 12,
            fontFamily: Fonts.medium,
          }}
        >
          Data: {start === end ? start : `${start} — ${end}`}
        </Text>
      )}

      {!!summary.expiresAt && (
        <Text
          style={{
            color: colors.textSecondary,
            marginBottom: 20,
            opacity: 0.8,
            fontFamily: Fonts.medium,
            fontSize: 14,
          }}
        >
          🕒 Link expirando em: {toDateLabel(summary.expiresAt)}
        </Text>
      )}

      {!!summary.ownerName && (
        <Text style={{ color: colors.textSecondary, marginBottom: 20 }}>
          Organizador: {summary.ownerName}
        </Text>
      )}

      <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
        Como deseja participar?
      </Text>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable
          onPress={() => handleChoose('confirmado')}
          disabled={busy !== null}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor:
              busy === 'confirmado' ? colors.primary : 'transparent',
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {busy === 'confirmado' && (
            <ActivityIndicator size="small" color="#fff" />
          )}
          <Text style={{ color: busy === 'confirmado' ? '#fff' : colors.text }}>
            Confirmar presença
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleChoose('acompanhando')}
          disabled={busy !== null}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor:
              busy === 'acompanhando' ? colors.backgroundCard : 'transparent',
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {busy === 'acompanhando' && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
          <Text
            style={{
              color:
                busy === 'acompanhando' ? colors.text : colors.textSecondary,
            }}
          >
            Acompanhar
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.back()}
        style={{
          marginTop: 16,
          paddingVertical: 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.textSecondary }}>Voltar</Text>
      </Pressable>
    </ScrollView>
  );
}
