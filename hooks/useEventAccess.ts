import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useEvents } from '@/context/EventsContext';

export function useEventAccess(title?: string, accessCode?: string) {
  const { state, getGuestParticipation } = useEvents(); // atualizado
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
    if (!title || !accessCode) {
      setIsLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (!eventFound) {
        console.warn('❌ Evento não encontrado após 8 segundos.');
        setIsLoading(false);
      }
    }, 8000);

    const normalizedAccessCode = accessCode.toLowerCase().trim();
    const normalizedTitle = title.toLowerCase().trim();

    const found = state.events.find(
      (e) =>
        e.accessCode?.toLowerCase().trim() === normalizedAccessCode &&
        e.title?.toLowerCase().trim() === normalizedTitle
    );

    if (found) {
      setEventFound(found);
      clearTimeout(timeout);
      setIsLoading(false);
    }

    return () => clearTimeout(timeout);
  }, [state.events, title, accessCode]);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!eventFound || !userEmail) return;

      const isCreatorUser =
        eventFound.createdBy?.toLowerCase() === userEmail.toLowerCase();
      setIsCreator(isCreatorUser);

      if (isCreatorUser) {
        router.replace(`/events/${eventFound.id}`);
        return;
      }

      try {
        const participation = await getGuestParticipation(
          eventFound.id,
          userEmail
        );

        if (participation) {
          const status =
            participation.mode === 'confirmado' ? 'confirmed' : 'interested';
          setGuestStatus(status);
          router.replace(`/events/${eventFound.id}`);
        } else {
          setGuestStatus('none');
        }
      } catch (error) {
        console.error('Erro ao buscar participação:', error);
        setGuestStatus('none');
      }
    };

    verifyAccess();
  }, [eventFound, userEmail]);

  return {
    isLoading,
    eventFound,
    isCreator,
    guestStatus,
  };
}
