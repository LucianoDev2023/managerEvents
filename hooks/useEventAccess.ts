import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useEvents } from '@/context/EventsContext';
import { Event } from '@/types'; // substitua pelo seu tipo real, se houver

type GuestStatus = 'none' | 'confirmed' | 'interested';

export function useEventAccess(title?: string, accessCode?: string) {
  const { state, getGuestParticipation } = useEvents();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [verifyingAccess, setVerifyingAccess] = useState(true);
  const [eventFound, setEventFound] = useState<Event | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [guestStatus, setGuestStatus] = useState<GuestStatus>('none');

  const user = getAuth().currentUser;
  const userEmail = user?.email ?? 'convidado@anonimo.com';

  // 🔎 Busca o evento com base no título e código
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

  const refetchAccess = async () => {
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

  useEffect(() => {
    refetchAccess().finally(() => setVerifyingAccess(false));
  }, [eventFound, userEmail]);

  return {
    isLoading: isLoading || verifyingAccess,
    eventFound,
    isCreator,
    guestStatus,
    refetchAccess, // <== aqui
  };
}
