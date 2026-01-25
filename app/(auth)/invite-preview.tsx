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

type GuestMode = 'confirmado' | 'acompanhando';

type InviteSummary = {
  v: number;
  shareKey: string;
  eventId: string;

  title?: string;
  coverImage?: string;
  locationName?: string;
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

  // helper: navegar pro evento 1x
  const goEvent = useCallback(
    (eventId: string) => {
      const key = `${shareKey}:${eventId}:${uid}`;
      if (navigatedToEvent.current === key) return;
      navigatedToEvent.current = key;

      router.replace({
        pathname: '/(stack)/events/[id]',
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

      setLoading(true);
      setSummary(null);

      try {
        const snap = await getDoc(doc(db, 'eventInviteSummaries', shareKey));
        if (cancelled) return;

        if (!snap.exists()) {
          setSummary(null);
          return;
        }

        const data = snap.data() as InviteSummary;

        // sanity checks
        if (data?.shareKey !== shareKey || data?.v !== 1 || !data?.eventId) {
          setSummary(null);
          return;
        }

        setSummary(data);

        // ✅ AQUI está o “pulo do gato”:
        // se já existe participação (confirmado/acompanhando), entra direto no evento.
        const existing = await getGuestParticipation(uid, data.eventId);
        if (cancelled) return;

        if (
          existing?.mode === 'confirmado' ||
          existing?.mode === 'acompanhando'
        ) {
          goEvent(data.eventId);
          return;
        }
      } catch (e) {
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

      goEvent(summary.eventId);
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
          source={{ uri: summary.coverImage }}
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

      {!!summary.locationName && (
        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>
          Local: {summary.locationName}
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
          }}
        >
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
              busy === 'acompanhando' ? colors.backgroundC : 'transparent',
            alignItems: 'center',
          }}
        >
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
