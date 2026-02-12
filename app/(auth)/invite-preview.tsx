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
};

function toDateLabel(v: any) {
  try {
    const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
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
      if (fetchedForKey.current === shareKey) return;
      fetchedForKey.current = shareKey;

      console.log(`[InviteDiag] 🛠️ Iniciando resolução: shareKey=${shareKey}, uid=${uid}`);
      setLoading(true);
      setSummary(null);

      try {
        // 🔥 Pequeno delay para garantir que o Firestore Auth propagou as regras
        // (especialmente após um redirect rápido de login/register)
        await new Promise((resolve) => setTimeout(resolve, 500));

        let snap;
        try {
          snap = await getDoc(doc(db, 'eventInviteSummaries', shareKey));
        } catch (e: any) {
          console.log('[InviteDiag] ⚠️ Erro na leitura primária (summary):', e.code);
          // se for permissão negada, tenta mais uma vez em 1s
          if (e.code === 'permission-denied') {
             await new Promise((resolve) => setTimeout(resolve, 1000));
             snap = await getDoc(doc(db, 'eventInviteSummaries', shareKey));
          } else {
             throw e;
          }
        }

        if (cancelled) return;
        let data: InviteSummary | null = null;
        let usedFallback = false;

        if (snap?.exists()) {
          console.log('[InviteDiag] ✅ eventInviteSummaries encontrado');
          const raw = snap.data() as InviteSummary;
          if (raw?.shareKey === shareKey && raw?.v === 1 && raw?.eventId) {
            data = raw;
          }
        } else {
          console.log('[InviteDiag] ⚠️ eventInviteSummaries não existe');
        }

        // Fallback: se não há summary válido, resolve eventId via eventShareKeys
        if (!data) {
          console.log('[InviteDiag] ⏳ Tentando fallback via eventShareKeys...');
          try {
            const keySnap = await getDoc(doc(db, 'eventShareKeys', shareKey));
            if (cancelled) return;
            if (keySnap.exists()) {
              console.log('[InviteDiag] ✅ eventShareKeys (fallback) encontrado');
              const eventId = (keySnap.data() as any)?.eventId;
              if (typeof eventId === 'string' && eventId) {
                data = { v: 1, shareKey, eventId, title: 'Convite' };
                usedFallback = true;
              }
            } else {
              console.log('[InviteDiag] ❌ eventShareKeys (fallback) NÃO existe');
            }
          } catch (keyErr: any) {
            console.log('[InviteDiag] ❌ Erro ao ler eventShareKeys (fallback):', keyErr.code);
          }
        }

        if (!data) {
          console.log('[InviteDiag] 🚫 Falha total: doc não encontrado ou sem permissão');
          setSummary(null);
          return;
        }

        try {
          console.log(`[InviteDiag] ⏳ Verificando detalhes do evento: ${data?.eventId}`);
          const evSnap = await getDoc(doc(db, 'events', data!.eventId));
          if (evSnap.exists()) {
            console.log('[InviteDiag] ✅ Evento principal acessível');
            const evData: any = evSnap.data();
            const isOwner = evData?.userId === uid;
            if (isOwner) {
              console.log('[InviteDiag] 👑 Usuário é o dono, redirecionando direto');
              if (usedFallback) {
                try {
                  await createInviteSummary(shareKey, data!.eventId);
                } catch (healErr: any) {
                  console.log('[InviteDiag] ⚠️ Erro ao curar summary:', healErr.message);
                }
              }
              goEvent(data!.eventId);
              return;
            }
          } else {
            console.log('[InviteDiag] ❌ Evento principal não encontrado ou ACESSO NEGADO');
          }
        } catch (checkErr: any) {
          console.log('[InviteDiag] ❌ Erro ao ler evento (ignorável pro preview):', checkErr.code);
        }

        setSummary(data);

        // Se já for logado, checa se já participa
        if (uid) {
          try {
            console.log(`[InviteDiag] 🔍 Checando participação para uid=${uid}, eventId=${data.eventId}`);
            const existing = await getGuestParticipation(uid, data.eventId);
            if (cancelled) return;

            if (
              existing?.mode === 'confirmado' ||
              existing?.mode === 'acompanhando'
            ) {
              console.log('[InviteDiag] ✅ Já participa, indo para Minha Participação');
              await refetchEventById(data.eventId);
              goMyParticipation(data.eventId);
              return;
            }
          } catch (partErr: any) {
             const code = partErr.code || '';
             const msg = partErr.message || '';
             // 💡 Conforme solicitado: se der acesso negado, consideramos que o registro não existe
             if (code.includes('permission-denied') || msg.includes('permission-denied')) {
               console.log('[InviteDiag] ℹ️ Acesso negado na participação (tratado como inexistente).');
             } else {
               console.log('[InviteDiag] ⚠️ Erro ao checar participação:', code || msg);
             }
             // Não interrompe o fluxo de preview
          }
        }
      } catch (e: any) {
        console.log('[InviteDiag] 🚨 ERRO FATAL no fluxo:', e.code, e.message);
        setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [shareKey, uid, authLoading, goEvent]);

  // ✅ Context
  const { refetchEventById } = useEvents();

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
            borderRadius: 12,
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
        <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
          Data: {start}
          {end ? ` — ${end}` : ''}
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
            borderRadius: 12,
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
            borderRadius: 12,
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
          borderRadius: 12,
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
