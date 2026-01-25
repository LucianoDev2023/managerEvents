import type { Event } from '@/types';
import type { GuestMode } from '@/types/guestParticipation';

export type EventVM = Event & {
  myGuestMode?: GuestMode; // 'confirmado' | 'acompanhando'
  shareKey?: string;
};
