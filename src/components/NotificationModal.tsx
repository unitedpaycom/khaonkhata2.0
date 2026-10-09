import React, { useState } from 'react';
import { MessNotification, NotificationType } from '../types';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: MessNotification[];
  readIds: Set<string>;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
  messName?: string;
}

const TY: Record<string, [string, string]> = {
  deposit: ['wal', 'জমা'],
  meal: ['bowl', 'মিল'],
  cost: ['cart', 'খরচ'],
  expense: ['cart', 'খরচ'],
  member: ['users', 'সদস্য'],
  req: ['req', 'রিকোয়েস্ট'],
  push: ['send', 'পুশ'],
  system: ['bell', 'সিস্টেম'],
  notice: ['note', 'নোটিশ'],
};

function rel(ts?: string | number): string {
  if (!ts) return 'এইমাত্র';
  const t = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (isNaN(s) || s < 60) return 'এইমাত্র';
  if (s < 3600) return Math.floor(s / 60) + ' মিনিট আগে';
  if (s < 86400) return Math.floor(s / 3600) + ' ঘণ্টা আগে';
  return Math.floor(s / 86400) + ' দিন আগে';
}

function dayKey(ts?: string | number): string {
  if (!ts) return 'আজ';
  const t = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const d = new Date(t);
  const now = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const n = Math.round((b.getTime() - a.getTime()) / 864e5);
  return n <= 0 ? 'আজ' : n === 1 ? 'গতকাল' : d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
}

