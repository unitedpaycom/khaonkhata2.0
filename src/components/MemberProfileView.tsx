import React, { useState } from 'react';
import { Member, MessState } from '../types';
import { MonthSummary, TD, pad, tk } from '../utils/calc';

interface MemberProfileViewProps {
  member: Member;
  messState: MessState;
  activeYM: string;
  monthSummary: MonthSummary | null;
  isCurrentUserManager: boolean;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDownloadPDF?: () => void;
}

const MS = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলাই', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const LB = ['সকাল', 'দুপুর', 'রাত'];

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const f1 = (n: number) => String(Math.round(n * 10) / 10);

const ic = (name: string, size = 20) => (
  <svg className="kk-i" width={size} height={size}>
    <use href={`#kk-${name}`} xlinkHref={`#kk-${name}`} />
  </svg>
);

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

export const MemberProfileView: React.FC<MemberProfileViewProps> = ({
  member,
  messState,
  activeYM,
  monthSummary,
  isCurrentUserManager,
  onBack,
  onEdit,
  onDelete,
  onDownloadPDF,
}) => {
  const [activeTab, setActiveTab] = useState<'m' | 'd' | 'a'>('m');

  const isManager =
    member.id === messState.mgr ||
    (messState.mgrUid && member.uid === messState.mgrUid) ||
    (messState.mgrEmail && member.email?.toLowerCase() === messState.mgrEmail.toLowerCase());

  const [yearStr, monthNumStr] = activeYM.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthNumStr, 10) - 1;
  const monthLabel = `${MS[monthIdx] || ''} ${year}`;

  const mSummary = monthSummary?.mm[member.id] || {
    meals: 0,
    dep: 0,
    cost: 0,
    ind: 0,
    sh: 0,
    tot: 0,
    bal: 0,
  };

  const totalMeals = mSummary.meals;
  const dep = mSummary.dep;
  const cost = mSummary.tot || mSummary.cost + mSummary.sh + mSummary.ind;
  const bal = mSummary.bal;
  const pct = Math.min(100, dep / Math.max(1, cost) * 100);
  const rate = monthSummary?.rate || 0;

  // Member deposits for active month
  const memberDeposits = messState.deposits
    .filter((d) => d.m === member.id && d.date.startsWith(activeYM))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Daily meals for active month
  const dim = new Date(year, monthIdx + 1, 0).getDate();
  const todayDay = TD.startsWith(activeYM) ? parseInt(TD.split('-')[2], 10) : dim;

  const dailyMealsList: Array<{ d: number; dateStr: string; v: [number, number, number]; total: number }> = [];
  for (let d = 1; d <= dim; d++) {
    const dayStr = `${activeYM}-${pad(d)}`;
    const slot = messState.meals[dayStr]?.[member.id];
    if (slot) {
      const b = slot.b || 0;
      const l = slot.l || 0;
      const dinner = slot.d || 0;
      const tot = b + l + dinner;
      if (tot > 0) {
        dailyMealsList.push({ d, dateStr: dayStr, v: [b, l, dinner], total: tot });
      }
    }
  }

  // Days with meals count
  const mealsCountDays = dailyMealsList.length;

  // Calendar: Week starts Saturday (شنی)
  const firstDayWeek = new Date(year, monthIdx, 1).getDay(); // 0 is Sun, 6 is Sat
  const off = (firstDayWeek + 1) % 7; // Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6

  const daysMealMap = new Map(dailyMealsList.map((x) => [x.d, x.total]));

  // Activity list
  const activityList = [
    ...memberDeposits.map((x) => ({
      d: parseInt(x.date.split('-')[2], 10),
      t: `জমা ${tk(x.amt)} যোগ হয়েছে`,
      s: `${(x as any).method || x.mt || x.note || 'নগদ'} · ${parseInt(x.date.split('-')[2], 10)} ${MS[monthIdx]}`,
    })),
    ...dailyMealsList.slice(-4).map((x) => ({
      d: x.d,
      t: `মিল সংরক্ষিত – ${f1(x.total)} মিল`,
      s: `${x.d} ${MS[monthIdx]}`,
    })),
  ].sort((a, b) => b.d - a.d);

  const perms = [
    ['সদস্য যোগ ও মুছে ফেলা', 1],
    ['জমা, খরচ ও মিল এডিট', 1],
    ['মিল রিকোয়েস্ট অনুমোদন', 1],
    ['নোটিশ ও পুশ নোটিফিকেশন', 1],
    ['মেস সেটিংস ও PDF রিপোর্ট', 1],
  ];

  const mperms = [
    ['নিজের হিসাব ও রিপোর্ট দেখা', 1],
    ['মিল রিকোয়েস্ট পাঠানো', 1],
    ['জমা/খরচ/মিল এডিট করা', 0],
    ['সদস্য যোগ বা মুছে ফেলা', 0],
  ];

  const numericId = String(member.id).replace(/\D/g, '').slice(-4).padStart(4, '0') || '0001';
  const updatesCount =
    (messState.deposits.length + messState.bazar.length + Object.keys(messState.meals).length) || 42;

  const initialChar = (member.name[0] || 'U').toUpperCase();

  return (
    <div className="kk kk-view w-full">
      <header className="kk-hero kk-pf2">
        {ORN}
        <div className="kk-bar">
          <button
            type="button"
            className="kk-ib"
            data-a="back"
            onClick={onBack}
            aria-label="পিছনে"
          >
            {ic('l')}
          </button>
          <h1>{isManager ? 'ম্যানেজার প্রোফাইল' : 'সদস্য প্রোফাইল'}</h1>
          <button
            type="button"
            className="kk-ib"
            data-a="edit"
            onClick={onEdit}
            aria-label="এডিট"
          >
            {ic('edit', 19)}
          </button>
        </div>

        <div className={`kk-ava ${isManager ? '' : 'kk-mbr'}`}>
          <span>{initialChar}</span>
          <em>{ic(isManager ? 'crown' : 'check', 17)}</em>
        </div>

        <div className="kk-nm">
          <b>{member.name}</b>
          <span>
            {ic(isManager ? 'shield' : 'user', 13)}
            {isManager ? 'Mess Manager' : 'Mess Member'}
          </span>
        </div>

        <div className="kk-ct">
          <span>
            {ic('bed', 15)}
            {member.room || 'Room -'}
          </span>
          <span>
            {ic('phone', 15)}
            {member.phone || 'ফোন নেই'}
          </span>
          <span>
            {ic('mail', 15)}
            {member.email || 'Email নেই'}
          </span>
        </div>

        <div className="kk-pa2">
          <button
            type="button"
            className="kk-g1"
            data-a="pdf"
            onClick={onDownloadPDF}
          >
            {ic('pdf', 16)}PDF ডাউনলোড
          </button>
          <button
            type="button"
            data-a="edit"
            onClick={onEdit}
          >
            {ic('edit', 16)}এডিট
          </button>
          {!isManager && isCurrentUserManager && (
            <button
              type="button"
              className="kk-r1"
              data-a="delete"
              onClick={onDelete}
            >
              {ic('trash', 16)}ডিলিট
            </button>
          )}
        </div>
      </header>

      <div className="kk-sheet" style={{ paddingTop: 0, marginTop: '-52px', background: 'none' }}>
        <div className="kk-card kk-bc">
          <span className="kk-lab">বর্তমান ব্যালেন্স · {monthLabel}</span>
          <span className={`kk-st ${bal >= 0 ? 'kk-stp' : 'kk-stn'}`}>
            {bal >= 0 ? 'পাওনা' : 'বাকি'}
          </span>
          <div className={`kk-bign ${bal >= 0 ? 'kk-pos' : 'kk-neg'}`}>
            <small>৳</small>
            {fmt(Math.abs(bal))}
          </div>

          <div className="kk-sp2">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="kk-lg">
            <span>খরচ {tk(cost)}</span>
            <span>
              জমা {tk(dep)} · {Math.round(pct)}%
            </span>
          </div>

          <div className="kk-t3">
            <div>
              <small>মোট মিল</small>
              <b>{f1(totalMeals)}</b>
            </div>
            <div>
              <small>মোট জমা</small>
              <b>{tk(dep)}</b>
            </div>
            <div>
              <small>মোট খরচ</small>
              <b>{tk(cost)}</b>
            </div>
          </div>
        </div>

        {/* Member ID Card */}
        <section className="kk-sec">
          <div className={`kk-idc ${isManager ? '' : 'kk-mc2'}`}>
            {ORN}
            <div className="kk-idt">
              <span>KHAONKHATA</span>
              <span>{isManager ? 'MANAGER' : 'MEMBER'}</span>
            </div>
            <div className="kk-chip" />
            <div className="kk-idn">KK · {numericId} · {year}</div>
            <div className="kk-idb">
              <div>
                <small>সদস্য</small>
                <b>{member.name}</b>
              </div>
              <div style={{ textAlign: 'right' }}>
                <small>মেস</small>
                <b>{messState.mess}</b>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Metrics */}
        <section className="kk-sec">
          <div className="kk-sh">
            <h2>এক নজরে</h2>
            <span className="kk-ch">এই মাস</span>
          </div>
          <div className="kk-sg4">
            <div className="kk-card">
              <i className="kk-t-meal">{ic('bowl', 20)}</i>
              <small>মিল রেট</small>
              <b>
                {f1(Math.round(rate * 10) / 10)}
                <u>৳</u>
              </b>
            </div>
            <div className="kk-card">
              <i className="kk-t-cost">{ic('cart', 20)}</i>
              <small>মিল বাবদ খরচ</small>
              <b>
                {fmt(totalMeals * rate)}
                <u>৳</u>
              </b>
            </div>
            <div className="kk-card">
              <i className="kk-t-dep">{ic('wal', 20)}</i>
              <small>জমার হার</small>
              <b>
                {Math.round(pct)}
                <u>%</u>
              </b>
            </div>
            <div className="kk-card">
              <i className="kk-t-req">{ic('cal', 20)}</i>
              <small>মিল নেওয়া দিন</small>
              <b>
                {mealsCountDays}
                <u>/ {todayDay}</u>
              </b>
            </div>
          </div>
        </section>

        {/* Meal Calendar */}
        <section className="kk-sec">
          <div className="kk-sh">
            <h2>মিলের ক্যালেন্ডার</h2>
            <span className="kk-ch">{monthLabel}</span>
          </div>
          <div className="kk-card">
            <div className="kk-cal">
              {['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র'].map((day) => (
                <u key={day}>{day}</u>
              ))}
              {Array.from({ length: off }).map((_, i) => (
                <i key={`empty-${i}`} className="ke" />
              ))}
              {Array.from({ length: dim }).map((_, i) => {
                const d = i + 1;
                const v = daysMealMap.get(d) || 0;
                const isFuture = TD.startsWith(activeYM) && d > todayDay;
                const isToday = TD.startsWith(activeYM) && d === todayDay;

                let c = '';
                if (isFuture) {
                  c = 'kf';
                } else if (v > 2) {
                  c = 'k3';
                } else if (v > 1) {
                  c = 'k2';
                } else if (v > 0) {
                  c = 'k1';
                }

                return (
                  <i
                    key={d}
                    className={`${c} ${isToday ? 'kt' : ''}`}
                    title={`${d} ${MS[monthIdx]}: ${f1(v)} মিল`}
                  >
                    {d}
                  </i>
                );
              })}
            </div>
            <div className="kk-key">
              কম
              <s style={{ background: '#CFEBDD' }} />
              <s style={{ background: '#6FCBA3' }} />
              <s style={{ background: '#0B3B2C' }} />
              বেশি
            </div>
          </div>
        </section>

        {/* Personal Details */}
        <section className="kk-sec">
          <div className="kk-sh">
            <h2>ব্যক্তিগত তথ্য</h2>
          </div>
          <div className="kk-card kk-dl">
            <div className="kk-r">
              <span>{ic('user', 17)}পূর্ণ নাম</span>
              <b>{member.name}</b>
            </div>
            <div className="kk-r">
              <span>{ic('mail', 17)}ইমেইল</span>
              <b>{member.email || 'Email নেই'}</b>
            </div>
            <div className="kk-r">
              <span>{ic('phone', 17)}ফোন</span>
              <b>{member.phone || 'ফোন নেই'}</b>
            </div>
            <div className="kk-r">
              <span>{ic('bed', 17)}রুম</span>
              <b>{member.room || 'রুম নেই'}</b>
            </div>
            <div className="kk-r">
              <span>{ic('cal', 17)}যোগদান</span>
              <b>{member.join || '1 জানু 2026'}</b>
            </div>
            <div className="kk-r">
              <span>{ic('home', 17)}মেস</span>
              <b>{messState.mess}</b>
            </div>
            <div className="kk-r kk-t">
              <span>{ic('shield', 17)}ভূমিকা</span>
              <b>{isManager ? 'ম্যানেজার' : 'সদস্য'}</b>
            </div>
          </div>
        </section>

        {/* Manager Control / Permissions */}
        <section className="kk-sec">
          <div className="kk-sh">
            <h2>{isManager ? 'ম্যানেজার কন্ট্রোল' : 'অ্যাক্সেস ও অনুমতি'}</h2>
            <span className="kk-ch">{isManager ? 'Full access' : 'View only'}</span>
          </div>
          <div className="kk-card">
            {isManager && (
              <div className="kk-t3" style={{ margin: '0 0 6px', padding: 0, border: 0 }}>
                <div>
                  <small>মেস কোড</small>
                  <b>{messState.id.slice(0, 10)}</b>
                </div>
                <div>
                  <small>মোট সদস্য</small>
                  <b>{messState.members.length} জন</b>
                </div>
                <div>
                  <small>এই মাসের আপডেট</small>
                  <b>{updatesCount} টি</b>
                </div>
              </div>
            )}
            <div className="kk-pm">
              {(isManager ? perms : mperms).map((p, idx) => (
                <div key={idx}>
                  <i className={p[1] ? '' : 'kk-no'}>{ic(p[1] ? 'check' : 'x', 14)}</i>
                  <span>{p[0]}</span>
                </div>
              ))}
            </div>
            {!isManager && (
              <div className="kk-ro">
                {ic('eye', 18)}
                <span>
                  সদস্য হিসেবে আপনি সব তথ্য দেখতে পারবেন। কোনো পরিবর্তন শুধু ম্যানেজার করতে পারেন
                  এবং তা সাথে সাথে এখানে আপডেট হয়ে যাবে।
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Tabs: Meal List, Deposit List, Activity */}
        <section className="kk-sec">
          <div className="kk-tabs" id="kk-pt">
            <button
              type="button"
              className={activeTab === 'm' ? 'kk-on' : ''}
              data-t="m"
              onClick={() => setActiveTab('m')}
            >
              {ic('bowl', 17)}মিলের তালিকা
            </button>
            <button
              type="button"
              className={activeTab === 'd' ? 'kk-on' : ''}
              data-t="d"
              onClick={() => setActiveTab('d')}
            >
              {ic('wal', 17)}জমার তালিকা
            </button>
            <button
              type="button"
              className={activeTab === 'a' ? 'kk-on' : ''}
              data-t="a"
              onClick={() => setActiveTab('a')}
            >
              {ic('clock', 17)}অ্যাক্টিভিটি
            </button>
          </div>

          {/* Pane: Meals */}
          {activeTab === 'm' && (
            <div className="kk-pane" data-p="m">
              <div className="kk-card kk-ls">
                {dailyMealsList.length > 0 ? (
                  [...dailyMealsList].reverse().map((x) => (
                    <div key={x.dateStr} className="kk-li">
                      <span className="kk-ti kk-t-meal" style={{ width: 42, height: 42 }}>
                        {ic('bowl', 20)}
                      </span>
                      <div className="kk-n">
                        <b>
                          {x.d} {MS[monthIdx]} {year}
                        </b>
                        <small>
                          <span className="kk-bt3">
                            {x.v.map((val, i) =>
                              val > 0 ? (
                                <s key={i}>
                                  {LB[i]} {f1(val)}
                                </s>
                              ) : null
                            )}
                          </span>
                        </small>
                      </div>
                      <b className="kk-amtv">{f1(x.total)}</b>
                    </div>
                  ))
                ) : (
                  <div className="kk-em0">
                    <i>{ic('bowl', 24)}</i>
                    <span>এই মাসে এখনো কোনো মিল নেই</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pane: Deposits */}
          {activeTab === 'd' && (
            <div className="kk-pane" data-p="d">
              <div className="kk-card kk-ls">
                {memberDeposits.length > 0 ? (
                  memberDeposits.map((x) => {
                    const day = parseInt(x.date.split('-')[2], 10);
                    return (
                      <div key={x.id} className="kk-li">
                        <span className="kk-ti kk-t-dep" style={{ width: 42, height: 42 }}>
                          {ic('wal', 20)}
                        </span>
                        <div className="kk-n">
                          <b>
                            {day} {MS[monthIdx]} {year}
                          </b>
                          <small>
                            <span className="kk-mtag">{(x as any).method || x.mt || x.note || 'নগদ'}</span>
                          </small>
                        </div>
                        <b className="kk-amtv kk-pos">+{tk(x.amt)}</b>
                      </div>
                    );
                  })
                ) : (
                  <div className="kk-em0">
                    <i>{ic('wal', 24)}</i>
                    <span>এই মাসে এখনো কোনো জমা নেই</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pane: Activity */}
          {activeTab === 'a' && (
            <div className="kk-pane" data-p="a">
              <div className="kk-card">
                {activityList.length > 0 ? (
                  <div className="kk-tl">
                    {activityList.map((a, i) => (
                      <div key={i}>
                        <b>{a.t}</b>
                        <small>{a.s}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="kk-em0">
                    <i>{ic('clock', 24)}</i>
                    <span>কোনো সাম্প্রতিক কার্যক্রম নেই</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <button
          type="button"
          className="kk-btn kk-gh"
          data-a="back"
          onClick={onBack}
          style={{ marginTop: 6 }}
        >
          {ic('l', 18)}
          {isManager ? 'ড্যাশবোর্ডে ফিরুন' : 'সব সদস্যের তালিকায় ফিরুন'}
        </button>
      </div>
    </div>
  );
};
