// guestService.ts

import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

type GuestParticipation = {
  id: string;
  eventId: string;
  userEmail: string;
  mode: 'confirmado' | 'acompanhando';
  family?: string[];
  timestamp?: Date;
};

export async function getGuestParticipationsByEmail(
  email: string
): Promise<GuestParticipation[]> {
  const q = query(
    collection(db, 'guestParticipations'),
    where('userEmail', '==', email.toLowerCase())
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<GuestParticipation, 'id'>),
  }));
}

export async function getGuestParticipationsByEventId(
  eventId: string
): Promise<GuestParticipation[]> {
  const q = query(
    collection(db, 'guestParticipations'),
    where('eventId', '==', eventId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<GuestParticipation, 'id'>),
  }));
}
