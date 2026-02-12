import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { Event } from '@/types';
import { getAuth } from 'firebase/auth';
import { removeGuestParticipation } from './guestService';

const STORAGE_KEY = '@followed_events';

export function useFollowedEvents() {
  const [followedEvents, setFollowedEvents] = useState<Event[]>([]);
  const auth = getAuth();

  useEffect(() => {
    loadFollowedEvents();
  }, []);

  const loadFollowedEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setFollowedEvents(JSON.parse(stored));
    } catch (err) {
    }
  };

  const removeFollowedEvent = async (eventId: string) => {
    const updated = followedEvents.filter((e) => e.id !== eventId);
    setFollowedEvents(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // ✅ Remove do Firestore também se estiver logado
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await removeGuestParticipation(uid, eventId);
      } catch (e) {
      }
    }
  };

  const toggleFollowEvent = async (event: Event) => {
    const alreadyFollowed = followedEvents.some((e) => e.id === event.id);
    const uid = auth.currentUser?.uid;

    let updatedEvents;
    if (alreadyFollowed) {
      updatedEvents = followedEvents.filter((e) => e.id !== event.id);
      // Remove do Firestore se estiver deixando de seguir
      if (uid) {
        try {
          await removeGuestParticipation(uid, event.id);
        } catch (e) {}
      }
    } else {
      updatedEvents = [...followedEvents, event];
    }

    setFollowedEvents(updatedEvents);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
  };

  const isFollowing = (eventId: string) =>
    followedEvents.some((e) => e.id === eventId);

  return {
    followedEvents,
    toggleFollowEvent,
    isFollowing,
    removeFollowedEvent,
  };
}
