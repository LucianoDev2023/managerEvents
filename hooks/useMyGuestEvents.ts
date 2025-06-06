// hooks/useMyGuestEvents.ts
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useEvents } from '@/context/EventsContext';
import type { Event } from '@/types';

type GuestEvent = {
  event: Event;
  mode: 'confirmado' | 'acompanhando';
};

export function useMyGuestEvents() {
  const { state, getGuestByEmail } = useEvents();
  const [guestEvents, setGuestEvents] = useState<GuestEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const userEmail = getAuth().currentUser?.email?.toLowerCase();

  useEffect(() => {
    if (!userEmail || state.events.length === 0) {
      setLoading(false);
      return;
    }

    const fetchGuestEvents = async () => {
      const results: GuestEvent[] = [];

      for (const event of state.events) {
        const guest = await getGuestByEmail(event.id, userEmail);
        if (
          guest &&
          (guest.mode === 'confirmado' || guest.mode === 'acompanhando')
        ) {
          results.push({ event, mode: guest.mode });
        }
      }

      setGuestEvents(results);
      setLoading(false);
    };

    fetchGuestEvents();
  }, [state.events, userEmail]);

  return { guestEvents, loading };
}
