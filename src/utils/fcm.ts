import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { doc, updateDoc, collection, addDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { app, db, FCM_VAPID_KEY } from '../firebase';

let messagingInstance: Messaging | null = null;
let isMessagingChecked = false;

/**
 * Initializes and returns the Firebase Messaging instance safely.
 */
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  if (!isMessagingChecked) {
    isMessagingChecked = true;
    try {
      const supported = await isSupported();
      if (supported) {
        messagingInstance = getMessaging(app);
      } else {
        console.warn('FCM is not supported in this browser environment');
      }
    } catch (err) {
      console.warn('Error checking FCM support:', err);
    }
  }

  return messagingInstance;
};

/**
 * Requests Notification permission upon user login and saves the FCM device token to Firestore.
 */
export const requestFcmPermissionAndGetToken = async (userId: string): Promise<string | null> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications are not supported in this browser.');
    return null;
  }

  try {
    // 1. Request notification permission
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('Notification permission not granted:', permission);
      return null;
    }

    // 2. Initialize Messaging
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.warn('Firebase Messaging not available.');
      return null;
    }

    // 3. Register or ensure firebase-messaging-sw.js is active
    let swReg: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('Service worker registration failed:', swErr);
      }
    }

    // 4. Retrieve FCM Token using the provided VAPID Key
    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      console.log('FCM Device Token retrieved successfully:', token);

      // 5. Store FCM device token in user profile in Firestore
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcmToken: token,
          fcmUpdatedAt: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Could not update fcmToken in Firestore user profile:', dbErr);
      }
      return token;
    }
  } catch (err) {
    console.warn('Error getting FCM token:', err);
  }

  return null;
};

/**
 * Listens for FCM push notifications when the app is in the foreground.
 */
export const setupFcmForegroundListener = (
  onNotificationReceived: (payload: { title: string; body: string; data?: Record<string, unknown> }) => void
) => {
  getFirebaseMessaging().then((messaging) => {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground notification received:', payload);
      const title = payload.notification?.title || (payload.data?.title as string) || 'KhaonKhata (খাওনখাতা)';
      const body = payload.notification?.body || (payload.data?.body as string) || 'নতুন মিল বা মেসের আপডেট এসেছে।';

      onNotificationReceived({
        title,
        body,
        data: payload.data as Record<string, unknown>,
      });

      // Show system notification if browser permits
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
          });
        } catch {
          // Ignore if background-only restriction in some browsers
        }
      }
    });
  });
};

/**
 * Trigger a push notification whenever a meal entry is added or updated for a member.
 */
