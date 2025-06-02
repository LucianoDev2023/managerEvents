// Versão 100% COMPLETA, REFINADA E ESCALÁVEL do EventsContext.tsx com Lazy Loading e Firebase

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Event, Program, Activity, Photo } from '@/types';
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
  confirmAttendance: (eventId: string, userEmail: string) => Promise<void>;
  refetchEventById: (eventId: string) => Promise<void>;

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
  loadProgramsByEventId: (eventId: string) => Promise<void>;
  loadActivitiesByProgramId: (programId: string) => Promise<void>;
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
          confirmedGuests: data.confirmedGuests ?? [],
          programs: [],
        };
      });
      dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: events });
    } catch (err: any) {
      dispatch({ type: 'FETCH_EVENTS_ERROR', payload: err.message });
    }
  };

  const loadProgramsByEventId = async (eventId: string) => {
    const snap = await getDocs(
      query(collection(db, 'programs'), where('eventId', '==', eventId))
    );
    const programs: Program[] = snap.docs.map((doc) => ({
      id: doc.id,
      eventId,
      date: doc.data().date.toDate(),
      activities: [],
      photos: [],
    }));
    dispatch({ type: 'SET_PROGRAMS', payload: { eventId, programs } });
  };

  const loadActivitiesByProgramId = async (programId: string) => {
    const snap = await getDocs(
      query(collection(db, 'activities'), where('programId', '==', programId))
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
    const photosSnap = await getDocs(
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

    const photos: Photo[] = photosSnap.docs.map((doc) => ({
      id: doc.id,
      activityId,
      programId,
      uri: doc.data().uri,
      publicId: doc.data().publicId,
      timestamp: doc.data().timestamp?.toDate?.() ?? new Date(),
      description: doc.data().description ?? '',
    }));
    dispatch({ type: 'SET_PHOTOS', payload: { activityId, photos } });
  };

  const refetchEventById = async (eventId: string) => {
    try {
      // 1. Buscar evento principal
      const eventSnap = await getDoc(doc(db, 'events', eventId));
      if (!eventSnap.exists()) throw new Error('Evento não encontrado');
      const eventData = eventSnap.data();

      // 2. Buscar todos os programas do evento
      const programsSnap = await getDocs(
        query(collection(db, 'programs'), where('eventId', '==', eventId))
      );

      const programs: Program[] = [];

      for (const programDoc of programsSnap.docs) {
        const programId = programDoc.id;
        const programData = programDoc.data();

        // 3. Buscar atividades do programa
        const activitiesSnap = await getDocs(
          query(
            collection(db, 'activities'),
            where('programId', '==', programId)
          )
        );

        const activities: Activity[] = [];

        for (const activityDoc of activitiesSnap.docs) {
          const activityId = activityDoc.id;
          const activityData = activityDoc.data();

          // 4. Buscar fotos da atividade
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
                activityId: p.activityId,
                programId: p.programId,
                uri: p.uri,
                publicId: p.publicId,
                description: p.description ?? '',
                timestamp: p.timestamp?.toDate?.() ?? new Date(),
              };
            }
          );

          activities.push({
            id: activityId,
            programId: activityData.programId,
            time: activityData.time,
            title: activityData.title,
            description: activityData.description,
            photos: activityPhotos,
          });
        }

        // 5. Buscar fotos diretamente ligadas ao programa (não à atividade)
        const programPhotosSnap = await getDocs(
          query(
            collection(db, 'photos'),
            where('programId', '==', programId),
            where('activityId', '==', '')
          )
        );

        const programPhotos: Photo[] = programPhotosSnap.docs.map(
          (photoDoc) => {
            const p = photoDoc.data();
            return {
              id: photoDoc.id,
              activityId: '',
              programId: p.programId,
              uri: p.uri,
              publicId: p.publicId,
              description: p.description ?? '',
              timestamp: p.timestamp?.toDate?.() ?? new Date(),
            };
          }
        );

        programs.push({
          id: programId,
          eventId: programData.eventId,
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
        confirmedGuests: eventData.confirmedGuests ?? [],
        programs,
      };

      dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
      console.log('Evento atualizado:', JSON.stringify(updatedEvent, null, 2));
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
    await addDoc(collection(db, 'programs'), {
      eventId,
      date: Timestamp.fromDate(date),
    });
    await loadProgramsByEventId(eventId);
  };

  const deleteProgram = async (eventId: string, programId: string) => {
    await deleteDoc(doc(db, 'programs', programId));
    await loadProgramsByEventId(eventId);
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
    await loadActivitiesByProgramId(programId);
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
    await loadActivitiesByProgramId(programId);
  };

  const deleteActivity = async (
    eventId: string,
    programId: string,
    activityId: string
  ) => {
    await deleteDoc(doc(db, 'activities', activityId));
    await loadActivitiesByProgramId(programId);
  };

  const addPhoto = async (
    eventId: string,
    programId: string,
    activityId: string,
    publicId: string,
    uri: string,
    description: string
  ) => {
    await addDoc(
      collection(
        db,
        'events',
        eventId,
        'programs',
        programId,
        'activities',
        activityId,
        'photos'
      ),
      {
        publicId,
        uri,
        description: description.trim().slice(0, 100),
        timestamp: Timestamp.now(),
      }
    );
    await loadPhotosByActivityId(eventId, programId, activityId);
  };

  const deletePhoto = async (
    eventId: string,
    programId: string,
    photoId: string
  ) => {
    await deleteDoc(doc(db, 'photos', photoId));
    await loadProgramsByEventId(eventId);
  };

  const confirmAttendance = async (eventId: string, userEmail: string) => {
    const ref = doc(db, 'events', eventId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Evento não encontrado');
    const data = snap.data();
    const confirmedGuests: string[] = data.confirmedGuests || [];
    if (!confirmedGuests.includes(userEmail)) {
      confirmedGuests.push(userEmail);
      await updateDoc(ref, { confirmedGuests });
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
        confirmAttendance,
        loadProgramsByEventId,
        loadActivitiesByProgramId,
        loadPhotosByActivityId,
        refetchEventById,
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
