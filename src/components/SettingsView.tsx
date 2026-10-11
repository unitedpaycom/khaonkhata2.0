import React from 'react';
import { MessState } from '../types';

interface SettingsViewProps {
  messState: MessState;
  isManager: boolean;
  activeYM: string;
  isMonthLocked: boolean;
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  setModalConfig: (cfg: any) => void;
  saveStateToFirestore: (st: MessState, msg?: string) => Promise<void>;
  showToast: (msg: string) => void;
  onDeleteMess: () => void;
  onOpenDrawer: () => void;
  onBack: () => void;
}

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

export const SettingsView: React.FC<SettingsViewProps> = ({
  messState,
  isManager,
  activeYM,
  isMonthLocked,
  theme,
  setTheme,
  setModalConfig,
  saveStateToFirestore,
  onDeleteMess,
  onOpenDrawer,
  onBack,
}) => {
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
            <h2>মেস সেটিংস ও কন্ট্রোল</h2>
            <span>{messState.mess} · সেটিংস প্যানেল</span>
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

        {/* Status Pill Bar */}
        <div className="kk-bt">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--gold)] font-medium flex items-center gap-1.5">
              <span>👑</span> রোল: {isManager ? 'ম্যানেজার (Manager)' : 'সাধারণ সদস্য (Member)'}
            </span>
          </div>
          <span className="text-xs text-[var(--mut)]">
            সক্রিয় মাস: {activeYM}
          </span>
        </div>
      </header>

      {/* Main Settings Card */}
      <div className="kk-card space-y-4">
        <div className="border-b border-[var(--line)] pb-3">
          <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2 m-0">
            <span>⚙️</span>
            <span>মেসের মূল কনফিগারেশন</span>
          </h3>
          <p className="text-xs text-[var(--mut)] mt-1 mb-0">
            {isManager
              ? 'ম্যানেজার হিসেবে মেসের নাম, সময়সীমা ও রোল পরিচালনা করুন'
              : 'শুধু মেস ম্যানেজার সেটিংস পরিবর্তন করতে পারবেন'}
          </p>
        </div>

        {isManager ? (
          <div className="divide-y divide-[var(--line)]">
            {/* Setting 1: Mess Name */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <b className="text-sm text-[var(--ink)] block">মেসের নাম</b>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                  {messState.mess}
                </span>
                <p className="text-[11px] text-[var(--mut)] m-0">ড্যাশবোর্ড ও রিপোর্টে প্রদর্শিত মেসের নাম</p>
              </div>
              <button
                type="button"
                className="kk-btn kk-sm self-start sm:self-auto cursor-pointer"
                onClick={() => {
                  setModalConfig({
                    isOpen: true,
                    title: 'মেসের নাম পরিবর্তন',
                    fields: [{ k: 'name', l: 'নতুন নাম', v: messState.mess }],
                    onConfirm: (vals: any) => {
                      if (!vals.name?.trim()) return false;
                      saveStateToFirestore(
                        { ...messState, mess: vals.name.trim() },
                        'মেসের নাম পরিবর্তন হয়েছে'
                      );
                    },
                  });
                }}
              >
                বদলান
              </button>
            </div>

            {/* Setting 2: Cutoff Hour */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <b className="text-sm text-[var(--ink)] block">মিল রিকোয়েস্ট কাটঅফ সময়</b>
                <span className="text-xs text-[var(--ink)] font-bold block mt-0.5">
                  রাত {messState.cutoff || 21}:00 টা
                </span>
                <p className="text-[11px] text-[var(--mut)] m-0">
                  পরের দিনের মিল রিকোয়েস্ট বা পরিবর্তনের সর্বশেষ সময়সীমা
                </p>
              </div>
              <button
                type="button"
                className="kk-btn kk-sm self-start sm:self-auto cursor-pointer"
                onClick={() => {
                  setModalConfig({
                    isOpen: true,
                    title: 'কাটঅফ সময় নির্ধারণ (ঘণ্টা)',
                    fields: [
                      {
                        k: 'cutoff',
                        l: 'আগের রাত কয়টা (0-23)',
                        t: 'number',
                        v: messState.cutoff ?? 21,
                      },
                    ],
                    onConfirm: (vals: any) => {
                      const hour = Math.min(23, Math.max(0, +vals.cutoff || 21));
                      saveStateToFirestore(
                        { ...messState, cutoff: hour },
                        'কাটঅফ সময় আপডেট হয়েছে'
                      );
                    },
                  });
                }}
              >
                বদলান
              </button>
            </div>

            {/* Setting 3: Month Lock / Close */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <b className="text-sm text-[var(--ink)] block">চলতি মাস ক্লোজিং / লক</b>
                <span className="text-xs font-semibold block mt-0.5">
                  অবস্থা:{' '}
                  <span
                    className={
                      isMonthLocked
                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                        : 'text-emerald-600 dark:text-emerald-400 font-bold'
                    }
                  >
                    {isMonthLocked ? 'এই মাস বন্ধ (Locked)' : 'এই মাস চলমান (Running)'}
                  </span>
                </span>
                <p className="text-[11px] text-[var(--mut)] m-0">
                  মাস বন্ধ রাখলে নতুন মিল বা খরচের হিসেব যোগ করা বন্ধ থাকবে
                </p>
              </div>
              <button
                type="button"
                className={`kk-btn kk-sm self-start sm:self-auto cursor-pointer ${
                  isMonthLocked
                    ? '!bg-emerald-600 !text-white'
                    : '!bg-amber-600 !text-white'
                }`}
                onClick={() => {
                  const updatedClosed = {
                    ...messState.closed,
                    [activeYM]: !isMonthLocked,
                  };
                  saveStateToFirestore(
                    { ...messState, closed: updatedClosed },
                    isMonthLocked ? 'মাস খোলা হয়েছে' : 'মাস বন্ধ করা হয়েছে'
                  );
                }}
              >
                {isMonthLocked ? 'মাস খুলুন (Unlock)' : 'মাস বন্ধ করুন (Lock)'}
              </button>
            </div>

            {/* Setting 4: Transfer Manager */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <b className="text-sm text-[var(--ink)] block">ম্যানেজার হস্তান্তর (Change Manager)</b>
                <p className="text-[11px] text-[var(--mut)] m-0">
                  অন্য কোনো সক্রিয় মেম্বারকে মেস ম্যানেজারের পূর্ণ কর্তৃত্ব হস্তান্তর করুন
                </p>
              </div>
              <button
                type="button"
                className="kk-btn kk-sm self-start sm:self-auto cursor-pointer !bg-[var(--line)] !text-[var(--ink)]"
                onClick={() => {
                  const opts: [string | number, string][] = messState.members.map((m) => [
                    m.id,
                    `${m.name} (${m.email || 'Email নেই'})`,
                  ]);
                  setModalConfig({
                    isOpen: true,
                    title: 'নতুন ম্যানেজার নির্বাচন',
                    fields: [
                      {
                        k: 'mgr',
                        l: 'মেম্বার সিলেক্ট করুন',
                        t: 'sel',
                        v: messState.mgr,
                        o: opts,
                      },
                    ],
                    onConfirm: (vals: any) => {
                      const newMgrMem = messState.members.find((m) => m.id === vals.mgr);
                      if (!newMgrMem) return false;
                      saveStateToFirestore(
                        {
                          ...messState,
                          mgr: newMgrMem.id,
                          mgrEmail: newMgrMem.email || messState.mgrEmail,
                          mgrUid: newMgrMem.uid || messState.mgrUid,
                        },
                        'ম্যানেজার পরিবর্তন সম্পন্ন হয়েছে'
                      );
                    },
                  });
                }}
              >
                হস্তান্তর
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[var(--line)]/30 border border-[var(--line)] text-xs text-[var(--mut)]">
            🔒 আপনি এই মেসের সাধারণ সদস্য। মেসের নাম, কাটঅফ ও পরিচালনা কেবল ম্যানেজার নিয়ন্ত্রণ করতে পারেন।
          </div>
        )}
      </div>

      {/* Theme Settings Card */}
      <div className="kk-card flex items-center justify-between gap-3 p-4">
        <div>
          <b className="text-sm text-[var(--ink)] block">ডার্ক / লাইট মোড</b>
          <p className="text-xs text-[var(--mut)] m-0">অ্যাপের ডিসপ্লে থিম পরিবর্তন করুন</p>
        </div>
        <button
          type="button"
          className="kk-btn kk-sm flex items-center gap-1.5 cursor-pointer"
          onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        >
          <span>{theme === 'light' ? '🌙 ডার্ক মোড' : '☀️ লাইট মোড'}</span>
        </button>
      </div>

      {/* Danger Zone: Manager only */}
      {isManager && (
        <div className="kk-card border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <b className="text-sm text-rose-600 dark:text-rose-400 block">
                ⚠️ ডেঞ্জার জোন (Danger Zone)
              </b>
              <p className="text-xs text-[var(--mut)] m-0">
                এই মেস ও এর সকল মিল, জমা ও খরচের ডাটা স্থায়ীভাবে মুছে ফেলতে চান?
              </p>
            </div>
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
              onClick={onDeleteMess}
            >
              মেস ডিলিট করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
