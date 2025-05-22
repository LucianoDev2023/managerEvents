// Versão COMPLETA e FUNCIONAL do EventsContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Event, Program, Activity, Photo } from '@/types';
import { db, storage } from '@/config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// --- Types ---
type EventsState = {
  events: Event[];
  loading: boolean;
  error: string | null;
};

const initialState: EventsState = {
  events: [],
  loading: false,
  error: null,
};

type EventsAction =
  | { type: 'FETCH_EVENTS_START' }
  | { type: 'FETCH_EVENTS_SUCCESS'; payload: Event[] }
  | { type: 'FETCH_EVENTS_ERROR'; payload: string }
  | { type: 'ADD_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'DELETE_EVENT'; payload: string };

const eventsReducer = (
  state: EventsState,
  action: EventsAction
): EventsState => {
  switch (action.type) {
    case 'FETCH_EVENTS_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_EVENTS_SUCCESS':
      return { ...state, events: action.payload, loading: false };
    case 'FETCH_EVENTS_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.payload),
      };
    default:
      return state;
  }
};

// --- Context Type ---
type EventsContextType = {
  state: EventsState;
  fetchEvents: () => Promise<void>;
  addEvent: (data: Omit<Event, 'id' | 'programs'>) => Promise<string>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  addProgram: (eventId: string, date: Date) => Promise<void>;
  deleteProgram: (eventId: string, programId: string) => Promise<void>;
  addActivity: (
    eventId: string,
    programId: string,
    data: Omit<Activity, 'id'>
  ) => Promise<void>;
  updateActivity: (
    eventId: string,
    programId: string,
    activity: Activity
  ) => Promise<void>;
  deleteActivity: (
    eventId: string,
    programId: string,
    activityId: string
  ) => Promise<void>;
  addPhoto: (
    eventId: string,
    programId: string,
    activityId: string,
    publicId: string,
    uri: string,
    description: string
  ) => Promise<void>;

  deletePhoto: (
    eventId: string,
    programId: string,
    photoId: string
  ) => Promise<void>;
};

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(eventsReducer, initialState);

  const fetchEvents = async () => {
    dispatch({ type: 'FETCH_EVENTS_START' });
    try {
      const eventsSnap = await getDocs(
        query(collection(db, 'events'), orderBy('startDate', 'desc'))
      );
      const events: Event[] = [];

      for (const eventDoc of eventsSnap.docs) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;

        const programsSnap = await getDocs(
          query(collection(db, 'programs'), where('eventId', '==', eventId))
        );

        const programs: Program[] = [];

        for (const programDoc of programsSnap.docs) {
          const programData = programDoc.data();
          const programId = programDoc.id;

          const activitiesSnap = await getDocs(
            query(
              collection(db, 'activities'),
              where('programId', '==', programId)
            )
          );

          const activities: Activity[] = [];
          const activityIds: string[] = [];

          for (const actDoc of activitiesSnap.docs) {
            const actData = actDoc.data();
            activityIds.push(actDoc.id);
            activities.push({ id: actDoc.id, ...actData } as Activity);
          }

          const photosSnap = activityIds.length
            ? await getDocs(
                query(
                  collection(db, 'photos'),
                  where('activityId', 'in', activityIds)
                )
              )
            : { docs: [] };

          const photosMap = new Map<string, Photo[]>();
          for (const photoDoc of photosSnap.docs) {
            const data = photoDoc.data();
            const activityId = data.activityId;
            const photo: Photo = {
              activityId: data.activityId,
              id: photoDoc.id,
              programId: data.programId,
              uri: data.uri,
              publicId: data.publicId,
              timestamp: data.timestamp?.toDate?.() ?? new Date(),
              description: data.description ?? '',
            };
            if (!photosMap.has(activityId)) photosMap.set(activityId, []);
            photosMap.get(activityId)!.push(photo);
          }

          const activitiesWithPhotos = activities.map((a) => ({
            ...a,
            photos: photosMap.get(a.id) ?? [],
          }));

          programs.push({
            id: programId,
            eventId,
            date: programData.date.toDate(),
            activities: activitiesWithPhotos,
            photos: [],
          });
        }

        events.push({
          id: eventId,
          title: eventData.title,
          location: eventData.location,
          description: eventData.description,
          startDate: eventData.startDate.toDate(),
          endDate: eventData.endDate.toDate(),
          accessCode: eventData.accessCode ?? '',
          coverImage: eventData.coverImage || '',
          userId: eventData.userId,
          createdBy: eventData.createdBy ?? '',
          subAdmins: eventData.subAdmins ?? [], // ✅ Adicionado aqui
          programs,
        });
      }

      dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: events });
    } catch (err: any) {
      dispatch({ type: 'FETCH_EVENTS_ERROR', payload: err.message });
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addEvent = async (data: Omit<Event, 'id' | 'programs'>) => {
    const user = getAuth().currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const userEmail = user.email?.toLowerCase() ?? '';
    const normalizeDate = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const docRef = await addDoc(collection(db, 'events'), {
      ...data,
      userId: user.uid,
      createdBy: userEmail, // 👈 Usa o email do usuário logado como criador
      subAdmins: data.subAdmins ?? [],
      startDate: Timestamp.fromDate(normalizeDate(data.startDate)),
      endDate: Timestamp.fromDate(normalizeDate(data.endDate)),
      createdAt: Timestamp.now(),
      coverImage: data.coverImage || '',
    });

    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: docRef.id,
        ...data,
        userId: user.uid,
        createdBy: userEmail, // 👈 Mantém a consistência com o que foi salvo
        subAdmins: data.subAdmins ?? [],
        coverImage: data.coverImage ?? '',
        programs: [],
      },
    });

    return docRef.id;
  };

  const updateEvent = async (event: Event) => {
    await updateDoc(doc(db, 'events', event.id), {
      title: event.title,
      location: event.location,
      description: event.description,
      startDate: Timestamp.fromDate(event.startDate),
      endDate: Timestamp.fromDate(event.endDate),
      coverImage: event.coverImage || '',
      userId: event.userId,
      subAdmins: event.subAdmins ?? [], // ✅ Aqui também
    });

    dispatch({ type: 'UPDATE_EVENT', payload: event });
  };

  const deleteEvent = async (eventId: string) => {
    await deleteDoc(doc(db, 'events', eventId));
    dispatch({ type: 'DELETE_EVENT', payload: eventId });
  };

  const addProgram = async (eventId: string, date: Date) => {
    await addDoc(collection(db, 'programs'), {
      eventId,
      date: Timestamp.fromDate(date),
    });
    await fetchEvents();
  };

  const deleteProgram = async (eventId: string, programId: string) => {
    await deleteDoc(doc(db, 'programs', programId));
    await fetchEvents();
  };

  const addActivity = async (
    eventId: string,
    programId: string,
    data: Omit<Activity, 'id'>
  ) => {
    await addDoc(collection(db, 'activities'), {
      ...data,
      programId,
      createdAt: Timestamp.now(),
    });
    await fetchEvents();
  };

  const updateActivity = async (
    eventId: string,
    programId: string,
    activity: Activity
  ) => {
    await updateDoc(doc(db, 'activities', activity.id), {
      title: activity.title,
      time: activity.time,
      description: activity.description,
    });
    await fetchEvents();
  };

  const deleteActivity = async (
    eventId: string,
    programId: string,
    activityId: string
  ) => {
    await deleteDoc(doc(db, 'activities', activityId));
    await fetchEvents();
  };

  const addPhoto = async (
    eventId: string,
    programId: string,
    activityId: string,
    publicId: string,
    uri: string,
    description: string
  ) => {
    console.log('Salvando no Firestore com descrição:', description);
    await addDoc(collection(db, 'photos'), {
      eventId,
      programId,
      activityId,
      publicId,
      uri,
      description: description.trim().slice(0, 100),
      timestamp: Timestamp.now(),
    });

    await fetchEvents();
  };

  const deletePhoto = async (
    eventId: string,
    programId: string,
    photoId: string
  ) => {
    const photoSnap = await getDocs(
      query(collection(db, 'photos'), where('programId', '==', programId))
    );
    const photo = photoSnap.docs.find((doc) => doc.id === photoId);
    if (photo) {
      const { uri } = photo.data();
      await deleteDoc(doc(db, 'photos', photoId));
      await fetchEvents();
    }
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
