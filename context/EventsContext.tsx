// Versão 100% COMPLETA, REFINADA E ESCALÁVEL do EventsContext.tsx com Lazy Loading e Firebase

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Event, Program, Activity, Photo } from '@/types';
import { db } from '@/config/firebase';
import { Guest } from '@/types';

import {
  collection,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// --- Types ---
type EventsState = {
  events: Event[];
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
  | { type: 'FETCH_EVENTS_SUCCESS'; payload: Event[] }
  | { type: 'FETCH_EVENTS_ERROR'; payload: string }
  | { type: 'SET_PROGRAMS'; payload: { eventId: string; programs: Program[] } }
  | {
      type: 'SET_ACTIVITIES';
      payload: { programId: string; activities: Activity[] };
    }
  | { type: 'SET_PHOTOS'; payload: { activityId: string; photos: Photo[] } }
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
      return { ...state, loading: false, events: action.payload };
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
type EventsContextType = {
  state: EventsState;
  fetchEvents: () => Promise<void>;
  addEvent: (data: Omit<Event, 'id' | 'programs'>) => Promise<string>;
  updateEvent: (event: Event) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  addProgram: (eventId: string, date: Date) => Promise<void>;
  deleteProgram: (eventId: string, programId: string) => Promise<void>;
  refetchEventById: (eventId: string) => Promise<void>;
  getGuests: (eventId: string) => Promise<Guest[]>;
  saveGuest: (eventId: string, guest: Guest) => Promise<void>;
  deleteGuest: (eventId: string, guestEmail: string) => Promise<void>;
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
    activityId: string,
    photoId: string
  ) => Promise<void>;
  getGuestsByEventId: (eventId: string) => Promise<Guest[]>;
  getGuestByEmail: (eventId: string, email: string) => Promise<Guest | null>;
  addGuest: (eventId: string, guest: Guest) => Promise<void>;

  loadProgramsByEventId: (eventId: string) => Promise<void>;
  loadActivitiesByProgramId: (
    eventId: string,
    programId: string
  ) => Promise<void>;
  loadPhotosByActivityId: (
    eventId: string,
    programId: string,
    activityId: string
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
      const events: Event[] = eventsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          location: data.location,
          description: data.description,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          accessCode: data.accessCode ?? '',
          coverImage: data.coverImage ?? '',
          userId: data.userId,
          createdBy: data.createdBy ?? '',
          subAdmins: data.subAdmins ?? [],
          programs: [],
        };
      });
      dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: events });
    } catch (err: any) {
      dispatch({ type: 'FETCH_EVENTS_ERROR', payload: err.message });
    }
  };

  const loadProgramsByEventId = async (eventId: string) => {
    try {
      const snap = await getDocs(collection(db, 'events', eventId, 'programs'));

      const programs: Program[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          eventId,
          date: data.date?.toDate?.() ?? new Date(), // evita quebra se 'date' estiver undefined
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
    programId: string
  ) => {
    const snap = await getDocs(
      collection(db, 'events', eventId, 'programs', programId, 'activities')
    );
    const activities: Activity[] = snap.docs.map((doc) => ({
      id: doc.id,
      programId,
      title: doc.data().title,
      time: doc.data().time,
      description: doc.data().description,
      photos: [],
    }));
    dispatch({ type: 'SET_ACTIVITIES', payload: { programId, activities } });
  };

  const loadPhotosByActivityId = async (
    eventId: string,
    programId: string,
    activityId: string
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
        'photos'
      )
    );
    const photos: Photo[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
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

  const refetchEventById = async (eventId: string) => {
    try {
      // 1. Buscar evento principal
      const eventSnap = await getDoc(doc(db, 'events', eventId));
      if (!eventSnap.exists()) throw new Error('Evento não encontrado');
      const eventData = eventSnap.data();

      // 2. Buscar todos os programas do evento (subcoleção)
      const programsSnap = await getDocs(
        collection(db, 'events', eventId, 'programs')
      );

      const programs: Program[] = [];

      for (const programDoc of programsSnap.docs) {
        const programId = programDoc.id;
        const programData = programDoc.data();

        // 3. Buscar atividades do programa (subcoleção)
        const activitiesSnap = await getDocs(
          collection(db, 'events', eventId, 'programs', programId, 'activities')
        );

        const activities: Activity[] = [];

        for (const activityDoc of activitiesSnap.docs) {
          const activityId = activityDoc.id;
          const activityData = activityDoc.data();

          // 4. Buscar fotos da atividade (subcoleção)
          const activityPhotosSnap = await getDocs(
            collection(
              db,
              'events',
              eventId,
              'programs',
              programId,
              'activities',
              activityId,
              'photos'
            )
          );

          const activityPhotos: Photo[] = activityPhotosSnap.docs.map(
            (photoDoc) => {
              const p = photoDoc.data();
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
            }
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

        // 5. Buscar fotos diretamente do programa (se quiser implementar, crie subcoleção `photos` diretamente em `program`)
        const programPhotos: Photo[] = [];

        programs.push({
          id: programId,
          eventId,
          date: programData.date?.toDate?.() ?? new Date(),
          activities,
          photos: programPhotos,
        });
      }

      // 6. Atualizar evento no estado com os programas completos
      const updatedEvent: Event = {
        id: eventSnap.id,
        title: eventData.title,
        location: eventData.location,
        description: eventData.description,
        startDate: eventData.startDate.toDate(),
        endDate: eventData.endDate.toDate(),
        accessCode: eventData.accessCode ?? '',
        coverImage: eventData.coverImage ?? '',
        userId: eventData.userId,
        createdBy: eventData.createdBy ?? '',
        subAdmins: eventData.subAdmins ?? [],
        programs,
      };

      dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
    } catch (error) {
      console.error('Erro ao refetchEventById:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = getAuth().onAuthStateChanged((user) => {
      if (user) fetchEvents();
    });
    return () => unsubscribe();
  }, []);

  const addEvent = async (data: Omit<Event, 'id' | 'programs'>) => {
    const user = getAuth().currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    const userEmail = user.email?.toLowerCase() ?? '';
    const docRef = await addDoc(collection(db, 'events'), {
      ...data,
      userId: user.uid,
      createdBy: userEmail,
      subAdmins: data.subAdmins ?? [],
      startDate: Timestamp.fromDate(data.startDate),
      endDate: Timestamp.fromDate(data.endDate),
      createdAt: Timestamp.now(),
    });
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        ...data,
        id: docRef.id,
        userId: user.uid,
        createdBy: userEmail,
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
      subAdmins: event.subAdmins ?? [],
    });
    dispatch({ type: 'UPDATE_EVENT', payload: event });
  };

  const deleteEvent = async (eventId: string) => {
    await deleteDoc(doc(db, 'events', eventId));
    dispatch({ type: 'DELETE_EVENT', payload: eventId });
  };

  const addProgram = async (eventId: string, date: Date) => {
    try {
      const programRef = collection(db, 'events', eventId, 'programs');

      await addDoc(programRef, {
        eventId,
        date: Timestamp.fromDate(date),
      });

      await refetchEventById(eventId); // Atualiza os dados com novos programas
      await loadProgramsByEventId(eventId); // Opcional, se necessário para seu estado
    } catch (error) {
      console.error('Erro ao adicionar programa:', error);
      throw error;
    }
  };

  const deleteProgram = async (eventId: string, programId: string) => {
    const programRef = doc(db, 'events', eventId, 'programs', programId);
    await deleteDoc(programRef);
    await refetchEventById(eventId);
  };

  const addActivity = async (
    eventId: string,
    programId: string,
    data: Omit<Activity, 'id'>
  ) => {
    const activityRef = collection(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities'
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
    activity: Activity
  ) => {
    await updateDoc(doc(db, 'activities', activity.id), {
      title: activity.title,
      time: activity.time,
      description: activity.description,
    });
    await await loadActivitiesByProgramId(eventId, programId);
  };

  const deleteActivity = async (
    eventId: string,
    programId: string,
    activityId: string
  ) => {
    const activityRef = doc(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activityId
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
    description: string
  ) => {
    const photoRef = collection(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activityId,
      'photos'
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
    photoId: string
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
      photoId
    );
    await deleteDoc(photoRef);
    await refetchEventById(eventId);
  };

  const getGuestsByEventId = async (eventId: string): Promise<Guest[]> => {
    const guestsRef = collection(db, 'events', eventId, 'guests');
    const snapshot = await getDocs(guestsRef);
    return snapshot.docs.map((doc) => doc.data() as Guest);
  };

  const addGuest = async (eventId: string, guest: Guest) => {
    try {
      const guestRef = doc(db, 'events', eventId, 'guests', guest.email);
      await setDoc(guestRef, guest, { merge: true });
    } catch (error) {
      console.error('Erro ao adicionar convidado:', error);
      throw error;
    }
  };

  const getGuestByEmail = async (
    eventId: string,
    email: string
  ): Promise<Guest | null> => {
    try {
      const docRef = doc(db, 'events', eventId, 'guests', email);
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as Guest;
      return null;
    } catch (error) {
      console.error('[ERRO] getGuestByEmail:', error);
      return null;
    }
  };

  const getGuests = async (eventId: string): Promise<Guest[]> => {
    const guestsSnap = await getDocs(
      collection(db, 'events', eventId, 'guests')
    );
    return guestsSnap.docs.map((doc) => doc.data() as Guest);
  };

  const saveGuest = async (eventId: string, guest: Guest): Promise<void> => {
    const guestRef = doc(db, 'events', eventId, 'guests', guest.email);
    await setDoc(guestRef, guest, { merge: true });
  };

  const deleteGuest = async (
    eventId: string,
    guestEmail: string
  ): Promise<void> => {
    const guestRef = doc(db, 'events', eventId, 'guests', guestEmail);
    await deleteDoc(guestRef);
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
        getGuests,
        saveGuest,
        deleteGuest,
        getGuestsByEventId,
        addGuest,
        getGuestByEmail,
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
