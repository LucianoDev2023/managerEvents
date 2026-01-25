// src/utils/eventDocBuilders.ts
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Event } from '@/types';
import { normalizeSubAdminsByUid } from './eventPermissions';

// Entrada real usada para criar evento (sem id/programs)
type EventCreateInput = Omit<Event, 'id' | 'programs'> & {
  shareKey?: string; // ✅ novo (opcional para não quebrar legados)
};

export function buildEventCreateDoc(
  data: EventCreateInput,
  meta: { userId: string }
) {
  const { subAdminsByUid, subAdminUids } = normalizeSubAdminsByUid(data);

  const titleLower = data.title.trim().toLowerCase();

  return {
    // dados principais
    title: data.title,
    location: data.location,
    description: data.description,
    coverImage: data.coverImage ?? '',

    // ✅ NOVO: shareKey do convite (sem title/accesscode)
    // Se não vier, fica null (não quebra evento antigo)
    shareKey: data.shareKey ?? null,

    // 🔎 busca / legado
    titleLower,

    // dono
    userId: meta.userId,

    // permissões
    subAdminsByUid,
    subAdminUids,

    // datas
    startDate: Timestamp.fromDate(new Date(data.startDate)),
    endDate: Timestamp.fromDate(new Date(data.endDate)),

    // timestamps do servidor (mais consistente)
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildEventUpdateDoc(event: Event) {
  const { subAdminsByUid, subAdminUids } = normalizeSubAdminsByUid(event);

  const titleLower = event.title.trim().toLowerCase();

  return {
    title: event.title,
    location: event.location,
    description: event.description,
    coverImage: event.coverImage ?? '',

    // ✅ mantém shareKey se existir no objeto "event"
    // (se você não mandar shareKey no updateEvent, isso não altera nada)
    ...(event.shareKey ? { shareKey: event.shareKey } : {}),

    titleLower,

    // userId não muda
    userId: event.userId,

    subAdminsByUid,
    subAdminUids,

    startDate: Timestamp.fromDate(new Date(event.startDate)),
    endDate: Timestamp.fromDate(new Date(event.endDate)),

    updatedAt: serverTimestamp(),
  };
}
