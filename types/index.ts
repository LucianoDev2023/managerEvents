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
  subAdmins?: {
    email: string;
    level: 'Adm' | 'Parcial';
  }[];
  programs: Program[];
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
