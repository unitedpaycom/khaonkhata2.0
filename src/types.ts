export interface Member {
  id: string;
  uid?: string;
  name: string;
  email?: string;
  phone?: string;
  room?: string;
  join?: string;
  photoURL?: string;
}

export interface Deposit {
  id: string;
  m: string; // member id
  amt: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface BazarItem {
  id: string;
  by: string; // member id
  date: string;
  items: string;
  amt: number;
}

export interface OtherCost {
  id: string;
  date: string;
  note: string;
  amt: number;
  type: 'shared' | 'ind';
  m?: string; // member id if individual
}

export interface MealSlot {
  b: number;
  l: number;
  d: number;
  rq?: number;
}

export interface MealRequest {
  id: string;
  m: string; // member id
  date: string;
  b: number;
  l: number;
  d: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Notice {
  id: string;
  text: string;
  date: string;
}

export interface MessState {
  id: string;
  mess: string;
  mgr: string; // member id
  mgrUid: string;
  mgrEmail: string;
  members: Member[];
  memberEmails?: string[];
  deposits: Deposit[];
  bazar: BazarItem[];
  meals: Record<string, Record<string, MealSlot>>; // date -> memberId -> slot
  reqs: MealRequest[];
  notices: Notice[];
  other: OtherCost[];
  cutoff: number;
  closed: Record<string, boolean>; // YYYY-MM -> boolean
  theme?: 'light' | 'dark' | 'auto';
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  currentMessId?: string;
  joinedMesses?: string[];
}
