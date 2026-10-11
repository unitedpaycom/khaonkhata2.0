import React, { useMemo } from 'react';
import { MessState } from '../types';
import { MonthSummary, tk, pad } from '../utils/calc';

interface DepositViewProps {
  messState: MessState;
  activeYM: string;
  setActiveYM: (ym: string) => void;
  monthSummary: MonthSummary | null;
  isManager: boolean;
  onOpenDrawer: () => void;
  onBack: () => void;
  depDate: string;
  setDepDate: (date: string) => void;
  depAmt: string;
  setDepAmt: (amt: string) => void;
  depMember: string;
  setDepMember: (m: string) => void;
  depNote: string;
  setDepNote: (note: string) => void;
  onSaveDeposit: () => void;
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

export const DepositView: React.FC<DepositViewProps> = ({
  messState,
  activeYM,
  setActiveYM,
  monthSummary,
  isManager,
  onOpenDrawer,
  onBack,
  depDate,
  setDepDate,
  depAmt,
  setDepAmt,
  depMember,
  setDepMember,
  depNote,
  setDepNote,
  onSaveDeposit,
  setModalConfig,
  saveStateToFirestore,
}) => {
  const [yearStr, monthNumStr] = activeYM.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthNumStr, 10) - 1;
  const monthLabel = `${MS[monthIdx] || ''} ${year}`;

