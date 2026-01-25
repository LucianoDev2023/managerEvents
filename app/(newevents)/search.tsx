import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { useEventAccessByShareKey } from '@/hooks/useEventAccessByShareKey';
import { getAuth } from 'firebase/auth';
import { upsertGuestParticipation } from '@/hooks/guestService';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';

type ChooseMode = 'confirmado' | 'acompanhando';
type NormalizedStatus = 'none' | 'confirmado' | 'acompanhando';

export default function SearchScreen() {
  const { k } = useLocalSearchParams<{ k?: string }>();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const auth = getAuth();
  const uid = auth.currentUser?.uid ?? '';

  const [thanks, setThanks] = useState(false);
  const [busy, setBusy] = useState<ChooseMode | null>(null);

  // Mantido por compatibilidade com seu fluxo (mesmo com botão removido)
  const [wantsPreview, setWantsPreview] = useState(false);

  const lottieRef = useRef<LottieView>(null);
  const redirectRef = useRef<string | null>(null);
  const chooseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedKey = useMemo(
    () => (typeof k === 'string' ? k.trim() : ''),
    [k],
  );

  const { isLoading, eventFound, guestStatus, requiresAuth } =
    useEventAccessByShareKey(resolvedKey);

  const normalizedStatus: NormalizedStatus = useMemo(
    () => (guestStatus || 'none') as NormalizedStatus,
    [guestStatus],
  );

  const canChoose = useMemo(() => {
    return (
      !isLoading &&
      !!eventFound &&
      normalizedStatus === 'none' &&
      !!uid &&
      !thanks
    );
  }, [isLoading, eventFound, normalizedStatus, uid, thanks]);

  // Quando thanks liga, toca animação
  useEffect(() => {
    if (!thanks) return;
    try {
      lottieRef.current?.reset();
      lottieRef.current?.play();
    } catch {}
  }, [thanks]);

  // cleanup timer
  useEffect(() => {
    return () => {
      if (chooseTimerRef.current) clearTimeout(chooseTimerRef.current);
    };
  }, []);

  // sem key → landing
  useEffect(() => {
    if (wantsPreview) return;
    if (resolvedKey) return;

    if (redirectRef.current === 'landing') return;
    redirectRef.current = 'landing';

    router.replace('/(auth)/landing');
  }, [resolvedKey, wantsPreview]);

  // precisa logar → invite-gate
  useEffect(() => {
    if (wantsPreview) return;
    if (!resolvedKey) return;
    if (!requiresAuth || uid) return;

    const mark = `gate:${resolvedKey}`;
    if (redirectRef.current === mark) return;
    redirectRef.current = mark;
    router.replace({
      pathname: '/(auth)/invite-gate',
      params: { k: resolvedKey },
    } as any);
  }, [requiresAuth, resolvedKey, uid, wantsPreview]);

  // é criador do evento → entra direto
  useEffect(() => {
    const eventId = eventFound?.id as string | undefined;
    const ownerUid = (eventFound as any)?.userId as string | undefined;

    if (!resolvedKey) return;
    if (isLoading) return;
    if (!eventId) return;
    if (!uid) return;
    if (wantsPreview) return;

    if (ownerUid && ownerUid === uid) {
      const mark = `owner:${eventId}`;
      if (redirectRef.current === mark) return;
      redirectRef.current = mark;

      router.replace({
        pathname: '/(stack)/events/[id]',
        params: { id: eventId },
      } as any);
    }
  }, [resolvedKey, isLoading, eventFound?.id, uid, wantsPreview, eventFound]);

  // já é participante → entra direto no evento
  useEffect(() => {
    const eventId = eventFound?.id;

    if (!resolvedKey) return;
    if (isLoading) return;
    if (!eventId) return;

    if (wantsPreview) return;

    if (normalizedStatus !== 'none') {
      const mark = `event:${eventId}`;
      if (redirectRef.current === mark) return;
      redirectRef.current = mark;

      router.replace({
        pathname: '/(stack)/events/[id]',
        params: { id: eventId },
      } as any);
    }
  }, [
    resolvedKey,
    isLoading,
    eventFound?.id,
    normalizedStatus,
    wantsPreview,
    eventFound,
  ]);

  // Ao voltar para essa tela, destrava redirects
  useFocusEffect(
    useCallback(() => {
      setWantsPreview(false);
      return () => {};
    }, []),
  );

  // Logs de estado
  useEffect(() => {}, [
    resolvedKey,
    uid,
    isLoading,
    eventFound?.id,
    normalizedStatus,
    requiresAuth,
    thanks,
    canChoose,
  ]);

  const handleChoose = useCallback(
    async (mode: ChooseMode) => {
      if (!eventFound || !uid) return;

      setBusy(mode);
      console.log('🟩 [SearchScreen] choose start', {
        mode,
        userId: uid,
        eventId: eventFound.id,
      });

      if (mode === 'confirmado') {
        setThanks(true);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }

      try {
        await upsertGuestParticipation({
          userId: uid,
          eventId: eventFound.id,
          mode,
        });

        console.log('🟩 [SearchScreen] choose success', {
          mode,
          eventId: eventFound.id,
        });

        if (redirectRef.current?.startsWith('event:')) return;
        const id = eventFound.id;
        redirectRef.current = `event:${id}`;

        router.replace({
          pathname: '/(stack)/events/[id]',
          params: { id },
        } as any);
      } catch (err) {
        console.error('🟥 [SearchScreen] choose error', err);
        if (mode === 'confirmado') setThanks(false);
      } finally {
        setBusy(null);
      }
    },
    [eventFound, uid],
  );

  // UI helpers
  const ScreenShell = ({ children }: { children: React.ReactNode }) => (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 24,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
    </View>
  );

  // 1) Carregando / resolvendo convite (suprimir preview para owner)
  const ownerUid = (eventFound as any)?.userId as string | undefined;
  if (
    isLoading ||
    (!eventFound && !requiresAuth) ||
    (ownerUid && uid && ownerUid === uid)
  ) {
    return (
      <ScreenShell>
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}
          >
            Localizando seu convite...
          </Text>
        </View>
      </ScreenShell>
    );
  }

  // 2) Convite inválido
  if (!isLoading && !eventFound) {
    return (
      <ScreenShell>
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Convite inválido ou evento indisponível
          </Text>

          <Pressable
            onPress={() => router.replace('/')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textSecondary }}>
              Ir para a página inicial
            </Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  // 3) Obrigado (após confirmar)
  if (thanks) {
    return (
      <ScreenShell>
        <View style={{ alignItems: 'center' }}>
          <LottieView
            ref={lottieRef}
            source={require('@/assets/images/tks.json')}
            autoPlay
            loop={busy !== null}
            speed={1}
            style={{ width: 220, height: 220 }}
          />
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: '800',
              marginBottom: 8,
            }}
          >
            Obrigado!
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Redirecionando para o evento...
          </Text>
        </View>
      </ScreenShell>
    );
  }

  // A partir daqui eventFound existe (type-safe)
  if (!eventFound) {
    return (
      <ScreenShell>
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenShell>
    );
  }

  const event = eventFound;

  // 4) Pode escolher (com preview embutido)
  if (canChoose) {
    const startLabel =
      typeof (event as any).startDate?.toDate === 'function'
        ? (event as any).startDate.toDate().toLocaleString()
        : (event.startDate?.toLocaleString?.() ?? '');

    const endLabel =
      typeof (event as any).endDate?.toDate === 'function'
        ? (event as any).endDate.toDate().toLocaleString()
        : (event.endDate?.toLocaleString?.() ?? '');

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 28,
          }}
        >
          {/* Capa */}
          {!!(event as any).coverImage && (
            <View
              style={{
                width: '100%',
                height: 190,
                borderRadius: 18,
                overflow: 'hidden',
                marginBottom: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Image
                source={{ uri: (event as any).coverImage }}
                resizeMode="cover"
                style={{ width: '100%', height: '100%' }}
              />
            </View>
          )}

          {/* Título */}
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: '900',
              marginBottom: 6,
              textAlign: 'center',
            }}
          >
            {(event as any).title ?? 'Evento'}
          </Text>

          {/* Local */}
          {!!(event as any).location && (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              📍 {(event as any).location}
            </Text>
          )}

          {/* Datas */}
          {!!(startLabel || endLabel) && (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                marginBottom: 14,
                textAlign: 'center',
              }}
            >
              🗓️ {startLabel} {endLabel ? `— ${endLabel}` : ''}
            </Text>
          )}

          {/* Descrição (se existir no summary) */}
          {!!(event as any).description && (
            <Text
              style={{
                color: colors.text,
                opacity: 0.9,
                fontSize: 14,
                marginBottom: 18,
                textAlign: 'center',
              }}
            >
              {(event as any).description}
            </Text>
          )}

          {/* Ações */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            Como deseja participar?
          </Text>

          <View
            style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}
          >
            <Pressable
              onPress={() => handleChoose('confirmado')}
              disabled={busy !== null}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor:
                  busy === 'confirmado' ? colors.primary : 'transparent',
                opacity: busy !== null && busy !== 'confirmado' ? 0.6 : 1,
              }}
            >
              <Text
                style={{ color: busy === 'confirmado' ? '#fff' : colors.text }}
              >
                Confirmar presença
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleChoose('acompanhando')}
              disabled={busy !== null}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor:
                  busy === 'acompanhando' ? colors.backgroundC : 'transparent',
                opacity: busy !== null && busy !== 'acompanhando' ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  color:
                    busy === 'acompanhando'
                      ? colors.text
                      : colors.textSecondary,
                }}
              >
                Acompanhar
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // 5) fallback (se nada bater)
  return (
    <ScreenShell>
      <View style={{ alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </ScreenShell>
  );
}
