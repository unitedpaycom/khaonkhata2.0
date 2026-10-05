import React, { useEffect, useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  MessState,
  Member,
  Deposit,
  BazarItem,
  OtherCost,
  MealSlot,
  MealRequest,
  Notice,
  UserProfile,
  PaymentMethodKey,
  PaymentMethodsConfig,
  MemberDepositRequest,
} from './types';
import {
  TD,
  pad,
  ds,
  uid,
  tk,
  fm,
  mt,
  calcMonth,
} from './utils/calc';
import { Icon, GoogleIcon, FacebookIcon } from './components/Icons';
import { Modal, ModalField } from './components/Modal';
import { Toast } from './components/Toast';
import { AddMemberModal } from './components/AddMemberModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ManagerPaymentMethods } from './components/ManagerPaymentMethods';
import { MemberDeposit } from './components/MemberDeposit';
import { NotificationModal } from './components/NotificationModal';
import { AboutPage } from './components/AboutPage';
import { triggerMessNotification } from './utils/notificationHelpers';
import {
  MessNotification,
  NotificationType,
} from './types';
import {
  requestFcmPermissionAndGetToken,
  setupFcmForegroundListener,
  triggerMealPushNotification,
  dispatchTargetedDailyMealNotifications,
  TargetedMealPushResult,
} from './utils/fcm';
import {
  saveCachedMessState,
  getCachedMessState,
  enqueueOfflineAction,
  getOfflineQueue,
  syncOfflineQueueToFirestore,
} from './utils/offlineSync';
import {
  downloadIndividualReportPDF,
  downloadGroupReportPDF,
} from './utils/pdfExport';
import {
  sendMealConfirmationEmail,
  sendDepositConfirmationEmail,
  sendMemberDailyMessUpdate,
  sendBatchMemberDailyMessUpdates,
  changeUserPassword,
} from './utils/emailClient';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsPage } from './components/TermsPage';
import { ContactPage } from './components/ContactPage';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export default function App() {
  const [user, setUser] = useState<AppUser | User | null>(() => {
    try {
      const saved = localStorage.getItem('khaonkhata_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Browser Route State for SEO, AdSense Compliance & Landing Navigation
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setPathname(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePop = () => {
      setPathname(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Offline Persistence & Auto-Sync State
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  // Mess State
  const [currentMessId, setCurrentMessId] = useState<string>(() => {
    return localStorage.getItem('mm_cur_mess_id') || '';
  });
  const [messState, setMessState] = useState<MessState | null>(null);
  const [messLoading, setMessLoading] = useState<boolean>(() => {
    return !!localStorage.getItem('mm_cur_mess_id');
  });
  const [userMesses, setUserMesses] = useState<{ id: string; name: string; mgrEmail: string }[]>([]);

  // Navigation & View
  const [tab, setTab] = useState<'home' | 'about' | 'deposit' | 'meal' | 'cost' | 'members' | 'detail' | 'active' | 'all' | 'settings' | 'profile' | 'payment_methods' | 'member_deposit'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/about') {
      return 'about';
    }
    return 'home';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeYM, setActiveYM] = useState<string>(TD.slice(0, 7));
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sync tab with browser URL history
  useEffect(() => {
    if (tab === 'about' && window.location.pathname !== '/about') {
      window.history.pushState({}, '', '/about');
    } else if (tab !== 'about' && window.location.pathname === '/about') {
      window.history.pushState({}, '', '/');
    }
  }, [tab]);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/about') {
        setTab('about');
      } else {
        setTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Meal Tab specifics
  const [mealSubTab, setMealSubTab] = useState<'add' | 'req' | 'chart' | 'history'>('add');
  const [mealDate, setMealDate] = useState<string>(TD);
  const [mealWho, setMealWho] = useState<string>('all');
  const [mealDraft, setMealDraft] = useState<Record<string, MealSlot>>({});

  // Change Password Modal & Form State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changePassOld, setChangePassOld] = useState('');
  const [changePassNew, setChangePassNew] = useState('');
  const [changePassConfirm, setChangePassConfirm] = useState('');
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [changePassMsg, setChangePassMsg] = useState<{ type: 'ok' | 'bad'; text: string } | null>(null);

  // Cost Tab specifics
  const [costSubTab, setCostSubTab] = useState<'meal' | 'other'>('meal');

  // Deposit Form State
  const [depDate, setDepDate] = useState<string>(TD);
  const [depAmt, setDepAmt] = useState<string>('');
  const [depMember, setDepMember] = useState<string>('');
  const [depNote, setDepNote] = useState<string>('');

  // Cost Form State
  const [costDate, setCostDate] = useState<string>(TD);
  const [costAmt, setCostAmt] = useState<string>('');
  const [costItems, setCostItems] = useState<string>('');
  const [costType, setCostType] = useState<'shared' | 'ind'>('shared');
  const [costMember, setCostMember] = useState<string>('');
  const [costAutoDep, setCostAutoDep] = useState<boolean>(false);

  // Gate view mode
  const [gateMode, setGateMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [createMessName, setCreateMessName] = useState('');
  const [joinEmailOrId, setJoinEmailOrId] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  // Add Member Modal State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Targeted Meal Push Notification State
  const [targetedPushLoading, setTargetedPushLoading] = useState(false);
  const [targetedPushResult, setTargetedPushResult] = useState<TargetedMealPushResult | null>(null);
  const [isTargetedReportOpen, setIsTargetedReportOpen] = useState(false);

  // Notification System State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [collectionNotifs, setCollectionNotifs] = useState<MessNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(
        `khaonkhata_read_notifs_${user?.uid || 'guest'}_${currentMessId || 'none'}`
      );
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Keep readNotificationIds in sync when user or currentMessId changes
  useEffect(() => {
    if (!currentMessId || !user) return;
    try {
      const stored = localStorage.getItem(`khaonkhata_read_notifs_${user.uid}_${currentMessId}`);
      if (stored) {
        setReadNotificationIds(new Set(JSON.parse(stored)));
      } else {
        setReadNotificationIds(new Set());
      }
    } catch {
      setReadNotificationIds(new Set());
    }
  }, [currentMessId, user]);

  // Real-time Firestore listener for mess_notifications collection
  useEffect(() => {
    if (!currentMessId) {
      setCollectionNotifs([]);
      return;
    }
    const notifsQuery = query(
      collection(db, 'mess_notifications'),
      where('messId', '==', currentMessId)
    );
    const unsub = onSnapshot(
      notifsQuery,
      (snapshot) => {
        const notifs: MessNotification[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as MessNotification;
          item.id = item.id || d.id;
          notifs.push(item);
        });
        setCollectionNotifs(notifs);
      },
      (err) => {
        console.warn('Real-time listener for mess_notifications:', err);
      }
    );
    return () => unsub();
  }, [currentMessId]);

  // Deduplicated notifications combined from messState.notifications and collectionNotifs (newest first)
  const notificationsList: MessNotification[] = useMemo(() => {
    const map = new Map<string, MessNotification>();
    (messState?.notifications || []).forEach(n => {
      if (n && n.id) map.set(n.id, n);
    });
    collectionNotifs.forEach(n => {
      if (n && n.id) map.set(n.id, n);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [messState?.notifications, collectionNotifs]);

  const unreadNotificationCount = useMemo(() => {
    return notificationsList.filter(n => !readNotificationIds.has(n.id)).length;
  }, [notificationsList, readNotificationIds]);

  const handleMarkAsRead = (notifId: string) => {
    setReadNotificationIds(prev => {
      const next = new Set(prev);
      next.add(notifId);
      if (user && currentMessId) {
        try {
          localStorage.setItem(
            `khaonkhata_read_notifs_${user.uid}_${currentMessId}`,
            JSON.stringify(Array.from(next))
          );
        } catch (e) {
          console.warn(e);
        }
      }
      return next;
    });
  };

  const handleMarkAllAsRead = () => {
    const allIds = notificationsList.map(n => n.id);
    const next = new Set(allIds);
    setReadNotificationIds(next);
    if (user && currentMessId) {
      try {
        localStorage.setItem(
          `khaonkhata_read_notifs_${user.uid}_${currentMessId}`,
          JSON.stringify(allIds)
        );
      } catch (e) {
        console.warn(e);
      }
    }
    showToast('সব নোটিফিকেশন পঠিত চিহ্নিত করা হয়েছে');
  };

  const createNotification = async (params: {
    type: NotificationType;
    title: string;
    body: string;
    actorId?: string;
    actorName?: string;
    targetMemberId?: string;
    amount?: number;
    metadata?: Record<string, any>;
  }): Promise<MessNotification | null> => {
    if (!messState) return null;
    try {
      return await triggerMessNotification({
        messId: messState.id,
        messName: messState.mess,
        ...params,
      });
    } catch (err) {
      console.warn('triggerMessNotification notice:', err);
      return null;
    }
  };

  // Unauthorized Domain Error Modal State
  const [unauthorizedDomainModal, setUnauthorizedDomainModal] = useState(false);

  // Generic Modal
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    fields?: ModalField[];
    message?: string;
    onConfirm: (values: Record<string, string>) => void | boolean | Promise<void | boolean>;
    onDelete?: () => void;
    confirmText?: string;
    deleteText?: string;
  }>({
    isOpen: false,
    title: '',
    onConfirm: () => {},
  });

  // Synchronize user profile from Firestore for both Firebase Auth and Custom authenticated users
  const syncUserProfile = async (currentUser: AppUser | User) => {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        if (data.currentMessId && !currentMessId) {
          setCurrentMessId(data.currentMessId);
          localStorage.setItem('mm_cur_mess_id', data.currentMessId);
        }
      } else {
        const newProfile: UserProfile = {
          uid: currentUser.uid,
          name: currentUser.displayName || 'User',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || undefined,
          joinedMesses: [],
        };
        await setDoc(userDocRef, newProfile);
        setProfile(newProfile);
      }

      // Request notification permission and register FCM device token
      requestFcmPermissionAndGetToken(currentUser.uid).then((token) => {
        if (token) {
          setProfile((prev) => (prev ? { ...prev, fcmToken: token } : null));
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users/' + currentUser.uid);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUserAuthenticated = (authenticatedUser: AppUser) => {
    setUser(authenticatedUser);
    try {
      localStorage.setItem('khaonkhata_auth_user', JSON.stringify(authenticatedUser));
    } catch {
      // ignore
    }
    syncUserProfile(authenticatedUser);
    navigate('/dashboard');
  };

  // Listen to Auth State (Firebase Auth & Custom OTP Hashed Session)
  useEffect(() => {
    if (user) {
      syncUserProfile(user);
    }

    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const appUser: AppUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        };
        setUser(appUser);
        try {
          localStorage.setItem('khaonkhata_auth_user', JSON.stringify(appUser));
        } catch {
          // ignore
        }
        await syncUserProfile(currentUser);
      } else {
        // Fallback: Check if a custom authenticated user is saved in localStorage
        const saved = localStorage.getItem('khaonkhata_auth_user');
        if (saved) {
          try {
            const parsed: AppUser = JSON.parse(saved);
            if (parsed && parsed.uid) {
              setUser(parsed);
              await syncUserProfile(parsed);
              return;
            }
          } catch {
            // ignore
          }
        }
        setUser(null);
        setProfile(null);
        setMessState(null);
        setMessLoading(false);
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Setup FCM Foreground Push Notification Listener
  useEffect(() => {
    if (!user) return;
    setupFcmForegroundListener((payload) => {
      showToast(`🔔 ${payload.title}: ${payload.body}`);
    });
  }, [user]);

  // Listen to real-time User's Mess list
  useEffect(() => {
    if (!user) return;
    const fetchUserMesses = async () => {
      try {
        // Query messes where mgrUid == user.uid OR mgrEmail == user.email
        const q1 = query(collection(db, 'messes'), where('mgrUid', '==', user.uid));
        const snap1 = await getDocs(q1);
        const list: { id: string; name: string; mgrEmail: string }[] = [];
        snap1.forEach(docSnap => {
          const d = docSnap.data();
          list.push({ id: docSnap.id, name: d.mess || d.name, mgrEmail: d.mgrEmail });
        });

        // Also find messes where user's email is in members
        if (user.email) {
          const q2 = query(collection(db, 'messes'), where('mgrEmail', '==', user.email));
          const snap2 = await getDocs(q2);
          snap2.forEach(docSnap => {
            if (!list.some(x => x.id === docSnap.id)) {
              const d = docSnap.data();
              list.push({ id: docSnap.id, name: d.mess || d.name, mgrEmail: d.mgrEmail });
            }
          });

          // Query messes where user email is in memberEmails array
          const emailLower = user.email.toLowerCase();
          const q3 = query(collection(db, 'messes'), where('memberEmails', 'array-contains', emailLower));
          const snap3 = await getDocs(q3);
          snap3.forEach(docSnap => {
            if (!list.some(x => x.id === docSnap.id)) {
              const d = docSnap.data();
              list.push({ id: docSnap.id, name: d.mess || d.name, mgrEmail: d.mgrEmail });
            }
          });
        }

        // If user profile has currentMessId or joinedMesses, include them too
        if (profile?.currentMessId && !list.some(x => x.id === profile.currentMessId)) {
          try {
            const s = await getDoc(doc(db, 'messes', profile.currentMessId));
            if (s.exists()) {
              const d = s.data();
              list.push({ id: s.id, name: d.mess || d.name, mgrEmail: d.mgrEmail });
            }
          } catch (_) {}
        }

        if (profile?.joinedMesses) {
          for (const mId of profile.joinedMesses) {
            if (!list.some(x => x.id === mId)) {
              try {
                const s = await getDoc(doc(db, 'messes', mId));
                if (s.exists()) {
                  const d = s.data();
                  list.push({ id: s.id, name: d.mess || d.name, mgrEmail: d.mgrEmail });
                }
              } catch (_) {}
            }
          }
        }

        // Broad fallback: if list is still empty, scan messes to match by member UID, email or name
        if (list.length === 0) {
          try {
            const allMessesSnap = await getDocs(query(collection(db, 'messes'), limit(25)));
            allMessesSnap.forEach(mDoc => {
              const d = mDoc.data();
              const membersList = (d.members || []) as Member[];
              const isMember = membersList.some(
                m =>
                  (m.uid && m.uid === user.uid) ||
                  (m.id && m.id === user.uid) ||
                  (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
                  (m.name && user.displayName && m.name.toLowerCase() === user.displayName.toLowerCase())
              );
              if (isMember && !list.some(x => x.id === mDoc.id)) {
                list.push({ id: mDoc.id, name: d.mess || d.name, mgrEmail: d.mgrEmail });
              }
            });
          } catch (_) {}
        }

        setUserMesses(list);
        if (!currentMessId && list.length > 0) {
          setCurrentMessId(list[0].id);
          localStorage.setItem('mm_cur_mess_id', list[0].id);
        }
      } catch (err) {
        console.error('Error fetching user messes', err);
      }
    };

    fetchUserMesses();
  }, [user, profile]);

  // Refresh pending offline sync count
  const refreshPendingSyncCount = async () => {
    try {
      const queue = await getOfflineQueue();
      setPendingSyncCount(queue.length);
    } catch {
      setPendingSyncCount(0);
    }
  };

  // Online / Offline listener & Auto-Sync
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      try {
        const { syncedCount, error } = await syncOfflineQueueToFirestore();
        await refreshPendingSyncCount();
        if (syncedCount > 0 && !error) {
          showToast('Back online - Data synced successfully!');
        }
      } catch (err) {
        console.error('Auto-sync error:', err);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline Mode - Changes saved locally');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPendingSyncCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time listener for currentMessId with instant offline cache loading
  useEffect(() => {
    if (!currentMessId || !user) {
      setMessState(null);
      return;
    }

    // Instantly try reading from offline storage first
    getCachedMessState(currentMessId).then((cached) => {
      if (cached) {
        setMessState((prev) => prev || cached);
        setMessLoading(false);
      }
    });

    setMessLoading(true);
    const messDocRef = doc(db, 'messes', currentMessId);
    const unsub = onSnapshot(
      messDocRef,
      (docSnap) => {
        setMessLoading(false);
        if (docSnap.exists()) {
          const data = docSnap.data() as MessState;
          data.id = docSnap.id;
          data.members = data.members || [];
          data.deposits = data.deposits || [];
          data.bazar = data.bazar || [];
          data.meals = data.meals || {};
          data.reqs = data.reqs || [];
          data.notices = data.notices || [];
          data.other = data.other || [];
          data.notifications = data.notifications || [];
          data.closed = data.closed || {};
          data.cutoff = data.cutoff ?? 21;
          setMessState(data);
          saveCachedMessState(data);
        } else {
          showToast('মেসটি পাওয়া যায়নি বা মুছে ফেলা হয়েছে');
          setMessState(null);
          setCurrentMessId('');
          localStorage.removeItem('mm_cur_mess_id');
        }
      },
      async (error) => {
        setMessLoading(false);
        const cached = await getCachedMessState(currentMessId);
        if (cached) {
          setMessState(cached);
        } else {
          handleFirestoreError(error, OperationType.GET, 'messes/' + currentMessId);
        }
      }
    );

    return () => unsub();
  }, [currentMessId, user]);

  // Update theme on html element
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Sync meal draft when mealDate or messState changes
  useEffect(() => {
    if (!messState) return;
    const day = messState.meals[mealDate] || {};
    const draft: Record<string, MealSlot> = {};
    messState.members.forEach(m => {
      const val = day[m.id];
      if (val) {
        draft[m.id] = { b: val.b || 0, l: val.l || 0, d: val.d || 0 };
      } else {
        const pendingReq = messState.reqs.find(
          r => r.m === m.id && r.date === mealDate && r.status === 'pending'
        );
        if (pendingReq) {
          draft[m.id] = { b: pendingReq.b, l: pendingReq.l, d: pendingReq.d, rq: 1 };
        } else {
          draft[m.id] = { b: 0, l: 0, d: 0 };
        }
      }
    });
    setMealDraft(draft);
  }, [mealDate, messState]);

  // Sanitize object recursively removing undefined keys for Firestore
  const cleanUndefined = <T,>(val: T): T => {
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) {
      return val.map(item => cleanUndefined(item)) as unknown as T;
    }
    if (typeof val === 'object') {
      const res: any = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) {
          res[k] = cleanUndefined(v);
        }
      }
      return res;
    }
    return val;
  };

  // Save updated messState to Firestore or Offline Storage with Auto-Sync
  const saveStateToFirestore = async (newState: MessState, successMsg?: string) => {
    if (!newState.id) return;

    // Immediately update React state for instant optimistic UI response
    setMessState(newState);

    if (!navigator.onLine) {
      // Offline mode: save locally to IndexedDB & queue action
      await saveCachedMessState(newState);
      await enqueueOfflineAction({
        id: uid(),
        messId: newState.id,
        actionType: 'save_state',
        description: successMsg || 'অফলাইন পরিবর্তন',
        state: newState,
        timestamp: Date.now(),
      });
      await refreshPendingSyncCount();
      showToast('Offline Mode - Changes saved locally');
      return;
    }

    try {
      newState.updatedAt = new Date().toISOString();
      const sanitized = cleanUndefined(newState);
      const messDocRef = doc(db, 'messes', newState.id);
      await setDoc(messDocRef, sanitized, { merge: true });
      await saveCachedMessState(newState);
      if (successMsg) showToast(successMsg);
    } catch (err) {
      console.warn('saveStateToFirestore online write failed, saving locally:', err);
      await saveCachedMessState(newState);
      await enqueueOfflineAction({
        id: uid(),
        messId: newState.id,
        actionType: 'save_state',
        description: successMsg || 'অফলাইন পরিবর্তন',
        state: newState,
        timestamp: Date.now(),
      });
      await refreshPendingSyncCount();
      showToast('Offline Mode - Changes saved locally');
    }
  };

  // Manual Trigger to Sync Queued Offline Actions
  const handleManualSync = async () => {
    if (!navigator.onLine) {
      showToast('Offline Mode - Changes saved locally');
      return;
    }
    setIsSyncing(true);
    try {
      const { syncedCount, error } = await syncOfflineQueueToFirestore();
      await refreshPendingSyncCount();
      if (error) {
        showToast('সিঙ্ক করতে কিছু ত্রুটি হয়েছে');
      } else if (syncedCount > 0) {
        showToast('Back online - Data synced successfully!');
      } else {
        showToast('সব ডাটা ইতোমধ্যে সিঙ্ক করা আছে');
      }
    } catch (e) {
      console.error(e);
      showToast('সিঙ্ক ব্যর্থ হয়েছে');
    } finally {
      setIsSyncing(false);
    }
  };

  // Export Individual Monthly Expense & Meal Summary PDF
  const handleDownloadIndividualPDF = async (targetMember?: Member) => {
    const mem = targetMember || currentMember;
    if (!mem || !messState || !monthSummary) {
      showToast('মেম্বার বা মাসের হিসাব পাওয়া যায়নি');
      return;
    }
    setIsExportingPDF(true);
    showToast('পিডিএফ তৈরি হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...');
    try {
      await downloadIndividualReportPDF({
        member: mem,
        messState,
        ym: activeYM,
        summary: monthSummary,
      });
      showToast('ব্যক্তিগত PDF রিপোর্ট ডাউনলোড সম্পন্ন!');
    } catch (err) {
      console.error('Individual PDF export error:', err);
      showToast('PDF ডাউনলোড ব্যর্থ হয়েছে');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Export Group Mess Summary Report PDF
  const handleDownloadGroupPDF = async () => {
    if (!messState || !monthSummary) {
      showToast('মেস বা মাসের হিসাব পাওয়া যায়নি');
      return;
    }
    setIsExportingPDF(true);
    showToast('সম্পূর্ণ মেস PDF রিপোর্ট প্রস্তুত হচ্ছে...');
    try {
      await downloadGroupReportPDF({
        messState,
        ym: activeYM,
        summary: monthSummary,
      });
      showToast('মেস সামারি PDF রিপোর্ট ডাউনলোড সম্পন্ন!');
    } catch (err) {
      console.error('Group PDF export error:', err);
      showToast('মেস PDF ডাউনলোড ব্যর্থ হয়েছে');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Permissions & Current User Member info
  const isManager = useMemo(() => {
    if (!user || !messState) return false;
    return (
      messState.mgrUid === user.uid ||
      messState.mgrEmail?.toLowerCase() === user.email?.toLowerCase() ||
      messState.members.some(m => m.id === messState.mgr && m.email === user.email)
    );
  }, [user, messState]);

  const currentMember = useMemo(() => {
    if (!user || !messState) return null;
    const userEmailLower = user.email?.toLowerCase();
    const userDisplayNameLower = user.displayName?.toLowerCase();
    return (
      messState.members.find(
        m =>
          (m.uid && m.uid === user.uid) ||
          (m.id && m.id === user.uid) ||
          (m.email && userEmailLower && m.email.toLowerCase() === userEmailLower) ||
          (m.email && userEmailLower && m.email.toLowerCase().replace(/@.*$/, '') === userEmailLower.replace(/@.*$/, '')) ||
          (m.name && userDisplayNameLower && m.name.toLowerCase() === userDisplayNameLower)
      ) || messState.members[0] || null
    );
  }, [user, messState]);

  const isMonthLocked = useMemo(() => {
    if (!messState) return false;
    return !!messState.closed[activeYM];
  }, [messState, activeYM]);

  const monthSummary = useMemo(() => {
    if (!messState) return null;
    return calcMonth(messState, activeYM);
  }, [messState, activeYM]);

  // Shift month
  const shiftMonth = (delta: number) => {
    const [y, m] = activeYM.split('-');
    const nextDate = new Date(+y, +m - 1 + delta, 1);
    setActiveYM(ds(nextDate).slice(0, 7));
  };

  // Google Sign-in Handler
  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        showToast(`স্বাগতম, ${res.user.displayName || 'ব্যবহারকারী'}`);
        navigate('/app');
      }
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === 'auth/unauthorized-domain' || errorObj?.message?.includes('unauthorized-domain')) {
        setUnauthorizedDomainModal(true);
      } else {
        showToast('গুগল লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      }
    }
  };

  // Sign-out Handler
  const handleSignOut = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      setCurrentMessId('');
      localStorage.removeItem('mm_cur_mess_id');
      localStorage.removeItem('khaonkhata_auth_user');
      setMessState(null);
      showToast('লগআউট সম্পন্ন হয়েছে');
      navigate('/');
    } catch (err) {
      console.error('Sign-out error:', err);
      setUser(null);
      setCurrentMessId('');
      localStorage.removeItem('mm_cur_mess_id');
      localStorage.removeItem('khaonkhata_auth_user');
      setMessState(null);
      navigate('/');
    }
  };

  // Create Mess
  const handleCreateMess = async () => {
    if (!user) return;
    const name = createMessName.trim() || 'My Mess';
    const messId = 'mess_' + uid();
    const m0Id = 'm0';
    const newState: MessState = {
      id: messId,
      mess: name,
      mgr: m0Id,
      mgrUid: user.uid,
      mgrEmail: user.email || '',
      members: [
        {
          id: m0Id,
          uid: user.uid,
          name: user.displayName || 'ম্যানেজার',
          email: user.email || '',
          phone: '',
          room: 'Room 101',
          join: TD,
        },
      ],
      deposits: [],
      bazar: [],
      meals: {},
      reqs: [],
      notices: [
        {
          id: uid(),
          text: `মেস "${name}" তৈরি হয়েছে। সদস্যদের যোগ করুন বা মেস কোড শেয়ার করুন।`,
          date: TD,
        },
      ],
      other: [],
      cutoff: 21,
      closed: {},
      theme: 'light',
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'messes', messId), newState);
      // update profile joined messes
      const userRef = doc(db, 'users', user.uid);
      const joined = Array.from(new Set([...(profile?.joinedMesses || []), messId]));
      await setDoc(userRef, { currentMessId: messId, joinedMesses: joined }, { merge: true });

      setCurrentMessId(messId);
      localStorage.setItem('mm_cur_mess_id', messId);
      showToast(`মেস "${name}" তৈরি হয়েছে!`);
      setGateMode('choose');
      setTab('home');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'messes/' + messId);
    }
  };

  // Join Mess
  const handleJoinMess = async () => {
    if (!user) return;
    const input = joinEmailOrId.trim();
    if (!input) {
      showToast('ম্যানেজারের ইমেইল বা মেস আইডি দিন');
      return;
    }

    try {
      let targetMessId = '';
      let targetState: MessState | null = null;

      // Check if it's a document ID
      const directRef = doc(db, 'messes', input);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        targetMessId = directSnap.id;
        targetState = directSnap.data() as MessState;
      } else {
        // Query by mgrEmail
        const q = query(collection(db, 'messes'), where('mgrEmail', '==', input.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          targetMessId = d.id;
          targetState = d.data() as MessState;
        }
      }

      if (!targetState || !targetMessId) {
        showToast('কোনো মেস পাওয়া যায়নি! সঠিক ইমেইল বা আইডি দিন।');
        return;
      }

      // Check if user is already a member
      const exists = targetState.members.some(
        m => m.uid === user.uid || (user.email && m.email?.toLowerCase() === user.email.toLowerCase())
      );

      if (!exists) {
        const newMember: Member = {
          id: 'm_' + uid(),
          uid: user.uid,
          name: user.displayName || 'নতুন সদস্য',
          email: user.email || '',
          phone: '',
          room: '',
          join: TD,
        };
        targetState.members.push(newMember);
        await setDoc(doc(db, 'messes', targetMessId), targetState, { merge: true });
      }

      // Update user profile
      const userRef = doc(db, 'users', user.uid);
      const joined = Array.from(new Set([...(profile?.joinedMesses || []), targetMessId]));
      await setDoc(userRef, { currentMessId: targetMessId, joinedMesses: joined }, { merge: true });

      setCurrentMessId(targetMessId);
      localStorage.setItem('mm_cur_mess_id', targetMessId);
      showToast(`মেস "${targetState.mess}" এ যোগ দিয়েছেন!`);
      setGateMode('choose');
      setTab('home');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'messes/' + input);
    }
  };

  // Helper guard
  const checkManagerGuard = () => {
    if (!isManager) {
      showToast('শুধু ম্যানেজার এই কাজটি করতে পারবেন');
      return false;
    }
    if (isMonthLocked) {
      showToast('এই মাস বন্ধ (archived), কোনো পরিবর্তন করা যাবে না');
      return false;
    }
    return true;
  };

  // Add Member with credentials & initial deposit support
  const handleAddMember = async (newMember: Member, initialDeposit?: number) => {
    if (!messState) return;

    const cleanEmail = newMember.email?.toLowerCase();
    const nextMembers = [...messState.members, newMember];
    const allEmails = Array.from(
      new Set(
        [
          ...(messState.memberEmails || []),
          cleanEmail,
          ...nextMembers.map(m => m.email?.toLowerCase()).filter(Boolean),
        ].filter(Boolean) as string[]
      )
    );

    let nextDeposits = messState.deposits || [];
    if (initialDeposit && initialDeposit > 0) {
      const initDep: Deposit = {
        id: 'd_' + uid(),
        m: newMember.id,
        amt: initialDeposit,
        date: newMember.join || TD,
        note: 'প্রাথমিক মেস জমা (Initial Deposit)',
      };
      nextDeposits = [initDep, ...nextDeposits];
    }

    const nextState: MessState = {
      ...messState,
      members: nextMembers,
      memberEmails: allEmails,
      deposits: nextDeposits,
    };

    await saveStateToFirestore(nextState, `সদস্য "${newMember.name}" যোগ করা হয়েছে!`);

    // If user already registered in Firestore, add mess to their profile joinedMesses
    if (newMember.uid) {
      try {
        const targetUserRef = doc(db, 'users', newMember.uid);
        await setDoc(
          targetUserRef,
          {
            currentMessId: messState.id,
            joinedMesses: arrayUnion(messState.id),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Error linking mess to user profile:', err);
      }
    }
  };

  // Archive / Delete Member from Active List
  const handleArchiveMember = async (targetMember: Member) => {
    if (!checkManagerGuard() || !messState) return;
    if (targetMember.id === messState.mgr) {
      showToast('ম্যানেজার নিজেকে মুছে ফেলতে পারবেন না');
      return;
    }

    const archivedMember: Member = {
      ...targetMember,
      isArchived: true,
      archivedAt: new Date().toISOString(),
    };

    const nextActiveMembers = messState.members.filter(m => m.id !== targetMember.id);
    const nextArchivedMembers = [
      archivedMember,
      ...(messState.archivedMembers || []).filter(m => m.id !== targetMember.id),
    ];

    // Remove email from memberEmails so they lose access to active mess
    const targetEmail = targetMember.email?.toLowerCase();
    const nextEmails = (messState.memberEmails || []).filter(e => e.toLowerCase() !== targetEmail);

    const nextState: MessState = {
      ...messState,
      members: nextActiveMembers,
      archivedMembers: nextArchivedMembers,
      memberEmails: nextEmails,
    };

    await saveStateToFirestore(nextState, `"${targetMember.name}"-কে মেস থেকে সফলভাবে রিমুভ ও আর্কাইভ করা হয়েছে`);

    // Disable user document in Firestore if exists so they cannot log in
    if (targetMember.uid) {
      try {
        await setDoc(
          doc(db, 'users', targetMember.uid),
          {
            isArchived: true,
            status: 'archived',
            archivedMessId: messState.id,
            archivedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Error archiving user doc in users collection:', err);
      }
    }

    if (detailMemberId === targetMember.id) {
      setTab('members');
      setDetailMemberId('');
    }
  };

  // Delete all meals for a specific date
  const handleDeleteDateMeals = async (targetDate: string) => {
    if (!checkManagerGuard() || !messState) return;
    if (!messState.meals || !messState.meals[targetDate]) {
      showToast(`${targetDate} তারিখে কোনো মিল রেকর্ড নেই`);
      return;
    }

    const nextMeals = { ...(messState.meals || {}) };
    delete nextMeals[targetDate];

    const notif = await createNotification({
      type: 'meal',
      title: `🗑️ মিল মুছে ফেলা: ${targetDate}`,
      body: `ম্যানেজার ${targetDate} তারিখের সকল মিল রেকর্ড মুছে ফেলেছেন`,
      actorId: user?.uid,
      actorName: user?.displayName || 'ম্যানেজার',
    });

    const nextState: MessState = {
      ...messState,
      meals: nextMeals,
      notifications: notif
        ? [notif, ...(messState.notifications || [])].slice(0, 100)
        : messState.notifications,
    };

    await saveStateToFirestore(nextState, `${targetDate} তারিখের মিল সম্পূর্ণ মুছে ফেলা হয়েছে!`);

    // Clear meal draft if currently on that date
    if (mealDate === targetDate) {
      const clearedDraft: Record<string, MealSlot> = {};
      messState.members.forEach(m => {
        clearedDraft[m.id] = { b: 0, l: 0, d: 0 };
      });
      setMealDraft(clearedDraft);
    }
  };

  // Remove meal for a single member on a target date
  const handleRemoveMemberMeal = async (memberId: string, targetDate: string) => {
    if (!checkManagerGuard() || !messState) return;
    const nextMeals = { ...(messState.meals || {}) };
    if (nextMeals[targetDate]) {
      const nextDay = { ...nextMeals[targetDate] };
      delete nextDay[memberId];
      if (Object.keys(nextDay).length === 0) {
        delete nextMeals[targetDate];
      } else {
        nextMeals[targetDate] = nextDay;
      }

      const mem = messState.members.find(m => m.id === memberId);
      const nextState: MessState = {
        ...messState,
        meals: nextMeals,
      };

      await saveStateToFirestore(nextState, `${mem?.name || 'সদস্য'}-এর ${targetDate} তারিখের মিল মুছে ফেলা হয়েছে!`);
      setMealDraft(prev => ({
        ...prev,
        [memberId]: { b: 0, l: 0, d: 0 },
      }));
    }
  };

  // Add Deposit
  const handleSaveDeposit = () => {
    if (!checkManagerGuard() || !messState) return;
    const amt = +depAmt;
    if (!amt || !depMember || !depDate) {
      showToast('তারিখ, টাকা ও সদস্য নির্বাচন করুন');
      return;
    }

    const newDep: Deposit = {
      id: uid(),
      m: depMember,
      amt,
      date: depDate,
      note: depNote.trim(),
    };

    const targetMember = messState.members.find(m => m.id === depMember);
    const mName = targetMember?.name || 'সদস্য';

    // Dispatch Resend confirmation and automated Mess Update email
    const targetEmail = targetMember?.email || (targetMember?.uid === user?.uid ? user?.email : undefined);
    if (targetEmail) {
      const mSummary = monthSummary?.mm[depMember] || { dep: 0, bal: 0 };
      const currentDaySlot = messState.meals[depDate]?.[depMember];
      const dayMealsCount = currentDaySlot ? mt(currentDaySlot) : 0;
      const updatedTotalDep = (mSummary.dep || 0) + amt;
      const updatedBalance = (mSummary.bal || 0) + amt;

      // Automated Member-Specific Daily Mess Update email (Template: mess-update)
      sendMemberDailyMessUpdate({
        to: targetEmail,
        userName: mName,
        dailyMeals: dayMealsCount,
        totalDeposit: updatedTotalDep,
        currentBalance: updatedBalance,
        messId: messState.id,
        memberId: depMember,
        date: depDate,
      });

      sendDepositConfirmationEmail({
        to: targetEmail,
        memberName: mName,
        messName: messState.mess,
        amount: amt,
        depositDate: depDate,
        note: depNote.trim(),
        status: 'approved',
      });
    }

    createNotification({
      type: 'deposit',
      title: `💰 নতুন জমা যোগ: ${mName}`,
      body: `${mName}-এর হিসাবে ৳${amt} জমা যোগ করা হয়েছে (${depDate})`,
      actorId: user?.uid,
      actorName: user?.displayName || 'ম্যানেজার',
      targetMemberId: depMember,
      amount: amt,
    }).then(notif => {
      const nextState: MessState = {
        ...messState,
        deposits: [...messState.deposits, newDep],
        notifications: notif
          ? [notif, ...(messState.notifications || [])].slice(0, 100)
          : messState.notifications,
      };
      saveStateToFirestore(nextState, 'জমা যোগ হয়েছে');
    });

    setDepAmt('');
    setDepNote('');
  };

  // Add Cost
  const handleSaveCost = () => {
    if (!checkManagerGuard() || !messState) return;
    const amt = +costAmt;
    if (!amt || !costDate) {
      showToast('তারিখ ও টাকা দিন');
      return;
    }

    let nextState: MessState = { ...messState };

    if (costSubTab === 'meal') {
      if (!costMember) {
        showToast('বাজারকারী নির্বাচন করুন');
        return;
      }
      const newBazar: BazarItem = {
        id: uid(),
        by: costMember,
        date: costDate,
        items: costItems.trim() || 'বাজার',
        amt,
      };
      nextState.bazar = [...nextState.bazar, newBazar];

      if (costAutoDep) {
        nextState.deposits = [
          ...nextState.deposits,
          {
            id: uid(),
            m: costMember,
            amt,
            date: costDate,
            note: 'বাজারের টাকা জমা',
          },
        ];
      }

      const buyer = messState.members.find(m => m.id === costMember);
      const byName = buyer?.name || 'সদস্য';

      createNotification({
        type: 'expense',
        title: `🛒 নতুন বাজার খরচ: ৳${amt}`,
        body: `${byName} বাজার করেছেন: ${costItems.trim() || 'দৈনিক বাজার'} (৳${amt}, ${costDate})`,
        actorId: user?.uid,
        actorName: byName,
        amount: amt,
      }).then(notif => {
        if (notif) {
          nextState.notifications = [notif, ...(nextState.notifications || [])].slice(0, 100);
        }
        saveStateToFirestore(nextState, 'খরচ যোগ হয়েছে');
      });
    } else {
      if (costType === 'ind' && !costMember) {
        showToast('ব্যক্তিগত খরচের জন্য সদস্য নির্বাচন করুন');
        return;
      }
      const newOther: OtherCost = {
        id: uid(),
        date: costDate,
        note: costItems.trim() || 'অন্যান্য খরচ',
        amt,
        type: costType,
        m: costType === 'ind' ? costMember : undefined,
      };
      nextState.other = [...nextState.other, newOther];

      createNotification({
        type: 'expense',
        title: `🧾 মেস খরচ যুক্ত হয়েছে: ৳${amt}`,
        body: `${costItems.trim() || 'অন্যান্য খরচ'} - ৳${amt} (${costDate})`,
        actorId: user?.uid,
        actorName: user?.displayName || 'ম্যানেজার',
        amount: amt,
      }).then(notif => {
        if (notif) {
          nextState.notifications = [notif, ...(nextState.notifications || [])].slice(0, 100);
        }
        saveStateToFirestore(nextState, 'খরচ যোগ হয়েছে');
      });
    }

    setCostAmt('');
    setCostItems('');
  };

  // Save Meal draft
  const handleSaveMealDraft = () => {
    if (!checkManagerGuard() || !messState) return;
    const nextMeals = { ...(messState.meals || {}) };
    const day = { ...(nextMeals[mealDate] || {}) };

    messState.members.forEach(m => {
      const draft = mealDraft[m.id];
      if (draft && mt(draft) > 0) {
        day[m.id] = { b: draft.b, l: draft.l, d: draft.d };
      } else {
        delete day[m.id];
      }
    });

    nextMeals[mealDate] = day;

    // Auto-approve pending requests for this date
    const nextReqs = messState.reqs.map(r => {
      if (r.date === mealDate && r.status === 'pending') {
        return { ...r, status: 'approved' as const };
      }
      return r;
    });

    const totalDayMeals = Object.values(day).reduce((acc, slot) => acc + mt(slot), 0);

    createNotification({
      type: 'meal',
      title: `🍽️ মিল আপডেট: ${mealDate}`,
      body: `ম্যানেজার ${mealDate} তারিখের মিল আপডেট করেছেন (মোট ${totalDayMeals}টি মিল)`,
      actorId: user?.uid,
      actorName: user?.displayName || 'ম্যানেজার',
    }).then(notif => {
      const nextState: MessState = {
        ...messState,
        meals: nextMeals,
        reqs: nextReqs,
        notifications: notif
          ? [notif, ...(messState.notifications || [])].slice(0, 100)
          : messState.notifications,
      };
      saveStateToFirestore(nextState, 'মিল সেভ হয়েছে!');
    });

    // Collect all changed members who need email notifications
    const membersToNotify: Array<{
      to: string;
      userName: string;
      dailyMeals: number;
      totalDeposit: number;
      currentBalance: number;
      messId: string;
      memberId: string;
      date: string;
      messName: string;
    }> = [];

    // Trigger push notification for members whose meal was added or updated
    messState.members.forEach((m) => {
      const draft = mealDraft[m.id];
      const prevSlot = messState.meals[mealDate]?.[m.id];
      const hadPrev = prevSlot && mt(prevSlot) > 0;
      const hasNow = draft && mt(draft) > 0;

      if (hasNow || hadPrev) {
        const isChanged =
          !prevSlot ||
          prevSlot.b !== (draft?.b || 0) ||
          prevSlot.l !== (draft?.l || 0) ||
          prevSlot.d !== (draft?.d || 0);

        if (isChanged) {
          triggerMealPushNotification({
            messId: messState.id,
            messName: messState.mess,
            memberName: m.name,
            date: mealDate,
            action: hadPrev ? 'updated' : 'added',
            slotDetails: draft ? { b: draft.b, l: draft.l, d: draft.d } : { b: 0, l: 0, d: 0 },
            totalMeals: draft ? mt(draft) : 0,
          });

          // Queue member for rate-limited batch email dispatch
          const targetEmail = m.email || (m.uid === user?.uid ? user?.email : undefined);
          if (targetEmail) {
            const mSummary = monthSummary?.mm[m.id] || { dep: 0, bal: 0 };
            const dailyMealsCount = draft ? mt(draft) : 0;
            membersToNotify.push({
              to: targetEmail,
              userName: m.name,
              dailyMeals: dailyMealsCount,
              totalDeposit: mSummary.dep || 0,
              currentBalance: mSummary.bal || 0,
              messId: messState.id,
              memberId: m.id,
              date: mealDate,
              messName: messState.mess,
            });
          }
        }
      }
    });

    // Execute sequential batch email dispatch with 300ms delay & safe error handling
    if (membersToNotify.length > 0) {
      sendBatchMemberDailyMessUpdates(membersToNotify);
    }
  };

  // Targeted Meal Push Notification Handler (Manager)
  const handleSendTargetedPush = async () => {
    if (!checkManagerGuard() || !messState) return;
    setTargetedPushLoading(true);
    try {
      showToast('সদস্যদের মিল যাচাই করে পুশ নোটিফিকেশন পাঠানো হচ্ছে...');
      const todayDate = TD;
      const todayMeals = messState.meals[todayDate] || {};

      const result = await dispatchTargetedDailyMealNotifications({
        messId: messState.id,
        messName: messState.mess,
        members: messState.members,
        todayDate,
        mealsForDate: todayMeals,
      });

      setTargetedPushResult(result);
      setIsTargetedReportOpen(true);
      showToast(`✅ নোটিফিকেশন সম্পন্ন: ${result.hasMealCount} জনের মিল যুক্ত, ${result.noMealCount} জনের মিল বাকি`);
    } catch (err) {
      console.error('Targeted push notification error:', err);
      showToast('পুশ নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setTargetedPushLoading(false);
    }
  };

  // Payment Methods & Member Deposit Handlers
  const handleSavePaymentMethods = async (updatedMethods: PaymentMethodsConfig) => {
    if (!messState || !checkManagerGuard()) return;
    const nextState: MessState = {
      ...messState,
      paymentMethods: updatedMethods,
      updatedAt: new Date().toISOString(),
    };
    await saveStateToFirestore(nextState, 'পেমেন্ট মেথড সেভ হয়েছে!');
  };

  const handleApproveDepositRequest = async (req: MemberDepositRequest) => {
    if (!messState || !checkManagerGuard()) return;
    const targetMember = messState.members.find(
      m => m.id === req.memberId || (m.uid && m.uid === req.memberId)
    );
    const targetMemberId = targetMember ? targetMember.id : req.memberId;

    const newDeposit: Deposit = {
      id: uid(),
      m: targetMemberId,
      amt: req.amount,
      date: req.date || TD,
      note: `অনলাইন ডিপোজিট (${req.method.toUpperCase()} - ${req.senderNumber})`,
    };

    // Dispatch Resend confirmation and automated Mess Update email
    const targetEmail = targetMember?.email;
    if (targetEmail) {
      const mSummary = monthSummary?.mm[targetMemberId] || { dep: 0, bal: 0 };
      const currentDaySlot = messState.meals[req.date || TD]?.[targetMemberId];
      const dayMealsCount = currentDaySlot ? mt(currentDaySlot) : 0;
      const updatedTotalDep = (mSummary.dep || 0) + req.amount;
      const updatedBalance = (mSummary.bal || 0) + req.amount;

      // Automated Member-Specific Daily Mess Update email (Template: mess-update)
      sendMemberDailyMessUpdate({
        to: targetEmail,
        userName: req.memberName,
        dailyMeals: dayMealsCount,
        totalDeposit: updatedTotalDep,
        currentBalance: updatedBalance,
        messId: messState.id,
        memberId: targetMemberId,
        date: req.date || TD,
      });

      sendDepositConfirmationEmail({
        to: targetEmail,
        memberName: req.memberName,
        messName: messState.mess,
        amount: req.amount,
        depositDate: req.date || TD,
        method: req.method,
        senderNumber: req.senderNumber,
        trxId: req.trxId,
        status: 'approved',
      });
    }

    const nextRequests = (messState.depositRequests || []).map(r =>
      r.id === req.id
        ? {
            ...r,
            status: 'approved' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: user?.displayName || 'ম্যানেজার',
          }
        : r
    );

    createNotification({
      type: 'deposit',
      title: `✅ জমা অনুমোদন: ${req.memberName}`,
      body: `${req.memberName}-এর ৳${req.amount} জমা সফলভাবে অনুমোদিত হয়েছে`,
      actorId: user?.uid,
      actorName: user?.displayName || 'ম্যানেজার',
      targetMemberId: req.memberId,
      amount: req.amount,
    }).then(notif => {
      const nextState: MessState = {
        ...messState,
        deposits: [...messState.deposits, newDeposit],
        depositRequests: nextRequests,
        notifications: notif
          ? [notif, ...(messState.notifications || [])].slice(0, 100)
          : messState.notifications,
        updatedAt: new Date().toISOString(),
      };
      saveStateToFirestore(nextState, 'জমা সফলভাবে অনুমোদন করা হয়েছে!');
    });
  };

  const handleRejectDepositRequest = async (reqId: string) => {
    if (!messState || !checkManagerGuard()) return;
    const targetReq = (messState.depositRequests || []).find(r => r.id === reqId);
    const nextRequests = (messState.depositRequests || []).map(r =>
      r.id === reqId
        ? {
            ...r,
            status: 'rejected' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: user?.displayName || 'ম্যানেজার',
          }
        : r
    );

    createNotification({
      type: 'deposit',
      title: `❌ জমা রিকোয়েস্ট বাতিল: ${targetReq?.memberName || 'সদস্য'}`,
      body: `${targetReq?.memberName || 'সদস্য'}-এর ৳${targetReq?.amount || 0} জমা রিকোয়েস্ট বাতিল করা হয়েছে`,
      actorId: user?.uid,
      actorName: user?.displayName || 'ম্যানেজার',
      amount: targetReq?.amount,
    }).then(notif => {
      const nextState: MessState = {
        ...messState,
        depositRequests: nextRequests,
        notifications: notif
          ? [notif, ...(messState.notifications || [])].slice(0, 100)
          : messState.notifications,
        updatedAt: new Date().toISOString(),
      };
      saveStateToFirestore(nextState, 'জমা রিকোয়েস্ট বাতিল করা হয়েছে');
    });
  };

  const handleSubmitMemberDeposit = async (data: {
    method: PaymentMethodKey;
    amount: number;
    senderNumber: string;
    trxId?: string;
  }) => {
    if (!messState) {
      showToast('মেসের তথ্য এখনো লোড হয়নি');
      return;
    }

    const memberId = currentMember?.id || user?.uid || uid();
    const memberName =
      currentMember?.name ||
      user?.displayName ||
      user?.email?.split('@')[0] ||
      'সদস্য';

    const newReq: MemberDepositRequest = {
      id: uid(),
      memberId,
      memberName,
      method: data.method,
      amount: Number(data.amount) || 0,
      senderNumber: String(data.senderNumber || '').trim(),
      trxId: String(data.trxId || '').trim(),
      date: TD,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Dispatch Resend confirmation email to user
    const targetEmail = currentMember?.email || user?.email;
    if (targetEmail) {
      sendDepositConfirmationEmail({
        to: targetEmail,
        memberName,
        messName: messState.mess,
        amount: Number(data.amount) || 0,
        depositDate: TD,
        method: data.method,
        senderNumber: data.senderNumber,
        trxId: data.trxId,
        status: 'pending',
        note: 'পেমেন্ট রিকোয়েস্ট সফলভাবে মেসে জমা দেওয়া হয়েছে (ম্যানেজার অনুমোদন করবেন)',
      });
    }

    createNotification({
      type: 'deposit',
      title: `💳 জমা রিকোয়েস্ট: ${memberName}`,
      body: `${memberName} ৳${data.amount} জমা রিকোয়েস্ট পাঠিয়েছেন (${data.method.toUpperCase()} - ${data.senderNumber})`,
      actorId: memberId,
      actorName: memberName,
      amount: Number(data.amount) || 0,
    }).then(notif => {
      const nextState: MessState = {
        ...messState,
        depositRequests: [newReq, ...(messState.depositRequests || [])],
        notifications: notif
          ? [notif, ...(messState.notifications || [])].slice(0, 100)
          : messState.notifications,
        updatedAt: new Date().toISOString(),
      };
      saveStateToFirestore(nextState, 'জমা রিকোয়েস্ট সফলভাবে জমা হয়েছে!');
    });
  };

  // Submit Meal Request (Members)
  const handleSubmitMealRequest = (b: number, l: number, d: number, dateStr: string) => {
    if (!messState || !currentMember) return;
    const now = new Date();
    const tomorrow = ds(new Date(Date.now() + 864e5));

    if (!dateStr || dateStr <= TD) {
      showToast('আজ বা অতীতের তারিখের রিকোয়েস্ট দেওয়া যাবে না');
      return;
    }

    if (dateStr === tomorrow && now.getHours() >= messState.cutoff) {
      showToast(`রাত ${messState.cutoff}:00 এর পর পরের দিনের মিল রিকোয়েস্ট বন্ধ`);
      return;
    }

    if (b + l + d === 0) {
      showToast('কমপক্ষে একটি মিল নির্বাচন করুন');
      return;
    }

    const newReq: MealRequest = {
      id: uid(),
      m: currentMember.id,
      date: dateStr,
      b,
      l,
      d,
      status: 'pending',
    };

    createNotification({
      type: 'meal',
      title: `🍽️ মিল রিকোয়েস্ট: ${currentMember.name}`,
      body: `${currentMember.name} ${dateStr} তারিখের জন্য ${b + l + d} টি মিলের রিকোয়েস্ট পাঠিয়েছেন`,
      actorId: currentMember.id,
      actorName: currentMember.name,
      metadata: { b, l, d, date: dateStr },
    }).then(notif => {
      const nextState: MessState = {
        ...messState,
        reqs: [...messState.reqs, newReq],
        notifications: notif
          ? [notif, ...(messState.notifications || [])].slice(0, 100)
          : messState.notifications,
      };
      saveStateToFirestore(nextState, 'রিকোয়েস্ট পাঠানো হয়েছে');
    });

    // Dispatch Resend confirmation email to member
    const targetEmail = currentMember.email || user?.email;
    if (targetEmail) {
      sendMealConfirmationEmail({
        to: targetEmail,
        memberName: currentMember.name,
        messName: messState.mess,
        date: dateStr,
        breakfast: b,
        lunch: l,
        dinner: d,
        action: 'requested',
      });
    }
  };

  // Approve Meal Request
  const handleApproveReq = (reqId: string) => {
    if (!checkManagerGuard() || !messState) return;
    const target = messState.reqs.find(r => r.id === reqId);
    if (!target) return;

    const nextMeals = { ...messState.meals };
    const day = { ...(nextMeals[target.date] || {}) };
    day[target.m] = { b: target.b, l: target.l, d: target.d };
    nextMeals[target.date] = day;

    const nextReqs = messState.reqs.map(r =>
      r.id === reqId ? { ...r, status: 'approved' as const } : r
    );

    const targetMember = messState.members.find((m) => m.id === target.m);

    createNotification({
      type: 'meal',
      title: `✅ মিল রিকোয়েস্ট অনুমোদিত: ${targetMember?.name || 'সদস্য'}`,
      body: `${targetMember?.name || 'সদস্য'}-এর ${target.date} তারিখের ${target.b + target.l + target.d} টি মিল অনুমোদিত হয়েছে`,
      actorId: user?.uid,
      actorName: user?.displayName || 'ম্যানেজার',
      targetMemberId: target.m,
    }).then(notif => {
      const nextState: MessState = {
        ...messState,
        meals: nextMeals,
        reqs: nextReqs,
        notifications: notif
          ? [notif, ...(messState.notifications || [])].slice(0, 100)
          : messState.notifications,
      };
      saveStateToFirestore(nextState, 'রিকোয়েস্ট অ্যাপ্রুভ হয়েছে');
    });

    // Trigger push notification for approved meal request
    triggerMealPushNotification({
      messId: messState.id,
      messName: messState.mess,
      memberName: targetMember?.name || 'সদস্য',
      date: target.date,
      action: 'approved',
      slotDetails: { b: target.b, l: target.l, d: target.d },
      totalMeals: target.b + target.l + target.d,
    });

    // Dispatch Resend confirmation and automated Mess Update email to member
    if (targetMember?.email) {
      const mSummary = monthSummary?.mm[target.m] || { dep: 0, bal: 0 };
      const totalApprovedMeals = target.b + target.l + target.d;

      // Automated Member-Specific Daily Mess Update email (Template: mess-update)
      sendMemberDailyMessUpdate({
        to: targetMember.email,
        userName: targetMember.name,
        dailyMeals: totalApprovedMeals,
        totalDeposit: mSummary.dep || 0,
        currentBalance: mSummary.bal || 0,
        messId: messState.id,
        memberId: target.m,
        date: target.date,
      });

      sendMealConfirmationEmail({
        to: targetMember.email,
        memberName: targetMember.name,
        messName: messState.mess,
        date: target.date,
        breakfast: target.b,
        lunch: target.l,
        dinner: target.d,
        action: 'approved',
      });
    }
  };

  // Reject Meal Request
  const handleRejectReq = (reqId: string) => {
    if (!checkManagerGuard() || !messState) return;
    const target = messState.reqs.find(r => r.id === reqId);
    const targetMember = target ? messState.members.find((m) => m.id === target.m) : null;

    const nextReqs = messState.reqs.map(r =>
      r.id === reqId ? { ...r, status: 'rejected' as const } : r
    );

    createNotification({
      type: 'meal',
      title: `❌ মিল রিকোয়েস্ট বাতিল: ${targetMember?.name || 'সদস্য'}`,
      body: `${targetMember?.name || 'সদস্য'}-এর ${target?.date || ''} তারিখের মিল রিকোয়েস্ট বাতিল করা হয়েছে`,
      actorId: user?.uid,
      actorName: user?.displayName || 'ম্যানেজার',
      targetMemberId: target?.m,
    }).then(notif => {
      const nextState: MessState = {
        ...messState,
        reqs: nextReqs,
        notifications: notif
          ? [notif, ...(messState.notifications || [])].slice(0, 100)
          : messState.notifications,
      };
      saveStateToFirestore(nextState, 'রিকোয়েস্ট বাতিল করা হয়েছে');
    });
  };

  // Bengali Month Names
  const banglaMonths = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const [activeYear, activeMonthNum] = activeYM.split('-');

  // Days in active month for Meal Chart
  const daysInMonth = useMemo(() => {
    const dim = new Date(+activeYear, +activeMonthNum, 0).getDate();
    return Array.from({ length: dim }, (_, i) => `${activeYM}-${pad(i + 1)}`);
  }, [activeYear, activeMonthNum, activeYM]);

  // Full-Screen Loading Animation:
  // Shows while verifying session (authLoading) when trying to access /app
  const isCheckingSessionOrMess = authLoading && (pathname === '/app' || (pathname === '/login' && !!user));

  if (isCheckingSessionOrMess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)] p-4 select-none">
        <div className="text-center space-y-6 max-w-sm w-full mx-auto">
          {/* Logo & Brand Icon with dual ring spinner */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/15 border-t-emerald-600 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shadow-sm">
                <Icon name="bowl" size={26} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[var(--fg)]">
              KhaonKhata
            </h1>
            <p className="text-sm font-medium text-[var(--mut)] flex items-center justify-center gap-1.5">
              <span>সেশন ও মেস যাচাই করা হচ্ছে</span>
              <span className="inline-flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- DEDICATED ROUTE: PRIVACY POLICY (/privacy) ---
  if (pathname === '/privacy') {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <PrivacyPolicyPage
          onBack={() => navigate('/')}
          onNavigate={(p) => navigate(p)}
        />
        <Toast message={toastMsg} />
      </div>
    );
  }

  // --- DEDICATED ROUTE: TERMS OF SERVICE (/terms) ---
  if (pathname === '/terms') {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <TermsPage
          onBack={() => navigate('/')}
          onNavigate={(p) => navigate(p)}
        />
        <Toast message={toastMsg} />
      </div>
    );
  }

  // --- DEDICATED ROUTE: CONTACT US (/contact) ---
  if (pathname === '/contact') {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <ContactPage
          onBack={() => navigate('/')}
          showToast={showToast}
        />
        <Toast message={toastMsg} />
      </div>
    );
  }

  // --- DEDICATED ROUTE: ABOUT US (/about) ---
  if (pathname === '/about' || (tab === 'about' && pathname !== '/app')) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <AboutPage
          standalone
          onLogin={() => navigate('/login')}
          onBack={() => {
            if (user && currentMessId && messState) {
              navigate('/app');
              setTab('home');
            } else {
              navigate('/');
            }
          }}
        />
        <Toast message={toastMsg} />
      </div>
    );
  }

  // --- DEDICATED ROUTE: LOGIN (/login) ---
  if (pathname === '/login') {
    if (user) {
      setTimeout(() => navigate('/app'), 0);
      return null;
    }
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <LoginPage
          onGoogleSignIn={handleGoogleSignIn}
          onBackToHome={() => navigate('/')}
          unauthorizedDomainModal={unauthorizedDomainModal}
          setUnauthorizedDomainModal={setUnauthorizedDomainModal}
          showToast={showToast}
          onNavigate={(p) => navigate(p)}
          onUserAuthenticated={handleUserAuthenticated}
        />
        <Toast message={toastMsg} />
      </div>
    );
  }

  // --- ROOT ROUTE: WORLD-CLASS RESPONSIVE LANDING PAGE (/) ---
  if (pathname === '/' || pathname === '') {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <LandingPage
          user={user}
          onNavigate={(p) => navigate(p)}
          theme={theme}
          onToggleTheme={() => {
            const nextTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(nextTheme);
            localStorage.setItem('mm_theme', nextTheme);
            if (nextTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }}
          showToast={showToast}
        />
        <Toast message={toastMsg} />
      </div>
    );
  }

  // --- PROTECTED APP ROUTE: IF NOT SIGNED IN, REDIRECT/RENDER LOGIN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <LoginPage
          onGoogleSignIn={handleGoogleSignIn}
          onBackToHome={() => navigate('/')}
          unauthorizedDomainModal={unauthorizedDomainModal}
          setUnauthorizedDomainModal={setUnauthorizedDomainModal}
          showToast={showToast}
          onNavigate={(p) => navigate(p)}
          onUserAuthenticated={handleUserAuthenticated}
        />
        <Toast message={toastMsg} />
      </div>
    );
  }

  // Public /about route accessible even when no mess selected
  if (tab === 'about' && (!currentMessId || !messState)) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <AboutPage
          standalone
          onBack={() => {
            setTab('home');
            window.history.pushState({}, '', '/');
          }}
        />
        <Toast message={toastMsg} />
      </div>
    );
  }

  // User has signed in, but no mess selected or in Gate mode
  if (!currentMessId || !messState) {
    return (
      <div id="gate">
        <div className="gc">
          <div className="gb">
            <i><Icon name="bowl" size={22} /></i>
            <span className="font-serif">KhaonKhata (খাওনখাতা)</span>
          </div>

          {gateMode === 'choose' && (
            <>
              <h2>হ্যালো, {user.displayName || 'সদস্য'}</h2>
              <p className="mut">কীভাবে শুরু করতে চান?</p>

              <button
                className="opt"
                onClick={() => setGateMode('create')}
              >
                <i><Icon name="home" size={24} /></i>
                <span>
                  <b>নতুন মেস তৈরি করুন</b>
                  <small>আপনি হবেন মেস ম্যানেজার (Manager)</small>
                </span>
              </button>

              <button
                className="opt"
                onClick={() => setGateMode('join')}
              >
                <i><Icon name="users" size={24} /></i>
                <span>
                  <b>মেসে যোগ দিন (Join Mess)</b>
                  <small>ম্যানেজারের ইমেইল বা মেস আইডি দিয়ে যোগ দিন</small>
                </span>
              </button>

              {userMesses.length > 0 && (
                <div className="mt-6">
                  <p className="mut mb-2 text-sm font-semibold">আপনার পূর্বে যুক্ত মেসসমূহ</p>
                  <div className="space-y-2">
                    {userMesses.map(m => (
                      <button
                        key={m.id}
                        className="opt !mt-0 !p-3"
                        onClick={() => {
                          setCurrentMessId(m.id);
                          localStorage.setItem('mm_cur_mess_id', m.id);
                        }}
                      >
                        <i><Icon name="bowl" size={20} /></i>
                        <span>
                          <b>{m.name}</b>
                          <small>ম্যানেজার: {m.mgrEmail}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-[var(--line)] flex justify-between items-center text-xs">
                <button
                  onClick={() => navigate('/')}
                  className="lnk text-emerald-600 hover:underline cursor-pointer"
                >
                  ← হোমপেজে যান (Landing)
                </button>
                <button
                  onClick={handleSignOut}
                  className="lnk text-[var(--bad)] hover:underline cursor-pointer"
                >
                  লগআউট করুন
                </button>
              </div>
            </>
          )}

          {gateMode === 'create' && (
            <>
              <h2>Create Mess</h2>
              <p className="mut">আপনার মেসের একটি সুন্দর নাম দিন</p>

              <label>মেসের নাম</label>
              <input
                placeholder="যেমন: White House, ধানমন্ডি মেস..."
                value={createMessName}
                onChange={e => setCreateMessName(e.target.value)}
              />

              <p className="mt-6">
                <button
                  onClick={handleCreateMess}
                  className="btn big w-full"
                >
                  মেস তৈরি করুন
                </button>
              </p>

              <p className="text-center mt-3">
                <button
                  onClick={() => setGateMode('choose')}
                  className="lnk"
                >
                  ‹ ফিরে যান
                </button>
              </p>
            </>
          )}

          {gateMode === 'join' && (
            <>
              <h2>Join Mess</h2>
              <p className="mut">যে ম্যানেজার মেস খুলেছেন তার Google Email বা Mess ID দিন</p>

              <label>Manager এর Email বা Mess ID</label>
              <input
                type="email"
                placeholder="যেমন: manager@gmail.com"
                value={joinEmailOrId}
                onChange={e => setJoinEmailOrId(e.target.value)}
              />

              <p className="mt-6">
                <button
                  onClick={handleJoinMess}
                  className="btn big w-full"
                >
                  মেসে যোগ দিন
                </button>
              </p>

              <p className="text-center mt-3">
                <button
                  onClick={() => setGateMode('choose')}
                  className="lnk"
                >
                  ‹ ফিরে যান
                </button>
              </p>
            </>
          )}
        </div>
        <Toast message={toastMsg} />
      </div>
    );
  }

  // --- Main Application UI when in an Active Mess ---
  const whoName = currentMember?.name || user.displayName || 'সদস্য';
  const mySummary = monthSummary?.mm[currentMember?.id || ''] || {
    meals: 0,
    dep: 0,
    tot: 0,
    bal: 0,
  };

  const todayMeals = messState.meals[TD] || {};
  const todayEaters = messState.members.filter(m => mt(todayMeals[m.id]) > 0);
  const pendingReqCount = messState.reqs.filter(r => r.status === 'pending').length;
  const pendingDepositCount = (messState.depositRequests || []).filter(r => r.status === 'pending').length;

  // Daily Bazar Bar Chart calculation
  const dim = new Date(+activeYear, +activeMonthNum, 0).getDate();
  const dailyBazarAmounts = Array.from({ length: dim }, (_, i) => {
    const dayStr = `${activeYM}-${pad(i + 1)}`;
    return messState.bazar
      .filter(b => b.date === dayStr)
      .reduce((acc, curr) => acc + +curr.amt, 0);
  });
  const maxBazar = Math.max(1, ...dailyBazarAmounts);

  return (
    <div id="shell">
      {/* Desktop Sidebar Navigation */}
      <nav className="desktop-nav">
        <div className="logo !pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <i><Icon name="bowl" size={18} /></i>
            <span className="truncate">{messState.mess}</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold ml-1 flex-shrink-0">
            KhaonKhata
          </span>
        </div>
        <a
          href="https://www.facebook.com/share/1DmkXxdFDk/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-[var(--pri)] px-3 -mt-2 mb-2 hover:underline inline-flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80"
          title="Facebook Profile"
        >
          Developed by Reduean A. Rahat ↗
        </a>

        <button
          className={tab === 'home' ? 'on' : ''}
          onClick={() => { setTab('home'); setDrawerOpen(false); }}
        >
          <Icon name="home" size={18} />
          <span>Home</span>
        </button>

        <a
          href="/about"
          className={`nav-item ${tab === 'about' ? 'on' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setTab('about');
            setDrawerOpen(false);
          }}
        >
          <Icon name="user" size={18} />
          <span>About Us</span>
        </a>

        {isManager && (
          <button
            className={tab === 'deposit' ? 'on' : ''}
            onClick={() => { setTab('deposit'); setDrawerOpen(false); }}
          >
            <Icon name="wallet" size={18} />
            <span>Deposit</span>
          </button>
        )}

        <button
          className={tab === 'meal' ? 'on' : ''}
          onClick={() => { setTab('meal'); setDrawerOpen(false); }}
        >
          <Icon name="bowl" size={18} />
          <span>Meal</span>
          {pendingReqCount > 0 && isManager && (
            <span className="ml-auto bg-[var(--bad)] text-white text-xs px-1.5 py-0.5 rounded-full">
              {pendingReqCount}
            </span>
          )}
        </button>

        {isManager && (
          <button
            className={tab === 'cost' ? 'on' : ''}
            onClick={() => { setTab('cost'); setDrawerOpen(false); }}
          >
            <Icon name="cart" size={18} />
            <span>Cost</span>
          </button>
        )}

        {isManager && (
          <button
            className={tab === 'payment_methods' ? 'on' : ''}
            onClick={() => { setTab('payment_methods'); setDrawerOpen(false); }}
          >
            <Icon name="wallet" size={18} />
            <span>Payment Methods</span>
            {pendingDepositCount > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                {pendingDepositCount}
              </span>
            )}
          </button>
        )}

        {!isManager && (
          <button
            className={tab === 'member_deposit' ? 'on' : ''}
            onClick={() => { setTab('member_deposit'); setDrawerOpen(false); }}
          >
            <Icon name="wallet" size={18} />
            <span>Deposit</span>
          </button>
        )}

        <button
          className={tab === 'members' || tab === 'detail' ? 'on' : ''}
          onClick={() => { setTab('members'); setDrawerOpen(false); }}
        >
          <Icon name="users" size={18} />
          <span>Members</span>
        </button>

        <button
          className={tab === 'active' ? 'on' : ''}
          onClick={() => { setTab('active'); setDrawerOpen(false); }}
        >
          <Icon name="cal" size={18} />
          <span>Active Month</span>
        </button>

        <button
          className={tab === 'all' ? 'on' : ''}
          onClick={() => { setTab('all'); setDrawerOpen(false); }}
        >
          <Icon name="list" size={18} />
          <span>All Months</span>
        </button>

        <div className="mt-auto pt-4 border-t border-[var(--line)] space-y-1.5">
          <PWAInstallButton />
          <button
            className={tab === 'settings' ? 'on' : ''}
            onClick={() => { setTab('settings'); setDrawerOpen(false); }}
          >
            <Icon name="gear" size={18} />
            <span>Settings</span>
          </button>
          <a
            href="https://www.facebook.com/share/1VCSom58hc/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] dark:bg-[#1877F2]/20 dark:hover:bg-[#1877F2]/30 dark:text-[#5890ff] flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer"
          >
            <FacebookIcon size={16} />
            <span>Direct Support</span>
          </a>
          <button
            className="w-full py-2 px-3 rounded-xl text-[var(--bad)] hover:bg-[var(--line)] flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer"
            onClick={handleSignOut}
          >
            <Icon name="swap" size={16} />
            <span>Log out</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main id="app">
        {/* Top Header Bar */}
        <div className="top">
          <button
            className="pill md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
          >
            <Icon name="menu" size={18} />
          </button>

          <h1 className="capitalize">
            {tab === 'home' && 'ড্যাশবোর্ড'}
            {tab === 'about' && 'About Us'}
            {tab === 'deposit' && 'Add Deposit'}
            {tab === 'meal' && 'Add Meal'}
            {tab === 'cost' && 'Add Cost'}
            {tab === 'members' && 'Mess Members'}
            {tab === 'detail' && 'Member Details'}
            {tab === 'active' && 'Active Month Details'}
            {tab === 'all' && 'All Month Details'}
            {tab === 'settings' && 'Mess Settings'}
            {tab === 'profile' && 'Profile'}
            {tab === 'payment_methods' && 'পেমেন্ট মেথড (Payment Methods)'}
            {tab === 'member_deposit' && 'টাকা জমা (Deposit)'}
          </h1>

          {/* Month selector pills */}
          <button
            className="pill"
            onClick={() => shiftMonth(-1)}
            aria-label="আগের মাস"
          >
            ‹
          </button>
          <span className="pill font-medium">
            {banglaMonths[+activeMonthNum - 1]} {activeYear}
            {isMonthLocked && ' (বন্ধ)'}
          </span>
          <button
            className="pill"
            onClick={() => shiftMonth(1)}
            aria-label="পরের মাস"
          >
            ›
          </button>

          {/* Interactive Notification Bell Icon with Red Counter Badge */}
          <button
            type="button"
            className="pill relative !p-2 flex items-center justify-center cursor-pointer transition-transform active:scale-95 text-[var(--fg)] hover:bg-[var(--line)]"
            onClick={() => setIsNotificationOpen(true)}
            aria-label="Notifications"
            title="নোটিফিকেশন"
          >
            <Icon name="bell" size={19} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* User profile avatar pill */}
          <button
            className="pill pav"
            onClick={() => setTab('profile')}
            aria-label="Profile"
            title={user.email || ''}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              (whoName[0] || 'U').toUpperCase()
            )}
          </button>
        </div>

        {/* Live Status indicator & Offline Banner */}
        <div className="flex flex-col gap-1.5 mb-3 px-1">
          <div className="flex items-center justify-between text-xs text-[var(--mut)]">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                অনলাইন · রিয়েলটাইম সিঙ্ক সক্রিয়
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                অফলাইন মোড (Offline Mode) · লোকাল ডাটা
              </span>
            )}
            <span>মেস: <b>{messState.mess}</b> ({isManager ? 'ম্যানেজার' : 'সদস্য'})</span>
          </div>

          {/* Pending Offline Sync Notice Bar */}
          {pendingSyncCount > 0 && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs shadow-xs">
              <span className="flex items-center gap-2">
                <span>🔄</span>
                <span><b>{pendingSyncCount}টি</b> পরিবর্তন অফলাইনে সংরক্ষিত আছে (অনলাইন হলে অটো-সিঙ্ক হবে)</span>
              </span>
              {isOnline && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-[11px] cursor-pointer transition disabled:opacity-50"
                >
                  {isSyncing ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক করুন'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* --- VIEW: ABOUT US --- */}
        {tab === 'about' && (
          <div className="pg">
            <AboutPage
              onBack={() => {
                setTab('home');
                window.history.pushState({}, '', '/');
              }}
            />
          </div>
        )}

        {/* --- VIEW: HOME (DASHBOARD) --- */}
        {tab === 'home' && (
          <div className="pg space-y-4">
            {/* Header User Card */}
            <div className="row !border-0 !py-1">
              <span className="av">{(whoName[0] || '?').toUpperCase()}</span>
              <div className="g1">
                <b>{whoName}</b>
                <br />
                <small>
                  {isManager ? 'ম্যানেজার' : 'মেম্বার'} · {messState.mess}
                </small>
              </div>
              <span className="tag">
                ● {isMonthLocked ? 'Closed' : 'Running'}
              </span>
            </div>

            {/* Mess Hero Balance Card */}
            <div className="hero2 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <small>Mess Balance</small>
                  <div className="big">
                    {monthSummary ? tk(monthSummary.dep - monthSummary.tot) : '৳0'}
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs flex items-center gap-1.5 backdrop-blur-xs transition cursor-pointer border border-white/20 shadow-xs"
                  disabled={isExportingPDF}
                  onClick={handleDownloadGroupPDF}
                  title="Download Group Mess Summary Report PDF"
                >
                  <span>📋</span>
                  <span>{isExportingPDF ? 'তৈরি হচ্ছে...' : 'Group PDF'}</span>
                </button>
              </div>
              <div className="tri">
                <div>
                  <small>Deposit</small>
                  <b>{monthSummary ? tk(monthSummary.dep) : '৳0'}</b>
                </div>
                <div>
                  <small>Total Cost</small>
                  <b>{monthSummary ? tk(monthSummary.tot) : '৳0'}</b>
                </div>
                <div>
                  <small>Meal Rate</small>
                  <b>{monthSummary ? `${fm(monthSummary.rate)}৳` : '0৳'}</b>
                </div>
              </div>
            </div>

            {/* My Personal Summary */}
            <div className="card">
              <div className="flex justify-between items-center mb-2">
                <h3 className="!mb-0">My Summary</h3>
                <button
                  type="button"
                  className="btn g s flex items-center gap-1.5 text-xs font-semibold !py-1 !px-2.5 cursor-pointer"
                  disabled={isExportingPDF}
                  onClick={() => handleDownloadIndividualPDF()}
                  title="Download Individual Monthly Expense & Meal Summary PDF"
                >
                  <span>📄</span>
                  <span>{isExportingPDF ? 'তৈরি হচ্ছে...' : 'My Report PDF'}</span>
                </button>
              </div>
              <div className="fig">
                <div>
                  <b>{fm(mySummary.meals)}</b>
                  <small>Meals</small>
                </div>
                <div>
                  <b>{tk(mySummary.dep)}</b>
                  <small>Deposit</small>
                </div>
                <div>
                  <b>{tk(mySummary.tot)}</b>
                  <small>Cost</small>
                </div>
                <div>
                  <b className={mySummary.bal >= 0 ? 'ok' : 'bad'}>
                    {tk(mySummary.bal)}
                  </b>
                  <small>Balance</small>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="qa">
              {isManager && (
                <button onClick={() => { setTab('meal'); setMealSubTab('add'); }}>
                  <i><Icon name="bowl" size={22} /></i>
                  Add Meal
                </button>
              )}
              {isManager && (
                <button onClick={() => setTab('deposit')}>
                  <i><Icon name="wallet" size={22} /></i>
                  Add Deposit
                </button>
              )}
              {isManager && (
                <button onClick={() => setTab('cost')}>
                  <i><Icon name="cart" size={22} /></i>
                  Add Cost
                </button>
              )}
              <button onClick={() => { setTab('meal'); setMealSubTab('req'); }}>
                <i><Icon name="req" size={22} /></i>
                Request {pendingReqCount > 0 ? `(${pendingReqCount})` : ''}
              </button>

              {/* For Regular Members: Next to Request option, show Deposit */}
              {!isManager && (
                <button onClick={() => setTab('member_deposit')}>
                  <i><Icon name="wallet" size={22} /></i>
                  Deposit
                </button>
              )}
            </div>

            {/* Under the existing 4 options: 5th option named Payment Methods (Visible ONLY to Manager) */}
            {isManager && (
              <div className="mb-4">
                <button
                  onClick={() => setTab('payment_methods')}
                  className="w-full p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 flex items-center justify-between text-[var(--fg)] transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Icon name="wallet" size={20} />
                    </span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <b className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                          Payment Methods (পেমেন্ট মেথড)
                        </b>
                        <span className="tag text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/20">
                          ম্যানেজার অপশন
                        </span>
                      </div>
                      <p className="text-xs text-[var(--mut)] mt-0.5">
                        বিকাশ, নগদ, রকেট, উপায় ও বাংলা কিউআর পেমেন্ট তথ্য সেট করুন
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {pendingDepositCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                        {pendingDepositCount} নতুন জমা রিকোয়েস্ট
                      </span>
                    )}
                    <span className="text-xl text-emerald-600 dark:text-emerald-400 font-bold">›</span>
                  </div>
                </button>
              </div>
            )}

            {/* Today's Eaters */}
            <div className="card">
              <h3>
                আজ কে কে খাচ্ছে <span className="tag">{TD}</span>
              </h3>
              {todayEaters.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {todayEaters.map(m => (
                    <span key={m.id} className="pill">
                      {m.name} · {mt(todayMeals[m.id])} মিল
                    </span>
                  ))}
                </div>
              ) : (
                <small>আজ এখনো কোনো মিল যোগ হয়নি।</small>
              )}
            </div>

            {/* Daily Bazar Bar Chart */}
            <div className="card">
              <h3>দৈনিক বাজার খরচ</h3>
              <div className="bars">
                {dailyBazarAmounts.map((amt, idx) => {
                  const pct = (amt / maxBazar) * 100;
                  return (
                    <div
                      key={idx}
                      title={`${idx + 1} তারিখ: ${tk(amt)}`}
                      style={{ height: `${Math.max(2, pct)}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Notices Board */}
            <div className="card">
              <h3>
                <span>নোটিশ</span>
                {isManager && (
                  <button
                    className="btn s"
                    onClick={() => {
                      setModalConfig({
                        isOpen: true,
                        title: 'নতুন নোটিশ',
                        fields: [{ k: 'text', l: 'নোটিশ বার্তা', t: 'textarea', placeholder: 'বার্তা লিখুন...' }],
                        onConfirm: (vals) => {
                          if (!vals.text?.trim()) return false;
                          const newNotice: Notice = {
                            id: uid(),
                            text: vals.text.trim(),
                            date: TD,
                          };
                          createNotification({
                            type: 'notice',
                            title: `📢 নতুন মেস নোটিশ`,
                            body: vals.text.trim(),
                            actorId: user?.uid,
                            actorName: user?.displayName || 'ম্যানেজার',
                          }).then(notif => {
                            saveStateToFirestore(
                              {
                                ...messState,
                                notices: [...messState.notices, newNotice],
                                notifications: notif
                                  ? [notif, ...(messState.notifications || [])].slice(0, 100)
                                  : messState.notifications,
                              },
                              'নোটিশ প্রকাশ করা হয়েছে'
                            );
                          });
                        },
                      });
                    }}
                  >
                    + নতুন
                  </button>
                )}
              </h3>
              {messState.notices.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {messState.notices
                    .slice()
                    .reverse()
                    .map(n => (
                      <div key={n.id} className="row">
                        <div className="g1">
                          <p className="font-medium text-sm m-0">{n.text}</p>
                          <small>{n.date}</small>
                        </div>
                        {isManager && (
                          <button
                            className="btn g s"
                            onClick={() => {
                              const updated = messState.notices.filter(x => x.id !== n.id);
                              saveStateToFirestore({ ...messState, notices: updated }, 'নোটিশ মুছে ফেলা হয়েছে');
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <small>কোনো নোটিশ নেই</small>
              )}
            </div>

            {/* All Members Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="m-0">সদস্যবৃন্দ ({messState.members.length})</h3>
                <button
                  className="btn g s"
                  onClick={() => setTab('members')}
                >
                  সব দেখুন
                </button>
              </div>

              <div className="space-y-3">
                {messState.members.map(m => {
                  const mSummary = monthSummary?.mm[m.id] || {
                    meals: 0,
                    dep: 0,
                    cost: 0,
                    ind: 0,
                    sh: 0,
                    tot: 0,
                    bal: 0,
                  };
                  return (
                    <div
                      key={m.id}
                      className="card mb cursor-pointer hover:border-[var(--pri)]"
                      onClick={() => {
                        setDetailMemberId(m.id);
                        setTab('detail');
                      }}
                    >
                      <div className="row !pt-0 !pb-2">
                        <span className="av">{(m.name[0] || '?').toUpperCase()}</span>
                        <div className="g1">
                          <b>{m.name}</b>
                          {m.id === messState.mgr && (
                            <span className="tag ml-2 text-xs">Manager</span>
                          )}
                          <br />
                          <small>{m.room || 'Room -'}</small>
                        </div>
                        <div className="text-right">
                          <small>ব্যালেন্স</small>
                          <br />
                          <b className={mSummary.bal >= 0 ? 'ok' : 'bad'}>
                            {tk(mSummary.bal)}
                          </b>
                        </div>
                      </div>

                      {/* Summary Breakdown */}
                      <div className="br"><span>মোট মিল</span><b>{fm(mSummary.meals)}</b></div>
                      <div className="br"><span>মোট জমা</span><b>{tk(mSummary.dep)}</b></div>
                      <div className="br"><span>মিল বাবদ খরচ</span><b>{tk(mSummary.cost)}</b></div>
                      {mSummary.ind > 0 && <div className="br"><span>ব্যক্তিগত খরচ</span><b>{tk(mSummary.ind)}</b></div>}
                      <div className="br"><span>শেয়ার্ড খরচ</span><b>{tk(mSummary.sh)}</b></div>
                      <div className="br border-t border-[var(--line)] pt-2 mt-1">
                        <span>মোট খরচ</span>
                        <b className="bad">{tk(mSummary.tot)}</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: ADD MEAL --- */}
        {tab === 'meal' && (
          <div className="pg space-y-4">
            {/* Sub Tabs */}
            <div className="stabs flex-wrap">
              {isManager && (
                <button
                  className={mealSubTab === 'add' ? 'on' : ''}
                  onClick={() => setMealSubTab('add')}
                >
                  মিল এন্ট্রি / এডিট
                </button>
              )}
              <button
                className={mealSubTab === 'req' ? 'on' : ''}
                onClick={() => setMealSubTab('req')}
              >
                Meal Request {pendingReqCount > 0 ? `(${pendingReqCount})` : ''}
              </button>
              <button
                className={mealSubTab === 'chart' ? 'on' : ''}
                onClick={() => setMealSubTab('chart')}
              >
                Chart
              </button>
              {isManager && (
                <button
                  className={mealSubTab === 'history' ? 'on' : ''}
                  onClick={() => setMealSubTab('history')}
                >
                  📅 মিল হিস্ট্রি ও মুছুন
                </button>
              )}
            </div>

            {/* TAB: ADD / EDIT MEAL (Manager) */}
            {mealSubTab === 'add' && (
              <>
                <label>মেম্বার সিলেক্ট করুন</label>
                <select
                  value={mealWho}
                  onChange={e => setMealWho(e.target.value)}
                >
                  <option value="all">For All Members</option>
                  {messState.members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <div className="flex justify-between items-center mt-2">
                  <label className="m-0">মিলের তারিখ সিলেক্ট করুন</label>
                  {messState.meals?.[mealDate] && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ এই তারিখে মিল সংরক্ষিত আছে
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={mealDate}
                  onChange={e => setMealDate(e.target.value)}
                />

                {/* Date meal status banner & delete button */}
                {(() => {
                  const existingDay = messState.meals?.[mealDate];
                  const existingTotal = existingDay
                    ? Object.values(existingDay).reduce((acc, s) => acc + mt(s), 0)
                    : 0;
                  if (existingTotal > 0) {
                    return (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2">
                        <div>
                          <b className="text-amber-900 dark:text-amber-100 text-xs">
                            📅 {mealDate} তারিখে মিল রেকর্ড রয়েছে (মোট {existingTotal}টি মিল)
                          </b>
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 m-0">
                            নিচে সংখ্যা পরিবর্তন করে 'Save Realtime Meals' দিন অথবা পুরো দিনটি মুছে ফেলুন।
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn d s text-xs !py-1 !px-2.5 whitespace-nowrap cursor-pointer"
                          onClick={() => {
                            setModalConfig({
                              isOpen: true,
                              title: 'মিলের তারিখ মুছে ফেলা',
                              message: `আপনি কি নিশ্চিতভাবে ${mealDate} তারিখের সকল মেম্বারের মিল রেকর্ড মুছে ফেলতে চান? এটি মোছার সাথে সাথে মোট মিল ও সদস্যদের ব্যালেন্স স্বয়ংক্রিয়ভাবে রিক্যালকুলেট হবে।`,
                              confirmText: 'সম্পূর্ণ মুছুন',
                              onConfirm: () => handleDeleteDateMeals(mealDate),
                            });
                          }}
                        >
                          🗑️ এই দিনের সব মিল মুছুন
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {isMonthLocked && (
                  <p className="bad text-sm font-semibold mt-2">
                    এই মাস বন্ধ, মিল বদলানো যাবে না।
                  </p>
                )}

                <p className="text-[var(--mut)] text-sm my-3">
                  মেম্বারদের ব্রেকফাস্ট, লাঞ্চ ও ডিনার মিল সংখ্যা সেট করুন:
                </p>

                <div className="space-y-3">
                  {messState.members
                    .filter(m => mealWho === 'all' || m.id === mealWho)
                    .map(m => {
                      const slot = mealDraft[m.id] || { b: 0, l: 0, d: 0 };
                      const totalSlot = mt(slot);
                      const hasExistingInDb = messState.meals?.[mealDate]?.[m.id] && mt(messState.meals[mealDate][m.id]) > 0;
                      return (
                        <div key={m.id} className="card mc">
                          <h3>
                            <span className="flex items-center gap-2">
                              <span className="av">{(m.name[0] || '?').toUpperCase()}</span>
                              <span>{m.name}</span>
                              {slot.rq ? <span className="rq">Request</span> : null}
                            </span>
                            <div className="flex items-center gap-2">
                              <span>Total: {totalSlot}</span>
                              {totalSlot > 0 && (
                                <button
                                  type="button"
                                  className="text-[11px] text-red-600 dark:text-red-400 hover:underline cursor-pointer bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded border border-red-200 dark:border-red-900"
                                  onClick={() => {
                                    setMealDraft(prev => ({
                                      ...prev,
                                      [m.id]: { b: 0, l: 0, d: 0 },
                                    }));
                                  }}
                                  title="এই মেম্বারের মিল শূন্য করুন"
                                >
                                  রিসেট (0)
                                </button>
                              )}
                              {hasExistingInDb && (
                                <button
                                  type="button"
                                  className="text-[11px] text-red-700 dark:text-red-300 hover:underline cursor-pointer bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded"
                                  onClick={() => {
                                    setModalConfig({
                                      isOpen: true,
                                      title: 'মেম্বারের মিল মুছুন',
                                      message: `${m.name}-এর ${mealDate} তারিখের মিল ডাটাবেজ থেকে মুছে ফেলতে চান?`,
                                      confirmText: 'মুছুন',
                                      onConfirm: () => handleRemoveMemberMeal(m.id, mealDate),
                                    });
                                  }}
                                  title="ডাটাবেজ থেকে সরাসরি এন্ট্রি মুছুন"
                                >
                                  🗑️ রিমুভ
                                </button>
                              )}
                            </div>
                          </h3>

                          <div className="mr">
                            {/* Breakfast Stepper */}
                            <div>
                              <small>Breakfast</small>
                              <div className="st">
                                <button
                                  className="sb"
                                  onClick={() => {
                                    setMealDraft(prev => ({
                                      ...prev,
                                      [m.id]: {
                                        ...slot,
                                        b: Math.max(0, fm((slot.b || 0) - 0.5)),
                                      },
                                    }));
                                  }}
                                >
                                  −
                                </button>
                                <span>{slot.b || 0}</span>
                                <button
                                  className="sb"
                                  onClick={() => {
                                    setMealDraft(prev => ({
                                      ...prev,
                                      [m.id]: {
                                        ...slot,
                                        b: Math.min(5, fm((slot.b || 0) + 0.5)),
                                      },
                                    }));
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Lunch Stepper */}
                            <div>
                              <small>Lunch</small>
                              <div className="st">
                                <button
                                  className="sb"
                                  onClick={() => {
                                    setMealDraft(prev => ({
                                      ...prev,
                                      [m.id]: {
                                        ...slot,
                                        l: Math.max(0, fm((slot.l || 0) - 0.5)),
                                      },
                                    }));
                                  }}
                                >
                                  −
                                </button>
                                <span>{slot.l || 0}</span>
                                <button
                                  className="sb"
                                  onClick={() => {
                                    setMealDraft(prev => ({
                                      ...prev,
                                      [m.id]: {
                                        ...slot,
                                        l: Math.min(5, fm((slot.l || 0) + 0.5)),
                                      },
                                    }));
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Dinner Stepper */}
                            <div>
                              <small>Dinner</small>
                              <div className="st">
                                <button
                                  className="sb"
                                  onClick={() => {
                                    setMealDraft(prev => ({
                                      ...prev,
                                      [m.id]: {
                                        ...slot,
                                        d: Math.max(0, fm((slot.d || 0) - 0.5)),
                                      },
                                    }));
                                  }}
                                >
                                  −
                                </button>
                                <span>{slot.d || 0}</span>
                                <button
                                  className="sb"
                                  onClick={() => {
                                    setMealDraft(prev => ({
                                      ...prev,
                                      [m.id]: {
                                        ...slot,
                                        d: Math.min(5, fm((slot.d || 0) + 0.5)),
                                      },
                                    }));
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button
                    className="btn big flex-1"
                    onClick={handleSaveMealDraft}
                  >
                    Save Realtime Meals
                  </button>
                  <button
                    className="btn big !bg-emerald-600 !text-white hover:!bg-emerald-700 flex items-center justify-center gap-1.5 cursor-pointer text-sm font-semibold"
                    disabled={targetedPushLoading}
                    onClick={handleSendTargetedPush}
                    title="আজকের মিল স্ট্যাটাস অনুযায়ী সদস্যদের পুশ নোটিফিকেশন পাঠান"
                  >
                    {targetedPushLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>পাঠানো হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="bell" size={16} />
                        <span>পুশ নোটিফিকেশন পাঠান</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* TAB: MEAL REQUEST */}
            {mealSubTab === 'req' && (
              <div className="card">
                <h3>
                  <span>{isManager ? 'সকল মিল রিকোয়েস্ট' : 'আমার রিকোয়েস্ট'}</span>
                  {!isManager && (
                    <button
                      className="btn s"
                      onClick={() => {
                        const tm = ds(new Date(Date.now() + 864e5));
                        const opts: [string | number, string][] = [
                          [0, '0'],
                          [0.5, '0.5'],
                          [1, '1'],
                          [1.5, '1.5'],
                          [2, '2'],
                        ];
                        setModalConfig({
                          isOpen: true,
                          title: 'নতুন মিল রিকোয়েস্ট',
                          fields: [
                            { k: 'date', l: 'তারিখ', t: 'date', v: tm },
                            { k: 'b', l: 'Breakfast', t: 'sel', v: 0, o: opts },
                            { k: 'l', l: 'Lunch', t: 'sel', v: 1, o: opts },
                            { k: 'd', l: 'Dinner', t: 'sel', v: 1, o: opts },
                          ],
                          onConfirm: (vals) => {
                            handleSubmitMealRequest(
                              +vals.b || 0,
                              +vals.l || 0,
                              +vals.d || 0,
                              vals.date
                            );
                          },
                        });
                      }}
                    >
                      + নতুন রিকোয়েস্ট
                    </button>
                  )}
                </h3>

                {!isManager && (
                  <p className="text-xs text-[var(--mut)] mb-3">
                    কাটঅফ সময়: রাত {messState.cutoff}:00 এর পর পরের দিনের মিল রিকোয়েস্ট দেওয়া যাবে না।
                  </p>
                )}

                <div className="space-y-2 mt-3">
                  {(isManager
                    ? messState.reqs
                    : messState.reqs.filter(r => r.m === currentMember?.id)
                  )
                    .slice()
                    .reverse()
                    .map(r => {
                      const reqMember = messState.members.find(m => m.id === r.m);
                      return (
                        <div key={r.id} className="row">
                          <span className="av">{(reqMember?.name[0] || '?').toUpperCase()}</span>
                          <div className="g1">
                            <b>{reqMember?.name || 'সদস্য'}</b>
                            <br />
                            <small>
                              {r.date} · B: {r.b} · L: {r.l} · D: {r.d} (মোট: {r.b + r.l + r.d})
                            </small>
                          </div>
                          {isManager && r.status === 'pending' ? (
                            <div className="flex gap-1.5">
                              <button
                                className="btn s"
                                onClick={() => handleApproveReq(r.id)}
                              >
                                Approve
                              </button>
                              <button
                                className="btn g s text-[var(--bad)]"
                                onClick={() => handleRejectReq(r.id)}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`tag capitalize ${
                                r.status === 'approved'
                                  ? 'text-emerald-600 border-emerald-300'
                                  : r.status === 'rejected'
                                  ? 'text-rose-600 border-rose-300'
                                  : 'text-amber-600 border-amber-300'
                              }`}
                            >
                              {r.status}
                            </span>
                          )}
                        </div>
                      );
                    })}

                  {messState.reqs.length === 0 && (
                    <small>কোনো মিল রিকোয়েস্ট নেই</small>
                  )}
                </div>
              </div>
            )}

            {/* TAB: MEAL CHART TABLE */}
            {mealSubTab === 'chart' && (
              <div className="card">
                <h3>
                  <span>মিল চার্ট ({banglaMonths[+activeMonthNum - 1]} {activeYear})</span>
                  {isMonthLocked && <span className="tag">বন্ধ</span>}
                </h3>
                {isManager && (
                  <small className="block mb-3 text-[var(--mut)]">
                    যেকোনো ঘরের সংখ্যার ওপর চাপ দিলে ওই দিনের মিল এডিট করা যাবে।
                  </small>
                )}

                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>সদস্য</th>
                        {daysInMonth.map((d, i) => (
                          <th key={d}>{i + 1}</th>
                        ))}
                        <th>মোট</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messState.members.map(m => {
                        const totalMemberMeals = monthSummary?.mm[m.id]?.meals || 0;
                        return (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            {daysInMonth.map(d => {
                              const dayMeals = messState.meals[d] || {};
                              const count = mt(dayMeals[m.id]);
                              const isToday = d === TD;
                              return (
                                <td
                                  key={d}
                                  className={`c ${count > 0 ? 'h' : ''} ${isToday ? 't' : ''}`}
                                  onClick={() => {
                                    if (!isManager) return;
                                    setMealDate(d);
                                    setMealWho(m.id);
                                    setMealSubTab('add');
                                  }}
                                  title={`${m.name} (${d})`}
                                >
                                  {count > 0 ? count : '·'}
                                </td>
                              );
                            })}
                            <td>
                              <b>{fm(totalMemberMeals)}</b>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: MEAL HISTORY & DELETE (Manager) */}
            {mealSubTab === 'history' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="!mb-0.5">মাসের মিল হিস্ট্রি ও রেকর্ড মুছুন</h3>
                    <p className="text-xs text-[var(--mut)] m-0">
                      যেকোনো অতীত দিনের মিল এডিট করুন বা সম্পূর্ণ রেকর্ড মুছে ফেলুন
                    </p>
                  </div>
                  <span className="tag font-bold">
                    {Object.keys(messState.meals || {}).filter(k => k.startsWith(activeYM)).length} দিন রেকর্ড রয়েছে
                  </span>
                </div>

                {(() => {
                  const recordedDates = Object.keys(messState.meals || {})
                    .filter(k => k.startsWith(activeYM))
                    .sort()
                    .reverse();

                  if (recordedDates.length === 0) {
                    return (
                      <div className="p-8 text-center text-sm text-[var(--mut)] bg-[var(--bg)] border border-[var(--line)] rounded-xl">
                        এই মাসে এখনো কোনো মিল এন্ট্রি নেই
                      </div>
                    );
                  }

                  return recordedDates.map(dateKey => {
                    const daySlots = messState.meals[dateKey] || {};
                    const totalDay = Object.values(daySlots).reduce((acc, s) => acc + mt(s), 0);
                    const memberNames = Object.entries(daySlots)
                      .filter(([_, s]) => mt(s) > 0)
                      .map(([memId, s]) => {
                        const member =
                          messState.members.find(m => m.id === memId) ||
                          (messState.archivedMembers || []).find(m => m.id === memId);
                        return `${member?.name || 'মেম্বার'}: ${mt(s)}`;
                      });

                    return (
                      <div
                        key={dateKey}
                        className="card !p-4 hover:border-[var(--pri)] flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <b className="text-base text-[var(--ink)]">📅 {dateKey}</b>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                              মোট {totalDay} টি মিল
                            </span>
                          </div>
                          <p className="text-xs text-[var(--mut)] m-0 line-clamp-1">
                            {memberNames.length > 0 ? memberNames.join(', ') : 'কোনো সদস্য মিল খায়নি'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="btn s font-bold flex items-center gap-1 cursor-pointer"
                            onClick={() => {
                              setMealDate(dateKey);
                              setMealSubTab('add');
                              showToast(`${dateKey} তারিখটি এডিটের জন্য লোড হয়েছে`);
                            }}
                          >
                            <span>✏️</span>
                            <span>এডিট করুন</span>
                          </button>
                          <button
                            type="button"
                            className="btn d s font-bold flex items-center gap-1 cursor-pointer"
                            onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'মিল সম্পূর্ণ মুছে ফেলবেন?',
                                message: `আপনি কি নিশ্চিতভাবে ${dateKey} তারিখের সকল মেম্বারের মিল মুছে ফেলতে চান? এটি মুছে ফেলার সাথে সাথে মেসের মোট মিল এবং সকল মেম্বারের ব্যালেন্স তৎক্ষণাৎ রিক্যালকুলেট হবে।`,
                                confirmText: 'সম্পূর্ণ মুছুন',
                                onConfirm: () => handleDeleteDateMeals(dateKey),
                              });
                            }}
                          >
                            <span>🗑️</span>
                            <span>মুছুন</span>
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* --- VIEW: DEPOSIT --- */}
        {tab === 'deposit' && (
          <div className="pg space-y-4">
            <div className="info">
              <i>i</i>
              <span>কোনো সদস্য মেসে টাকা জমা দিলে এখান থেকে রিয়েলটাইমে এন্ট্রি করুন।</span>
            </div>

            <label>Deposit Date</label>
            <input
              type="date"
              value={depDate}
              onChange={e => setDepDate(e.target.value)}
            />

            <label>Amount (টাকা)</label>
            <input
              type="number"
              placeholder="যেমন: 3000"
              value={depAmt}
              onChange={e => setDepAmt(e.target.value)}
            />

            <label>Select who has deposited</label>
            <select
              value={depMember}
              onChange={e => setDepMember(e.target.value)}
            >
              <option value="">সদস্য নির্বাচন করুন</option>
              {messState.members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <label>Deposit Note (optional)</label>
            <textarea
              rows={2}
              placeholder="যেমন: মিলের অগ্রিম, বাড়িভাড়া..."
              value={depNote}
              onChange={e => setDepNote(e.target.value)}
            />

            <button
              className="btn big mt-4"
              onClick={handleSaveDeposit}
            >
              Add Deposit
            </button>

            {/* Deposit History */}
            <div className="card mt-6">
              <h3>জমার ইতিহাস ({banglaMonths[+activeMonthNum - 1]} {activeYear})</h3>
              <div className="space-y-2 mt-3">
                {messState.deposits
                  .filter(d => d.date.startsWith(activeYM))
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(d => {
                    const depMem = messState.members.find(m => m.id === d.m);
                    return (
                      <div key={d.id} className="row">
                        <span className="av">{(depMem?.name[0] || '?').toUpperCase()}</span>
                        <div className="g1">
                          <b>{depMem?.name || 'সদস্য'}</b>
                          <br />
                          <small>{d.date} {d.note ? `· ${d.note}` : ''}</small>
                        </div>
                        <b className={d.amt < 0 ? 'bad' : 'ok'}>
                          {d.amt < 0 ? '−' : '+'}{tk(Math.abs(d.amt))}
                        </b>
                        {isManager && (
                          <button
                            className="btn g s text-[var(--bad)] ml-2"
                            onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'নিশ্চিত?',
                                message: 'এই জমার এন্ট্রি মুছে ফেলা হবে।',
                                onConfirm: () => {
                                  const filtered = messState.deposits.filter(x => x.id !== d.id);
                                  saveStateToFirestore({ ...messState, deposits: filtered }, 'জমা মোছা হয়েছে');
                                },
                              });
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}

                {messState.deposits.filter(d => d.date.startsWith(activeYM)).length === 0 && (
                  <small>এই মাসে কোনো জমা নেই</small>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: COST --- */}
        {tab === 'cost' && (
          <div className="pg space-y-4">
            <div className="stabs">
              <button
                className={costSubTab === 'meal' ? 'on' : ''}
                onClick={() => setCostSubTab('meal')}
              >
                Meal Cost (বাজার)
              </button>
              <button
                className={costSubTab === 'other' ? 'on' : ''}
                onClick={() => setCostSubTab('other')}
              >
                Other Cost (অন্যান্য)
              </button>
            </div>

            <div className="info">
              <i>i</i>
              <span>
                {costSubTab === 'meal'
                  ? 'দৈনিক বাজারের খরচ যুক্ত করুন, যার সাথে সরাসরি মিল রেট হিসাব করা হবে।'
                  : 'বিদ্যুৎ, গ্যাস, বুয়া বা ব্যক্তিগত খরচ। Shared হলে সবার মধ্যে সমান ভাগ হবে।'}
              </span>
            </div>

            <label>তারিখ</label>
            <input
              type="date"
              value={costDate}
              onChange={e => setCostDate(e.target.value)}
            />

            <label>{costSubTab === 'meal' ? 'বাজারের টাকার পরিমাণ' : 'অন্যান্য খরচের পরিমাণ'}</label>
            <input
              type="number"
              placeholder="যেমন: 1200"
              value={costAmt}
              onChange={e => setCostAmt(e.target.value)}
            />

            <label>{costSubTab === 'meal' ? 'বাজারের ফর্দ (অপশনাল)' : 'খরচের বিবরণ'}</label>
            <textarea
              rows={2}
              placeholder={costSubTab === 'meal' ? 'মাছ, মুরগি, সবজি, তেল...' : 'যেমন: গ্যাস সিলিন্ডার বিল'}
              value={costItems}
              onChange={e => setCostItems(e.target.value)}
            />

            {costSubTab === 'other' && (
              <>
                <label>খরচের ধরন</label>
                <select
                  value={costType}
                  onChange={e => setCostType(e.target.value as 'shared' | 'ind')}
                >
                  <option value="shared">Shared (সবার মাঝে সমান ভাগ)</option>
                  <option value="ind">Individual (নির্দিষ্ট একজনের)</option>
                </select>
              </>
            )}

            <label>
              {costSubTab === 'meal'
                ? 'বাজারকারী সদস্য'
                : costType === 'ind'
                ? 'নির্দিষ্ট সদস্য'
                : 'পরিশোধকারী (ঐচ্ছিক)'}
            </label>
            <select
              value={costMember}
              onChange={e => setCostMember(e.target.value)}
            >
              <option value="">সদস্য নির্বাচন করুন</option>
              {messState.members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {costSubTab === 'meal' && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={costAutoDep}
                  onChange={e => setCostAutoDep(e.target.checked)}
                  className="w-5 h-5 !shadow-none !border-[var(--line)] cursor-pointer"
                />
                <span className="text-sm">সমপরিমাণ টাকা বাজারকারীর নামে স্বয়ংক্রিয় জমা করুন?</span>
              </label>
            )}

            <button
              className="btn big mt-4"
              onClick={handleSaveCost}
            >
              Add Cost
            </button>

            {/* Cost History */}
            <div className="card mt-6">
              <h3>খরচের তালিকা ({banglaMonths[+activeMonthNum - 1]} {activeYear})</h3>
              <div className="space-y-2 mt-3">
                {/* Bazar Items */}
                {messState.bazar
                  .filter(b => b.date.startsWith(activeYM))
                  .map(b => {
                    const shopper = messState.members.find(m => m.id === b.by);
                    return (
                      <div key={b.id} className="row">
                        <div className="g1">
                          <b>{b.items || 'বাজার'}</b>
                          <br />
                          <small>{b.date} · Meal · {shopper?.name || 'সদস্য'}</small>
                        </div>
                        <b>{tk(b.amt)}</b>
                        {isManager && (
                          <button
                            className="btn g s text-[var(--bad)] ml-2"
                            onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'নিশ্চিত?',
                                message: 'এই বাজার খরচ মুছে ফেলা হবে।',
                                onConfirm: () => {
                                  const filtered = messState.bazar.filter(x => x.id !== b.id);
                                  saveStateToFirestore({ ...messState, bazar: filtered }, 'বাজার মোছা হয়েছে');
                                },
                              });
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}

                {/* Other Costs */}
                {messState.other
                  .filter(o => o.date.startsWith(activeYM))
                  .map(o => {
                    const costMem = messState.members.find(m => m.id === o.m);
                    return (
                      <div key={o.id} className="row">
                        <div className="g1">
                          <b>{o.note}</b>
                          <br />
                          <small>
                            {o.date} · {o.type === 'ind' ? `Individual (${costMem?.name})` : 'Shared (সবার)'}
                          </small>
                        </div>
                        <b>{tk(o.amt)}</b>
                        {isManager && (
                          <button
                            className="btn g s text-[var(--bad)] ml-2"
                            onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'নিশ্চিত?',
                                message: 'এই খরচ মুছে ফেলা হবে।',
                                onConfirm: () => {
                                  const filtered = messState.other.filter(x => x.id !== o.id);
                                  saveStateToFirestore({ ...messState, other: filtered }, 'খরচ মোছা হয়েছে');
                                },
                              });
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}

                {messState.bazar.filter(b => b.date.startsWith(activeYM)).length === 0 &&
                  messState.other.filter(o => o.date.startsWith(activeYM)).length === 0 && (
                    <small>এই মাসে কোনো খরচ যুক্ত হয়নি</small>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: MEMBERS --- */}
        {tab === 'members' && (
          <div className="pg space-y-4">
            <div className="card">
              <h3>
                <span>Mess Members ({messState.members.length})</span>
                {isManager && (
                  <button
                    className="btn s"
                    onClick={() => setIsAddMemberOpen(true)}
                  >
                    + সদস্য যোগ
                  </button>
                )}
              </h3>
              <input
                placeholder="নাম / ইমেইল / রুম খুঁজুন..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="space-y-3">
              {messState.members
                .filter(m =>
                  `${m.name} ${m.email || ''} ${m.room || ''}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
                )
                .map(m => {
                  const mSummary = monthSummary?.mm[m.id] || {
                    meals: 0,
                    dep: 0,
                    cost: 0,
                    ind: 0,
                    sh: 0,
                    tot: 0,
                    bal: 0,
                  };
                  return (
                    <div
                      key={m.id}
                      className="card mb cursor-pointer hover:border-[var(--pri)]"
                      onClick={() => {
                        setDetailMemberId(m.id);
                        setTab('detail');
                      }}
                    >
                      <div className="row !p-0">
                        <span className="av overflow-hidden">
                          {m.photoURL ? (
                            <img src={m.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (m.name[0] || '?').toUpperCase()
                          )}
                        </span>
                        <div className="g1">
                          <b>{m.name}</b>
                          {m.id === messState.mgr && (
                            <span className="tag ml-2">Manager</span>
                          )}
                          <br />
                          <small>{m.room || 'Room -'} · {m.email || 'Email নেই'}</small>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <b className={mSummary.bal >= 0 ? 'ok' : 'bad'}>
                              {tk(mSummary.bal)}
                            </b>
                            <br />
                            <small className="text-[var(--mut)]">বিস্তারিত ›</small>
                          </div>
                          {isManager && m.id !== messState.mgr && (
                            <button
                              type="button"
                              className="btn d s !py-1 !px-2.5 text-xs font-bold cursor-pointer ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalConfig({
                                  isOpen: true,
                                  title: 'সদস্য মুছে ফেলবেন?',
                                  message: `আপনি কি "${m.name}"-কে মেস থেকে রিমুভ ও আর্কাইভ করতে চান? ওনার পূর্বের মিল ও জমার রেকর্ড মেসের ইতিহাসে সংরক্ষিত থাকবে, কিন্তু উনি আর অ্যাক্টিভ লিস্টে থাকবেন না এবং লগইন করতে পারবেন না।`,
                                  confirmText: 'মুছে ফেলুন',
                                  onConfirm: () => handleArchiveMember(m),
                                });
                              }}
                              title="সদস্য মুছুন / আর্কাইভ করুন"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Archived Members List */}
            {messState.archivedMembers && messState.archivedMembers.length > 0 && (
              <div className="card !bg-neutral-50 dark:!bg-neutral-900/40 border border-dashed border-[var(--line)]">
                <h4 className="text-xs font-bold text-[var(--mut)] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>📦 আর্কাইভকৃত প্রাক্তন সদস্য ({messState.archivedMembers.length})</span>
                  <span className="text-[10px] font-normal lowercase">রেকর্ড সংরক্ষিত</span>
                </h4>
                <div className="divide-y divide-[var(--line)]">
                  {messState.archivedMembers.map(am => {
                    const amSummary = monthSummary?.mm[am.id] || { bal: 0, meals: 0, dep: 0 };
                    return (
                      <div key={am.id} className="py-2 flex items-center justify-between text-xs opacity-75">
                        <div className="flex items-center gap-2">
                          <span className="av !w-7 !h-7 !text-xs bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                            {(am.name[0] || '?').toUpperCase()}
                          </span>
                          <div>
                            <span className="font-semibold text-[var(--ink)]">{am.name}</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded ml-1.5 font-bold">
                              আর্কাইভড
                            </span>
                            <p className="text-[10px] text-[var(--mut)] m-0">{am.email || 'Email নেই'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={amSummary.bal >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                            {tk(amSummary.bal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW: MEMBER DETAIL --- */}
        {tab === 'detail' && detailMemberId && (
          <div className="pg space-y-4">
            {(() => {
              const mem = messState.members.find(m => m.id === detailMemberId) ||
                (messState.archivedMembers || []).find(m => m.id === detailMemberId);
              if (!mem) return <p>সদস্য পাওয়া যায়নি</p>;

              const mSummary = monthSummary?.mm[mem.id] || {
                meals: 0,
                dep: 0,
                cost: 0,
                ind: 0,
                sh: 0,
                tot: 0,
                bal: 0,
              };

              const memberMealsDays = Object.keys(messState.meals)
                .filter(d => d.startsWith(activeYM) && mt(messState.meals[d][mem.id]) > 0)
                .sort();

              const memberDeposits = messState.deposits.filter(
                d => d.m === mem.id && d.date.startsWith(activeYM)
              );

              const memberIndCosts = messState.other.filter(
                o => o.type === 'ind' && o.m === mem.id && o.date.startsWith(activeYM)
              );

              return (
                <>
                  <div className="card">
                    <div className="row !p-0">
                      <span className="av !w-12 !h-12 !text-xl overflow-hidden">
                        {mem.photoURL ? (
                          <img src={mem.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (mem.name[0] || '?').toUpperCase()
                        )}
                      </span>
                      <div className="g1">
                        <b className="text-xl">{mem.name}</b>
                        {mem.id === messState.mgr && (
                          <span className="tag ml-2">Manager</span>
                        )}
                        {mem.isArchived && (
                          <span className="tag ml-2 !bg-amber-100 dark:!bg-amber-950 text-amber-800 dark:text-amber-200">
                            আর্কাইভড
                          </span>
                        )}
                        <br />
                        <small>
                          {mem.email || 'Email নেই'} · {mem.room || 'রুম নেই'} · জয়েনিং: {mem.join || '-'}
                        </small>
                      </div>
                    </div>

                    {/* MANAGER PRIVATE CREDENTIALS DISPLAY */}
                    {isManager && mem.tempPassword && (
                      <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1">
                            <span>🔑</span>
                            <span>লগইন ক্রেডেনশিয়াল (ম্যানেজার ভিউ)</span>
                          </span>
                          <p className="text-xs text-emerald-950 dark:text-emerald-100 m-0">
                            লগইন পাসওয়ার্ড: <code className="font-mono font-bold bg-white dark:bg-black/30 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-300">{mem.tempPassword}</code>
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn s font-bold text-xs py-1 px-3 cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(`মেস লগইন:\nআইডি: ${mem.email || mem.name}\nপাসওয়ার্ড: ${mem.tempPassword}\nলিঙ্ক: https://khaonkhata.online/login`);
                            showToast('ক্রেডেনশিয়াল কপি হয়েছে!');
                          }}
                        >
                          📋 কপি করুন
                        </button>
                      </div>
                    )}

                    <div className="acts !justify-between items-center mt-4 pt-3 border-t border-[var(--line)] flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn !bg-emerald-600 !text-white hover:!bg-emerald-700 s flex items-center gap-1.5 cursor-pointer font-semibold shadow-xs"
                        disabled={isExportingPDF}
                        onClick={() => handleDownloadIndividualPDF(mem)}
                        title="Download Individual Monthly Expense & Meal Summary PDF"
                      >
                        <span>📄</span>
                        <span>{isExportingPDF ? 'PDF তৈরি হচ্ছে...' : 'মাসিক হিসাব PDF ডাউনলোড'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {isManager && !mem.isArchived && mem.id !== messState.mgr && (
                          <button
                            type="button"
                            className="btn d s font-bold flex items-center gap-1 cursor-pointer"
                            onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'সদস্য মুছে ফেলবেন?',
                                message: `আপনি কি "${mem.name}"-কে মেস থেকে রিমুভ ও আর্কাইভ করতে চান? ওনার পূর্বের মিল ও জমার রেকর্ড সংরক্ষিত থাকবে, কিন্তু উনি আর অ্যাক্টিভ লিস্টে থাকবেন না এবং লগইন করতে পারবেন না।`,
                                confirmText: 'মুছে ফেলুন',
                                onConfirm: () => handleArchiveMember(mem),
                              });
                            }}
                          >
                            <span>🗑️</span>
                            <span>সদস্য মুছুন</span>
                          </button>
                        )}

                        {isManager && (
                          <button
                            className="btn g s"
                            onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'সদস্য এডিট',
                                fields: [
                                  { k: 'n', l: 'নাম', v: mem.name },
                                  { k: 'e', l: 'ইমেইল (Google Email)', v: mem.email || '' },
                                  { k: 'r', l: 'রুম', v: mem.room || '' },
                                  { k: 'j', l: 'জয়েনিং তারিখ', t: 'date', v: mem.join || TD },
                                ],
                                onConfirm: (vals) => {
                                  if (!vals.n?.trim()) return false;
                                  const updatedMembers = messState.members.map(m =>
                                    m.id === mem.id
                                      ? {
                                          ...m,
                                          name: vals.n.trim(),
                                          email: vals.e?.trim().toLowerCase() || m.email,
                                          room: vals.r?.trim(),
                                          join: vals.j,
                                        }
                                      : m
                                  );
                                  const updatedEmails = Array.from(
                                    new Set([
                                      ...(messState.memberEmails || []),
                                      vals.e?.trim().toLowerCase(),
                                      ...updatedMembers.map(m => m.email?.toLowerCase()).filter(Boolean),
                                    ].filter(Boolean) as string[])
                                  );
                                  saveStateToFirestore(
                                    { ...messState, members: updatedMembers, memberEmails: updatedEmails },
                                    'সদস্য তথ্য আপডেট হয়েছে'
                                  );
                                },
                                onDelete: () => {
                                  setModalConfig({
                                    isOpen: true,
                                    title: 'নিশ্চিত?',
                                    message: `${mem.name}-কে মেস থেকে মুছে ফেলবেন?`,
                                    confirmText: 'মুছে ফেলুন',
                                    onConfirm: () => handleArchiveMember(mem),
                                  });
                                },
                              });
                            }}
                          >
                            এডিট করুন
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Month Calculation Breakdown */}
                  <div className="card">
                    <h3>
                      <span>এই মাসের হিসাব ({banglaMonths[+activeMonthNum - 1]} {activeYear})</span>
                      <span className={mSummary.bal >= 0 ? 'ok font-bold' : 'bad font-bold'}>
                        {mSummary.bal >= 0 ? 'ফেরত ' : 'বাকি '}
                        {tk(Math.abs(mSummary.bal))}
                      </span>
                    </h3>

                    <div className="br"><span>Total Meal</span><b>{fm(mSummary.meals)}</b></div>
                    <div className="br"><span>Total Deposit</span><b>{tk(mSummary.dep)}</b></div>
                    <div className="br"><span>Meal Cost</span><b>{tk(mSummary.cost)}</b></div>
                    <div className="br"><span>Individual Other Cost</span><b>{tk(mSummary.ind)}</b></div>
                    <div className="br"><span>Shared Other Cost</span><b>{tk(mSummary.sh)}</b></div>
                    <div className="br border-t border-[var(--line)] pt-2 mt-1">
                      <span>Total Cost (Meal+Other)</span>
                      <b className="bad">{tk(mSummary.tot)}</b>
                    </div>
                  </div>

                  {/* Meals List */}
                  <div className="card">
                    <h3>মিলের তালিকা</h3>
                    <div className="space-y-1.5 mt-2">
                      {memberMealsDays.map(dateKey => {
                        const s = messState.meals[dateKey][mem.id];
                        return (
                          <div key={dateKey} className="row">
                            <div className="g1">
                              <b>{dateKey}</b>
                              <br />
                              <small>B: {s.b || 0} · L: {s.l || 0} · D: {s.d || 0}</small>
                            </div>
                            <b>{mt(s)}</b>
                          </div>
                        );
                      })}
                      {memberMealsDays.length === 0 && <small>কোনো মিল খাওয়া হয়নি</small>}
                    </div>
                  </div>

                  {/* Deposits List */}
                  <div className="card">
                    <h3>জমার তালিকা</h3>
                    <div className="space-y-1.5 mt-2">
                      {memberDeposits.map(d => (
                        <div key={d.id} className="row">
                          <div className="g1">
                            <b>{d.date}</b>
                            <br />
                            <small>{d.note || 'জমা'}</small>
                          </div>
                          <b className="ok">{tk(d.amt)}</b>
                        </div>
                      ))}
                      {memberDeposits.length === 0 && <small>কোনো জমা নেই</small>}
                    </div>
                  </div>

                  {/* Individual Costs List */}
                  {memberIndCosts.length > 0 && (
                    <div className="card">
                      <h3>ব্যক্তিগত খরচ</h3>
                      <div className="space-y-1.5 mt-2">
                        {memberIndCosts.map(c => (
                          <div key={c.id} className="row">
                            <div className="g1">
                              <b>{c.note}</b>
                              <br />
                              <small>{c.date}</small>
                            </div>
                            <b>{tk(c.amt)}</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    className="btn g"
                    onClick={() => setTab('members')}
                  >
                    ‹ সব সদস্য
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {/* --- VIEW: ACTIVE MONTH SUMMARY & PRINT --- */}
        {tab === 'active' && monthSummary && (
          <div className="pg space-y-4">
            <div className="card">
              <h3>
                <span>
                  {banglaMonths[+activeMonthNum - 1]} {activeYear}
                </span>
                <span className="tag">{isMonthLocked ? 'Closed' : 'Running'}</span>
              </h3>
              <div className="br"><span>মোট জমা</span><b>{tk(monthSummary.dep)}</b></div>
              <div className="br"><span>বাজার খরচ</span><b>{tk(monthSummary.baz)}</b></div>
              <div className="br"><span>অন্যান্য খরচ</span><b>{tk(monthSummary.oth)}</b></div>
              <div className="br"><span>মোট মিল</span><b>{fm(monthSummary.meals)}</b></div>
              <div className="br"><span>মিল রেট</span><b>{fm(monthSummary.rate)}৳</b></div>
            </div>

            <div className="card scroll">
              <table>
                <thead>
                  <tr>
                    <th>সদস্য</th>
                    <th>মিল</th>
                    <th>জমা</th>
                    <th>খরচ</th>
                    <th>ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody>
                  {messState.members.map(m => {
                    const o = monthSummary.mm[m.id];
                    return (
                      <tr
                        key={m.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setDetailMemberId(m.id);
                          setTab('detail');
                        }}
                      >
                        <td>{m.name}</td>
                        <td>{fm(o.meals)}</td>
                        <td>{tk(o.dep)}</td>
                        <td>{tk(o.tot)}</td>
                        <td className={o.bal >= 0 ? 'ok font-bold' : 'bad font-bold'}>
                          {tk(o.bal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Export and Print Options */}
            <div className="card space-y-3">
              <div>
                <h3 className="!mb-1">অফিসিয়াল PDF রিপোর্ট ও প্রিন্ট</h3>
                <p className="text-xs text-[var(--mut)]">
                  সম্পূর্ণ মেসের ওভারভিউ টেবিল অথবা আপনার ব্যক্তিগত খরচের হিসাব সরাসরি ডিভাইসে PDF ডাউনলোড করুন
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  className="btn big !bg-emerald-600 !text-white hover:!bg-emerald-700 flex items-center justify-center gap-2 font-bold cursor-pointer shadow-xs"
                  disabled={isExportingPDF}
                  onClick={handleDownloadGroupPDF}
                  title="Download Group Mess Summary Report PDF"
                >
                  <span>📋</span>
                  <span>{isExportingPDF ? 'PDF তৈরি হচ্ছে...' : 'Group Mess Summary Report (PDF)'}</span>
                </button>
                <button
                  type="button"
                  className="btn big g flex items-center justify-center gap-2 font-bold cursor-pointer"
                  disabled={isExportingPDF}
                  onClick={() => handleDownloadIndividualPDF()}
                  title="Download Individual Monthly Expense & Meal Summary PDF"
                >
                  <span>👤</span>
                  <span>{isExportingPDF ? 'PDF তৈরি হচ্ছে...' : 'My Individual Summary (PDF)'}</span>
                </button>
              </div>
              <button
                type="button"
                className="btn g s w-full flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                onClick={() => window.print()}
              >
                <span>🖨️</span>
                <span>ব্রাউজার প্রিন্ট ভিউ (Print View)</span>
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW: ALL MONTHS HISTORY --- */}
        {tab === 'all' && (
          <div className="pg space-y-3">
            {(() => {
              const allMonthsSet = new Set<string>();
              Object.keys(messState.meals || {}).forEach(k => allMonthsSet.add(k.slice(0, 7)));
              messState.deposits.forEach(d => allMonthsSet.add(d.date.slice(0, 7)));
              messState.bazar.forEach(b => allMonthsSet.add(b.date.slice(0, 7)));
              messState.other.forEach(o => allMonthsSet.add(o.date.slice(0, 7)));
              allMonthsSet.add(activeYM);

              const monthsList = Array.from(allMonthsSet).sort().reverse();

              return monthsList.map(ymStr => {
                const s = calcMonth(messState, ymStr);
                const [y, m] = ymStr.split('-');
                return (
                  <div
                    key={ymStr}
                    className="card cursor-pointer hover:border-[var(--pri)]"
                    onClick={() => {
                      setActiveYM(ymStr);
                      setTab('active');
                    }}
                  >
                    <h3>
                      <span>{banglaMonths[+m - 1]} {y}</span>
                      <span className="tag">
                        {messState.closed[ymStr] ? 'Closed' : 'Running'}
                      </span>
                    </h3>
                    <div className="br"><span>জমা</span><b>{tk(s.dep)}</b></div>
                    <div className="br"><span>মোট খরচ</span><b>{tk(s.tot)}</b></div>
                    <div className="br"><span>মিল রেট</span><b>{fm(s.rate)}৳</b></div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* --- VIEW: SETTINGS --- */}
        {tab === 'settings' && (
          <div className="pg space-y-4">
            <div className="card">
              <h3>Mess Settings</h3>
              {isManager ? (
                <div className="space-y-3 mt-3">
                  <div className="flex justify-between items-center py-2 border-b border-[var(--line)]">
                    <div>
                      <b>মেসের নাম: {messState.mess}</b>
                      <p className="text-xs text-[var(--mut)]">মেসের নাম পরিবর্তন করুন</p>
                    </div>
                    <button
                      className="btn g s"
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: 'মেসের নাম পরিবর্তন',
                          fields: [{ k: 'name', l: 'নতুন নাম', v: messState.mess }],
                          onConfirm: (vals) => {
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

                  <div className="flex justify-between items-center py-2 border-b border-[var(--line)]">
                    <div>
                      <b>রিকোয়েস্ট কাটঅফ সময়: {messState.cutoff}:00</b>
                      <p className="text-xs text-[var(--mut)]">পরের দিনের মিল রিকোয়েস্টের শেষ সময়</p>
                    </div>
                    <button
                      className="btn g s"
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: 'কাটঅফ সময় নির্ধারণ (ঘণ্টা)',
                          fields: [{ k: 'cutoff', l: 'আগের রাত কয়টা (0-23)', t: 'number', v: messState.cutoff }],
                          onConfirm: (vals) => {
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

                  <div className="flex justify-between items-center py-2 border-b border-[var(--line)]">
                    <div>
                      <b>মাস আর্কাইভ / বন্ধকরণ</b>
                      <p className="text-xs text-[var(--mut)]">
                        বর্তমান অবস্থা: {isMonthLocked ? 'এই মাস বন্ধ (Locked)' : 'এই মাস চলমান (Running)'}
                      </p>
                    </div>
                    <button
                      className="btn g s"
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
                      {isMonthLocked ? 'মাস খুলুন' : 'মাস বন্ধ করুন'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-[var(--line)]">
                    <div>
                      <b>Change Manager</b>
                      <p className="text-xs text-[var(--mut)]">ম্যানেজার হস্তান্তর করুন</p>
                    </div>
                    <button
                      className="btn g s"
                      onClick={() => {
                        const opts: [string | number, string][] = messState.members.map(m => [
                          m.id,
                          `${m.name} (${m.email || 'Email নেই'})`,
                        ]);
                        setModalConfig({
                          isOpen: true,
                          title: 'নতুন ম্যানেজার নির্বাচন',
                          fields: [{ k: 'mgr', l: 'মেম্বার সিলেক্ট করুন', t: 'sel', v: messState.mgr, o: opts }],
                          onConfirm: (vals) => {
                            const newMgrMem = messState.members.find(m => m.id === vals.mgr);
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

                  <div className="flex justify-between items-center py-2 pt-4">
                    <div>
                      <b className="text-[var(--bad)]">মেস ডিলিট করুন</b>
                      <p className="text-xs text-[var(--mut)]">মেসের সব ডাটা মুছে ফেলা হবে</p>
                    </div>
                    <button
                      className="btn d s"
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: 'স্থায়ীভাবে মুছে ফেলতে চান?',
                          message: 'এই মেস ও এর সকল মিল, জমা ও খরচের ডাটা মুছে যাবে।',
                          onConfirm: async () => {
                            try {
                              const messRef = doc(db, 'messes', messState.id);
                              await setDoc(messRef, { deleted: true, mess: '[Deleted]' }, { merge: true });
                              setCurrentMessId('');
                              localStorage.removeItem('mm_cur_mess_id');
                              setMessState(null);
                              showToast('মেস মুছে ফেলা হয়েছে');
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, 'messes/' + messState.id);
                            }
                          },
                        });
                      }}
                    >
                      মুছুন
                    </button>
                  </div>
                </div>
              ) : (
                <small>শুধু ম্যানেজার মেসের সেটিংস পরিবর্তন করতে পারবেন।</small>
              )}
            </div>

            {/* Theme Toggle */}
            <div className="card flex items-center justify-between">
              <div>
                <b>ডার্ক / লাইট মোড</b>
                <p className="text-xs text-[var(--mut)]">থিম পরিবর্তন করুন</p>
              </div>
              <button
                className="btn g s"
                onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
              >
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW: PROFILE --- */}
        {tab === 'profile' && (
          <div className="pg space-y-4">
            <div className="card text-center py-6">
              <span className="av !w-18 !h-18 !text-3xl mx-auto mb-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (whoName[0] || 'U').toUpperCase()
                )}
              </span>
              <h3 className="justify-center text-xl">{user.displayName || whoName}</h3>
              <p className="text-sm text-[var(--mut)]">{user.email}</p>
              <div className="mt-2">
                <span className="tag">
                  {isManager ? 'ম্যানেজার' : 'মেম্বার'} · {messState.mess}
                </span>
              </div>
            </div>

            {/* Password Management Card */}
            <div className="card space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="!mb-0.5 flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>পাসওয়ার্ড পরিবর্তন (Change Password)</span>
                  </h3>
                  <p className="text-xs text-[var(--mut)] m-0">
                    মেম্বার হিসেবে নিজস্ব পছন্দের নতুন পাসওয়ার্ড সেট করুন
                  </p>
                </div>
                <button
                  type="button"
                  className="btn s font-bold cursor-pointer"
                  onClick={() => {
                    setIsChangePasswordOpen(prev => !prev);
                    setChangePassMsg(null);
                  }}
                >
                  {isChangePasswordOpen ? 'বাতিল' : 'পাসওয়ার্ড পরিবর্তন'}
                </button>
              </div>

              {isChangePasswordOpen && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!changePassNew || changePassNew.length < 6) {
                      setChangePassMsg({ type: 'bad', text: 'নতুন পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।' });
                      return;
                    }
                    if (changePassNew !== changePassConfirm) {
                      setChangePassMsg({ type: 'bad', text: 'নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।' });
                      return;
                    }

                    setChangePassLoading(true);
                    setChangePassMsg(null);
                    const res = await changeUserPassword({
                      uid: user.uid,
                      email: user.email || undefined,
                      oldPassword: changePassOld || undefined,
                      newPassword: changePassNew,
                    });
                    setChangePassLoading(false);

                    if (res.success) {
                      setChangePassMsg({ type: 'ok', text: res.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
                      showToast('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!');
                      setChangePassOld('');
                      setChangePassNew('');
                      setChangePassConfirm('');
                      setTimeout(() => setIsChangePasswordOpen(false), 2000);
                    } else {
                      setChangePassMsg({ type: 'bad', text: res.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' });
                    }
                  }}
                  className="p-3 bg-[var(--bg)] border border-[var(--line)] rounded-xl space-y-3 mt-3 animate-in fade-in duration-150"
                >
                  <div>
                    <label className="block text-xs font-semibold text-[var(--mut)] mb-1">
                      বর্তমান পাসওয়ার্ড (ঐচ্ছিক)
                    </label>
                    <input
                      type="password"
                      placeholder="বর্তমান পাসওয়ার্ড দিন"
                      value={changePassOld}
                      onChange={e => setChangePassOld(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--mut)] mb-1">
                      নতুন পাসওয়ার্ড <span className="text-[var(--bad)]">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                      value={changePassNew}
                      onChange={e => setChangePassNew(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--mut)] mb-1">
                      নতুন পাসওয়ার্ড নিশ্চিত করুন <span className="text-[var(--bad)]">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="নতুন পাসওয়ার্ড পুনরায় লিখুন"
                      value={changePassConfirm}
                      onChange={e => setChangePassConfirm(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-sm outline-none"
                    />
                  </div>

                  {changePassMsg && (
                    <p className={`text-xs font-semibold p-2.5 rounded-lg m-0 ${changePassMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'}`}>
                      {changePassMsg.text}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      className="btn g s text-xs"
                      onClick={() => setIsChangePasswordOpen(false)}
                      disabled={changePassLoading}
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="btn s font-bold text-xs !bg-emerald-600 text-white hover:!bg-emerald-700 cursor-pointer"
                      disabled={changePassLoading}
                    >
                      {changePassLoading ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড সেভ করুন'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Mess List & Switcher */}
            <div className="card">
              <h3>আমার মেসসমূহ</h3>
              <div className="space-y-2 mt-2">
                {userMesses.map(m => (
                  <div key={m.id} className="row">
                    <div className="g1">
                      <b>{m.name}</b>
                      <br />
                      <small>Manager: {m.mgrEmail}</small>
                    </div>
                    {m.id === currentMessId ? (
                      <span className="tag text-emerald-600 font-semibold">Active</span>
                    ) : (
                      <button
                        className="btn g s"
                        onClick={() => {
                          setCurrentMessId(m.id);
                          localStorage.setItem('mm_cur_mess_id', m.id);
                          showToast(`সুইচ করা হয়েছে: ${m.name}`);
                          setTab('home');
                        }}
                      >
                        Open
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="acts !justify-start mt-4">
                <button
                  className="btn g s"
                  onClick={() => {
                    setCurrentMessId('');
                    localStorage.removeItem('mm_cur_mess_id');
                    setGateMode('choose');
                  }}
                >
                  + Create / Join Another Mess
                </button>
              </div>
            </div>

            {/* Monthly Reports & Statements (PDF) */}
            <div className="card space-y-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-base !mb-1">
                  <span>📄 মাসিক হিসাব ও PDF স্টেটমেন্ট</span>
                </h3>
                <p className="text-xs text-[var(--mut)]">
                  বর্তমান মাসের ({banglaMonths[+activeMonthNum - 1]} {activeYear}) ব্যক্তিগত খরচ ও মিলের অফিশিয়াল PDF ডাউনলোড করুন
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  className="btn big !bg-emerald-600 !text-white hover:!bg-emerald-700 flex-1 flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer shadow-xs"
                  disabled={isExportingPDF}
                  onClick={() => handleDownloadIndividualPDF()}
                  title="Download Individual Monthly Expense & Meal Summary PDF"
                >
                  <span>👤</span>
                  <span>{isExportingPDF ? 'PDF তৈরি হচ্ছে...' : 'আমার ব্যক্তিগত PDF রিপোর্ট'}</span>
                </button>

                {isManager && (
                  <button
                    type="button"
                    className="btn big g flex-1 flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
                    disabled={isExportingPDF}
                    onClick={handleDownloadGroupPDF}
                    title="Download Group Mess Summary Report PDF"
                  >
                    <span>📋</span>
                    <span>{isExportingPDF ? 'PDF তৈরি হচ্ছে...' : 'গ্রুপ মেস সামারি PDF'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* FCM Notifications Card */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-1.5 text-base">
                    <span>🔔 পুশ নোটিফিকেশন (FCM)</span>
                  </h3>
                  <p className="text-xs text-[var(--mut)] mt-0.5">
                    {profile?.fcmToken
                      ? 'ডিভাইস টোকেন নিবন্ধিত আছে'
                      : 'মিল ও মেসের রিয়েলটাইম অ্যালার্ট পেতে অনুমোদন করুন'}
                  </p>
                </div>
                <span className={`tag text-xs font-semibold ${profile?.fcmToken ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-amber-600'}`}>
                  {profile?.fcmToken ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  className="btn g s flex-1 text-xs"
                  onClick={async () => {
                    if (!user) return;
                    showToast('নোটিফিকেশন পারমিশন ও টোকেন রিকোয়েস্ট করা হচ্ছে...');
                    const token = await requestFcmPermissionAndGetToken(user.uid);
                    if (token) {
                      setProfile((prev) => (prev ? { ...prev, fcmToken: token } : null));
                      showToast('✅ নোটিফিকেশন টোকেন সফলভাবে সেভ হয়েছে!');
                    } else {
                      showToast('ব্রাউজারের পারমিশন সেটিংস থেকে Notification এলাউ করুন');
                    }
                  }}
                >
                  {profile?.fcmToken ? '🔄 টোকেন রিফ্রেশ করুন' : '🔔 নোটিফিকেশন চালু করুন'}
                </button>

                <button
                  className="btn d s text-xs"
                  onClick={() => {
                    if (!messState) {
                      showToast('একটি মেসে যুক্ত থাকুন');
                      return;
                    }
                    triggerMealPushNotification({
                      messId: messState.id,
                      messName: messState.mess,
                      memberName: whoName,
                      date: TD,
                      action: 'updated',
                      slotDetails: { b: 1, l: 1, d: 1 },
                      totalMeals: 3,
                    });
                    showToast('টেস্ট পুশ নোটিফিকেশন পাঠানো হয়েছে!');
                  }}
                >
                  টেস্ট পুশ পাঠান
                </button>
              </div>

              {/* Targeted Meal Push Notifications (Manager only) */}
              {isManager && (
                <div className="pt-2 border-t border-[var(--line)]">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-sm">
                        <span>📢</span>
                        <span className="text-[var(--fg)]">টার্গেটেড মিল পুশ নোটিফিকেশন</span>
                      </div>
                      <span className="tag text-xs text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/15">
                        ম্যানেজার অপশন
                      </span>
                    </div>

                    <p className="text-xs text-[var(--mut)] leading-relaxed">
                      আজকের মিল এন্ট্রি করার পর এই বাটনে চাপুন। স্বয়ংক্রিয়ভাবে সদস্যদের বর্তমান মিল রেকর্ড অনুযায়ী নির্দিষ্ট নোটিফিকেশন যাবে:
                      <br />• <b>মিল যুক্ত সদস্যদের:</b> &quot;আপনার আজকের মিল যুক্ত করা হয়েছে।&quot;
                      <br />• <b>মিল না থাকা সদস্যদের:</b> &quot;আপনার এখনো মিল দেওয়া হয় নি।&quot;
                    </p>

                    <button
                      className="btn big !bg-emerald-600 !text-white hover:!bg-emerald-700 !w-full !py-2.5 flex items-center justify-center gap-2 text-xs font-semibold shadow-sm cursor-pointer"
                      disabled={targetedPushLoading}
                      onClick={handleSendTargetedPush}
                    >
                      {targetedPushLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>সদস্যদের নির্দিষ্ট নোটিফিকেশন পাঠানো হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Icon name="bell" size={15} />
                          <span>আজকের মিল স্ট্যাটাস পুশ নোটিফিকেশন পাঠান</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Action Buttons */}
            <div className="card space-y-3">
              <a
                href="https://www.facebook.com/share/1VCSom58hc/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#1877F2] text-white flex items-center justify-center gap-2 text-sm font-semibold shadow-sm hover:bg-[#166fe5] transition-all cursor-pointer"
              >
                <FacebookIcon size={18} />
                <span>Direct Support</span>
              </a>
              <div className="flex items-center justify-between pt-1">
                <button
                  className="btn d"
                  onClick={handleSignOut}
                >
                  Log out
                </button>
                <button
                  className="btn g s"
                  onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
                >
                  {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: MANAGER PAYMENT METHODS --- */}
        {tab === 'payment_methods' && isManager && (
          <ManagerPaymentMethods
            messId={messState.id}
            paymentMethods={messState.paymentMethods}
            depositRequests={messState.depositRequests}
            onSaveMethods={handleSavePaymentMethods}
            onApproveDeposit={handleApproveDepositRequest}
            onRejectDeposit={handleRejectDepositRequest}
            showToast={showToast}
          />
        )}

        {/* --- VIEW: MEMBER DEPOSIT --- */}
        {tab === 'member_deposit' && (
          <MemberDeposit
            paymentMethods={messState.paymentMethods}
            myDepositRequests={(messState.depositRequests || []).filter(r =>
              currentMember
                ? r.memberId === currentMember.id || (user && r.memberId === user.uid)
                : true
            )}
            onSubmitDeposit={handleSubmitMemberDeposit}
            showToast={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button
          className={tab === 'home' ? 'on' : ''}
          onClick={() => { setTab('home'); setDrawerOpen(false); }}
        >
          <Icon name="home" size={20} />
          <span>Home</span>
        </button>

        {isManager && (
          <button
            className={tab === 'deposit' ? 'on' : ''}
            onClick={() => { setTab('deposit'); setDrawerOpen(false); }}
          >
            <Icon name="wallet" size={20} />
            <span>Deposit</span>
          </button>
        )}

        <button
          className={tab === 'meal' ? 'on' : ''}
          onClick={() => { setTab('meal'); setDrawerOpen(false); }}
        >
          <Icon name="bowl" size={20} />
          <span>Meal</span>
          {pendingReqCount > 0 && isManager && (
            <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[var(--bad)]"></span>
          )}
        </button>

        {isManager && (
          <button
            className={tab === 'cost' ? 'on' : ''}
            onClick={() => { setTab('cost'); setDrawerOpen(false); }}
          >
            <Icon name="cart" size={20} />
            <span>Cost</span>
          </button>
        )}

        {!isManager && (
          <button
            className={tab === 'member_deposit' ? 'on' : ''}
            onClick={() => { setTab('member_deposit'); setDrawerOpen(false); }}
          >
            <Icon name="wallet" size={20} />
            <span>Deposit</span>
          </button>
        )}

        <button
          className={tab === 'members' || tab === 'detail' ? 'on' : ''}
          onClick={() => { setTab('members'); setDrawerOpen(false); }}
        >
          <Icon name="users" size={20} />
          <span>Members</span>
        </button>

        {!isManager && (
          <button
            className={tab === 'profile' ? 'on' : ''}
            onClick={() => { setTab('profile'); setDrawerOpen(false); }}
          >
            <Icon name="users" size={20} />
            <span>Profile</span>
          </button>
        )}
      </nav>

      {/* Mobile Drawer (Menu) */}
      <div className={`drawer ${drawerOpen ? 'on' : ''}`} id="drw">
        <div className="pn">
          <div className="hd flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <b className="text-lg">Mess: {messState.mess}</b>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  KhaonKhata
                </span>
              </div>
              <p className="text-xs text-[var(--mut)] mt-0.5">{user.email}</p>
              <a
                href="https://www.facebook.com/share/1DmkXxdFDk/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11.5px] font-semibold text-[var(--pri)] mt-1 tracking-wide hover:underline inline-flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80"
                title="Facebook Profile"
              >
                Developed by Reduean A. Rahat ↗
              </a>
            </div>
            <button
              type="button"
              className="!w-8 !h-8 !p-0 rounded-full flex items-center justify-center bg-[var(--card)] border border-[var(--line)] cursor-pointer text-sm font-bold"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <p className="px-5 pt-3 pb-1 text-xs font-bold text-[var(--mut)] uppercase tracking-wider">
            Accounts
          </p>
          <button
            className={tab === 'home' ? 'on' : ''}
            onClick={() => { setTab('home'); setDrawerOpen(false); }}
          >
            <Icon name="home" size={18} />
            <span>Home</span>
          </button>

          <a
            href="/about"
            className={`nav-item ${tab === 'about' ? 'on' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setTab('about');
              setDrawerOpen(false);
            }}
          >
            <Icon name="user" size={18} />
            <span>About Us</span>
          </a>

          {isManager && (
            <button
              className={tab === 'deposit' ? 'on' : ''}
              onClick={() => { setTab('deposit'); setDrawerOpen(false); }}
            >
              <Icon name="wallet" size={18} />
              <span>Add Deposit</span>
            </button>
          )}

          <button
            className={tab === 'meal' ? 'on' : ''}
            onClick={() => { setTab('meal'); setDrawerOpen(false); }}
          >
            <Icon name="bowl" size={18} />
            <span>Add Meal</span>
          </button>

          {isManager && (
            <button
              className={tab === 'cost' ? 'on' : ''}
              onClick={() => { setTab('cost'); setDrawerOpen(false); }}
            >
              <Icon name="cart" size={18} />
              <span>Add Cost</span>
            </button>
          )}

          {isManager && (
            <button
              className={tab === 'payment_methods' ? 'on' : ''}
              onClick={() => { setTab('payment_methods'); setDrawerOpen(false); }}
            >
              <Icon name="wallet" size={18} />
              <span>Payment Methods</span>
              {pendingDepositCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingDepositCount}
                </span>
              )}
            </button>
          )}

          {!isManager && (
            <button
              className={tab === 'member_deposit' ? 'on' : ''}
              onClick={() => { setTab('member_deposit'); setDrawerOpen(false); }}
            >
              <Icon name="wallet" size={18} />
              <span>Deposit (টাকা জমা দিন)</span>
            </button>
          )}

          <button
            className={tab === 'active' ? 'on' : ''}
            onClick={() => { setTab('active'); setDrawerOpen(false); }}
          >
            <Icon name="cal" size={18} />
            <span>Active Month Details</span>
          </button>

          <button
            className={tab === 'all' ? 'on' : ''}
            onClick={() => { setTab('all'); setDrawerOpen(false); }}
          >
            <Icon name="list" size={18} />
            <span>All Month Details</span>
          </button>

          <p className="px-5 pt-4 pb-1 text-xs font-bold text-[var(--mut)] uppercase tracking-wider">
            Mess
          </p>
          <button
            className={tab === 'members' || tab === 'detail' ? 'on' : ''}
            onClick={() => { setTab('members'); setDrawerOpen(false); }}
          >
            <Icon name="users" size={18} />
            <span>Mess Members</span>
          </button>

          <button
            className={tab === 'profile' ? 'on' : ''}
            onClick={() => { setTab('profile'); setDrawerOpen(false); }}
          >
            <Icon name="users" size={18} />
            <span>Profile</span>
          </button>

          <button
            className={tab === 'settings' ? 'on' : ''}
            onClick={() => { setTab('settings'); setDrawerOpen(false); }}
          >
            <Icon name="gear" size={18} />
            <span>Mess Settings</span>
          </button>

          <div className="px-5 pt-6 space-y-2.5">
            <PWAInstallButton />
            <a
              href="https://www.facebook.com/share/1VCSom58hc/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-[#1877F2] text-white flex items-center justify-center gap-2 text-xs font-semibold shadow hover:bg-[#166fe5] transition-all cursor-pointer"
            >
              <FacebookIcon size={16} />
              <span>Direct Support</span>
            </a>
            <button
              className="btn d s w-full"
              onClick={handleSignOut}
            >
              Log out
            </button>
          </div>
        </div>
        <div
          className="sc"
          onClick={() => setDrawerOpen(false)}
        />
      </div>

      {/* Add Member with Auto-Credentials & Welcome Email Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onAddMember={handleAddMember}
        existingEmails={messState.members.map(m => m.email || '').filter(Boolean)}
        messName={messState.mess}
      />

      {/* Global Interactive Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        fields={modalConfig.fields}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onDelete={modalConfig.onDelete}
        confirmText={modalConfig.confirmText}
        deleteText={modalConfig.deleteText}
      />

      {/* Targeted Push Notification Breakdown Modal */}
      {isTargetedReportOpen && targetedPushResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card !max-w-lg w-full max-h-[85vh] flex flex-col p-5 shadow-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <div>
                  <h3 className="text-base font-bold">টার্গেটেড পুশ নোটিফিকেশন রিপোর্ট</h3>
                  <p className="text-xs text-[var(--mut)]">তারিখ: {TD} ({messState.mess})</p>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-[var(--line)] flex items-center justify-center text-sm font-bold hover:opacity-80 cursor-pointer"
                onClick={() => setIsTargetedReportOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[var(--line)]">
                <p className="text-xs text-[var(--mut)]">মোট সদস্য</p>
                <b className="text-lg">{targetedPushResult.totalMembers}</b>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">মিল যুক্ত হয়েছে</p>
                <b className="text-lg text-emerald-600 dark:text-emerald-400">{targetedPushResult.hasMealCount}</b>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300">মিল দেওয়া হয়নি</p>
                <b className="text-lg text-amber-600 dark:text-amber-400">{targetedPushResult.noMealCount}</b>
              </div>
            </div>

            {/* Members List Breakdown */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <p className="text-xs font-semibold text-[var(--mut)]">প্রতি সদস্যের কাছে পাঠানো নির্দিষ্ট বার্তা:</p>
              {targetedPushResult.details.map((item) => (
                <div
                  key={item.memberId}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    item.hasMeal
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-amber-500/5 border-amber-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-sm">{item.memberName}</span>
                    <span
                      className={`tag text-[11px] font-bold ${
                        item.hasMeal
                          ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60'
                          : 'text-amber-700 bg-amber-100 dark:bg-amber-900/60'
                      }`}
                    >
                      {item.hasMeal ? `✓ মিল যুক্ত (${item.meals} টি)` : '✕ মিল নেই'}
                    </span>
                  </div>
                  <p className="text-[var(--fg)] italic">&ldquo;{item.body}&rdquo;</p>
                  <div className="flex items-center justify-between text-[10px] text-[var(--mut)] pt-0.5">
                    <span>{item.title}</span>
                    <span>{item.token ? '📱 FCM Token সক্রিয়' : 'ইন-অ্যাপ সংরক্ষিত'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <div className="pt-2 border-t border-[var(--line)]">
              <button
                className="btn big !w-full cursor-pointer"
                onClick={() => setIsTargetedReportOpen(false)}
              >
                ঠিক আছে (বন্ধ করুন)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Notification List Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notificationsList}
        readIds={readNotificationIds}
        onMarkAllAsRead={handleMarkAllAsRead}
        onMarkAsRead={handleMarkAsRead}
        onNavigateTab={(targetTab) => {
          setTab(targetTab as any);
          setDrawerOpen(false);
        }}
      />

      {/* Global Toast */}
      <Toast message={toastMsg} />
    </div>
  );
}
