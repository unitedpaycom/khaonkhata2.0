import React, { useMemo } from 'react';
import { Member, MealSlot, MessState } from '../types';
import { MonthSummary, TD, ds, fm, mt, pad } from '../utils/calc';

interface MealViewProps {
  messState: MessState;
  activeYM: string;
  setActiveYM: (ym: string) => void;
  monthSummary: MonthSummary | null;
  isManager: boolean;
  currentMember: Member | null;
  isMonthLocked: boolean;
  onOpenDrawer: () => void;
  onBack: () => void;
  mealSubTab: 'add' | 'req' | 'chart' | 'history';
  setMealSubTab: (tab: 'add' | 'req' | 'chart' | 'history') => void;
  mealWho: string;
  setMealWho: (who: string) => void;
  mealDate: string;
  setMealDate: (d: string) => void;
  mealDraft: Record<string, MealSlot>;
  setMealDraft: React.Dispatch<React.SetStateAction<Record<string, MealSlot>>>;
  handleSaveMealDraft: () => void;
  handleSendTargetedPush: () => void;
  targetedPushLoading: boolean;
  pendingReqCount: number;
  handleDeleteDateMeals: (dateKey: string) => void;
  handleRemoveMemberMeal: (memId: string, dateKey: string) => void;
  handleSubmitMealRequest: (b: number, l: number, d: number, date: string) => void;
  handleApproveReq: (reqId: string) => void;
  handleRejectReq: (reqId: string) => void;
  daysInMonth: string[];
  setModalConfig: (cfg: any) => void;
  showToast: (msg: string) => void;
}

const MS = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলাই', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const f1 = (n: number) => String(Math.round(n * 10) / 10);

const ORN = (
  <svg className="kk-orn" viewBox="0 0 300 300" aria-hidden="true">
    {Array.from({ length: 14 }).map((_, i) => (
      <ellipse
        key={i}
        cx="150"
        cy="150"
        rx="140"
        ry="48"
        transform={`rotate(${i * 13} 150 150)`}
      />
    ))}
    <circle cx="150" cy="150" r="146" />
    <circle cx="150" cy="150" r="104" />
  </svg>
);

