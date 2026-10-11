import React, { useState, useMemo } from 'react';
import { Member, MessState } from '../types';
import { MonthSummary, tk, fm, pad } from '../utils/calc';

interface MembersListViewProps {
  messState: MessState;
  activeYM: string;
  setActiveYM: (ym: string) => void;
  monthSummary: MonthSummary | null;
  isManager: boolean;
  onSelectMember: (memberId: string) => void;
  onAddMember: () => void;
  onArchiveMember: (member: Member) => void;
  onOpenDrawer: () => void;
  onBack: () => void;
  setModalConfig: (config: any) => void;
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

export const MembersListView: React.FC<MembersListViewProps> = ({
  messState,
  activeYM,
  setActiveYM,
  monthSummary,
  isManager,
  onSelectMember,
  onAddMember,
  onArchiveMember,
  onOpenDrawer,
  onBack,
  setModalConfig,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'due' | 'advance' | 'archived'>('all');

  const [yearStr, monthNumStr] = activeYM.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthNumStr, 10) - 1;
  const monthLabel = `${MS[monthIdx] || ''} ${year}`;

  const rate = monthSummary?.rate || 0;

  // Active members with their calculated month summaries
  const memberData = useMemo(() => {
    return messState.members.map((m) => {
      const summary = monthSummary?.mm[m.id] || {
        meals: 0,
        dep: 0,
        cost: 0,
        ind: 0,
        sh: 0,
        tot: 0,
        bal: 0,
      };
      const bal = summary.bal;
      const progress = Math.min(
        100,
        summary.cost > 0
          ? (summary.dep / summary.cost) * 100
          : summary.dep > 0
          ? 100
          : 0
      );
      return {
        member: m,
        summary,
        bal,
        progress,
        isMessManager:
          m.id === messState.mgr ||
          (messState.mgrUid && m.uid === messState.mgrUid) ||
          (messState.mgrEmail && m.email?.toLowerCase() === messState.mgrEmail.toLowerCase()),
      };
    });
  }, [messState.members, messState.mgr, messState.mgrUid, messState.mgrEmail, monthSummary]);

  // Counts for filters
  const dueCount = useMemo(() => memberData.filter((d) => d.bal < 0).length, [memberData]);
  const advanceCount = useMemo(() => memberData.filter((d) => d.bal > 0).length, [memberData]);
  const archivedCount = messState.archivedMembers?.length || 0;

  // Filtered members based on search and selected tab
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return memberData.filter(({ member, bal }) => {
      const matchSearch =
        !q ||
        `${member.name} ${member.email || ''} ${member.room || ''} ${member.phone || ''}`
          .toLowerCase()
          .includes(q);

      if (!matchSearch) return false;

      if (filterType === 'due') return bal < 0;
      if (filterType === 'advance') return bal > 0;
      return true;
    });
  }, [memberData, searchQuery, filterType]);

  const filteredArchived = useMemo(() => {
    if (!messState.archivedMembers) return [];
    const q = searchQuery.trim().toLowerCase();
    return messState.archivedMembers.filter((am) => {
      return (
        !q ||
        `${am.name} ${am.email || ''} ${am.room || ''} ${am.phone || ''}`
          .toLowerCase()
          .includes(q)
      );
    });
  }, [messState.archivedMembers, searchQuery]);

  return (
    <div className="kk-view">
      {/* Hero Header */}
      <header className="kk-hero">
        {ORN}

        {/* Top Bar Actions */}
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
            <h2>মেস সদস্যবৃন্দ</h2>
            <span>{messState.members.length} জন সক্রিয় সদস্য · {messState.mess}</span>
          </div>
          <div className="flex items-center gap-2">
            {isManager && (
              <button
                type="button"
                className="kk-ib"
                onClick={onAddMember}
                aria-label="নতুন সদস্য যোগ"
                title="নতুন সদস্য যোগ করুন"
              >
                <svg className="kk-i" width="18" height="18"><use href="#kk-plus" /></svg>
              </button>
            )}
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

        {/* Month Navigation & Rate Bar */}
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
              <span className="kk-lab !text-[11.5px]">মোট সদস্য</span>
              <b className="text-white text-base font-bold font-['Manrope'] block mt-0.5">
                {messState.members.length} জন
              </b>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <span className="kk-lab !text-[11.5px]">মাসিক মিল</span>
              <b className="text-white text-base font-bold font-['Manrope'] block mt-0.5">
                {fm(monthSummary?.meals || 0)}টি
              </b>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div>
              <span className="kk-lab !text-[11.5px]">মোট জমা</span>
              <b className="text-[var(--kk-gold)] text-base font-bold font-['Manrope'] block mt-0.5">
                {tk(monthSummary?.dep || 0)}
              </b>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Sheet */}
      <main className="kk-sheet space-y-4">
        {/* Search & Add Member Action Bar */}
        <div className="kk-row">
          <div className="kk-sb">
            <svg className="kk-i" width="18" height="18"><use href="#kk-search" /></svg>
            <input
              type="text"
              placeholder="নাম, রুম বা ইমেইল দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="kk-in"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm p-1.5 cursor-pointer"
                aria-label="অনুসন্ধান মুছুন"
              >
                ✕
              </button>
            )}
          </div>
          {isManager && (
            <button
              type="button"
              className="kk-btn kk-sm !w-auto !px-4 shrink-0 cursor-pointer"
              onClick={onAddMember}
            >
              <svg className="kk-i" width="16" height="16"><use href="#kk-plus" /></svg>
              <span>সদস্য যোগ</span>
            </button>
          )}
        </div>

        {/* Filter Segment Tabs */}
        <div className="kk-tabs" role="tablist">
          <button
            type="button"
            className={filterType === 'all' ? 'kk-on' : ''}
            onClick={() => setFilterType('all')}
          >
            সকল সদস্য ({memberData.length})
          </button>
          <button
            type="button"
            className={filterType === 'due' ? 'kk-on' : ''}
            onClick={() => setFilterType('due')}
          >
            বকেয়া / ঋণাত্মক ({dueCount})
          </button>
          <button
            type="button"
            className={filterType === 'advance' ? 'kk-on' : ''}
            onClick={() => setFilterType('advance')}
          >
            অগ্রিম জমা ({advanceCount})
          </button>
          {archivedCount > 0 && (
            <button
              type="button"
              className={filterType === 'archived' ? 'kk-on' : ''}
              onClick={() => setFilterType('archived')}
            >
              আর্কাইভ ({archivedCount})
            </button>
          )}
        </div>

        {/* Member Cards Grid / List */}
        {filterType !== 'archived' && (
          <div className="space-y-3.5">
            {filteredMembers.map(({ member: m, summary: mSummary, bal: b, progress: p, isMessManager }) => (
              <div
                key={m.id}
                className="kk-card kk-mc transition-all hover:border-[var(--kk-g)] cursor-pointer"
                onClick={() => onSelectMember(m.id)}
              >
                {/* Member Header Row */}
                <div className="kk-mct">
                  <span className={`kk-mav overflow-hidden ${isMessManager ? 'kk-mgr' : ''}`}>
                    {m.photoURL ? (
                      <img src={m.photoURL} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      (m.name[0] || '?').toUpperCase()
                    )}
                  </span>
                  <div className="kk-n">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <b>{m.name}</b>
                      {isMessManager && (
                        <span className="kk-tag">ম্যানেজার</span>
                      )}
                    </div>
                    <small>
                      <span>{m.room ? `রুম: ${m.room}` : 'রুম অনির্ধারিত'}</span>
                      <span>·</span>
                      <span>মিল: {fm(mSummary.meals)}টি</span>
                    </small>
                  </div>
                  <div className="kk-bv">
                    <b className={b >= 0 ? 'kk-pos' : 'kk-neg'}>
                      {b >= 0 ? '+' : ''}{tk(b)}
                    </b>
                    <small>{b >= 0 ? 'অগ্রিম ব্যালেন্স' : 'বকেয়া খরচ'}</small>
                  </div>
                </div>

                {/* Deposit vs Cost Progress Bar */}
                <div className="kk-md !m-0 !mt-3.5 !p-3">
                  <div className="kk-mb2">
                    <i style={{ width: `${p}%` }} />
                  </div>
                  <div className="kk-mbl !mb-0 !mt-2 flex justify-between text-xs">
                    <span>জমা: <b>{tk(mSummary.dep)}</b></span>
                    <span>খরচ: <b>{tk(mSummary.tot)}</b></span>
                  </div>
                </div>

                {/* Contact & Meta Information */}
                <div className="kk-mi">
                  <span>
                    <svg className="kk-i" width="15" height="15"><use href="#kk-mail" /></svg>
                    {m.email || 'ইমেইল যুক্ত করা নেই'}
                  </span>
                  {m.phone && (
                    <span>
                      <svg className="kk-i" width="15" height="15"><use href="#kk-phone" /></svg>
                      {m.phone}
                    </span>
                  )}
                  {m.room && (
                    <span>
                      <svg className="kk-i" width="15" height="15"><use href="#kk-bed" /></svg>
                      রুম নম্বর: {m.room}
                    </span>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="kk-mf">
                  <button
                    type="button"
                    className="kk-btn kk-gl2 kk-sm flex-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMember(m.id);
                    }}
                  >
                    <svg className="kk-i" width="16" height="16"><use href="#kk-user" /></svg>
                    <span>প্রোফাইল ও হিসাব</span>
                    <svg className="kk-i" width="14" height="14"><use href="#kk-chev" /></svg>
                  </button>
                  {isManager && !isMessManager && (
                    <button
                      type="button"
                      className="kk-btn kk-gh kk-sm !w-auto !px-3 text-red-500 hover:text-red-600 hover:border-red-300 dark:hover:border-red-800 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalConfig({
                          isOpen: true,
                          title: 'সদস্য মুছে ফেলবেন?',
                          message: `আপনি কি "${m.name}"-কে মেস থেকে রিমুভ ও আর্কাইভ করতে চান? ওনার পূর্বের মিল ও জমার রেকর্ড মেসের ইতিহাসে সংরক্ষিত থাকবে, কিন্তু উনি আর অ্যাক্টিভ লিস্টে থাকবেন না এবং লগইন করতে পারবেন না।`,
                          confirmText: 'মুছে ফেলুন',
                          onConfirm: () => onArchiveMember(m),
                        });
                      }}
                      title="সদস্য মুছুন / আর্কাইভ করুন"
                    >
                      <svg className="kk-i" width="16" height="16"><use href="#kk-trash" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <div className="kk-card text-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center">
                  <svg className="kk-i" width="28" height="28"><use href="#kk-users" /></svg>
                </div>
                <h3 className="text-base font-bold text-[var(--kk-ink)]">কোনো সদস্য পাওয়া যায়নি</h3>
                <p className="text-xs text-[var(--kk-mut)]">
                  {searchQuery
                    ? `"${searchQuery}" এর সাথে মিলে এমন কোনো সদস্য পাওয়া যায়নি।`
                    : filterType === 'due'
                    ? 'বর্তমানে কোনো সদস্যের ব্যালেন্স ঋণাত্মক নেই।'
                    : filterType === 'advance'
                    ? 'বর্তমানে কোনো সদস্যের অগ্রিম জমা নেই।'
                    : 'মেসে বর্তমানে কোনো সদস্য নেই।'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    className="kk-btn kk-sm !w-auto !px-5 mx-auto mt-2"
                    onClick={() => setSearchQuery('')}
                  >
                    সার্চ ক্লিয়ার করুন
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Archived Members Section */}
        {(filterType === 'archived' || (filterType === 'all' && filteredArchived.length > 0 && !searchQuery)) && (
          <section className="kk-sec !mt-6">
            <div className="kk-sh">
              <h2>📦 আর্কাইভকৃত প্রাক্তন সদস্য ({filteredArchived.length})</h2>
              <span className="kk-ch text-xs">রেকর্ড সংরক্ষিত</span>
            </div>
            <div className="kk-card !bg-neutral-50/80 dark:!bg-neutral-900/40 border border-dashed border-[var(--kk-line)] space-y-3">
              {filteredArchived.map((am) => {
                const amSummary = monthSummary?.mm[am.id] || { bal: 0, meals: 0, dep: 0 };
                return (
                  <div
                    key={am.id}
                    className="py-2.5 px-3 rounded-xl bg-white/70 dark:bg-neutral-800/40 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="kk-mav !w-9 !h-9 !text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                        {(am.name[0] || '?').toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--kk-ink)] text-sm">{am.name}</span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-bold">
                            আর্কাইভড
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--kk-mut)] m-0 mt-0.5">
                          {am.email || 'Email নেই'} {am.room ? `· রুম: ${am.room}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold block ${amSummary.bal >= 0 ? 'kk-pos' : 'kk-neg'}`}>
                        {amSummary.bal >= 0 ? '+' : ''}{tk(amSummary.bal)}
                      </span>
                      <small className="text-[10px] text-[var(--kk-mut)]">হিস্টোরি ব্যালেন্স</small>
                    </div>
                  </div>
                );
              })}
              {filteredArchived.length === 0 && (
                <p className="text-xs text-center text-[var(--kk-mut)] py-4">কোনো আর্কাইভকৃত সদস্য নেই।</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
