import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import type {
  Event,
  Program,
  Activity,
  Photo,
  Guest,
  PermissionLevel,
} from '@/types';
import { db } from '@/config/firebase';

import {
  collection,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type DocumentData,
  where,
  documentId,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { getAuth } from 'firebase/auth';
import {
  getGuestParticipation as getGuestParticipationService,
  getGuestParticipationsByUserId as getGuestParticipationsByUserIdService,
  getGuestParticipationsByEventId as getGuestParticipationsByEventIdService,
  updateGuestParticipation as updateGuestParticipationService,
  upsertGuestParticipation as upsertGuestParticipationService,
} from '@/hooks/guestService';

import { normalizeSubAdminsByUid } from '@/src/helpers/eventPermissions';
import {
  buildEventCreateDoc,
  buildEventUpdateDoc,
} from '@/src/helpers/eventDocBuilders';
import { GuestParticipation } from '@/types/guestParticipation';
import { EventVM } from '@/types/eventView';
import { pickUniqueShareKey } from '@/lib/utils/shareKey';
import { createInviteSummary } from '@/hooks/inviteService';

type GuestMode = GuestParticipation['mode'];

// --- Types ---
type EventsState = {
  events: EventVM[];
  programsByEventId: Record<string, Program[]>;
  activitiesByProgramId: Record<string, Activity[]>;
  photosByActivityId: Record<string, Photo[]>;
  loading: boolean;
  error: string | null;
};

const initialState: EventsState = {
  events: [],
  programsByEventId: {},
  activitiesByProgramId: {},
  photosByActivityId: {},
  loading: false,
  error: null,
};

type EventsAction =
  | { type: 'FETCH_EVENTS_START' }
  | { type: 'FETCH_EVENTS_SUCCESS'; payload: EventVM[] }
  | { type: 'FETCH_EVENTS_ERROR'; payload: string }
  | { type: 'SET_PROGRAMS'; payload: { eventId: string; programs: Program[] } }
  | {
      type: 'SET_ACTIVITIES';
      payload: { programId: string; activities: Activity[] };
    }
  | { type: 'SET_PHOTOS'; payload: { activityId: string; photos: Photo[] } }
  | { type: 'ADD_EVENT'; payload: EventVM }
  | { type: 'UPDATE_EVENT'; payload: EventVM }
  | { type: 'DELETE_EVENT'; payload: string };

const eventsReducer = (
  state: EventsState,
  action: EventsAction,
): EventsState => {
  switch (action.type) {
    case 'FETCH_EVENTS_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_EVENTS_SUCCESS':
      return { ...state, loading: false, events: action.payload };
    case 'FETCH_EVENTS_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.payload),
      };
    case 'SET_PROGRAMS':
      return {
        ...state,
        programsByEventId: {
          ...state.programsByEventId,
          [action.payload.eventId]: action.payload.programs,
        },
      };
    case 'SET_ACTIVITIES':
      return {
        ...state,
        activitiesByProgramId: {
          ...state.activitiesByProgramId,
          [action.payload.programId]: action.payload.activities,
        },
      };
    case 'SET_PHOTOS':
      return {
        ...state,
        photosByActivityId: {
          ...state.photosByActivityId,
          [action.payload.activityId]: action.payload.photos,
        },
      };
    default:
      return state;
  }
};