export const triggerMealPushNotification = async (params: {
  messId: string;
  messName: string;
  memberName: string;
  date: string;
  action: 'added' | 'updated' | 'approved';
  slotDetails?: { b: number; l: number; d: number };
  totalMeals?: number;
}) => {
  const { messId, messName, memberName, date, action, slotDetails, totalMeals } = params;

  const total = totalMeals ?? ((slotDetails?.b || 0) + (slotDetails?.l || 0) + (slotDetails?.d || 0));

  let title = 'খাওনখাতা - মিল নোটিফিকেশন';
  let body = '';

  if (action === 'added' || action === 'updated') {
    title = `🍽️ মিল আপডেট: ${memberName}`;
    const slotText = slotDetails ? ` (সকাল: ${slotDetails.b}, দুপুর: ${slotDetails.l}, রাত: ${slotDetails.d})` : '';
    body = `${date} তারিখে ${memberName}-এর মিল ${action === 'added' ? 'যোগ' : 'আপডেট'} করা হয়েছে [মোট: ${total} টি${slotText}]। মেস: ${messName}`;
  } else if (action === 'approved') {
    title = `✅ মিল রিকোয়েস্ট অনুমোদিত: ${memberName}`;
    body = `${date} তারিখে ${memberName}-এর ${total} টি মিল অনুমোদন করা হয়েছে। মেস: ${messName}`;
  }

  // 1. Show immediate notification via ServiceWorker / Notification API if permitted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = (await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')) || (await navigator.serviceWorker.ready);
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `meal-${date}-${memberName}`,
            renotify: true,
            data: { messId, date, memberName },
          } as NotificationOptions);
        } else {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            tag: `meal-${date}-${memberName}`,
          });
        }
      } else {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          tag: `meal-${date}-${memberName}`,
        });
      }
    } catch (e) {
      console.warn('Local push notification display failed:', e);
    }
  }

  // 2. Record notification entry in Firestore so all members receive real-time updates
  try {
    await addDoc(collection(db, 'mess_notifications'), {
      messId,
      messName,
      title,
      body,
      memberName,
      date,
      action,
      totalMeals: total,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not record mess_notifications in Firestore:', err);
  }
};

export interface TargetedMealPushResult {
  totalMembers: number;
  hasMealCount: number;
  noMealCount: number;
  dispatchedCount: number;
  details: {
    memberId: string;
    memberName: string;
    hasMeal: boolean;
    meals: number;
    title: string;
    body: string;
    token: string | null;
  }[];
}

/**
 * Iterates through all members of a mess, checks their meal record for today (or specified date),
 * and dispatches targeted push notifications accordingly:
 * - Users with meals today: "আপনার আজকের মিল যুক্ত করা হয়েছে।"
 * - Users with NO meals today: "আপনার এখনো মিল দেওয়া হয় নি।"
 */
export const dispatchTargetedDailyMealNotifications = async (params: {
  messId: string;
  messName: string;
  members: { id: string; name: string; email?: string; uid?: string }[];
  todayDate: string;
  mealsForDate: Record<string, { b: number; l: number; d: number } | undefined>;
}): Promise<TargetedMealPushResult> => {
  const { messId, messName, members, todayDate, mealsForDate } = params;

  let hasMealCount = 0;
  let noMealCount = 0;
  let dispatchedCount = 0;
  const details: TargetedMealPushResult['details'] = [];

  for (const member of members) {
    const slot = mealsForDate[member.id];
    const totalMeals = slot ? (slot.b || 0) + (slot.l || 0) + (slot.d || 0) : 0;
    const hasMeal = totalMeals > 0;

    if (hasMeal) {
      hasMealCount++;
    } else {
      noMealCount++;
    }

    const title = hasMeal
      ? `🍽️ আজকের মিল আপডেট (${todayDate})`
      : `⚠️ আজকের মিল সতর্কতা (${todayDate})`;

    const body = hasMeal
      ? `আপনার আজকের মিল যুক্ত করা হয়েছে। (মোট: ${totalMeals} টি মিল${slot ? ` - স: ${slot.b}, দু: ${slot.l}, রা: ${slot.d}` : ''})`
      : `আপনার এখনো মিল দেওয়া হয় নি।`;

    // Retrieve user FCM token from Firestore
    let memberToken: string | null = null;
    try {
      if (member.uid) {
        const uSnap = await getDoc(doc(db, 'users', member.uid));
        if (uSnap.exists()) {
          memberToken = (uSnap.data() as { fcmToken?: string }).fcmToken || null;
        }
      }
      if (!memberToken && member.email) {
        const qUsers = query(collection(db, 'users'), where('email', '==', member.email));
        const uSnap = await getDocs(qUsers);
        if (!uSnap.empty) {
          memberToken = (uSnap.docs[0].data() as { fcmToken?: string }).fcmToken || null;
        }
      }
    } catch (e) {
      console.warn(`Could not fetch token for ${member.name}:`, e);
    }

    // 1. Record targeted alert in Firestore mess_notifications
    try {
      await addDoc(collection(db, 'mess_notifications'), {
        messId,
        messName,
        targetMemberId: member.id,
        targetMemberName: member.name,
        targetEmail: member.email || null,
        targetUid: member.uid || null,
        targetToken: memberToken || null,
        title,
        body,
        date: todayDate,
        hasMeal,
        totalMeals,
        status: hasMeal ? 'meal_added' : 'no_meal',
        createdAt: new Date().toISOString(),
      });
      dispatchedCount++;
    } catch (err) {
      console.warn('Could not record notification in Firestore:', err);
    }

    // 2. Trigger browser push on current device if permission is granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = (await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')) || (await navigator.serviceWorker.ready);
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `targeted-${member.id}-${todayDate}`,
              renotify: true,
              data: { messId, date: todayDate, memberId: member.id, hasMeal },
            } as NotificationOptions);
          }
        }
      } catch (err) {
        console.warn('Browser push display failed:', err);
      }
    }

    details.push({
      memberId: member.id,
      memberName: member.name,
      hasMeal,
      meals: totalMeals,
      title,
      body,
      token: memberToken,
    });
  }

  return {
    totalMembers: members.length,
    hasMealCount,
    noMealCount,
    dispatchedCount,
    details,
  };
};

