// hooks/useGuestEvents.ts
import { useEffect, useState } from 'react';
import { useEvents } from '@/context/EventsContext';
import { getGuestParticipationsByEmail } from './guestService';
import { Event } from '@/types';
import { getAuth } from 'firebase/auth';

export function useGuestEvents() {
  const { state } = useEvents();
  const [guestEvents, setGuestEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuestEvents = async () => {
      try {
        const auth = getAuth();
        const email = auth.currentUser?.email?.toLowerCase();
        if (!email) return;

        const participations = await getGuestParticipationsByEmail(email);
        const eventIds = participations.map((p) => p.eventId);

        const matchedEvents = state.events.filter((event) =>
          eventIds.includes(event.id)
        );

        setGuestEvents(matchedEvents);
      } catch (err) {
        console.error('Erro ao carregar eventos do convidado:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGuestEvents();
  }, [state.events]);

  return { guestEvents, loading };
}
