import React, { useState, useMemo } from 'react';
import { MessState } from '../types';
import { calcMonth, tk, fm } from '../utils/calc';

interface AllMonthsViewProps {
  messState: MessState;
  activeYM: string;
  setActiveYM: (ym: string) => void;
  setTab: (tab: any) => void;
  onOpenDrawer: () => void;
  onBack: () => void;
}

const banglaMonthsFull = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

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

export const AllMonthsView: React.FC<AllMonthsViewProps> = ({
  messState,
  activeYM,
  setActiveYM,
  setTab,
  onOpenDrawer,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Collect all months
  const monthsData = useMemo(() => {
    const allMonthsSet = new Set<string>();
    Object.keys(messState.meals || {}).forEach((k) => allMonthsSet.add(k.slice(0, 7)));
    messState.deposits.forEach((d) => allMonthsSet.add(d.date.slice(0, 7)));
    messState.bazar.forEach((b) => allMonthsSet.add(b.date.slice(0, 7)));
    messState.other.forEach((o) => allMonthsSet.add(o.date.slice(0, 7)));
    allMonthsSet.add(activeYM);

    const sortedMonths = Array.from(allMonthsSet).sort().reverse();

    return sortedMonths.map((ymStr) => {
      const summary = calcMonth(messState, ymStr);
      const [yStr, mStr] = ymStr.split('-');
      const monthIdx = parseInt(mStr, 10) - 1;
      const mName = banglaMonthsFull[monthIdx] || mStr;
      const isClosed = !!messState.closed?.[ymStr];
      const isCurrentActive = ymStr === activeYM;

      return {
        ymStr,
        year: yStr,
        monthName: mName,
        label: `${mName} ${yStr}`,
        summary,
        isClosed,
        isCurrentActive,
      };
    });
  }, [messState, activeYM]);

  const filteredMonths = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return monthsData;
    return monthsData.filter((item) =>
      item.label.toLowerCase().includes(q) || item.ymStr.includes(q)
    );
  }, [monthsData, searchQuery]);

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
            <h2>সকল মাসের হিসাব</h2>
            <span>পূর্ববর্তী ও চলমান সকল মাসের খতিয়ান · {messState.mess}</span>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Top Summary Bar */}
        <div className="kk-bt">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--gold)] font-medium flex items-center gap-1.5">
              <span>📅</span> মোট রেকর্ডকৃত মাস: {monthsData.length}টি
            </span>
          </div>
          <span className="text-xs text-[var(--mut)]">
            সক্রিয় মাস: {activeYM}
          </span>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          className="kk-in w-full pl-9"
          placeholder="মাস বা বছর দিয়ে ফিল্টার করুন (যেমন: 2026 বা এপ্রিল)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <svg className="kk-i absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]" width="16" height="16">
          <use href="#kk-search" />
        </svg>
        {searchQuery && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--mut)] hover:text-[var(--ink)] cursor-pointer"
            onClick={() => setSearchQuery('')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Months List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredMonths.map(({ ymStr, label, summary, isClosed, isCurrentActive }) => {
          return (
            <div
              key={ymStr}
              className={`kk-card p-4.5 hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                isCurrentActive ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20' : ''
              }`}
              onClick={() => {
                setActiveYM(ymStr);
                setTab('active');
              }}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg shadow-2xs">
                      📅
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--ink)] m-0 flex items-center gap-2">
                        {label}
                        {isCurrentActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                            বর্তমান
                          </span>
                        )}
                      </h3>
                      <span className="text-[11px] text-[var(--mut)]">
                        কোড: {ymStr}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs ${
                      isClosed
                        ? 'bg-[var(--line)] text-[var(--mut)]'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isClosed ? 'bg-gray-400' : 'bg-emerald-500'
                      }`}
                    />
                    {isClosed ? 'ক্লোজড' : 'চলমান'}
                  </span>
                </div>

                {/* 4-Item Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-[var(--line)]/25 border border-[var(--line)] text-center text-xs mb-3">
                  <div>
                    <span className="text-[11px] text-[var(--mut)] block mb-0.5">মোট জমা</span>
                    <b className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      {tk(summary.dep)}
                    </b>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--mut)] block mb-0.5">মোট খরচ</span>
                    <b className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                      {tk(summary.tot)}
                    </b>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--mut)] block mb-0.5">মোট মিল</span>
                    <b className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                      {fm(summary.meals)}
                    </b>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--mut)] block mb-0.5">মিল রেট</span>
                    <b className="text-[var(--ink)] font-bold text-sm">
                      {fm(summary.rate)}৳
                    </b>
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--line)] text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>সম্পূর্ণ মেস ও সদস্য শিট দেখুন</span>
                <span className="flex items-center gap-1">
                  বিস্তারিত <svg className="kk-i" width="12" height="12"><use href="#kk-r" /></svg>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMonths.length === 0 && (
        <div className="kk-card p-8 text-center text-[var(--mut)] space-y-2">
          <span className="text-3xl block">🔍</span>
          <b className="text-sm block text-[var(--ink)]">কোনো মাস পাওয়া যায়নি</b>
          <p className="text-xs">আপনার অনুসন্ধানের সাথে মিল রেখে কোনো রেকর্ড নেই</p>
        </div>
      )}
    </div>
  );
};
