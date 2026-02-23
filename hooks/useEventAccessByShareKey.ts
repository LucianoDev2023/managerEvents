import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Event } from '@/types';

type GuestStatus = 'none' | 'confirmed' | 'interested';

type InviteSummary = {
  v?: number;
  shareKey?: string;
  eventId?: string;
  title?: string;
  coverImage?: string | null;
  location?: string | null;
  startDate?: any;
  endDate?: any;
};

function normalize(s?: string) {
  return (s ?? '').trim();
}

function toDateSafe(v: any): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

function mapEvent(docId: string, data: any): Event {
  const { id: _ignoredId, ...rest } = data ?? {};
  return {
    id: docId,
    ...(rest as Omit<Event, 'id'>),
    startDate: toDateSafe(rest?.startDate),
    endDate: toDateSafe(rest?.endDate),
  } as Event;
}

function mapSummaryToEvent(eventId: string, summary: InviteSummary): Event {
  return {
    id: eventId,
    title: summary.title ?? 'Evento',
    coverImage: summary.coverImage ?? null,
    location: summary.location ?? '',
    startDate: toDateSafe(summary.startDate),
    endDate: toDateSafe(summary.endDate),
  } as Event;
}

export function useEventAccessByShareKey(shareKey?: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [eventFound, setEventFound] = useState<Event | null>(null);
  const [guestStatus, setGuestStatus] = useState<GuestStatus>('none');
  const [requiresAuth, setRequiresAuth] = useState(false);

  const [uid, setUid] = useState(() => getAuth().currentUser?.uid ?? '');

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // uid reativo
  useEffect(() => {
    const auth = getAuth();
    setUid(auth.currentUser?.uid ?? '');

    return onAuthStateChanged(auth, (u) => {
      if (!aliveRef.current) return;
      setUid(u?.uid ?? '');
    });
  }, []);

  const k = useMemo(() => normalize(shareKey), [shareKey]);

  useEffect(() => {
    let cancelled = false;

    const safe = (fn: () => void) => {
      if (cancelled || !aliveRef.current) return;
      fn();
    };

    // unsubscribe do snapshot precisa viver fora do async, e ser retornado no cleanup
    let unsubParticipation: null | (() => void) = null;
    const run = async () => {
      // reset inicial
      safe(() => {
        setIsLoading(true);
        setEventFound(null);
        setGuestStatus('none');
        setRequiresAuth(false);
      });

      if (!k) {
        safe(() => setIsLoading(false));
        return;
      }

      const immediateUid = getAuth().currentUser?.uid ?? uid;

      if (!immediateUid) {
        safe(() => {
          setRequiresAuth(true);
          setIsLoading(false);
        });
        return;
      }

      try {
        const keySnap = await getDoc(doc(db, 'eventShareKeys', k));
        if (!keySnap.exists()) {
          safe(() => {
            setEventFound(null);
            setGuestStatus('none');
          });
          return;
        }

        const keyData = keySnap.data();
        const eventId = keyData?.eventId as string | undefined;
        const expiresAt = keyData?.expiresAt;

        if (expiresAt) {
          const expireDate = toDateSafe(expiresAt);
          if (expireDate < new Date()) {
            safe(() => {
              setEventFound(null);
              setGuestStatus('none');
            });
            return;
          }
        }

        if (!eventId) {
          safe(() => {
            setEventFound(null);
            setGuestStatus('none');
          });
          return;
        }

        // STEP 2) assina participação (reativo)
        const participationId = `${immediateUid}_${eventId}`;
        const partRef = doc(db, 'guestParticipations', participationId);

        unsubParticipation = onSnapshot(
          partRef,
          (snap) => {
            if (cancelled || !aliveRef.current) return;

            if (!snap.exists()) {
              safe(() => setGuestStatus('none'));
              return;
            }

            const data: any = snap.data();
            const status: GuestStatus =
              data?.mode === 'confirmado' ? 'confirmed' : 'interested';

            safe(() => setGuestStatus(status));
          },
          (err) => {},
        );

        // STEP 3) decide o que buscar para eventFound (full ou preview)
        // aqui usamos leitura pontual do doc de participação pra decidir,
        // mas sem depender de getGuestParticipation custom.
        const partSnap = await getDoc(partRef);

        if (partSnap.exists()) {
          // ✅ participante: NÃO tenta ler events aqui (evita race condition / permission-denied).
          // Basta devolver um Event mínimo com id, porque a navegação será guiada por guestStatus
          // e a tela do evento fará o fetch completo depois.
          safe(() => {
            setEventFound({ id: eventId } as Event);
          });
          return;
        }

        // tenta ler evento para detectar owner
        try {
          const eventRef = doc(db, 'events', eventId);
          const eventSnap = await getDoc(eventRef);
          if (eventSnap.exists()) {
            const data: any = eventSnap.data();
            if (data?.userId && data.userId === immediateUid) {
              safe(() => setEventFound(mapEvent(eventId, data)));
            }
          }
        } catch (e: any) {}

        const summarySnap = await getDoc(doc(db, 'eventInviteSummaries', k));
        if (!summarySnap.exists()) {
          // Fallback: sem summary, ainda assim continuar com Event mínimo (id)
          safe(() => {
            setEventFound({ id: eventId } as Event);
            setGuestStatus('none');
          });
        } else {
          const summary = summarySnap.data() as InviteSummary;
          // ✅ não participante: usa SOMENTE o summary (nunca tenta ler events)
          safe(() => setEventFound(mapSummaryToEvent(eventId, summary)));
        }

        // opcional: best-effort tentar ler evento completo pra detectar owner sem flas
      } catch (err) {
        safe(() => {
          setEventFound(null);
          setGuestStatus('none');
          setRequiresAuth(false);
        });
      } finally {
        safe(() => setIsLoading(false));
      }
    };

    run();

    return () => {
      cancelled = true;
      try {
        unsubParticipation?.();
      } catch {}
    };
  }, [k, uid]);

  return { isLoading, eventFound, guestStatus, requiresAuth };
}
