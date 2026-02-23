import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/config/firebase';
import { pickUniqueShareKey } from '@/lib/utils/shareKey';

type InviteSummaryDoc = {
  v: 1;
  shareKey: string;
  eventId: string;

  // ✅ mesmos nomes do seu Event (pra UI reaproveitar)
  title: string;
  coverImage: string | null;
  location: string;
  startDate: any;
  endDate: any;
  expiresAt?: any;

  createdAt?: any;
};

export async function createInviteForEvent(eventId: string, ttlHours: number = 72) {
  const u = getAuth().currentUser;
  if (!u) throw new Error('not-authenticated');
  if (u.isAnonymous) throw new Error('anonymous-blocked');
  const uid = u.uid;

  // 1) gera shareKey único
  const shareKey = await pickUniqueShareKey();

  // calcula expiresAt com base no TTL escolhido pelo organizador
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + ttlHours * 60 * 60 * 1000),
  );

  // 2) grava eventShareKeys/{shareKey}
  try {
    await setDoc(doc(db, 'eventShareKeys', shareKey), {
      eventId,
      expiresAt,
      createdAt: serverTimestamp(),
    });
  } catch (e: any) {
    if (e?.code === 'permission-denied')
      throw new Error('invite-permission-denied');
    throw e;
  }

  // 3) lê evento (precisa ter permissão; normalmente owner)
  const eventSnap = await getDoc(doc(db, 'events', eventId));
  if (!eventSnap.exists()) throw new Error('event-not-found');
  const event = eventSnap.data() as any;

  // 4) cria preview seguro em eventInviteSummaries/{shareKey}
  const summary: InviteSummaryDoc = {
    v: 1,
    shareKey,
    eventId,
    title: event.title ?? 'Evento',
    coverImage: event.coverImage ?? null,
    location: event.location ?? '',
    startDate: event.startDate ?? null,
    endDate: event.endDate ?? null,
    expiresAt,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'eventInviteSummaries', shareKey), summary, {
      merge: true,
    });
  } catch (e: any) {
    if (e?.code === 'permission-denied')
      throw new Error('invite-permission-denied');
    throw e;
  }

  return shareKey;
}


export async function createInviteSummary(shareKey: string, eventId: string) {
  const u = getAuth().currentUser;
  if (!u) throw new Error('not-authenticated');
  if (u.isAnonymous) throw new Error('anonymous-blocked');
  const uid = u.uid;

  const eventSnap = await getDoc(doc(db, 'events', eventId));
  if (!eventSnap.exists()) throw new Error('event-not-found');
  const event = eventSnap.data() as any;

  const keySnap = await getDoc(doc(db, 'eventShareKeys', shareKey));
  const expiresAt = keySnap.exists() ? keySnap.data()?.expiresAt : null;

  const summary: InviteSummaryDoc = {
    v: 1,
    shareKey,
    eventId,
    title: event.title ?? 'Evento',
    coverImage: event.coverImage ?? null,
    location: event.location ?? '',
    startDate: event.startDate ?? null,
    endDate: event.endDate ?? null,
    expiresAt,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'eventInviteSummaries', shareKey), summary, {
      merge: true,
    });
  } catch (e: any) {
    if (e?.code === 'permission-denied')
      throw new Error('invite-permission-denied');
    throw e;
  }
}
