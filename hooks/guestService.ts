import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  updateDoc,
  serverTimestamp,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import type { GuestParticipation } from '@/types/guestParticipation';
import { GuestMode } from '@/types';

const makeParticipationId = (userId: string, eventId: string) =>
  `${userId}_${eventId}`;

// -------------------------
// Mapper (fonte de verdade do id é docSnap.id)
// -------------------------
function mapParticipation(
  snap: QueryDocumentSnapshot | DocumentSnapshot
): GuestParticipation {
  const data = (snap.data() ?? {}) as Omit<GuestParticipation, 'id'>;

  return {
    id: snap.id,
    eventId: data.eventId,
    userId: data.userId,
    mode: data.mode as GuestMode,
    userName: data.userName ?? null,
    family: data.family ?? [],
    createdAt: (data as any).createdAt,
    updatedAt: (data as any).updatedAt,
  };
}

// -------------------------
// CREATE / UPSERT (sem merge, schema controlado)
// -------------------------
export const upsertGuestParticipation = async (params: {
  userId: string;
  eventId: string;
  mode: GuestMode;
  userName?: string | null;
  family?: string[];
}) => {
  const { userId, eventId, mode } = params;

  if (!userId || !eventId) throw new Error('userId e eventId são obrigatórios');

  const id = makeParticipationId(userId, eventId);

  // LGPD: só guarda nome se existir; senão null
  const safeName =
    (params.userName ?? '').trim().length >= 2 ? params.userName!.trim() : null;

  await setDoc(doc(db, 'guestParticipations', id), {
    userId,
    eventId,
    mode,
    userName: safeName,
    family: params.family ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// -------------------------
// GET (UID + eventId)
// -------------------------
export const getGuestParticipation = async (
  userId: string,
  eventId: string
): Promise<GuestParticipation | null> => {
  if (!userId || !eventId) return null;

  const id = makeParticipationId(userId, eventId);
  const snap = await getDoc(doc(db, 'guestParticipations', id));
  if (!snap.exists()) return null;

  return mapParticipation(snap);
};

// -------------------------
// LIST por usuário (Profile/Calendar)
// -------------------------
export const getGuestParticipationsByUserId = async (
  userId: string
): Promise<GuestParticipation[]> => {
  if (!userId) return [];

  const q = query(
    collection(db, 'guestParticipations'),
    where('userId', '==', userId)
  );

  const snap = await getDocs(q);
  return snap.docs.map(mapParticipation);
};

// -------------------------
// LIST por evento (Admin / Confirmados)
// -------------------------
export const getGuestParticipationsByEventId = async (
  eventId: string
): Promise<GuestParticipation[]> => {
  if (!eventId) return [];

  const q = query(
    collection(db, 'guestParticipations'),
    where('eventId', '==', eventId)
  );

  const snap = await getDocs(q);
  return snap.docs.map(mapParticipation);
};

// -------------------------
// UPDATE parcial (mode / family / userName)
// -------------------------
export const updateGuestParticipation = async (params: {
  userId: string;
  eventId: string;
  updates: Partial<Pick<GuestParticipation, 'mode' | 'family' | 'userName'>>;
}) => {
  const { userId, eventId, updates } = params;
  if (!userId || !eventId) throw new Error('userId e eventId são obrigatórios');

  const id = makeParticipationId(userId, eventId);

  const safeUpdates: any = { ...updates };

  if ('userName' in safeUpdates) {
    const v = (safeUpdates.userName ?? '').trim();
    safeUpdates.userName = v.length >= 2 ? v : null;
  }

  await updateDoc(doc(db, 'guestParticipations', id), {
    ...safeUpdates,
    updatedAt: serverTimestamp(),
  });
};

// -------------------------
// DELETE (sair do evento)
// -------------------------
export const removeGuestParticipation = async (
  userId: string,
  eventId: string
) => {
  if (!userId || !eventId) throw new Error('userId e eventId são obrigatórios');

  const id = makeParticipationId(userId, eventId);
  await deleteDoc(doc(db, 'guestParticipations', id));
};