// --- Context Type ---
// ✅ Atualizado: guests por UID e docId = `${eventId}_${userId}`
type EventsContextType = {
  state: EventsState;
  fetchEvents: () => Promise<void>;
  addEvent: (data: Omit<Event, 'id' | 'programs'>) => Promise<string>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  addProgram: (eventId: string, date: Date) => Promise<void>;
  deleteProgram: (eventId: string, programId: string) => Promise<void>;
  refetchEventById: (eventId: string) => Promise<Event | null>;

  addActivity: (
    eventId: string,
    programId: string,
    data: Omit<Activity, 'id'>,
  ) => Promise<void>;
  updateActivity: (
    eventId: string,
    programId: string,
    activity: Activity,
  ) => Promise<void>;
  deleteActivity: (
    eventId: string,
    programId: string,
    activityId: string,
  ) => Promise<void>;
  addPhoto: (
    eventId: string,
    programId: string,
    activityId: string,
    publicId: string,
    uri: string,
    description: string,
  ) => Promise<void>;
  deletePhoto: (
    eventId: string,
    programId: string,
    activityId: string,
    photoId: string,
  ) => Promise<void>;

  // ✅ guestParticipations
  getGuestParticipationsByUserId: (
    userId: string,
  ) => Promise<GuestParticipation[]>;
  getGuestParticipationsByEventId: (
    eventId: string,
  ) => Promise<GuestParticipation[]>;
  getGuestParticipation: (
    eventId: string,
    userId: string,
  ) => Promise<GuestParticipation | null>;
  updateGuestParticipation: (
    eventId: string,
    userId: string,
    updates: Partial<GuestParticipation>,
  ) => Promise<void>;
  confirmPresence: (
    eventId: string,
    userName: string,
    mode: GuestMode,
    family?: string[],
  ) => Promise<void>;

  loadProgramsByEventId: (eventId: string) => Promise<void>;
  loadActivitiesByProgramId: (
    eventId: string,
    programId: string,
  ) => Promise<void>;
  loadPhotosByActivityId: (
    eventId: string,
    programId: string,
    activityId: string,
  ) => Promise<void>;

  getGuestsByEventId: (eventId: string) => Promise<Guest[]>;
};

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(eventsReducer, initialState);

  // ---------------------------
  // Events
  // ---------------------------
  const mapEvent = useCallback(
    (
      docSnap:
        | QueryDocumentSnapshot<DocumentData>
        | DocumentSnapshot<DocumentData>,
    ): Event => {
      const data = docSnap.data() || {};
      return {
        id: docSnap.id,
        title: data.title ?? '',
        location: data.location ?? '',
        description: data.description ?? '',
        startDate: data.startDate?.toDate?.() ?? new Date(),
        endDate: data.endDate?.toDate?.() ?? new Date(),
        coverImage: data.coverImage ?? '',
        shareKey: (data.shareKey ?? undefined) as string | undefined,
        userId: data.userId ?? '',
        subAdminsByUid: (data.subAdminsByUid ?? {}) as Record<string, any>,
        programs: [],
      };
    },
    [],
  );

  // ✅ Helper: sempre virar Date e pegar time
  function toMillis(value: any): number {
    if (!value) return 0;
    // Firestore Timestamp tem toDate()
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // ✅ Helper: chunk de 10 para where(documentId(), 'in', ...)
  function chunk<T>(arr: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // ✅ Tipagem útil pro mapEvent aceitar ambos
  type FireDoc = QueryDocumentSnapshot | DocumentSnapshot;

  const fetchEvents = useCallback(async () => {
    dispatch({ type: 'FETCH_EVENTS_START' });

    try {
      const user = getAuth().currentUser;
      const uid = user?.uid;

      if (!uid) {
        dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: [] });
        return;
      }

      // 1) Eventos do criador + 2) Eventos onde é subadmin
      const eventsRef = collection(db, 'events');

      const [ownerSnap, subadminSnap] = await Promise.all([
        getDocs(query(eventsRef, where('userId', '==', uid))),
        getDocs(query(eventsRef, where('subAdminUids', 'array-contains', uid))),
      ]);

      const eventsMap = new Map<string, Event>();

      ownerSnap.docs.forEach((d) =>
        eventsMap.set(d.id, mapEvent(d as FireDoc)),
      );
      subadminSnap.docs.forEach((d) =>
        eventsMap.set(d.id, mapEvent(d as FireDoc)),
      );

      // 3) Eventos onde é convidado (guestParticipations)
      const participations = await getGuestParticipationsByUserId(uid);

      const partsByEventId = new Map<string, 'confirmado' | 'acompanhando'>(
        participations
          .filter((p) => !!p.eventId)
          .map((p) => [p.eventId as string, p.mode]),
      );

      const eventIds = Array.from(
        new Set(
          participations
            .map((p) => p.eventId)
            .filter((id): id is string => !!id && typeof id === 'string'),
        ),
      );

      // ✅ Remove IDs que já vieram como owner/subadmin (evita busca repetida)
      const missingIds = eventIds.filter((id) => !eventsMap.has(id));

      if (missingIds.length) {
        const batches = chunk(missingIds, 10);

        const snaps = await Promise.all(
          batches.map((ids) =>
            getDocs(query(eventsRef, where(documentId(), 'in', ids))),
          ),
        );

        snaps.forEach((qs) => {
          qs.docs.forEach((d) => {
            const ev = mapEvent(d as FireDoc);
            eventsMap.set(ev.id, ev);
          });
        });
      }

      const merged: EventVM[] = Array.from(eventsMap.values())
        .map((ev) => ({
          ...ev,
          myGuestMode: partsByEventId.get(ev.id),
        }))
        .sort((a, b) => toMillis(b.startDate) - toMillis(a.startDate));

      dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: merged });
    } catch (err: any) {
      console.error('fetchEvents error:', err);
      dispatch({
        type: 'FETCH_EVENTS_ERROR',
        payload: err?.message ?? 'Erro ao buscar eventos',
      });
    }
  }, [mapEvent, dispatch, db]);

  const fetchEventsRef = React.useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    fetchEventsRef.current = fetchEvents;
  }, [fetchEvents]);

  useEffect(() => {
    const unsub = getAuth().onAuthStateChanged((user) => {
      if (user) fetchEventsRef.current();
      else dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: [] });
    });

    return () => unsub();
  }, []);

  const addEvent = async (data: Omit<Event, 'id' | 'programs'>) => {
    const user = getAuth().currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const { subAdminsByUid } = normalizeSubAdminsByUid(data);

    // 1) shareKey (sem reserva)
    let shareKey = '';
    try {
      shareKey = await pickUniqueShareKey();
    } catch (e) {
      throw e;
    }

    // 2) createDoc
    let createDoc: any;
    try {
      createDoc = buildEventCreateDoc(
        { ...data, subAdminsByUid, shareKey },
        { userId: user.uid },
      );
    } catch (e) {
      throw e;
    }

    // 3) cria events/{eventId}
    let eventId = '';
    try {
      const created = await addDoc(collection(db, 'events'), createDoc);
      eventId = created.id;
    } catch (e) {
      throw e;
    }

    // 4) cria mapping eventShareKeys/{shareKey}
    // Observação: sem createdAt pra evitar conflitos com rules + serverTimestamp
    try {
      await setDoc(
        doc(db, 'eventShareKeys', shareKey),
        { eventId },
        { merge: false },
      );

      try {
        await createInviteSummary(shareKey, eventId);
      } catch (e) {}
    } catch (e) {
      // 4.1) fallback: tenta outra key e atualiza o event (mantém consistência)
      // Se você quiser só debugar e NÃO fazer fallback, comente este bloco inteiro.
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const newKey = await pickUniqueShareKey();

          // atualiza evento com a nova key
          await setDoc(
            doc(db, 'events', eventId),
            { shareKey: newKey },
            { merge: true },
          );

          // tenta criar mapping com a nova key
          await setDoc(
            doc(db, 'eventShareKeys', newKey),
            { eventId },
            { merge: false },
          );

          try {
            await createInviteSummary(newKey, eventId);
          } catch (e) {}

          shareKey = newKey;

          break;
        } catch (fallbackErr) {
          if (attempt === 2) throw e; // lança o erro original do mapping
        }
      }
    }

    // 5) dispatch
    try {
      dispatch({
        type: 'ADD_EVENT',
        payload: {
          ...data,
          id: eventId,
          userId: user.uid,
          subAdminsByUid,
          shareKey,
          programs: [],
        },
      });
    } catch (e) {}

    return eventId;
  };

  const updateEvent = async (event: Event) => {
    const { subAdminsByUid } = normalizeSubAdminsByUid(event);

    const updateDocPayload = buildEventUpdateDoc({
      ...event,
      subAdminsByUid,
    });

    await updateDoc(doc(db, 'events', event.id), updateDocPayload);

    dispatch({
      type: 'UPDATE_EVENT',
      payload: { ...event, subAdminsByUid },
    });
  };

  const deleteEvent = async (eventId: string) => {
    await deleteDoc(doc(db, 'events', eventId));
    dispatch({ type: 'DELETE_EVENT', payload: eventId });
  };

  // ---------------------------
  // Lazy loading: Programs/Activities/Photos
  // ---------------------------

  const loadProgramsByEventId = async (eventId: string) => {
    try {
      const snap = await getDocs(collection(db, 'events', eventId, 'programs'));

      const programs: Program[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          eventId,
          date: data.date?.toDate?.() ?? new Date(),
          activities: [],
          photos: [],
        };
      });

      dispatch({ type: 'SET_PROGRAMS', payload: { eventId, programs } });
    } catch (error) {
      console.error('Erro ao carregar os programas:', error);
    }
  };

  const loadActivitiesByProgramId = async (
    eventId: string,
    programId: string,
  ) => {
    const snap = await getDocs(
      collection(db, 'events', eventId, 'programs', programId, 'activities'),
    );

    const activities: Activity[] = snap.docs.map((d) => ({
      id: d.id,
      programId,
      title: d.data().title,
      time: d.data().time,
      description: d.data().description,
      photos: [],
    }));

    dispatch({ type: 'SET_ACTIVITIES', payload: { programId, activities } });
  };

  const loadPhotosByActivityId = async (
    eventId: string,
    programId: string,
    activityId: string,
  ) => {
    const snap = await getDocs(
      collection(
        db,
        'events',
        eventId,
        'programs',
        programId,
        'activities',
        activityId,
        'photos',
      ),
    );

    const photos: Photo[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        activityId,
        programId,
        uri: data.uri,
        publicId: data.publicId,
        timestamp: data.timestamp?.toDate?.() ?? new Date(),
        description: data.description ?? '',
        createdBy: data.createdBy ?? '',
      };
    });

    dispatch({ type: 'SET_PHOTOS', payload: { activityId, photos } });
  };

  // Dentro do seu EventsContext (ou onde estiver)
  // ✅ versão completa com logs + identificação do "ponto" que falhou
  // helper opcional: log bonito
  function logStep(tag: string, data?: any) {
    try {
    } catch {
      // ignore
    }
  }

  const refetchLocksRef = { current: new Map<string, Promise<Event | null>>() };
  // Se preferir, declare isso no topo do EventsContext:
  // const refetchLocksRef = useRef<Map<string, Promise<Event | null>>>(new Map());

  const refetchEventById = async (eventId: string): Promise<Event | null> => {
    // ✅ se já tem uma chamada em andamento para o MESMO eventId, reaproveita
    const existing = refetchLocksRef.current.get(eventId);
    if (existing) {
      logStep('JOIN in-flight refetch', { eventId });
      return existing;
    }

    const task = (async () => {
      console.log('🧭 [refetchEventById] CALLED FROM:\n', new Error().stack);

      const auth = getAuth();
      const uid = auth.currentUser?.uid ?? null;
      const startedAt = Date.now();

      logStep('START', { eventId, uid });

      // ✅ retry/backoff apenas para permission-denied (race condition)
      const delays = [0, 250, 600, 1200]; // 4 tentativas (0 + 3 retries)

      let lastErr: any = null;

      for (let attempt = 0; attempt < delays.length; attempt++) {
        const delay = delays[attempt];

        if (delay > 0) {
          logStep('retry wait', { eventId, delay, attempt: attempt + 1 });
          await new Promise((r) => setTimeout(r, delay));
        }

        try {
          // 1) EVENT DOC
          const eventPath = `events/${eventId}`;
          logStep('READ event doc ->', eventPath);

          const eventRef = doc(db, 'events', eventId);
          const eventSnap = await getDoc(eventRef);

          logStep('event doc read OK', {
            exists: eventSnap.exists(),
            id: eventSnap.id,
          });

          if (!eventSnap.exists()) throw new Error('Evento não encontrado');

          const eventData: any = eventSnap.data();

          logStep('event.userId check', {
            eventUserId: eventData.userId ?? null,
            uid,
            isOwner: uid ? eventData.userId === uid : false,
            hasSubAdmin: uid ? !!eventData.subAdminsByUid?.[uid] : false,
          });

          // 2) PROGRAMS
          const programsPath = `events/${eventId}/programs`;
          logStep('READ programs ->', programsPath);

          const programsRef = collection(db, 'events', eventId, 'programs');
          const programsSnap = await getDocs(programsRef);

          logStep('programs read OK', { count: programsSnap.size });

          const programs: Program[] = [];

          for (const programDoc of programsSnap.docs) {
            const programId = programDoc.id;
            const programData: any = programDoc.data();

            logStep('PROGRAM', { programId });

            // 3) ACTIVITIES
            const activitiesPath = `events/${eventId}/programs/${programId}/activities`;
            logStep('READ activities ->', activitiesPath);

            const activitiesRef = collection(
              db,
              'events',
              eventId,
              'programs',
              programId,
              'activities',
            );
            const activitiesSnap = await getDocs(activitiesRef);

            logStep('activities read OK', {
              programId,
              count: activitiesSnap.size,
            });

            const activities: Activity[] = [];

            for (const activityDoc of activitiesSnap.docs) {
              const activityId = activityDoc.id;
              const activityData: any = activityDoc.data();

              logStep('ACTIVITY', { programId, activityId });

              // 4) PHOTOS
              const photosPath = `events/${eventId}/programs/${programId}/activities/${activityId}/photos`;
              logStep('READ photos ->', photosPath);

              const photosRef = collection(
                db,
                'events',
                eventId,
                'programs',
                programId,
                'activities',
                activityId,
                'photos',
              );

              const activityPhotosSnap = await getDocs(photosRef);

              logStep('photos read OK', {
                programId,
                activityId,
                count: activityPhotosSnap.size,
              });

              const activityPhotos: Photo[] = activityPhotosSnap.docs.map(
                (photoDoc) => {
                  const p: any = photoDoc.data();
                  return {
                    id: photoDoc.id,
                    activityId,
                    programId,
                    uri: p.uri,
                    publicId: p.publicId,
                    description: p.description ?? '',
                    timestamp: p.timestamp?.toDate?.() ?? new Date(),
                    createdBy: p.createdBy ?? '',
                  };
                },
              );

              activities.push({
                id: activityId,
                programId,
                title: activityData.title,
                time: activityData.time,
                description: activityData.description,
                photos: activityPhotos,
              });
            }

            programs.push({
              id: programId,
              eventId,
              date: programData.date?.toDate?.() ?? new Date(),
              activities,
              photos: [],
            });
          }

          const updatedEvent: Event = {
            id: eventSnap.id,
            title: eventData.title,
            location: eventData.location,
            description: eventData.description,
            startDate: eventData.startDate?.toDate?.() ?? new Date(),
            endDate: eventData.endDate?.toDate?.() ?? new Date(),
            coverImage: eventData.coverImage ?? '',
            userId: eventData.userId ?? '',
            subAdminsByUid: (eventData.subAdminsByUid ?? {}) as Record<
              string,
              PermissionLevel
            >,
            programs,
            shareKey: eventData.shareKey ?? '',
          };

          dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });

          logStep('DONE', {
            ms: Date.now() - startedAt,
            programs: programs.length,
            attempt: attempt + 1,
          });

          return updatedEvent;
        } catch (error: any) {
          lastErr = error;

          const errInfo = {
            name: error?.name,
            code: error?.code,
            message: error?.message,
            eventId,
            uid,
            ms: Date.now() - startedAt,
            attempt: attempt + 1,
          };

          // ✅ se for permission-denied, vamos tentar de novo (até acabar)
          if (
            error?.code === 'permission-denied' &&
            attempt < delays.length - 1
          ) {
            logStep('permission-denied (will retry)', errInfo);
            continue;
          }

          // ❌ aqui acabou (ou não é permission-denied)
          console.error('❌ [refetchEventById] FAILED', {
            ...errInfo,
            stack: error?.stack,
          });
          return null;
        }
      }

      // fallback (não deveria chegar aqui)
      console.error('❌ [refetchEventById] FAILED (exhausted retries)', {
        code: lastErr?.code,
        message: lastErr?.message,
        eventId,
        uid,
        ms: Date.now() - startedAt,
      });
      return null;
    })();

    refetchLocksRef.current.set(eventId, task);

    try {
      return await task;
    } finally {
      // ✅ libera lock
      refetchLocksRef.current.delete(eventId);
    }
  };

  // ---------------------------
  // CRUD Programs/Activities/Photos
  // ---------------------------

  const addProgram = async (eventId: string, date: Date) => {
    const programRef = collection(db, 'events', eventId, 'programs');

    await addDoc(programRef, {
      eventId,
      date: Timestamp.fromDate(date),
    });

    await refetchEventById(eventId);
    await loadProgramsByEventId(eventId);
  };

  const deleteProgram = async (eventId: string, programId: string) => {
    const programRef = doc(db, 'events', eventId, 'programs', programId);
    await deleteDoc(programRef);
    await refetchEventById(eventId);
  };

  const addActivity = async (
    eventId: string,
    programId: string,
    data: Omit<Activity, 'id'>,
  ) => {
    const activityRef = collection(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
    );

    await addDoc(activityRef, {
      programId,
      title: data.title,
      time: data.time,
      description: data.description,
    });

    await refetchEventById(eventId);
  };

  const updateActivity = async (
    eventId: string,
    programId: string,
    activity: Activity,
  ) => {
    const activityRef = doc(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activity.id,
    );

    await updateDoc(activityRef, {
      title: activity.title,
      time: activity.time,
      description: activity.description,
    });

    await loadActivitiesByProgramId(eventId, programId);
  };

  const deleteActivity = async (
    eventId: string,
    programId: string,
    activityId: string,
  ) => {
    const activityRef = doc(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activityId,
    );
    await deleteDoc(activityRef);
    await refetchEventById(eventId);
  };

  const addPhoto = async (
    eventId: string,
    programId: string,
    activityId: string,
    publicId: string,
    uri: string,
    description: string,
  ) => {
    const photoRef = collection(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activityId,
      'photos',
    );

    const user = getAuth().currentUser;

    await addDoc(photoRef, {
      activityId,
      programId,
      uri,
      publicId,
      description,
      timestamp: Timestamp.now(),
      createdBy: user?.email ?? '',
    });

    await refetchEventById(eventId);
  };

  const deletePhoto = async (
    eventId: string,
    programId: string,
    activityId: string,
    photoId: string,
  ) => {
    const photoRef = doc(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activityId,
      'photos',
      photoId,
    );
    await deleteDoc(photoRef);
    await refetchEventById(eventId);
  };

  // ---------------------------
  // ✅ Guest Participations
  // ---------------------------

  const getGuestParticipationsByUserId = async (userId: string) => {
    return getGuestParticipationsByUserIdService(userId);
  };

  const getGuestParticipationsByEventId = async (eventId: string) => {
    return getGuestParticipationsByEventIdService(eventId);
  };

  const getGuestParticipation = async (eventId: string, userId: string) => {
    return getGuestParticipationService(userId, eventId);
  };

  const updateGuestParticipation = async (
    eventId: string,
    userId: string,
    updates: Partial<Pick<GuestParticipation, 'mode' | 'family' | 'userName'>>,
  ) => {
    await updateGuestParticipationService({
      userId,
      eventId,
      updates,
    });
  };

  async function confirmPresence(
    eventId: string,
    userName: string,
    mode: GuestMode,
    family: string[] = [],
  ) {
    const user = getAuth().currentUser;
    if (!user?.uid) throw new Error('Usuário não autenticado');

    await upsertGuestParticipationService({
      userId: user.uid,
      eventId,
      mode,
      userName, // pode ser string, o service transforma em null se for inválido
      family,
    });
  }

  const getGuestsByEventId = async (eventId: string): Promise<Guest[]> => {
    const participations = await getGuestParticipationsByEventId(eventId);

    return participations.map((p) => ({
      userId: p.userId,
      name: p.userName ?? '',
      mode: p.mode,
      family: p.family ?? [],
    }));
  };

  return (
    <EventsContext.Provider
      value={{
        state,
        fetchEvents,
        addEvent,
        updateEvent,
        deleteEvent,
        addProgram,
        deleteProgram,
        addActivity,
        updateActivity,
        deleteActivity,
        addPhoto,
        deletePhoto,
        loadProgramsByEventId,
        loadActivitiesByProgramId,
        loadPhotosByActivityId,
        refetchEventById,

        // ✅ guests (UID)
        getGuestParticipationsByUserId,
        getGuestParticipationsByEventId,
        getGuestParticipation,
        updateGuestParticipation,
        confirmPresence,
        getGuestsByEventId,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) throw new Error('useEvents must be used within EventsProvider');
  return context;
};
