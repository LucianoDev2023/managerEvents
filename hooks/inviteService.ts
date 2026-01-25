import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

  createdAt?: any;
};

export async function createInviteForEvent(eventId: string) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('not-authenticated');

  // 1) gera shareKey único
  const shareKey = await pickUniqueShareKey();

  // 2) grava eventShareKeys/{shareKey}
  await setDoc(doc(db, 'eventShareKeys', shareKey), {
    eventId,
    createdAt: serverTimestamp(),
  });

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
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'eventInviteSummaries', shareKey), summary, {
    merge: true,
  });

  return shareKey;
}

export async function createInviteSummary(shareKey: string, eventId: string) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('not-authenticated');

  const eventSnap = await getDoc(doc(db, 'events', eventId));
  if (!eventSnap.exists()) throw new Error('event-not-found');
  const event = eventSnap.data() as any;

  const summary: InviteSummaryDoc = {
    v: 1,
    shareKey,
    eventId,
    title: event.title ?? 'Evento',
    coverImage: event.coverImage ?? null,
    location: event.location ?? '',
    startDate: event.startDate ?? null,
    endDate: event.endDate ?? null,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'eventInviteSummaries', shareKey), summary, {
    merge: true,
  });
}
