import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useEvents } from '@/context/EventsContext';

export function useEventAccess(title?: string, accessCode?: string) {
  const { state, getGuestByEmail } = useEvents();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [eventFound, setEventFound] = useState<any | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [guestStatus, setGuestStatus] = useState<
    'none' | 'confirmed' | 'interested'
  >('none');

  const user = getAuth().currentUser;
  const userEmail = user?.email ?? 'convidado@anonimo.com';

  useEffect(() => {
    const verifyAccess = async () => {
      if (!title || !accessCode || !userEmail || state.events.length === 0) {
        setIsLoading(false);
        return;
      }

      // Gera uma chave de busca única combinando título e código de acesso
      const searchKey = `${title.toLowerCase().trim()}__${accessCode
        .toLowerCase()
        .trim()}`;

      // Busca usando a chave otimizada (assumindo que `event.searchKey` está presente nos dados do evento)
      const event = state.events.find(
        (e) =>
          `${e.title?.toLowerCase().trim()}__${e.accessCode
            ?.toLowerCase()
            .trim()}` === searchKey
      );

      if (!event) {
        setIsLoading(false);
        return;
      }

      setEventFound(event);

      const isCreatorUser =
        event.createdBy?.toLowerCase() === userEmail.toLowerCase();
      setIsCreator(isCreatorUser);

      if (isCreatorUser) {
        router.replace(`/events/${event.id}`);
        return;
      }

      const guest = await getGuestByEmail(event.id, userEmail);

      if (guest) {
        const status = guest.mode === 'confirmado' ? 'confirmed' : 'interested';
        setGuestStatus(status);
        router.replace(`/events/${event.id}`);
      } else {
        setGuestStatus('none');
      }

      setIsLoading(false);
    };

    verifyAccess();
  }, [state.events, title, accessCode, userEmail]);

  return {
    isLoading,
    eventFound,
    isCreator,
    guestStatus,
  };
}
