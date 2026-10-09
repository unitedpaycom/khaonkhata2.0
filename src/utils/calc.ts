import { MessState, MealSlot } from '../types';

export const pad = (n: number) => String(n).padStart(2, '0');
export const ds = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const TD = ds(new Date());

export const uid = () => Math.random().toString(36).slice(2, 9);
export const tk = (n: number) => '৳' + Math.round(n).toLocaleString('en-IN');
export const fm = (n: number) => Math.round(n * 100) / 100;

export const mt = (v?: MealSlot | number): number => {
  if (!v) return 0;
  if (typeof v === 'object') {
    return (+v.b || 0) + (+v.l || 0) + (+v.d || 0);
  }
  return +v || 0;
};

export interface MonthSummary {
  mm: Record<
    string,
    {
      meals: number;
      dep: number;
      ind: number;
      cost: number;
      sh: number;
      tot: number;
      bal: number;
    }
  >;
  dep: number;
  baz: number;
  meals: number;
  rate: number;
  oth: number;
  tot: number;
}

export function calcMonth(state: MessState, ym: string): MonthSummary {
  const days = Object.keys(state.meals || {}).filter(k => k.startsWith(ym));
  const r: MonthSummary = {
    mm: {},
    dep: 0,
    baz: 0,
    meals: 0,
    rate: 0,
    oth: 0,
    tot: 0,
  };

  // Only active members are counted in total meals, dynamic rate and balance calculations
  const activeMembers = (state.members || []).filter(m => !m.isArchived);
  const activeMemberIds = new Set(activeMembers.map(m => m.id));

  activeMembers.forEach(m => {
    r.mm[m.id] = { meals: 0, dep: 0, ind: 0, cost: 0, sh: 0, tot: 0, bal: 0 };
  });

  days.forEach(k => {
    const day = state.meals[k] || {};
    Object.entries(day).forEach(([id, v]) => {
      // Auto filter/ignore deleted user or missing ID meals
      if (activeMemberIds.has(id) && r.mm[id]) {
        const w = mt(v);
        r.mm[id].meals += w;
        r.meals += w;
      }
    });
  });

  (state.deposits || [])
    .filter(x => x.date.startsWith(ym))
    .forEach(x => {
      if (activeMemberIds.has(x.m) && r.mm[x.m]) {
        r.mm[x.m].dep += +x.amt;
        r.dep += +x.amt;
      }
    });

  (state.bazar || [])
    .filter(x => x.date.startsWith(ym))
    .forEach(x => {
      r.baz += +x.amt;
    });

  r.rate = r.meals ? r.baz / r.meals : 0;
  let shT = 0;

  (state.other || [])
    .filter(x => x.date.startsWith(ym))
    .forEach(x => {
      r.oth += +x.amt;
      if (x.type === 'ind') {
        if (x.m && activeMemberIds.has(x.m) && r.mm[x.m]) {
          r.mm[x.m].ind += +x.amt;
        }
      } else {
        shT += +x.amt;
      }
    });

  r.tot = r.baz + r.oth;
  const memberCount = activeMembers.length || 1;
  const sh = shT / memberCount;

  Object.values(r.mm).forEach(o => {
    o.cost = o.meals * r.rate;
    o.sh = sh;
    o.tot = o.cost + o.ind + o.sh;
    o.bal = o.dep - o.tot;
  });

  return r;
}

export function seedDemoData(messName: string, mgrName: string, mgrEmail: string, mgrUid: string): MessState {
  const m0Id = 'm0';
  const members = [
    { id: m0Id, uid: mgrUid, name: mgrName || 'ম্যানেজার', email: mgrEmail, phone: '01711000000', room: 'Room 101', join: TD },
    { id: 'm1', name: 'রাহিম', email: '', phone: '01712000001', room: 'Room 102', join: TD },
    { id: 'm2', name: 'করিম', email: '', phone: '01713000002', room: 'Room 102', join: TD },
    { id: 'm3', name: 'সুমন', email: '', phone: '01714000003', room: 'Room 103', join: TD },
    { id: 'm4', name: 'জাহিদ', email: '', phone: '01715000004', room: 'Room 103', join: TD },
  ];

  const ymC = TD.slice(0, 7);
  const deposits = [
    { id: uid(), m: m0Id, amt: 3500, date: `${ymC}-01`, note: 'মাসের শুরু' },
    { id: uid(), m: 'm1', amt: 3000, date: `${ymC}-01`, note: 'মাসের শুরু' },
    { id: uid(), m: 'm2', amt: 3000, date: `${ymC}-02`, note: 'মাসের শুরু' },
    { id: uid(), m: 'm3', amt: 2500, date: `${ymC}-02`, note: 'মাসের শুরু' },
    { id: uid(), m: 'm4', amt: 3000, date: `${ymC}-03`, note: 'মাসের শুরু' },
  ];

  const meals: Record<string, Record<string, MealSlot>> = {};
  // generate meals for today
  meals[TD] = {
    [m0Id]: { b: 0, l: 1, d: 1 },
    m1: { b: 0, l: 1, d: 1 },
    m2: { b: 1, l: 1, d: 1 },
    m3: { b: 0, l: 1, d: 0 },
    m4: { b: 0, l: 1, d: 1 },
  };

  const bazar = [
    { id: uid(), by: m0Id, date: TD, items: 'মুরগি, চাল, ডাল, তেল', amt: 1250 },
  ];

  const other = [
    { id: uid(), date: `${ymC}-02`, note: 'গ্যাস বিল', amt: 900, type: 'shared' as const },
    { id: uid(), date: `${ymC}-03`, note: 'বুয়া বেতন', amt: 1200, type: 'shared' as const },
  ];

  const notices = [
    { id: uid(), text: 'স্বাগতম! মেস হিসাব এখন রিয়েলটাইমে কাজ করছে।', date: TD },
  ];

  return {
    id: uid(),
    mess: messName || 'My Mess',
    mgr: m0Id,
    mgrUid,
    mgrEmail,
    members,
    deposits,
    bazar,
    meals,
    reqs: [],
    notices,
    other,
    cutoff: 21,
    closed: {},
    theme: 'light',
    updatedAt: new Date().toISOString(),
  };
}
