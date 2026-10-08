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

const TABS: [string, string][] = [
  ['all', 'সকল'],
  ['meal', 'মিল'],
  ['deposit', 'পেমেন্ট'],
  ['system', 'সিস্টেম'],
];

function bn(n: number | string): string {
  return String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d] || d);
}

function ago(timeStr: string | number | undefined): string {
  if (!timeStr) return 'এইমাত্র';
  const t = typeof timeStr === 'number' ? timeStr : new Date(timeStr).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (isNaN(s) || s < 60) return 'এইমাত্র';
  if (s < 3600) return bn(Math.floor(s / 60)) + ' মিনিট আগে';
  if (s < 86400) return bn(Math.floor(s / 3600)) + ' ঘণ্টা আগে';
  return bn(Math.floor(s / 86400)) + ' দিন আগে';
}

function dayLabel(timeStr: string | number | undefined): string {
  if (!timeStr) return 'আজ';
  const t = typeof timeStr === 'number' ? timeStr : new Date(timeStr).getTime();
  const diffDays = Math.round(
    (new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86400000
  );
  return diffDays <= 0 ? 'আজ' : diffDays === 1 ? 'গতকাল' : 'আগের';
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
  const [activeTab, setActiveTab] = useState('all');
  const [openGroupKeys, setOpenGroupKeys] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  // Filter list by selected tab
  const filteredList = notifications
    .filter(item => {
      if (activeTab === 'all') return true;
      if (activeTab === 'meal') return item.type === 'meal';
      if (activeTab === 'deposit') return item.type === 'deposit';
      if (activeTab === 'system') return item.type === 'system' || item.type === 'notice' || item.type === 'expense';
      return item.type === activeTab;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group by day section
  const sections: Record<string, MessNotification[]> = {};
  const sectionOrder: string[] = [];
  filteredList.forEach(item => {
    const d = dayLabel(item.createdAt);
    if (!sections[d]) {
      sections[d] = [];
      sectionOrder.push(d);
    }
    sections[d].push(item);
  });

  const toggleGroup = (k: string) => {
    setOpenGroupKeys(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const handleRowClick = (n: MessNotification) => {
    onMarkAsRead(n.id);
    if (onNavigateTab) {
      if (n.type === 'meal') {
        onNavigateTab('meal');
        onClose();
      } else if (n.type === 'deposit') {
        onNavigateTab('member_deposit');
        onClose();
      } else if (n.type === 'expense') {
        onNavigateTab('cost');
        onClose();
      } else if (n.type === 'notice') {
        onNavigateTab('home');
        onClose();
      }
    }
  };

  const renderSingleRow = (n: MessNotification) => {
    const isUnread = !readIds.has(n.id);
    const who = n.actorName || 'সদস্য';
    const firstChar = who.trim().charAt(0) || 'U';

    let titleNode: React.ReactNode = null;
    let subNode: React.ReactNode = null;

    if (n.type === 'meal') {
      const slotData = (n.slot || n.metadata?.slot) as Record<string, any> | undefined;
      const morning = slotData?.b ?? slotData?.m ?? 0;
      const lunch = slotData?.l ?? 0;
      const dinner = slotData?.d ?? 0;
      const totalMeal = (morning + lunch + dinner);

      titleNode = (
        <span className="ti">
          <b>{who}</b>-এর মিল আপডেট
        </span>
      );

      subNode = (
        <span className="ml">
          <span className="mc"><small>সকাল</small><b>{bn(morning)}</b></span>
          <span className="mc"><small>দুপুর</small><b>{bn(lunch)}</b></span>
          <span className="mc"><small>রাত</small><b>{bn(dinner)}</b></span>
          <span className="st">মোট<b>{bn(totalMeal)}</b></span>
        </span>
      );
    } else if (n.type === 'deposit') {
      const amt = n.amount || 0;
      titleNode = (
        <span className="ti">
          <b>৳{bn(amt.toLocaleString('en-US'))}</b> জমা হয়েছে
        </span>
      );
      subNode = (
        <span className="sb">
          {who} · {n.body || 'জমা রেকর্ড নিশ্চিত করা হয়েছে'}
        </span>
      );
    } else {
      titleNode = (
        <span className="ti">
          <b>{n.title || 'সিস্টেম বার্তা'}</b>
        </span>
      );
      subNode = (
        <span className="sb">{n.body || ''}</span>
      );
    }

    return (
      <button
        key={n.id}
        type="button"
        className={`r ${isUnread ? 'un' : ''}`}
        onClick={() => handleRowClick(n)}
      >
        <span className="av">
          {n.type === 'meal' ? (
            firstChar
          ) : n.type === 'deposit' ? (
            <svg viewBox="0 0 24 24">
              <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
              <path d="M4 7.5V17a2 2 0 0 0 2 2h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z" />
              <circle cx="15.5" cy="13.5" r=".6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24">
              <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
          )}
        </span>
        <span className="b">
          <span className="l1">
            {titleNode}
            <time className="tm">{ago(n.createdAt)}</time>
          </span>
          {subNode}
        </span>
      </button>
    );
  };

  return (
    <div
      className="notif-panel-ov ov"
      id="ov"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'ov') onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="নোটিফিকেশন প্যানেল"
    >
      <section className="notif-panel-sh sh" onClick={(e) => e.stopPropagation()}>
        <span className="tp" aria-hidden="true" />
        
        {/* Header */}
        <header className="hd">
          <div className="t">
            <h2>নোটিফিকেশন</h2>
            <svg className="wv-s" viewBox="0 0 118 8" aria-hidden="true">
              <path className="wv" d="M2 4Q11 0 20 4T38 4T56 4T74 4T92 4T116 4" />
            </svg>
            <p>
              {messName}
              {unreadCount > 0 ? (
                <> · <b>{bn(unreadCount)}টি অপঠিত</b></>
              ) : (
                <> · সব পড়া হয়েছে</>
              )}
            </p>
          </div>

          <button
            type="button"
            className="pill"
            id="all"
            disabled={unreadCount === 0}
            onClick={onMarkAllAsRead}
            title="সবগুলো নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করুন"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M3 12.5l4.5 4.5L14 9.5" />
              <path d="M11 16.5l.5.5L20 7.5" />
            </svg>
            সব পঠিত
          </button>

          <button
            type="button"
            className="x"
            id="x"
            aria-label="বন্ধ করুন"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {/* Tab Filters */}
        <nav className="tabs" role="tablist">
          {TABS.map(([tKey, tLabel]) => {
            const count = notifications.filter(n => {
              if (tKey === 'all') return true;
              if (tKey === 'meal') return n.type === 'meal';
              if (tKey === 'deposit') return n.type === 'deposit';
              if (tKey === 'system') return n.type === 'system' || n.type === 'notice' || n.type === 'expense';
              return n.type === tKey;
            }).length;

            const isSelected = activeTab === tKey;

            return (
              <button
                key={tKey}
                role="tab"
                aria-selected={isSelected}
                className={`tab ${isSelected ? 'on' : ''}`}
                onClick={() => setActiveTab(tKey)}
              >
                {tLabel}
                <small>{bn(count)}</small>
              </button>
            );
          })}
        </nav>

        {/* Notification List Body with red margin notebook line */}
        <div className="ls">
          {sectionOrder.length === 0 ? (
            <p className="em">কোনো নোটিফিকেশন নেই</p>
          ) : (
            sectionOrder.map(secKey => {
              const itemsInSec = sections[secKey];
              return (
                <div key={secKey}>
                  <h3 className="dy">{secKey}</h3>
                  {itemsInSec.map(item => renderSingleRow(item))}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
