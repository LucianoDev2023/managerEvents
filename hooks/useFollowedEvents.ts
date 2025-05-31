import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { Event } from '@/types';

const STORAGE_KEY = '@followed_events';

export function useFollowedEvents() {
  const [followedEvents, setFollowedEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadFollowedEvents();
  }, []);

  const loadFollowedEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setFollowedEvents(JSON.parse(stored));
    } catch (err) {
      console.error('Erro ao carregar eventos seguidos', err);
    }
  };

  const removeFollowedEvent = async (eventId: string) => {
    const updated = followedEvents.filter((e) => e.id !== eventId);
    setFollowedEvents(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const toggleFollowEvent = async (event: Event) => {
    const alreadyFollowed = followedEvents.some((e) => e.id === event.id);
    let updatedEvents;
    if (alreadyFollowed) {
      updatedEvents = followedEvents.filter((e) => e.id !== event.id);
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
