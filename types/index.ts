export type PermissionLevel = 'Super Admin' | 'Admin parcial';

export type GuestStatus = 'confirmed' | 'interested';

export type FamilyMember = {
  name: string;
  isChild?: boolean;
  age?: number;
};

export type Guest = {
  userId: string;
  name: string;
  mode: 'confirmado' | 'acompanhando';
  family?: FamilyMember[];
};

// ✅ Tipos para o Dashboard Financeiro/Gestão
export type FinancialRecord = {
  id: string;
  category: 'aluguel' | 'musico' | 'buffet' | 'decoracao' | 'Salão de festas'| 'outros';
  description: string;
  amount: number;
  paid: boolean;
  dueDate?: Date;
  supplier?: {
    name: string;
    phone?: string;
  };
};

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  deadline?: Date;
  category?: 'geral' | 'fornecedor';
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
  
  // ✅ Campos do Dashboard de Gestão
  targetBudget?: number;
  financials?: FinancialRecord[];
  tasks?: Task[];
  buffet?: string[];
  
  // ✅ Presentes (Pix) - Desabilitado
  // pixKey?: string;
  // pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  // pixMessage?: string;
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
