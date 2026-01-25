// hooks/useEventAccess.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEvents } from '@/context/EventsContext';

// Ajuste o import do tipo do seu Event conforme seu projeto
import type { Event, PermissionLevel } from '@/types';

// Ajuste conforme seu tipo real (no seu projeto já existe GuestParticipation)
import type { GuestParticipation } from '@/types/guestParticipation';

// Se no seu projeto você usa um service externo, pode trocar aqui,
// mas como você já tem funções no EventsContext, vamos usar elas.
type UseEventAccessParams = {
  eventId?: string;
  /**
   * Se você usa telas tipo "FoundEventScreen" que podem achar o evento por accessCode,
   * você pode passar accessCode e o hook tenta resolver.
   */
  accessCode?: string;

  /**
   * Se quiser forçar reload do evento no mount.
   */
  autoRefetch?: boolean;
};

type UseEventAccessReturn = {
  uid: string;
  isAuthReady: boolean;

  event: Event | null;
  eventLoading: boolean;
  eventError: string | null;

  // Permissões
  isCreator: boolean;
  myPermissionLevel: PermissionLevel | null;
  isSuperAdmin: boolean;
  isPartialAdmin: boolean;

  // Participação (guestParticipations)
  myParticipation: GuestParticipation | null;
  participationLoading: boolean;
  isParticipant: boolean;
  isConfirmed: boolean;
  isFollowing: boolean; // "acompanhando"
  hasAccess: boolean;

  // helpers
  refetch: () => Promise<void>;
};

/**
 * Hook central para decidir:
 * - evento carregado?
 * - usuário é criador / subadmin?
 * - usuário é participante (confirmado/acompanhando) via guestParticipations?
 * - usuário tem acesso?
 */
export function useEventAccess({
  eventId,
  accessCode,
  autoRefetch = true,
}: UseEventAccessParams): UseEventAccessReturn {
  const {
    state,
    fetchEvents,
    refetchEventById,
    // você já usa essas no MyEventsScreen:
    getGuestParticipationsByUserId,
  } = useEvents();

  const [uid, setUid] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  const [participationLoading, setParticipationLoading] = useState(false);
  const [myParticipation, setMyParticipation] =
    useState<GuestParticipation | null>(null);

  const cancelledRef = useRef(false);

  // ✅ uid reativo (evita bug de currentUser desatualizado)
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? '');
      setIsAuthReady(true);
    });
    return unsub;
  }, []);

  // ✅ resolve o evento do state (por id ou por accessCode)
  const eventFromState = useMemo(() => {
    if (eventId) return state.events.find((e) => e.id === eventId) ?? null;
    if (accessCode)
      return state.events.find((e) => e.accessCode === accessCode) ?? null;
    return null;
  }, [state.events, eventId, accessCode]);

  const [event, setEvent] = useState<Event | null>(null);

  // mantém o state local sincronizado com o state global
  useEffect(() => {
    setEvent(eventFromState);
  }, [eventFromState]);

  const refetch = useCallback(async () => {
    if (!isAuthReady) return;

    setEventError(null);

    try {
      setEventLoading(true);

      // se a lista estiver vazia, puxa eventos
      if (!state.events.length) {
        await fetchEvents();
      }

      // se temos eventId e existe função para refetch individual, melhor ainda
      if (eventId && typeof refetchEventById === 'function') {
        await refetchEventById(eventId);
      }

      // depois do fetch/refetch, o useMemo eventFromState atualiza sozinho
    } catch (e: any) {
      setEventError(e?.message ?? 'Falha ao carregar evento.');
    } finally {
      setEventLoading(false);
    }
  }, [
    isAuthReady,
    state.events.length,
    fetchEvents,
    refetchEventById,
    eventId,
  ]);

  // ✅ auto-carregar evento
  useEffect(() => {
    cancelledRef.current = false;

    const run = async () => {
      if (!autoRefetch) return;
      // se já tem no state, não precisa carregar (mas se quiser sempre, remove esse if)
      if (eventFromState) return;
      await refetch();
    };

    run();

    return () => {
      cancelledRef.current = true;
    };
  }, [autoRefetch, eventFromState, refetch]);

  // ✅ carregar participação do usuário (guestParticipations)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!uid) {
        setMyParticipation(null);
        return;
      }

      // sem evento ainda → não busca
      const ev = eventFromState;
      if (!ev) {
        setMyParticipation(null);
        return;
      }

      try {
        setParticipationLoading(true);

        // pega todas participações do usuário e filtra por eventId
        const list = await getGuestParticipationsByUserId(uid);
        const found = list.find((p) => p.eventId === ev.id) ?? null;

        if (!cancelled) setMyParticipation(found);
      } catch (e) {
        if (!cancelled) setMyParticipation(null);
      } finally {
        if (!cancelled) setParticipationLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [uid, eventFromState, getGuestParticipationsByUserId]);

  // ========= Permissões =========
  const isCreator = !!event && !!uid && event.userId === uid;

  const myPermissionLevel: PermissionLevel | null = useMemo(() => {
    if (!event || !uid) return null;
    const level = event.subAdminsByUid?.[uid];
    return (level ?? null) as PermissionLevel | null;
  }, [event, uid]);

  const isSuperAdmin = isCreator || myPermissionLevel === 'Super Admin';
  const isPartialAdmin = !isCreator && myPermissionLevel === 'Admin parcial';

  // ========= Participação =========
  const isConfirmed = myParticipation?.mode === 'confirmado';
  const isFollowing = myParticipation?.mode === 'acompanhando';
  const isParticipant = isConfirmed || isFollowing;

  // ✅ regra final de acesso
  const hasAccess = isCreator || !!myPermissionLevel || isParticipant;

  return {
    uid,
    isAuthReady,

    event,
    eventLoading,
    eventError,

    isCreator,
    myPermissionLevel,
    isSuperAdmin,
    isPartialAdmin,

    myParticipation,
    participationLoading,
    isParticipant,
    isConfirmed,
    isFollowing,
    hasAccess,

    refetch,
  };
}

export default useEventAccess;