  const currentMonthDeposits = useMemo(() => {
    return messState.deposits
      .filter((d) => d.date.startsWith(activeYM))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [messState.deposits, activeYM]);

  const totalDeposited = useMemo(() => {
    return currentMonthDeposits.reduce((acc, d) => acc + (d.amt || 0), 0);
  }, [currentMonthDeposits]);

  const messBal = monthSummary ? monthSummary.dep - monthSummary.tot : 0;

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
            <h2>টাকা জমা (Deposit)</h2>
            <span>মেস ফান্ডে জমার হিসাব · {messState.mess}</span>
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
              মোট জমা: {tk(totalDeposited)}
            </span>
          </div>
        </div>

        {/* Summary Ribbon */}
        <div className="kk-bal !py-3 !my-2">
          <div className="flex items-center justify-around w-full text-center">
            <div>
              <span className="kk-lab !text-[11.5px]">চলতি মাসের জমা</span>
              <b className="text-[var(--kk-gold)] text-base font-bold font-['Manrope'] block mt-0.5">
                {tk(totalDeposited)}
              </b>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <span className="kk-lab !text-[11.5px]">মোট এন্ট্রি</span>
              <b className="text-white text-base font-bold font-['Manrope'] block mt-0.5">
                {currentMonthDeposits.length} টি
              </b>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <span className="kk-lab !text-[11.5px]">মেস ব্যালেন্স</span>
              <b className="text-white text-base font-bold font-['Manrope'] block mt-0.5">
                {tk(messBal)}
              </b>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Sheet */}
      <main className="kk-sheet space-y-4">
        {/* Deposit Form Card */}
        <div className="kk-card space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--kk-line)]">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-none">
              <svg className="kk-i" width="18" height="18"><use href="#kk-wal" /></svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--kk-ink)] m-0">নতুন টাকা জমা এন্ট্রি করুন</h3>
              <p className="text-xs text-[var(--kk-mut)] m-0">সদস্যের জমা তৎক্ষণাৎ তার ব্যালেন্সে আপডেট হবে</p>
            </div>
          </div>

          <div className="kk-fg">
            <div className="kk-fd">
              <span>জমার তারিখ</span>
              <input
                type="date"
                value={depDate}
                onChange={(e) => setDepDate(e.target.value)}
                className="kk-in"
              />
            </div>

            <div className="kk-fd">
              <span>টাকার পরিমাণ (৳)</span>
              <div className="kk-amt">
                <b>৳</b>
                <input
                  type="number"
                  placeholder="যেমন: 3000"
                  value={depAmt}
                  onChange={(e) => setDepAmt(e.target.value)}
                  className="kk-in"
                />
              </div>
            </div>

            <div className="kk-fd">
              <span>জমা প্রদানকারী সদস্য</span>
              <select
                value={depMember}
                onChange={(e) => setDepMember(e.target.value)}
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

            <div className="kk-fd">
              <span>জমার বিবরণ বা নোট (ঐচ্ছিক)</span>
              <input
                type="text"
                placeholder="যেমন: মিলের অগ্রিম, বিকাশ, নগদ বা ব্যাংক..."
                value={depNote}
                onChange={(e) => setDepNote(e.target.value)}
                className="kk-in"
              />
            </div>
          </div>

          <button
            type="button"
            className="kk-btn mt-2 cursor-pointer"
            onClick={onSaveDeposit}
          >
            <svg className="kk-i" width="18" height="18"><use href="#kk-check" /></svg>
            <span>জমা সংরক্ষণ করুন</span>
          </button>
        </div>

        {/* Deposit History Section */}
        <section className="kk-sec">
          <div className="kk-sh">
            <h2>জমার ইতিহাস ({monthLabel})</h2>
            <span className="kk-ch text-xs">{currentMonthDeposits.length}টি এন্ট্রি</span>
          </div>

          <div className="kk-card space-y-2.5">
            {currentMonthDeposits.map((d) => {
              const depMem = messState.members.find((m) => m.id === d.m);
              return (
                <div
                  key={d.id}
                  className="p-3 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/50 border border-[var(--kk-line)] flex items-center justify-between gap-3 transition-colors hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="kk-mav !w-10 !h-10 !text-sm flex-none">
                      {(depMem?.name[0] || '?').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <b className="text-[14px] font-bold text-[var(--kk-ink)] block truncate">
                        {depMem?.name || 'সদস্য'}
                      </b>
                      <small className="text-xs text-[var(--kk-mut)] flex items-center gap-1.5 flex-wrap">
                        <span>{d.date}</span>
                        {d.note && (
                          <>
                            <span>·</span>
                            <span className="truncate">{d.note}</span>
                          </>
                        )}
                      </small>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-none">
                    <div className="text-right">
                      <b className={`text-base font-extrabold font-['Manrope'] block ${d.amt < 0 ? 'kk-neg' : 'kk-pos'}`}>
                        {d.amt < 0 ? '−' : '+'}{tk(Math.abs(d.amt))}
                      </b>
                      <small className="text-[10px] text-[var(--kk-mut)]">জমা ফান্ড</small>
                    </div>

                    {isManager && (
                      <button
                        type="button"
                        className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 hover:text-red-700 hover:bg-red-100 flex items-center justify-center cursor-pointer transition-colors border border-red-200/60 dark:border-red-900/40"
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: 'জমা মুছে ফেলবেন?',
                            message: `আপনি কি ${depMem?.name || 'সদস্য'}-এর ${tk(Math.abs(d.amt))} টাকার জমার এন্ট্রিটি মুছে ফেলতে চান?`,
                            confirmText: 'মুছে ফেলুন',
                            onConfirm: () => {
                              const filtered = messState.deposits.filter((x) => x.id !== d.id);
                              saveStateToFirestore({ ...messState, deposits: filtered }, 'জমা মোছা হয়েছে');
                            },
                          });
                        }}
                        title="জমার এন্ট্রি মুছুন"
                      >
                        <svg className="kk-i" width="14" height="14"><use href="#kk-trash" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {currentMonthDeposits.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <svg className="kk-i" width="24" height="24"><use href="#kk-wal" /></svg>
                </div>
                <p className="text-sm font-semibold text-[var(--kk-ink)] m-0">এই মাসে এখনও কোনো জমা এন্ট্রি করা হয়নি</p>
                <p className="text-xs text-[var(--kk-mut)] m-0">উপরের ফর্ম ব্যবহার করে কোনো সদস্যের টাকা জমা যুক্ত করুন।</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
