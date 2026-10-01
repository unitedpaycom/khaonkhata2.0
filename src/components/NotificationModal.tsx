import React, { useState } from 'react';
import { MessNotification, NotificationType } from '../types';
import { formatNotificationTime, NOTIFICATION_TYPE_META } from '../utils/notificationHelpers';
import { Icon } from './Icons';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: MessNotification[];
  readIds: Set<string>;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications = [],
  readIds,
  onMarkAllAsRead,
  onMarkAsRead,
  onNavigateTab,
}) => {
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');

  if (!isOpen) return null;

  // Filter notifications by selected tab
  const filteredNotifs = notifications.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const handleItemClick = (notif: MessNotification) => {
    onMarkAsRead(notif.id);

    // Optional quick navigation based on notification type
    if (onNavigateTab) {
      if (notif.type === 'meal') {
        onNavigateTab('meal');
        onClose();
      } else if (notif.type === 'deposit') {
        onNavigateTab('member_deposit');
        onClose();
      } else if (notif.type === 'expense') {
        onNavigateTab('cost');
        onClose();
      } else if (notif.type === 'notice') {
        onNavigateTab('home');
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="card !max-w-lg w-full p-0 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--card)]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--pri)]/10 text-[var(--pri)] flex items-center justify-center relative">
              <Icon name="bell" size={20} />
              {unreadCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 absolute top-2 right-2 ring-2 ring-white dark:ring-gray-900"></span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--fg)]">নোটিফিকেশন</h3>
                {unreadCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold">
                    {unreadCount}টি নতুন
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                    সব পঠিত
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--mut)]">মেসের সকল রিয়েলটাইম আপডেট</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="btn s g text-xs font-semibold !py-1 !px-2.5 cursor-pointer text-[var(--pri)]"
                title="সকল নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করুন"
              >
                সব পঠিত করুন
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--line)] hover:opacity-80 flex items-center justify-center text-sm font-bold text-[var(--fg)] cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="p-2 border-b border-[var(--line)] bg-[var(--card)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-[var(--pri)] text-white shadow-xs'
                : 'bg-[var(--line)]/50 text-[var(--mut)] hover:bg-[var(--line)]'
            }`}
            onClick={() => setFilterType('all')}
          >
            সকল ({notifications.length})
          </button>

          {(['meal', 'deposit', 'expense', 'notice'] as NotificationType[]).map(type => {
            const meta = NOTIFICATION_TYPE_META[type];
            const count = notifications.filter(n => n.type === type).length;
            const isSelected = filterType === type;

            return (
              <button
                key={type}
                type="button"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--pri)] text-white shadow-xs'
                    : 'bg-[var(--line)]/50 text-[var(--mut)] hover:bg-[var(--line)]'
                }`}
                onClick={() => setFilterType(type)}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                {count > 0 && <span className="opacity-80 text-[10px]">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Notification List (Chronological Order - Newest First) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-transparent">
          {filteredNotifs.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--mut)] space-y-3">
              <span className="text-4xl block">🔕</span>
              <b className="text-sm block text-[var(--fg)]">কোনো নোটিফিকেশন নেই</b>
              <p className="max-w-xs mx-auto">
                {filterType === 'all'
                  ? 'মেসে নতুন মিল, জমা, বাজার বা নোটিশ যোগ হলে এখানে স্বয়ংক্রিয়ভাবে নোটিফিকেশন চলে আসবে।'
                  : `এই ক্যাটাগরিতে এখনো কোনো নোটিফিকেশন তৈরি হয়নি।`}
              </p>
            </div>
          ) : (
            filteredNotifs.map(notif => {
              const meta = NOTIFICATION_TYPE_META[notif.type] || NOTIFICATION_TYPE_META.system;
              const isUnread = !readIds.has(notif.id);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex items-start gap-3 ${
                    isUnread
                      ? 'bg-[var(--pri)]/5 border-[var(--pri)]/30 hover:border-[var(--pri)]/60 shadow-xs'
                      : 'bg-[var(--card)] border-[var(--line)] hover:bg-[var(--line)]/40 opacity-90'
                  }`}
                >
                  {/* Category Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-xs border ${meta.bg} ${meta.border}`}
                  >
                    {meta.icon}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.bg} ${meta.border}`}
                        >
                          {meta.label}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--fg)] truncate">
                          {notif.title}
                        </h4>
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] text-[var(--mut)] whitespace-nowrap font-medium flex-shrink-0">
                        {formatNotificationTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--fg)] leading-relaxed font-normal break-words">
                      {notif.body}
                    </p>

                    {/* Actor / Details subtext */}
                    <div className="flex items-center justify-between text-[11px] text-[var(--mut)] mt-1.5 pt-1.5 border-t border-[var(--line)]/50">
                      <span>{notif.actorName ? `দ্বারা: ${notif.actorName}` : 'মেস আপডেট'}</span>
                      <span className="text-[10px] text-[var(--pri)] font-medium flex items-center gap-0.5">
                        বিস্তারিত দেখুন →
                      </span>
                    </div>
                  </div>

                  {/* Unread indicator dot */}
                  {isUnread && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-[var(--pri)] flex-shrink-0 self-center animate-pulse"
                      title="নতুন নোটিফিকেশন"
                    ></span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--line)] bg-[var(--card)] flex items-center justify-between text-xs text-[var(--mut)]">
          <span>মোট {filteredNotifs.length}টি নোটিফিকেশন</span>
          <button
            type="button"
            onClick={onClose}
            className="btn s g cursor-pointer text-xs font-semibold"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
