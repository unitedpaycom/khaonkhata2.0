import React, { useMemo } from 'react';
import { MessState } from '../types';
import { MonthSummary, tk, pad } from '../utils/calc';

interface CostViewProps {
  messState: MessState;
  activeYM: string;
  setActiveYM: (ym: string) => void;
  monthSummary: MonthSummary | null;
  isManager: boolean;
  onOpenDrawer: () => void;
  onBack: () => void;
  costSubTab: 'meal' | 'other';
  setCostSubTab: (tab: 'meal' | 'other') => void;
  costDate: string;
  setCostDate: (d: string) => void;
  costAmt: string;
  setCostAmt: (a: string) => void;
  costItems: string;
  setCostItems: (items: string) => void;
  costMember: string;
  setCostMember: (m: string) => void;
  costType: 'shared' | 'ind';
  setCostType: (t: 'shared' | 'ind') => void;
  costAutoDep: boolean;
  setCostAutoDep: (b: boolean) => void;
  onSaveCost: () => void;
  setModalConfig: (cfg: any) => void;
  saveStateToFirestore: (st: MessState, msg?: string) => Promise<void>;
}

const MS = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলাই', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

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

export const CostView: React.FC<CostViewProps> = ({
  messState,
  activeYM,
  setActiveYM,
  monthSummary,
  isManager,
  onOpenDrawer,
  onBack,
  costSubTab,
  setCostSubTab,
  costDate,
  setCostDate,
  costAmt,
  setCostAmt,
  costItems,
  setCostItems,
  costMember,
  setCostMember,
  costType,
  setCostType,
  costAutoDep,
  setCostAutoDep,
  onSaveCost,
  setModalConfig,
  saveStateToFirestore,
}) => {
  const [yearStr, monthNumStr] = activeYM.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthNumStr, 10) - 1;
  const monthLabel = `${MS[monthIdx] || ''} ${year}`;

  const currentMonthBazar = useMemo(() => {
    return messState.bazar
      .filter((b) => b.date.startsWith(activeYM))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [messState.bazar, activeYM]);

  const currentMonthOther = useMemo(() => {
    return messState.other
      .filter((o) => o.date.startsWith(activeYM))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [messState.other, activeYM]);

  const totalBazarAmt = useMemo(() => {
    return currentMonthBazar.reduce((acc, b) => acc + (b.amt || 0), 0);
  }, [currentMonthBazar]);

  const totalOtherAmt = useMemo(() => {
    return currentMonthOther.reduce((acc, o) => acc + (o.amt || 0), 0);
  }, [currentMonthOther]);

  const totalMonthCost = totalBazarAmt + totalOtherAmt;

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
            <h2>খরচ এন্ট্রি (Cost)</h2>
            <span>বাজার ও অন্যান্য খরচ ব্যবস্থাপনা · {messState.mess}</span>
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
              মোট খরচ: {tk(totalMonthCost)}
            </span>
          </div>
        </div>

        {/* Summary Metric Ribbon */}
        <div className="kk-bal !py-3 !my-2">
          <div className="flex items-center justify-around w-full text-center">
            <div>
              <span className="kk-lab !text-[11.5px]">বাজার খরচ</span>
              <b className="text-[var(--kk-gold)] text-base font-bold font-['Manrope'] block mt-0.5">
                {tk(totalBazarAmt)}
              </b>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <span className="kk-lab !text-[11.5px]">অন্যান্য খরচ</span>
              <b className="text-white text-base font-bold font-['Manrope'] block mt-0.5">
                {tk(totalOtherAmt)}
              </b>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <span className="kk-lab !text-[11.5px]">সর্বমোট খরচ</span>
              <b className="text-white text-base font-bold font-['Manrope'] block mt-0.5">
                {tk(totalMonthCost)}
              </b>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Sheet */}
      <main className="kk-sheet space-y-4">
        {/* Navigation Tabs */}
        <div className="kk-tabs" role="tablist">
          <button
            type="button"
            className={costSubTab === 'meal' ? 'kk-on' : ''}
            onClick={() => setCostSubTab('meal')}
          >
            🛒 বাজার খরচ (Meal Bazar)
          </button>
          <button
            type="button"
            className={costSubTab === 'other' ? 'kk-on' : ''}
            onClick={() => setCostSubTab('other')}
          >
            ⚡ অন্যান্য খরচ (Other Cost)
          </button>
        </div>

        {/* Cost Entry Form Card */}
        <div className="kk-card space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--kk-line)]">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-none">
              <svg className="kk-i" width="18" height="18">
                <use href={costSubTab === 'meal' ? '#kk-cart' : '#kk-doc'} />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--kk-ink)] m-0">
                {costSubTab === 'meal' ? 'দৈনিক বাজার খরচ এন্ট্রি' : 'অন্যান্য / ইউটিলিটি খরচ এন্ট্রি'}
              </h3>
              <p className="text-xs text-[var(--kk-mut)] m-0">
                {costSubTab === 'meal'
                  ? 'বাজারের খরচ সরাসরি মিল রেট ক্যালকুলেশনে যুক্ত হবে'
                  : 'বিদ্যুৎ, গ্যাস, বুয়া বা মেসের শেয়ার্ড ও ব্যক্তিগত খরচ'}
              </p>
            </div>
          </div>

          <div className="kk-fg">
            <div className="kk-fd">
              <span>খরচের তারিখ</span>
              <input
                type="date"
                value={costDate}
                onChange={(e) => setCostDate(e.target.value)}
                className="kk-in"
              />
            </div>

            <div className="kk-fd">
              <span>টাকার পরিমাণ (৳)</span>
              <div className="kk-amt">
                <b>৳</b>
                <input
                  type="number"
                  placeholder="যেমন: 1200"
                  value={costAmt}
                  onChange={(e) => setCostAmt(e.target.value)}
                  className="kk-in"
                />
              </div>
            </div>

            <div className="kk-fd">
              <span>{costSubTab === 'meal' ? 'বাজারের ফর্দ (ঐচ্ছিক)' : 'খরচের বিবরণ বা নাম'}</span>
              <input
                type="text"
                placeholder={costSubTab === 'meal' ? 'যেমন: মাছ, মুরগি, আলু, পেঁয়াজ, তেল...' : 'যেমন: বিদ্যুৎ বিল, গ্যাস সিলিন্ডার, ওয়াইফাই...'}
                value={costItems}
                onChange={(e) => setCostItems(e.target.value)}
                className="kk-in"
              />
            </div>

            {costSubTab === 'other' && (
              <div className="kk-fd">
                <span>খরচের বণ্টন পদ্ধতি</span>
                <select
                  value={costType}
                  onChange={(e) => setCostType(e.target.value as 'shared' | 'ind')}
                  className="kk-in"
                >
                  <option value="shared">Shared (সবার মাঝে সমবণ্টন হবে)</option>
                  <option value="ind">Individual (নির্দিষ্ট একজনের ব্যক্তিগত খরচ)</option>
                </select>
              </div>
            )}

            <div className="kk-fd">
              <span>
                {costSubTab === 'meal'
                  ? 'বাজারকারী সদস্য'
                  : costType === 'ind'
                  ? 'নির্দিষ্ট সদস্য'
                  : 'পরিশোধকারী সদস্য (ঐচ্ছিক)'}
              </span>
              <select
                value={costMember}
                onChange={(e) => setCostMember(e.target.value)}
                className="kk-in"
              >
                <option value="">সদস্য নির্বাচন করুন</option>
                {messState.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.room ? `(রুম ${m.room})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {costSubTab === 'meal' && (
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-[var(--kk-line)] cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={costAutoDep}
                  onChange={(e) => setCostAutoDep(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-[var(--kk-ink)] font-medium">
                  সমপরিমাণ টাকা বাজারকারীর নামে স্বয়ংক্রিয় জমা (Deposit) করুন?
                </span>
              </label>
            )}
          </div>

          <button
            type="button"
            className="kk-btn mt-2 cursor-pointer"
            onClick={onSaveCost}
          >
            <svg className="kk-i" width="18" height="18"><use href="#kk-check" /></svg>
            <span>খরচ সংরক্ষণ করুন</span>
          </button>
        </div>

        {/* Cost History Section */}
        <section className="kk-sec">
          <div className="kk-sh">
            <h2>
              {costSubTab === 'meal'
                ? `বাজার খরচের তালিকা (${monthLabel})`
                : `অন্যান্য খরচের তালিকা (${monthLabel})`}
            </h2>
            <span className="kk-ch text-xs">
              {costSubTab === 'meal' ? `${currentMonthBazar.length}টি এন্ট্রি` : `${currentMonthOther.length}টি এন্ট্রি`}
            </span>
          </div>

          <div className="kk-card space-y-2.5">
            {costSubTab === 'meal' && (
              <>
                {currentMonthBazar.map((b) => {
                  const shopper = messState.members.find((m) => m.id === b.by);
                  return (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/50 border border-[var(--kk-line)] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="kk-ti kk-t-cost !w-10 !h-10 !text-sm flex-none">
                          <svg className="kk-i" width="18" height="18"><use href="#kk-cart" /></svg>
                        </span>
                        <div className="min-w-0">
                          <b className="text-[14px] font-bold text-[var(--kk-ink)] block truncate">
                            {b.items || 'বাজার'}
                          </b>
                          <small className="text-xs text-[var(--kk-mut)] flex items-center gap-1.5 flex-wrap">
                            <span>{b.date}</span>
                            <span>·</span>
                            <span>ক্রেতা: {shopper?.name || 'সদস্য'}</span>
                          </small>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <div className="text-right">
                          <b className="text-base font-extrabold text-[var(--kk-red)] font-['Manrope'] block">
                            {tk(b.amt)}
                          </b>
                          <small className="text-[10px] text-[var(--kk-mut)]">মিল বাজার</small>
                        </div>

                        {isManager && (
                          <button
                            type="button"
                            className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 hover:text-red-700 hover:bg-red-100 flex items-center justify-center cursor-pointer transition-colors border border-red-200/60 dark:border-red-900/40"
                            onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'বাজার খরচ মুছে ফেলবেন?',
                                message: `আপনি কি "${b.items || 'বাজার'}"-এর ${tk(b.amt)} টাকার এন্ট্রিটি মুছে ফেলতে চান?`,
                                confirmText: 'মুছে ফেলুন',
                                onConfirm: () => {
                                  const filtered = messState.bazar.filter((x) => x.id !== b.id);
                                  saveStateToFirestore({ ...messState, bazar: filtered }, 'বাজার মোছা হয়েছে');
                                },
                              });
                            }}
                            title="বাজার খরচ মুছুন"
                          >
                            <svg className="kk-i" width="14" height="14"><use href="#kk-trash" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {currentMonthBazar.length === 0 && (
                  <div className="text-center py-8 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                      <svg className="kk-i" width="24" height="24"><use href="#kk-cart" /></svg>
                    </div>
                    <p className="text-sm font-semibold text-[var(--kk-ink)] m-0">এই মাসে এখনও কোনো বাজার খরচ এন্ট্রি করা হয়নি</p>
                    <p className="text-xs text-[var(--kk-mut)] m-0">উপরের ফর্ম দিয়ে বাজারের খরচ যুক্ত করুন।</p>
                  </div>
                )}
              </>
            )}

            {costSubTab === 'other' && (
              <>
                {currentMonthOther.map((o) => {
                  const costMem = messState.members.find((m) => m.id === o.m);
                  return (
                    <div
                      key={o.id}
                      className="p-3 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/50 border border-[var(--kk-line)] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="kk-ti kk-t-cost !w-10 !h-10 !text-sm flex-none">
                          <svg className="kk-i" width="18" height="18"><use href="#kk-doc" /></svg>
                        </span>
                        <div className="min-w-0">
                          <b className="text-[14px] font-bold text-[var(--kk-ink)] block truncate">
                            {o.note || 'অন্যান্য খরচ'}
                          </b>
                          <small className="text-xs text-[var(--kk-mut)] flex items-center gap-1.5 flex-wrap">
                            <span>{o.date}</span>
                            <span>·</span>
                            <span className="px-1.5 py-0.2 rounded bg-neutral-200/70 dark:bg-neutral-800 text-[10px] font-semibold">
                              {o.type === 'ind' ? `ব্যক্তিগত (${costMem?.name || 'মেম্বার'})` : 'সবার সমবণ্টন'}
                            </span>
                          </small>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <div className="text-right">
                          <b className="text-base font-extrabold text-[var(--kk-red)] font-['Manrope'] block">
                            {tk(o.amt)}
                          </b>
                          <small className="text-[10px] text-[var(--kk-mut)]">অন্যান্য</small>
                        </div>

                        {isManager && (
                          <button
                            type="button"
                            className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 hover:text-red-700 hover:bg-red-100 flex items-center justify-center cursor-pointer transition-colors border border-red-200/60 dark:border-red-900/40"
                            onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'খরচ মুছে ফেলবেন?',
                                message: `আপনি কি "${o.note || 'খরচ'}"-এর ${tk(o.amt)} টাকার এন্ট্রিটি মুছে ফেলতে চান?`,
                                confirmText: 'মুছে ফেলুন',
                                onConfirm: () => {
                                  const filtered = messState.other.filter((x) => x.id !== o.id);
                                  saveStateToFirestore({ ...messState, other: filtered }, 'খরচ মোছা হয়েছে');
                                },
                              });
                            }}
                            title="খরচ মুছুন"
                          >
                            <svg className="kk-i" width="14" height="14"><use href="#kk-trash" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {currentMonthOther.length === 0 && (
                  <div className="text-center py-8 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                      <svg className="kk-i" width="24" height="24"><use href="#kk-doc" /></svg>
                    </div>
                    <p className="text-sm font-semibold text-[var(--kk-ink)] m-0">এই মাসে কোনো অন্যান্য খরচ যুক্ত হয়নি</p>
                    <p className="text-xs text-[var(--kk-mut)] m-0">ইউটিলিটি, বুয়া বা ব্যক্তিগত খরচ এখানে এন্ট্রি করুন।</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