function clock(ts?: string | number): string {
  if (!ts) return '';
  const t = typeof ts === 'number' ? ts : new Date(ts).getTime();
  return new Date(t).toLocaleTimeString('bn-BD', { hour: 'numeric', minute: '2-digit' });
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications = [],
  readIds,
  onMarkAllAsRead,
  onMarkAsRead,
  onNavigateTab,
  messName = 'White House',
}) => {
  const [filter, setFilter] = useState<'all' | 'deposit' | 'meal' | 'cost' | 'member'>('all');
  const [selectedNotif, setSelectedNotif] = useState<MessNotification | null>(null);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'deposit') return n.type === 'deposit';
    if (filter === 'meal') return n.type === 'meal';
    if (filter === 'cost') return n.type === 'expense' || n.type === 'cost';
    if (filter === 'member') return n.type === 'member';
    return true;
  });

  // Group by day key
  const groups: Record<string, MessNotification[]> = {};
  filtered.forEach(n => {
    const k = dayKey(n.createdAt);
    if (!groups[k]) groups[k] = [];
    groups[k].push(n);
  });

  const handleOpenDetail = (n: MessNotification) => {
    onMarkAsRead(n.id);
    setSelectedNotif(n);
  };

  // Target tab for selected notification
  const getTargetTab = (n: MessNotification): string | null => {
    if (n.type === 'meal') return 'meal';
    if (n.type === 'deposit') return 'deposit';
    if (n.type === 'expense' || n.type === 'cost') return 'cost';
    if (n.type === 'member') return 'members';
    return null;
  };

  return (
    <div className="kk">
      <div className={`kk-sx ${isOpen ? 'kk-open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!isOpen}>
        <div className="kk-ov" onClick={onClose}></div>
        <div className="kk-bs" id="kk-bs">
          <div className="kk-grab"></div>
          <button className="kk-bsx" onClick={onClose} aria-label="বন্ধ করুন">
            <svg className="kk-i" width="18" height="18"><use href="#kk-x" /></svg>
          </button>

          {selectedNotif ? (
            /* Notification Detail View */
            <div className="kk-nd">
              {(() => {
                const n = selectedNotif;
                const typeInfo = TY[n.type] || ['bell', 'নোটিফিকেশন'];
                const actor = n.actorName || 'ব্যবহারকারী';
                const initial = (actor.trim()[0] || 'U').toUpperCase();
                const navTab = getTargetTab(n);

                // Build fields
                const fields: [string, string][] = [];
                if (n.actorName) fields.push(['সদস্য / প্রেরক', n.actorName]);
                if (n.amount) fields.push(['পরিমাণ', `৳${Math.round(n.amount).toLocaleString('en-IN')}`]);
                if (n.type === 'meal') {
                  const s = n.slot || n.metadata?.slot;
                  if (s) {
                    const b = (s.b || s.m || 0);
                    const l = (s.l || 0);
                    const d = (s.d || 0);
                    fields.push(['সকাল / দুপুর / রাত', `${b} / ${l} / ${d}`]);
                    fields.push(['মোট মিল', `${b + l + d} মিল`]);
                  }
                }
                if (n.body) fields.push(['বিবরণ', n.body]);

                return (
                  <>
                    <div className="kk-ndh">
                      <span className={`kk-ti kk-t-${n.type === 'expense' ? 'cost' : n.type === 'deposit' ? 'dep' : n.type === 'member' ? 'mem' : n.type}`}>
                        <svg className="kk-i" width="28" height="28"><use href={`#kk-${typeInfo[0]}`} /></svg>
                      </span>
                      <h3>{n.title}</h3>
                      <small>
                        {typeInfo[1]} · {new Date(n.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}, {clock(n.createdAt)} · {rel(n.createdAt)}
                      </small>
                      {n.amount ? (
                        <div className={`kk-nbig ${n.type === 'deposit' ? 'kk-pos' : n.type === 'expense' ? 'kk-neg' : 'kk-neu'}`}>
                          {n.type === 'deposit' ? '+' : n.type === 'expense' ? '−' : ''}৳{Math.round(n.amount).toLocaleString('en-IN')}
                        </div>
                      ) : n.type === 'meal' ? (
                        <div className="kk-nbig kk-neu">
                          {(() => {
                            const s = n.slot || n.metadata?.slot;
                            const tot = s ? (s.b || s.m || 0) + (s.l || 0) + (s.d || 0) : 0;
                            return `${tot} মিল`;
                          })()}
                        </div>
                      ) : null}
                    </div>

                    <div className="kk-nb">
                      <div className="kk-card">
                        <div className="kk-who">
                          <span className="kk-mav">{initial}</span>
                          <div>
                            <small>আপডেট করেছেন</small>
                            <b>{actor}</b>
                          </div>
                        </div>
                      </div>

                      {fields.length > 0 && (
                        <div className="kk-card">
                          <span className="kk-lb">বিস্তারিত তথ্য</span>
                          <div className="kk-cg">
                            {fields.map(([k, v]) => (
                              <div key={k}>
                                <span>{k}</span>
                                <em style={{ textAlign: 'right' }}>{v}</em>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="kk-bg3">
                        {navTab && onNavigateTab ? (
                          <button
                            type="button"
                            className="kk-btn"
                            onClick={() => {
                              onNavigateTab(navTab);
                              onClose();
                            }}
                          >
                            <svg className="kk-i" width="18" height="18"><use href="#kk-arr" /></svg>
                            পেজে যান
                          </button>
                        ) : <span />}
                        <button
                          type="button"
                          className="kk-btn kk-gh"
                          onClick={() => setSelectedNotif(null)}
                        >
                          তালিকায় ফিরুন
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            /* Notification List View */
            <div className="kk-bp" style={{ padding: '16px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, padding: 0 }}>
                  নোটিফিকেশন {unreadCount > 0 ? `(${unreadCount})` : ''}
                </h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="kk-hl"
                    onClick={onMarkAllAsRead}
                    style={{ padding: '4px 8px', fontSize: 13, cursor: 'pointer' }}
                  >
                    <svg className="kk-i" width="16" height="16"><use href="#kk-check" /></svg>
                    সব পড়া হয়েছে
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="kk-tabs" style={{ margin: '0 -14px 12px', padding: '2px 14px 6px' }}>
                <button
                  type="button"
                  className={filter === 'all' ? 'kk-on' : ''}
                  onClick={() => setFilter('all')}
                >
                  সব {unreadCount > 0 && <em>{unreadCount}</em>}
                </button>
                <button
                  type="button"
                  className={filter === 'deposit' ? 'kk-on' : ''}
                  onClick={() => setFilter('deposit')}
                >
                  জমা
                </button>
                <button
                  type="button"
                  className={filter === 'meal' ? 'kk-on' : ''}
                  onClick={() => setFilter('meal')}
                >
                  মিল
                </button>
                <button
                  type="button"
                  className={filter === 'cost' ? 'kk-on' : ''}
                  onClick={() => setFilter('cost')}
                >
                  খরচ
                </button>
                <button
                  type="button"
                  className={filter === 'member' ? 'kk-on' : ''}
                  onClick={() => setFilter('member')}
                >
                  সদস্য
                </button>
              </div>

              {/* Grouped Notification List */}
              {Object.keys(groups).length > 0 ? (
                Object.entries(groups).map(([dateLabel, items]) => (
                  <div key={dateLabel} className="kk-sec" style={{ marginTop: 0, marginBottom: 14 }}>
                    <div className="kk-card kk-nh">
                      <div className="kk-dg">
                        <b>{dateLabel}</b>
                        <span>{items.length} টি</span>
                      </div>
                      {items.map(item => {
                        const isUnread = !readIds.has(item.id);
                        const typeInfo = TY[item.type] || ['bell', 'বার্তা'];
                        const iconType = item.type === 'expense' ? 'cost' : item.type === 'deposit' ? 'dep' : item.type === 'member' ? 'mem' : item.type;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`kk-nf ${isUnread ? 'kk-un' : ''}`}
                            onClick={() => handleOpenDetail(item)}
                          >
                            <span className={`kk-ti kk-t-${iconType}`}>
                              <svg className="kk-i" width="22" height="22"><use href={`#kk-${typeInfo[0]}`} /></svg>
                            </span>
                            <div className="kk-n">
                              <b>{item.title}</b>
                              <small>{item.body || item.actorName || ''}</small>
                              <span className="kk-tm">{rel(item.createdAt)}</span>
                            </div>
                            {item.amount ? (
                              <div className="kk-bv">
                                <b className={item.type === 'deposit' ? 'kk-pos' : item.type === 'expense' ? 'kk-neg' : ''}>
                                  {item.type === 'deposit' ? '+' : item.type === 'expense' ? '−' : ''}৳{Math.round(item.amount).toLocaleString('en-IN')}
                                </b>
                              </div>
                            ) : null}
                            <svg className="kk-i" width="16" height="16"><use href="#kk-chev" /></svg>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="kk-card">
                  <div className="kk-em0">
                    <i><svg className="kk-i" width="24" height="24"><use href="#kk-bell" /></svg></i>
                    এই ফিল্টারে কোনো নোটিফিকেশন নেই
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
