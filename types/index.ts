export type PermissionLevel = 'Super Admin' | 'Admin parcial';

export type GuestStatus = 'confirmed' | 'interested';

export type Guest = {
  name: string;
  email: string;
  mode: 'confirmado' | 'acompanhando';
};

export type Event = {
  id: string;
  title: string;
  location: string;
  startDate: Date;
  endDate: Date;
  description: string;
  accessCode?: string;
  coverImage?: string;
  userId: string;
  createdBy: string;
  subAdmins?: SubAdmin[];
  programs: Program[];
  confirmedGuests?: Guest[]; // ✅ nova propriedade
};

export type SubAdmin = {
  email: string;
  level: PermissionLevel;
};

export type Program = {
  id: string;
  eventId: string;
  date: Date;
  activities: Activity[];
  photos: Photo[];
};

export type Activity = {
  id: string;
  programId: string;
  time: string;
  title: string;
  description: string;
  photos?: Photo[];
};

export type Photo = {
  id: string;
  activityId: string;
  programId: string;
  uri: string;
  timestamp: Date;
  publicId?: string;
  description?: string;
  comentarios?: string;
  createdBy: string;
};

export type FormValues = {
  title: string;
  location: string;
  startDate: Date;
  endDate: Date;
  description: string;
  accessCode: string;
  coverImage?: string;
  userId: string;
  createdBy: string;
};

type LocationScreenParams = {
  redirectTo: string;
  id?: string;
  lat?: string;
  lng?: string;
  locationName?: string;
};
