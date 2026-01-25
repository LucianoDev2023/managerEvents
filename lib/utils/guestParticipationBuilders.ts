import { Timestamp, serverTimestamp } from 'firebase/firestore';
import type { GuestMode } from '@/types/guestParticipation';

export type GuestParticipationWritePayload = {
  eventId: string;
  userId: string;
  userName?: string;
  mode: GuestMode;
  family?: string[];
};

export function normalizeGuestMode(mode: unknown): GuestMode {
  const m = String(mode ?? '')
    .trim()
    .toLowerCase();

  if (m === 'confirmado') return 'confirmado';
  if (m === 'acompanhando') return 'acompanhando';

  return 'acompanhando';
}

export function buildGuestParticipationPayload(
  input: GuestParticipationWritePayload
) {
  return {
    eventId: input.eventId,
    userId: input.userId,
    userName: input.userName ?? null,
    mode: input.mode,
    family: input.family ?? [],
    updatedAt: Timestamp.now(),
    createdAt: serverTimestamp(),
  };
}