export const MealView: React.FC<MealViewProps> = ({
  messState,
  activeYM,
  setActiveYM,
  monthSummary,
  isManager,
  currentMember,
  isMonthLocked,
  onOpenDrawer,
  onBack,
  mealSubTab,
  setMealSubTab,
  mealWho,
  setMealWho,
  mealDate,
  setMealDate,
  mealDraft,
  setMealDraft,
  handleSaveMealDraft,
  handleSendTargetedPush,
  targetedPushLoading,
  pendingReqCount,
  handleDeleteDateMeals,
  handleRemoveMemberMeal,
  handleSubmitMealRequest,
  handleApproveReq,
  handleRejectReq,
  daysInMonth,
  setModalConfig,
  showToast,
}) => {
  const [yearStr, monthNumStr] = activeYM.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthNumStr, 10) - 1;
  const monthLabel = `${MS[monthIdx] || ''} ${year}`;

  const rate = monthSummary?.rate || 0;

  const todayMealsTotal = useMemo(() => {
    const todaySlots = messState.meals?.[TD] || {};
    return Object.values(todaySlots).reduce((acc, s) => acc + mt(s), 0);
  }, [messState.meals]);

  return (
    <div className="kk-view">
      {/* Hero Header */}
      <header className="kk-hero">
        {ORN}

        <div className="kk-ht">
          <button
            type="button"
            className="kk-ib"
            onClick={onBack}
            aria-label="হোমে ফিরে যান"
            title="হোম ড্যাশবোর্ড"
          >
            <svg className="kk-i"><use href="#kk-l" /></svg>
          </button>
          <div className="kk-gr">
            <h2>মিল ব্যবস্থাপনা (Meal)</h2>
            <span>দৈনিক মিল এন্ট্রি ও রিকোয়েস্ট · {messState.mess}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="kk-ib"
              onClick={onBack}
              title="হোম ড্যাশবোর্ড"
            >
              <svg className="kk-i" width="18" height="18"><use href="#kk-home" /></svg>
            </button>
            <button
              type="button"
              className="kk-ib"
              onClick={onOpenDrawer}
              aria-label="মেনু"
              title="মেনু খুলুন"
            >
              <svg className="kk-i"><use href="#kk-menu" /></svg>
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="kk-bt">
          <div className="kk-mon">
            <button
              type="button"
              onClick={() => {
                const prevDate = new Date(year, monthIdx - 1, 1);
                setActiveYM(`${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`);
              }}
              aria-label="পূর্ববর্তী মাস"
            >
              <svg className="kk-i"><use href="#kk-l" /></svg>
            </button>
            <span>{monthLabel}</span>
            <button
              type="button"
              onClick={() => {
                const nextDate = new Date(year, monthIdx + 1, 1);
                setActiveYM(`${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}`);
              }}
              aria-label="পরবর্তী মাস"
            >
              <svg className="kk-i" style={{ transform: 'scaleX(-1)' }}><use href="#kk-l" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="kk-ch text-xs">
              মিল রেট: {f1(rate)}৳
            </span>
          </div>
        </div>

        {/* Summary Metric Ribbon */}
        <div className="kk-bal !py-3 !my-2">
          <div className="flex items-center justify-around w-full text-center">
            <div>
              <span className="kk-lab !text-[11.5px]">মাসিক মোট মিল</span>
              <b className="text-[var(--kk-gold)] text-base font-bold font-['Manrope'] block mt-0.5">
                {fm(monthSummary?.meals || 0)} টি
              </b>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <span className="kk-lab !text-[11.5px]">আজকের মিল</span>
              <b className="text-white text-base font-bold font-['Manrope'] block mt-0.5">
                {todayMealsTotal} টি
              </b>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <span className="kk-lab !text-[11.5px]">পেন্ডিং রিকোয়েস্ট</span>
              <b className="text-white text-base font-bold font-['Manrope'] block mt-0.5">
                {pendingReqCount} টি
              </b>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Sheet */}
      <main className="kk-sheet space-y-4">
        {/* Navigation Tabs */}
        <div className="kk-tabs" role="tablist">
          {isManager && (
            <button
              type="button"
              className={mealSubTab === 'add' ? 'kk-on' : ''}
              onClick={() => setMealSubTab('add')}
            >
              মিল এন্ট্রি / এডিট
            </button>
          )}
          <button
            type="button"
            className={mealSubTab === 'req' ? 'kk-on' : ''}
            onClick={() => setMealSubTab('req')}
          >
            মিল রিকোয়েস্ট {pendingReqCount > 0 ? `(${pendingReqCount})` : ''}
          </button>
          <button
            type="button"
            className={mealSubTab === 'chart' ? 'kk-on' : ''}
            onClick={() => setMealSubTab('chart')}
          >
            মিল চার্ট
          </button>
          {isManager && (
            <button
              type="button"
              className={mealSubTab === 'history' ? 'kk-on' : ''}
              onClick={() => setMealSubTab('history')}
            >
              📅 হিস্ট্রি ও মুছুন
            </button>
          )}
        </div>

        {/* TAB 1: ADD / EDIT MEAL (Manager) */}
        {mealSubTab === 'add' && isManager && (
          <div className="space-y-4">
            {/* Filter & Date Selection Card */}
            <div className="kk-card space-y-3.5">
              <div className="kk-fg">
                <div className="kk-fd">
                  <span>মেম্বার ফিল্টার</span>
                  <select
                    value={mealWho}
                    onChange={(e) => setMealWho(e.target.value)}
                    className="kk-in"
                  >
                    <option value="all">সকল সদস্যের মিল সেট করুন</option>
                    {messState.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.room ? `(রুম ${m.room})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="kk-fd">
                  <div className="flex justify-between items-center">
                    <span>মিলের তারিখ</span>
                    {messState.meals?.[mealDate] && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ এই তারিখে মিল সংরক্ষিত আছে
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={mealDate}
                    onChange={(e) => setMealDate(e.target.value)}
                    className="kk-in"
                  />
                </div>
              </div>

              {/* Existing Record Notice for Selected Date */}
              {(() => {
                const existingDay = messState.meals?.[mealDate];
                const existingTotal = existingDay
                  ? Object.values(existingDay).reduce((acc, s) => acc + mt(s), 0)
                  : 0;
                if (existingTotal > 0) {
                  return (
                    <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                      <div>
                        <b className="text-amber-900 dark:text-amber-100 text-xs block">
                          📅 {mealDate} তারিখে মিল রেকর্ড রয়েছে (মোট {existingTotal}টি মিল)
                        </b>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 m-0">
                          নিচে সংখ্যা পরিবর্তন করে 'সেভ করুন' দিন অথবা পুরো দিনটি মুছে ফেলুন।
                        </p>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-200 cursor-pointer flex-none"
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: 'মিলের তারিখ মুছে ফেলা',
                            message: `আপনি কি নিশ্চিতভাবে ${mealDate} তারিখের সকল মেম্বারের মিল রেকর্ড মুছে ফেলতে চান?`,
                            confirmText: 'সম্পূর্ণ মুছুন',
                            onConfirm: () => handleDeleteDateMeals(mealDate),
                          });
                        }}
                      >
                        🗑️ এই দিনের সব মুছুন
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              {isMonthLocked && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  ⚠️ এই মাস বন্ধ রয়েছে, মিল এডিট করা যাবে না।
                </div>
              )}
            </div>

            {/* Member Stepper Cards */}
            <div className="space-y-3">
              {messState.members
                .filter((m) => mealWho === 'all' || m.id === mealWho)
                .map((m) => {
                  const slot = mealDraft[m.id] || { b: 0, l: 0, d: 0 };
                  const totalSlot = mt(slot);
                  const hasExistingInDb =
                    messState.meals?.[mealDate]?.[m.id] &&
                    mt(messState.meals[mealDate][m.id]) > 0;

                  return (
                    <div key={m.id} className="kk-card space-y-3">
                      {/* Member Info Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="kk-mav !w-10 !h-10 !text-sm flex-none">
                            {(m.name[0] || '?').toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <b className="text-sm font-bold text-[var(--kk-ink)] block truncate">
                              {m.name}
                            </b>
                            <small className="text-xs text-[var(--kk-mut)] block">
                              {m.room ? `রুম: ${m.room}` : 'সদস্য'} {slot.rq ? '· রিকোয়েস্টেড' : ''}
                            </small>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-none">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                            মোট: {totalSlot}টি
                          </span>
                          {totalSlot > 0 && (
                            <button
                              type="button"
                              className="text-[11px] text-neutral-500 hover:text-red-500 cursor-pointer px-1.5 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              onClick={() => {
                                setMealDraft((prev) => ({
                                  ...prev,
                                  [m.id]: { b: 0, l: 0, d: 0 },
                                }));
                              }}
                              title="শূন্য করুন"
                            >
                              রিসেট
                            </button>
                          )}
                          {hasExistingInDb && (
                            <button
                              type="button"
                              className="text-[11px] text-red-600 hover:text-red-700 cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                              onClick={() => {
                                setModalConfig({
                                  isOpen: true,
                                  title: 'মেম্বারের মিল মুছুন',
                                  message: `${m.name}-এর ${mealDate} তারিখের মিল মুছে ফেলতে চান?`,
                                  confirmText: 'মুছুন',
                                  onConfirm: () => handleRemoveMemberMeal(m.id, mealDate),
                                });
                              }}
                              title="মুছুন"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Steppers Grid */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--kk-line)]">
                        {/* Breakfast */}
                        <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 text-center">
                          <span className="text-[11px] font-semibold text-[var(--kk-mut)] block mb-1">সকাল (B)</span>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 border border-[var(--kk-line)] text-sm font-bold flex items-center justify-center cursor-pointer active:scale-95 text-[var(--kk-ink)]"
                              onClick={() => {
                                setMealDraft((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    ...slot,
                                    b: Math.max(0, fm((slot.b || 0) - 0.5)),
                                  },
                                }));
                              }}
                            >
                              −
                            </button>
                            <span className="font-bold text-sm min-w-5 font-['Manrope'] text-[var(--kk-ink)]">{slot.b || 0}</span>
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center cursor-pointer active:scale-95"
                              onClick={() => {
                                setMealDraft((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    ...slot,
                                    b: Math.min(5, fm((slot.b || 0) + 0.5)),
                                  },
                                }));
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Lunch */}
                        <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 text-center">
                          <span className="text-[11px] font-semibold text-[var(--kk-mut)] block mb-1">দুপুর (L)</span>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 border border-[var(--kk-line)] text-sm font-bold flex items-center justify-center cursor-pointer active:scale-95 text-[var(--kk-ink)]"
                              onClick={() => {
                                setMealDraft((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    ...slot,
                                    l: Math.max(0, fm((slot.l || 0) - 0.5)),
                                  },
                                }));
                              }}
                            >
                              −
                            </button>
                            <span className="font-bold text-sm min-w-5 font-['Manrope'] text-[var(--kk-ink)]">{slot.l || 0}</span>
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center cursor-pointer active:scale-95"
                              onClick={() => {
                                setMealDraft((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    ...slot,
                                    l: Math.min(5, fm((slot.l || 0) + 0.5)),
                                  },
                                }));
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Dinner */}
                        <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 text-center">
                          <span className="text-[11px] font-semibold text-[var(--kk-mut)] block mb-1">রাত (D)</span>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 border border-[var(--kk-line)] text-sm font-bold flex items-center justify-center cursor-pointer active:scale-95 text-[var(--kk-ink)]"
                              onClick={() => {
                                setMealDraft((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    ...slot,
                                    d: Math.max(0, fm((slot.d || 0) - 0.5)),
                                  },
                                }));
                              }}
                            >
                              −
                            </button>
                            <span className="font-bold text-sm min-w-5 font-['Manrope'] text-[var(--kk-ink)]">{slot.d || 0}</span>
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center cursor-pointer active:scale-95"
                              onClick={() => {
                                setMealDraft((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    ...slot,
                                    d: Math.min(5, fm((slot.d || 0) + 0.5)),
                                  },
                                }));
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Action Buttons Strip */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                className="kk-btn cursor-pointer"
                onClick={handleSaveMealDraft}
              >
                <svg className="kk-i" width="18" height="18"><use href="#kk-check" /></svg>
                <span>রিয়েলটাইম মিল সংরক্ষণ করুন</span>
              </button>

              <button
                type="button"
                className="kk-btn kk-gl2 cursor-pointer"
                disabled={targetedPushLoading}
                onClick={handleSendTargetedPush}
                title="আজকের মিল অনুযায়ী সদস্যদের পুশ নোটিফিকেশন পাঠান"
              >
                {targetedPushLoading ? (
                  <span>নোটিফিকেশন পাঠানো হচ্ছে...</span>
                ) : (
                  <>
                    <svg className="kk-i" width="18" height="18"><use href="#kk-bell" /></svg>
                    <span>সদস্যদের পুশ নোটিফিকেশন পাঠান</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MEAL REQUEST */}
        {mealSubTab === 'req' && (
          <div className="kk-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--kk-line)]">
              <div>
                <h3 className="text-base font-bold text-[var(--kk-ink)] m-0">
                  {isManager ? 'সদস্যদের মিল রিকোয়েস্ট' : 'আমার মিল রিকোয়েস্ট'}
                </h3>
                <p className="text-xs text-[var(--kk-mut)] m-0">
                  কাটঅফ সময়: রাত {messState.cutoff}:00 এর পূর্বে আবেদন করতে হবে
                </p>
              </div>

              {!isManager && (
                <button
                  type="button"
                  className="kk-btn kk-sm !w-auto !px-3.5 shrink-0 cursor-pointer"
                  onClick={() => {
                    const tm = ds(new Date(Date.now() + 864e5));
                    const opts: [string | number, string][] = [
                      [0, '0'],
                      [0.5, '0.5'],
                      [1, '1'],
                      [1.5, '1.5'],
                      [2, '2'],
                    ];
                    setModalConfig({
                      isOpen: true,
                      title: 'নতুন মিল রিকোয়েস্ট',
                      fields: [
                        { k: 'date', l: 'তারিখ', t: 'date', v: tm },
                        { k: 'b', l: 'Breakfast (সকাল)', t: 'sel', v: 0, o: opts },
                        { k: 'l', l: 'Lunch (দুপুর)', t: 'sel', v: 1, o: opts },
                        { k: 'd', l: 'Dinner (রাত)', t: 'sel', v: 1, o: opts },
                      ],
                      onConfirm: (vals: any) => {
                        handleSubmitMealRequest(
                          +vals.b || 0,
                          +vals.l || 0,
                          +vals.d || 0,
                          vals.date
                        );
                      },
                    });
                  }}
                >
                  <svg className="kk-i" width="16" height="16"><use href="#kk-plus" /></svg>
                  <span>+ নতুন রিকোয়েস্ট</span>
                </button>
              )}
            </div>

            {/* Request Items */}
            <div className="space-y-2.5">
              {(isManager
                ? messState.reqs
                : messState.reqs.filter((r) => r.m === currentMember?.id)
              )
                .slice()
                .reverse()
                .map((r) => {
                  const reqMember = messState.members.find((m) => m.id === r.m);
                  return (
                    <div
                      key={r.id}
                      className="p-3 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/50 border border-[var(--kk-line)] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="kk-mav !w-10 !h-10 !text-sm flex-none">
                          {(reqMember?.name[0] || '?').toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <b className="text-[14px] font-bold text-[var(--kk-ink)] block truncate">
                            {reqMember?.name || 'সদস্য'}
                          </b>
                          <small className="text-xs text-[var(--kk-mut)] block">
                            📅 {r.date} · B: {r.b} · L: {r.l} · D: {r.d} (মোট {r.b + r.l + r.d}টি)
                          </small>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        {isManager && r.status === 'pending' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                              onClick={() => handleApproveReq(r.id)}
                            >
                              মঞ্জুর
                            </button>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold cursor-pointer"
                              onClick={() => handleRejectReq(r.id)}
                            >
                              বাতিল
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${
                              r.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : r.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {r.status === 'approved' ? 'গৃহীত' : r.status === 'rejected' ? 'বাতিল' : 'পেন্ডিং'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

              {(isManager ? messState.reqs.length : messState.reqs.filter((r) => r.m === currentMember?.id).length) === 0 && (
                <div className="text-center py-8 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <svg className="kk-i" width="24" height="24"><use href="#kk-bowl" /></svg>
                  </div>
                  <p className="text-sm font-semibold text-[var(--kk-ink)] m-0">কোনো মিল রিকোয়েস্ট নেই</p>
                  <p className="text-xs text-[var(--kk-mut)] m-0">নতুন রিকোয়েস্ট আসলে এখানে অনুমোদনের জন্য দেখা যাবে।</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MEAL CHART TABLE */}
        {mealSubTab === 'chart' && (
          <div className="kk-card space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--kk-line)]">
              <div>
                <h3 className="text-base font-bold text-[var(--kk-ink)] m-0">
                  মিল চার্ট ({monthLabel})
                </h3>
                <p className="text-xs text-[var(--kk-mut)] m-0">
                  {isManager
                    ? 'যেকোনো ঘরে ক্লিক করে ওই দিনের মিল দ্রুত পরিবর্তন করুন'
                    : 'পুরো মাসের মিলের দৈনিক হিসাব'}
                </p>
              </div>
              {isMonthLocked && <span className="kk-ch text-xs">মাস বন্ধ</span>}
            </div>

            <div className="overflow-x-auto -mx-2 px-2 scrollbar-none">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--kk-line)] text-[var(--kk-mut)]">
                    <th className="py-2 pr-3 sticky left-0 bg-white dark:bg-neutral-900 z-10 font-bold">সদস্য</th>
                    {daysInMonth.map((d, i) => (
                      <th key={d} className="py-2 px-1 text-center font-semibold min-w-6">
                        {i + 1}
                      </th>
                    ))}
                    <th className="py-2 pl-2 text-right font-bold">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--kk-line)]">
                  {messState.members.map((m) => {
                    const totalMemberMeals = monthSummary?.mm[m.id]?.meals || 0;
                    return (
                      <tr key={m.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="py-2 pr-3 font-semibold whitespace-nowrap sticky left-0 bg-white dark:bg-neutral-900 z-10 text-[var(--kk-ink)]">
                          {m.name}
                        </td>
                        {daysInMonth.map((d) => {
                          const dayMeals = messState.meals[d] || {};
                          const count = mt(dayMeals[m.id]);
                          const isToday = d === TD;
                          return (
                            <td
                              key={d}
                              className={`py-2 px-1 text-center font-['Manrope'] cursor-pointer rounded transition-colors ${
                                count > 0
                                  ? 'font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30'
                                  : 'text-neutral-300 dark:text-neutral-700'
                              } ${isToday ? 'ring-1 ring-emerald-500' : ''}`}
                              onClick={() => {
                                if (!isManager) return;
                                setMealDate(d);
                                setMealWho(m.id);
                                setMealSubTab('add');
                              }}
                              title={`${m.name} (${d}): ${count} মিল`}
                            >
                              {count > 0 ? count : '·'}
                            </td>
                          );
                        })}
                        <td className="py-2 pl-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-['Manrope'] whitespace-nowrap">
                          {fm(totalMemberMeals)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MEAL HISTORY & DELETE (Manager) */}
        {mealSubTab === 'history' && isManager && (
          <div className="space-y-3">
            <div className="kk-sh">
              <h2>মাসের মিল হিস্ট্রি ও রেকর্ড মুছুন</h2>
              <span className="kk-ch text-xs">
                {Object.keys(messState.meals || {}).filter((k) => k.startsWith(activeYM)).length} দিন সংরক্ষিত
              </span>
            </div>

            {(() => {
              const recordedDates = Object.keys(messState.meals || {})
                .filter((k) => k.startsWith(activeYM))
                .sort()
                .reverse();

              if (recordedDates.length === 0) {
                return (
                  <div className="kk-card text-center py-8">
                    <p className="text-xs text-[var(--kk-mut)] m-0">এই মাসে এখনও কোনো মিল এন্ট্রি নেই</p>
                  </div>
                );
              }

              return recordedDates.map((dateKey) => {
                const daySlots = messState.meals[dateKey] || {};
                const totalDay = Object.values(daySlots).reduce((acc, s) => acc + mt(s), 0);
                const memberNames = Object.entries(daySlots)
                  .filter(([_, s]) => mt(s) > 0)
                  .map(([memId, s]) => {
                    const member =
                      messState.members.find((m) => m.id === memId) ||
                      (messState.archivedMembers || []).find((m) => m.id === memId);
                    return `${member?.name || 'মেম্বার'}: ${mt(s)}`;
                  });

                return (
                  <div
                    key={dateKey}
                    className="kk-card flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <b className="text-sm text-[var(--kk-ink)]">📅 {dateKey}</b>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                          মোট {totalDay} টি মিল
                        </span>
                      </div>
                      <p className="text-xs text-[var(--kk-mut)] m-0 line-clamp-1">
                        {memberNames.length > 0 ? memberNames.join(', ') : 'কোনো সদস্য মিল খায়নি'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-none">
                      <button
                        type="button"
                        className="kk-btn kk-gl2 kk-sm !w-auto !px-3 cursor-pointer"
                        onClick={() => {
                          setMealDate(dateKey);
                          setMealSubTab('add');
                          showToast(`${dateKey} তারিখটি এডিটের জন্য লোড হয়েছে`);
                        }}
                      >
                        <svg className="kk-i" width="14" height="14"><use href="#kk-edit" /></svg>
                        <span>এডিট</span>
                      </button>
                      <button
                        type="button"
                        className="kk-btn kk-gh kk-sm !w-auto !px-3 text-red-500 hover:text-red-700 cursor-pointer"
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: 'মিল সম্পূর্ণ মুছে ফেলবেন?',
                            message: `আপনি কি ${dateKey} তারিখের সকল মেম্বারের মিল মুছে ফেলতে চান?`,
                            confirmText: 'সম্পূর্ণ মুছুন',
                            onConfirm: () => handleDeleteDateMeals(dateKey),
                          });
                        }}
                        title="রেকর্ড মুছুন"
                      >
                        <svg className="kk-i" width="14" height="14"><use href="#kk-trash" /></svg>
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </main>
    </div>
  );
};
