import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export type GuestParticipation = {
  userEmail: string;
  eventId: string;
  name: string;
  mode: 'confirmado' | 'acompanhando';
  family?: string[];
};

// Adiciona uma nova participação (merge = cria ou atualiza)
export const addGuestParticipation = async (
  participation: GuestParticipation
) => {
  const docId = `${participation.eventId}_${participation.userEmail}`;
  const ref = doc(db, 'guestParticipations', docId);
  await setDoc(ref, participation, { merge: true });
};

// Busca todas as participações de um usuário
export const getGuestParticipationsByEmail = async (userEmail: string) => {
  const q = query(
    collection(db, 'guestParticipations'),
    where('userEmail', '==', userEmail)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as GuestParticipation);
};

// Busca participação específica em um evento
export const getGuestParticipation = async (
  eventId: string,
  userEmail: string
) => {
  const docId = `${eventId}_${userEmail}`;
  const ref = doc(db, 'guestParticipations', docId);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? (snapshot.data() as GuestParticipation) : null;
};

// Atualiza dados da participação (ex: familiares, modo etc.)
export const updateParticipation = async (
  eventId: string,
  userEmail: string,
  updates: Partial<GuestParticipation>
) => {
  const docId = `${eventId}_${userEmail}`;
  const ref = doc(db, 'guestParticipations', docId);
  await updateDoc(ref, updates);
};
