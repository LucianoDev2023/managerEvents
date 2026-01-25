type GuestMode = 'confirmado' | 'acompanhando';

export type GuestParticipation = {
  id: string;
  eventId: string;
  userId: string;
  userName?: string | null; // ✅ AQUI
  mode: GuestMode;
  family?: string[];
  createdAt?: any;
  updatedAt?: any;
};
