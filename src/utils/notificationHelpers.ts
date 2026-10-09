import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MessNotification, NotificationType } from '../types';

/**
 * Formats ISO date string into human readable relative timestamp.
 * Examples: 'এইমাত্র', '১০ মিনিট আগে', 'আজ ৪:৩০ PM', 'গতকাল ৯:১৫ AM'
 */
export const formatNotificationTime = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 45) {
    return 'এইমাত্র';
  }
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} মিনিট আগে`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    // Check if it's the same calendar day
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      const timeStr = date.toLocaleTimeString('bn-BD', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `আজ ${timeStr}`;
    }
    return `${hours} ঘণ্টা আগে`;
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    const timeStr = date.toLocaleTimeString('bn-BD', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `গতকাল ${timeStr}`;
  }

  // Older dates
  return date.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Creates and logs a notification entry directly to Firestore 'mess_notifications' collection.
 * Also returns the formatted MessNotification object for local state prepending.
 */
export const triggerMessNotification = async (params: {
  messId: string;
  messName?: string;
  type: NotificationType;
  title: string;
  body: string;
  actorId?: string;
  actorName?: string;
  targetMemberId?: string;
  amount?: number;
  metadata?: Record<string, any>;
}): Promise<MessNotification> => {
  const notifItem: MessNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    messId: params.messId,
    type: params.type,
    title: params.title,
    body: params.body,
    createdAt: new Date().toISOString(),
    actorId: params.actorId,
    actorName: params.actorName,
    targetMemberId: params.targetMemberId,
    amount: params.amount,
    metadata: params.metadata,
  };

  // 1. Add to Cloud Firestore 'mess_notifications' collection
  try {
    const notifsRef = collection(db, 'mess_notifications');
    await addDoc(notifsRef, {
      ...notifItem,
      messName: params.messName || 'মেস',
    });
  } catch (err) {
    console.warn('Could not save to mess_notifications collection in Firestore:', err);
  }

  return notifItem;
};

/**
 * Notification Category Visual Metadata
 */
export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  {
    label: string;
    icon: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  meal: {
    label: 'মিল',
    icon: '🍽️',
    color: '#10B981',
    bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/20',
  },
  deposit: {
    label: 'পেমেন্ট/জমা',
    icon: '💳',
    color: '#3B82F6',
    bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/20',
  },
  expense: {
    label: 'খরচ/বাজার',
    icon: '🛒',
    color: '#F59E0B',
    bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/20',
  },
  notice: {
    label: 'নোটিশ',
    icon: '📢',
    color: '#EF4444',
    bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/20',
  },
  system: {
    label: 'সিস্টেম',
    icon: '🔔',
    color: '#8B5CF6',
    bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/20',
  },
  cost: {
    label: 'খরচ',
    icon: '🛒',
    color: '#F59E0B',
    bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/20',
  },
  member: {
    label: 'সদস্য',
    icon: '👤',
    color: '#06B6D4',
    bg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-500/20',
  },
};
