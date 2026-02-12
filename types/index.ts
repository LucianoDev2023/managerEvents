export type PermissionLevel = 'Super Admin' | 'Admin parcial';

export type GuestStatus = 'confirmed' | 'interested';

export type Guest = {
  userId: string;
  name: string;
  mode: 'confirmado' | 'acompanhando';
  family?: string[];
};

export type Event = {
  id: string;
  title: string;
  location: string;
  startDate: Date;
  endDate: Date;
  description: string;
  coverImage?: string;
  userId: string; // ✅ dono
  subAdminsByUid?: Record<string, PermissionLevel>; // ✅ novo
  programs: Program[];
  shareKey?: string;
};

export type SubAdmin = {
  email: string;
  level: PermissionLevel;
};

export type GuestMode = 'confirmado' | 'acompanhando';

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
  createdByUid: string;
};

export type FormValues = {
  title: string;
  location: string;
  startDate: Date;
  endDate: Date;
  description: string;
  coverImage?: string;
  userId: string;
  createdBy: string;
  searchKey: string;
};

type LocationScreenParams = {
  redirectTo: string;
  id?: string;
  lat?: string;
  lng?: string;
  locationName?: string;
};
