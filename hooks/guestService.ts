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
  writeBatch,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import type { GuestParticipation } from '@/types/guestParticipation';
import { GuestMode } from '@/types';
import logger from '@/lib/logger';

const makeParticipationId = (userId: string, eventId: string) =>
  `${userId}_${eventId}`;

// -------------------------
// Mapper (fonte de verdade do id é docSnap.id)
// -------------------------
function mapParticipation(
  snap: QueryDocumentSnapshot | DocumentSnapshot,
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
// CREATE / UPSERT (com merge inteligente para family)
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

  // Se 'family' não foi enviado, tentamos manter o que já existe (evita overwrite destrutivo)
  let finalFamily = params.family;
  if (finalFamily === undefined) {
    try {
      const snap = await getDoc(doc(db, 'guestParticipations', id));
      if (snap.exists()) {
        finalFamily = (snap.data() as any).family ?? [];
      } else {
        finalFamily = [];
      }
    } catch (e: any) {
      // 💡 Se não temos permissão para ler (comum para novos convidados),
      // assumimos que não há família anterior para preservar.
      logger.debug(
        '[GuestService] ℹ️ Ignorando erro de leitura na pré-verificação:',
        e.code,
      );
      finalFamily = [];
    }
  }

  await setDoc(doc(db, 'guestParticipations', id), {
    userId,
    eventId,
    mode,
    userName: safeName,
    family: finalFamily,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// -------------------------
// GET (UID + eventId)
// -------------------------
export const getGuestParticipation = async (
  userId: string,
  eventId: string,
): Promise<GuestParticipation | null> => {
  if (!userId || !eventId) return null;

  const id = makeParticipationId(userId, eventId);
  try {
    const snap = await getDoc(doc(db, 'guestParticipations', id));
    if (!snap.exists()) return null;
    return mapParticipation(snap);
  } catch (e: any) {
    logger.debug(
      '[GuestService] getGuestParticipation denied or failed:',
      e?.code ?? e,
    );
    return null;
  }
};

// -------------------------
// GET by Doc ID (Admin)
// -------------------------
export const getGuestParticipationByDocId = async (
  docId: string,
): Promise<GuestParticipation | null> => {
  if (!docId) return null;

  const snap = await getDoc(doc(db, 'guestParticipations', docId));
  if (!snap.exists()) return null;

  return mapParticipation(snap);
};

// -------------------------
// LIST por usuário (Profile/Calendar)
// -------------------------
export const getGuestParticipationsByUserId = async (
  userId: string,
): Promise<GuestParticipation[]> => {
  if (!userId) return [];

  const q = query(
    collection(db, 'guestParticipations'),
    where('userId', '==', userId),
  );

  try {
    const snap = await getDocs(q);
    return snap.docs.map(mapParticipation);
  } catch (err: any) {
    return [];
  }
};

// -------------------------
// LIST por evento (Admin / Confirmados)
// -------------------------
export const getGuestParticipationsByEventId = async (
  eventId: string,
): Promise<GuestParticipation[]> => {
  if (!eventId) return [];

  const q = query(
    collection(db, 'guestParticipations'),
    where('eventId', '==', eventId),
  );

  const snap = await getDocs(q);
  return snap.docs.map(mapParticipation);
};

// -------------------------
// UPDATE (agora com setDoc merge para garantir robustez)
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

  // ✅ setDoc com merge evita erro "document not found" se a criação falhou silenciosamente antes
  // E incluir userId/eventId garante que a regra "allow create" passe se o doc for novo.
  await setDoc(
    doc(db, 'guestParticipations', id),
    {
      userId,
      eventId,
      ...safeUpdates,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

/**
 * ✅ Atualiza o userName em TODAS as participações de um usuário de uma vez.
 * Útil quando o usuário muda seu nome no perfil.
 */
export const updateAllParticipationsUserName = async (
  userId: string,
  newName: string,
) => {
  if (!userId) return;

  const q = query(
    collection(db, 'guestParticipations'),
    where('userId', '==', userId),
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  const safeName = newName.trim().length >= 2 ? newName.trim() : null;

  snap.docs.forEach((d) => {
    batch.update(d.ref, {
      userName: safeName,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
};

// -------------------------
// DELETE (sair do evento)
// -------------------------
export const removeGuestParticipation = async (
  userId: string,
  eventId: string,
) => {
  if (!userId || !eventId) throw new Error('userId e eventId são obrigatórios');

  const id = makeParticipationId(userId, eventId);
  await deleteDoc(doc(db, 'guestParticipations', id));
};

// -------------------------
// MANUAL GUEST (Admin Only)
// -------------------------
export const createManualGuest = async (params: {
  eventId: string;
  userName: string;
  family?: string[];
}) => {
  const { eventId, userName } = params;
  if (!eventId || !userName) throw new Error('Dados incompletos');

  // Gera ID único manual
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const docId = `manual_${timestamp}_${random}`;

  await setDoc(doc(db, 'guestParticipations', docId), {
    userId: `manual_${timestamp}`, // Fake UID para manter consistência
    eventId,
    mode: 'confirmado', // Sempre confirmado por padrão
    userName: userName.trim(),
    family: params.family ?? [],
    isManual: true, // Flag para identificar
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};
