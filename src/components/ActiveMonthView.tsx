import React, { useState, useMemo } from 'react';
import { Member, MessState } from '../types';
import { MonthSummary, tk, fm, pad } from '../utils/calc';

interface ActiveMonthViewProps {
  messState: MessState;
  activeYM: string;
  setActiveYM: (ym: string) => void;
  monthSummary: MonthSummary | null;
  isMonthLocked: boolean;
  isExportingPDF: boolean;
  handleDownloadGroupPDF: () => void;
  handleDownloadIndividualPDF: (mem?: Member) => void;
  setDetailMemberId: (id: string) => void;
  setTab: (tab: any) => void;
  onOpenDrawer: () => void;
  onBack: () => void;
}

const MS = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলাই', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
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

export const ActiveMonthView: React.FC<ActiveMonthViewProps> = ({
  messState,
  activeYM,
  setActiveYM,
  monthSummary,
  isMonthLocked,
  isExportingPDF,
  handleDownloadGroupPDF,
  handleDownloadIndividualPDF,
  setDetailMemberId,
  setTab,
  onOpenDrawer,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'due' | 'advance'>('all');

  const [yearStr, monthNumStr] = activeYM.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthNumStr, 10) - 1;
  const monthName = banglaMonthsFull[monthIdx] || MS[monthIdx] || '';
  const monthLabel = `${monthName} ${year}`;

  const membersList = useMemo(() => {
    if (!monthSummary) return [];
    return messState.members.map((m) => {
      const o = monthSummary.mm[m.id] || {
        meals: 0,
        dep: 0,
        baz: 0,
        oth: 0,
        tot: 0,
        bal: 0,
        rate: monthSummary.rate || 0,
      };
      return {
        member: m,
        meals: o.meals,
        dep: o.dep,
        tot: o.tot,
        bal: o.bal,
        isMessManager:
          m.id === messState.mgr ||
          (messState.mgrUid && m.uid === messState.mgrUid) ||
          (messState.mgrEmail && m.email?.toLowerCase() === messState.mgrEmail.toLowerCase()),
      };
    });
  }, [messState.members, messState.mgr, messState.mgrUid, messState.mgrEmail, monthSummary]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return membersList.filter((item) => {
      const matchSearch =
        !q ||
        `${item.member.name} ${item.member.room || ''} ${item.member.email || ''}`
          .toLowerCase()
          .includes(q);
      if (!matchSearch) return false;
      if (activeFilter === 'due') return item.bal < 0;
      if (activeFilter === 'advance') return item.bal > 0;
      return true;
    });
  }, [membersList, searchQuery, activeFilter]);

  const totalCost = (monthSummary?.baz || 0) + (monthSummary?.oth || 0);

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
            <h2>চলতি মাসের হিসাব</h2>
            <span>{monthLabel} · {messState.mess}</span>
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

        {/* Month Selector Bar */}
        <div className="kk-bt">
          <div className="kk-mon">
            <button
              type="button"
              onClick={() => {
                const prevDate = new Date(year, monthIdx - 1, 1);
                setActiveYM(`${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`);
              }}
              aria-label="পূর্ববর্তী মাস"
              title="আগের মাস"
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
              title="পরের মাস"
            >
              <svg className="kk-i"><use href="#kk-r" /></svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs ${
                isMonthLocked
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isMonthLocked ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              {isMonthLocked ? 'বন্ধ (Closed)' : 'চলমান (Running)'}
            </span>
          </div>
        </div>
      </header>

      {/* Modern KPI Summary Grid */}
      {monthSummary ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Card 1: মোট জমা */}
          <div className="kk-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--mut)]">মোট জমা</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                ৳
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {tk(monthSummary.dep)}
              </div>
              <span className="text-[11px] text-[var(--mut)]">সদস্যদের মোট প্রদত্ত</span>
            </div>
          </div>

          {/* Card 2: বাজার খরচ */}
          <div className="kk-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--mut)]">বাজার খরচ</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm">
                🛒
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-[var(--ink)]">
                {tk(monthSummary.baz)}
              </div>
              <span className="text-[11px] text-[var(--mut)]">দৈনিক বাজার তালিকা</span>
            </div>
          </div>

          {/* Card 3: অন্যান্য খরচ */}
          <div className="kk-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--mut)]">অন্যান্য খরচ</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm">
                📑
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-[var(--ink)]">
                {tk(monthSummary.oth)}
              </div>
              <span className="text-[11px] text-[var(--mut)]">গ্যাস, বিদ্যুৎ ও বিবিধ</span>
            </div>
          </div>

          {/* Card 4: সর্বমোট খরচ */}
          <div className="kk-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--mut)]">সর্বমোট খরচ</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm">
                💳
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                {tk(totalCost)}
              </div>
              <span className="text-[11px] text-[var(--mut)]">বাজার + অন্যান্য খরচ</span>
            </div>
          </div>

          {/* Card 5: মোট মিল */}
          <div className="kk-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--mut)]">মোট মিল</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
                🍲
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                {fm(monthSummary.meals)} টি
              </div>
              <span className="text-[11px] text-[var(--mut)]">চলতি মাসে খাওয়া মিল</span>
            </div>
          </div>

          {/* Card 6: বর্তমান মিল রেট */}
          <div className="kk-card p-4 flex flex-col justify-between bg-gradient-to-br from-emerald-500/5 via-[var(--card)] to-amber-500/5 border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">মিল রেট</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold">
                ⚡
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {fm(monthSummary.rate)}৳
              </div>
              <span className="text-[11px] text-[var(--mut)]">প্রতি মিল খরচ</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Members Breakdown Section */}
      <section className="kk-sec">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
              <span>👥</span>
              <span>সদস্যভিত্তিক হিসাব বিবরণী</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--line)] text-[var(--mut)]">
                {filteredMembers.length} জন
              </span>
            </h3>
            <p className="text-xs text-[var(--mut)] mt-0.5">
              যেকোনো সদস্যের কার্ডে ক্লিক করে বিস্তারিত প্রোফাইল ও মিল শিট দেখুন
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[var(--card)] p-1 rounded-xl border border-[var(--line)]">
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--mut)] hover:text-[var(--ink)]'
              }`}
              onClick={() => setActiveFilter('all')}
            >
              সবাই
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeFilter === 'due'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-[var(--mut)] hover:text-[var(--ink)]'
              }`}
              onClick={() => setActiveFilter('due')}
            >
              বকেয়া
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeFilter === 'advance'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--mut)] hover:text-[var(--ink)]'
              }`}
              onClick={() => setActiveFilter('advance')}
            >
              উদ্বৃত্ত
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <input
            type="text"
            className="kk-in w-full pl-9"
            placeholder="সদস্যের নাম বা রুম নম্বর দিয়ে খুঁজুন..."
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

        {/* Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMembers.map(({ member, meals, dep, tot, bal, isMessManager }) => {
            const isDue = bal < 0;
            return (
              <div
                key={member.id}
                className="kk-card p-4 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                onClick={() => {
                  setDetailMemberId(member.id);
                  setTab('detail');
                }}
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <b className="text-sm font-bold text-[var(--ink)] truncate">
                            {member.name}
                          </b>
                          {isMessManager && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              Manager
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--mut)] block truncate">
                          {member.room ? `রুম ${member.room}` : 'রুম নির্ধারিত নেই'}
                          {member.phone ? ` · ${member.phone}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Balance Badge */}
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs ${
                          isDue
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isDue ? `বকেয়া: ${tk(Math.abs(bal))}` : `উদ্বৃত্ত: ${tk(bal)}`}
                      </span>
                    </div>
                  </div>

                  {/* 3-Col Micro Stat Box */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[var(--line)]/30 border border-[var(--line)] text-center text-xs mb-3">
                    <div>
                      <span className="text-[11px] text-[var(--mut)] block">মিল</span>
                      <b className="text-[var(--ink)] font-bold">{fm(meals)}</b>
                    </div>
                    <div>
                      <span className="text-[11px] text-[var(--mut)] block">জমা</span>
                      <b className="text-emerald-600 dark:text-emerald-400 font-bold">{tk(dep)}</b>
                    </div>
                    <div>
                      <span className="text-[11px] text-[var(--mut)] block">খরচ</span>
                      <b className="text-rose-600 dark:text-rose-400 font-bold">{tk(tot)}</b>
                    </div>
                  </div>
                </div>

                {/* Bottom Profile Link */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--line)] text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>বিস্তারিত মিল শিট ও খরচ</span>
                  <span className="flex items-center gap-1">
                    প্রোফাইল <svg className="kk-i" width="12" height="12"><use href="#kk-r" /></svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMembers.length === 0 && (
          <div className="kk-card p-8 text-center text-[var(--mut)] space-y-2">
            <span className="text-3xl block">🔍</span>
            <b className="text-sm block text-[var(--ink)]">কোনো সদস্য পাওয়া যায়নি</b>
            <p className="text-xs">আপনার অনুসন্ধানের সাথে মিল রেখে কোনো রেকর্ড নেই</p>
          </div>
        )}
      </section>

      {/* Official PDF Report & Print Section */}
      <section className="kk-card space-y-4">
        <div>
          <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2 !mb-1">
            <span>📑</span>
            <span>অফিসিয়াল PDF রিপোর্ট ও প্রিন্ট ভিউ</span>
          </h3>
          <p className="text-xs text-[var(--mut)] m-0">
            সম্পূর্ণ মেসের ওভারভিউ টেবিল অথবা আপনার ব্যক্তিগত খরচের হিসাব সরাসরি ডিভাইসে PDF ডাউনলোড বা প্রিন্ট করুন
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            className="kk-btn flex items-center justify-center gap-2 font-bold cursor-pointer shadow-sm py-3"
            disabled={isExportingPDF}
            onClick={handleDownloadGroupPDF}
            title="Download Group Mess Summary Report PDF"
          >
            <span>📋</span>
            <span>{isExportingPDF ? 'PDF তৈরি হচ্ছে...' : 'গ্রুপ মেস সামারি রিপোর্ট (PDF)'}</span>
          </button>

          <button
            type="button"
            className="kk-btn flex items-center justify-center gap-2 font-bold cursor-pointer shadow-sm py-3 !bg-[var(--line)] !text-[var(--ink)] hover:!bg-[var(--line)]/80"
            disabled={isExportingPDF}
            onClick={() => handleDownloadIndividualPDF()}
            title="Download Individual Monthly Expense & Meal Summary PDF"
          >
            <span>👤</span>
            <span>{isExportingPDF ? 'PDF তৈরি হচ্ছে...' : 'আমার ব্যক্তিগত সামারি (PDF)'}</span>
          </button>
        </div>

        <button
          type="button"
          className="w-full py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--line)]/40 text-[var(--ink)] flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-all"
          onClick={() => window.print()}
        >
          <span>🖨️</span>
          <span>ব্রাউজার প্রিন্ট ভিউ (Print View / Save as PDF)</span>
        </button>
      </section>
    </div>
  );
};
