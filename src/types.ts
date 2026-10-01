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

export type PaymentMethodKey = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'bangla_qr';

export interface MobileBankingConfig {
  accountName: string;
  phoneNumber: string;
  accountType: 'Personal' | 'Agent';
  instructions?: string;
  updatedAt?: string;
}

export interface BanglaQRConfig {
  qrImageUrl: string;
  tag: string; // e.g. "Payment Only"
  accountName?: string;
  instructions?: string;
  updatedAt?: string;
}

export interface PaymentMethodsConfig {
  bkash?: MobileBankingConfig;
  nagad?: MobileBankingConfig;
  rocket?: MobileBankingConfig;
  upay?: MobileBankingConfig;
  bangla_qr?: BanglaQRConfig;
}

export interface MemberDepositRequest {
  id: string;
  memberId: string;
  memberName: string;
  method: PaymentMethodKey;
  amount: number;
  senderNumber: string;
  trxId?: string;
  date: string; // YYYY-MM-DD
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
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
  depositRequests?: MemberDepositRequest[];
  paymentMethods?: PaymentMethodsConfig;
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
  fcmToken?: string;
  fcmUpdatedAt?: string;
}
