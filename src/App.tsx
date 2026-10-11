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
import { LogoLoader } from './components/LogoLoader';
import { UnauthorizedDomainModal } from './components/UnauthorizedDomainModal';
import { MemberProfileView } from './components/MemberProfileView';
import { MembersListView } from './components/MembersListView';
import { DepositView } from './components/DepositView';
import { MealView } from './components/MealView';
import { CostView } from './components/CostView';
import { ActiveMonthView } from './components/ActiveMonthView';
import { AllMonthsView } from './components/AllMonthsView';
import { SettingsView } from './components/SettingsView';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

const DASH_ICONS: Record<string, React.ReactNode> = {
  bell: <path d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4" />,
  bowl: <path d="M3 12h18a9 9 0 01-18 0zM8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4" />,
  wal: <path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h12M16 14h2" />,
  cart: <path d="M3 4h2l2.5 11h10L20 7H6.5M9 20h.01M17 20h.01" />,
  doc: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" />,
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  users: <path d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7M17 4.5a3.5 3.5 0 010 6.5M21 20v-1a4 4 0 00-3-3.9" />,
  pdf: <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />,
  chev: <path d="M9 6l6 6-6 6" />,
  l: <path d="M15 6l-6 6 6 6" />,
};

export const DashIcon = ({
  name,
  size = 20,
  className = 'i',
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    aria-hidden="true"
  >
    {DASH_ICONS[name] || <use href={`#${name}`} xlinkHref={`#${name}`} />}
  </svg>
);

/**
 * AnimatedTk: Counter component matching dashboard.html requestAnimationFrame count-up
 */
const AnimatedTk = ({ amount }: { amount: number }) => {
  const [val, setVal] = useState(amount);

  useEffect(() => {
    const t0 = performance.now();
    const duration = 1100;
    const startVal = 0;
    const targetVal = amount;
    let animId: number;

    const animate = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      setVal(Math.round(startVal + (targetVal - startVal) * ease));
      if (k < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [amount]);

  return <>{tk(val)}</>;
};

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
  const [barWidth, setBarWidth] = useState('0%');

  // Browser Route State for SEO, AdSense Compliance & Landing Navigation
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname || '/';
      return p === '/dashboard' ? '/app' : p;
    }
    return '/';
  });

  const navigate = (path: string) => {
    const targetPath = path === '/dashboard' ? '/app' : path;
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setPathname(targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePop = () => {
      const p = window.location.pathname || '/';
      setPathname(p === '/dashboard' ? '/app' : p);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Redirect logged-in user to dashboard if on root or login page
  useEffect(() => {
    if (user && (pathname === '/' || pathname === '' || pathname === '/login')) {
      navigate('/dashboard');
    }
  }, [user?.uid, pathname]);

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
  }, [currentMessId, user?.uid]);

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
  }, [user?.uid]);

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
  }, [user?.uid, user?.email, profile?.currentMessId, (profile?.joinedMesses || []).join(',')]);

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
  }, [currentMessId, user?.uid]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (monthSummary && monthSummary.dep > 0) {
        const pct = Math.min(100, Math.max(4, Math.round((monthSummary.tot / monthSummary.dep) * 100)));
        setBarWidth(`${pct}%`);
      } else {
        setBarWidth('0%');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [monthSummary]);

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

    // Clean up meals, deposits and requests so removed member data does not linger or distort calculations
    const targetId = targetMember.id;
    const nextMeals = { ...messState.meals };
    Object.keys(nextMeals).forEach(dateKey => {
      if (nextMeals[dateKey] && nextMeals[dateKey][targetId]) {
        const daySlots = { ...nextMeals[dateKey] };
        delete daySlots[targetId];
        if (Object.keys(daySlots).length === 0) {
          delete nextMeals[dateKey];
        } else {
          nextMeals[dateKey] = daySlots;
        }
      }
    });
    const nextDeposits = (messState.deposits || []).filter(d => d.m !== targetId);
    const nextReqs = (messState.reqs || []).filter(r => r.m !== targetId);
    const nextDepReqs = (messState.depositRequests || []).filter(r => r.memberId !== targetId);

    const nextState: MessState = {
      ...messState,
      members: nextActiveMembers,
      archivedMembers: nextArchivedMembers,
      memberEmails: nextEmails,
      meals: nextMeals,
      deposits: nextDeposits,
      reqs: nextReqs,
      depositRequests: nextDepReqs,
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

  // Full-Screen Logo Loading Animation:
  // Shows while verifying session (authLoading) across all routes to prevent visual flashing
  if (authLoading) {
    return (
      <LogoLoader
        text="মেস সেশন যাচাই করা হচ্ছে..."
        isReady={!authLoading}
      />
    );
  }

  // --- STRICT AUTO-REDIRECT FOR LOGGED-IN USERS AT ROOT OR LOGIN ---
  // If an authenticated user opens or refreshes root (/) or /login, redirect straight to Dashboard
  if (user && (pathname === '/' || pathname === '' || pathname === '/login')) {
    return (
      <LogoLoader
        text="ড্যাশবোর্ড লোড হচ্ছে..."
        isReady={!messLoading}
      />
    );
  }

  // Loading state while fetching mess data for authenticated user
  if (user && messLoading && currentMessId) {
    return (
      <LogoLoader
        text="ড্যাশবোর্ড লোড হচ্ছে..."
        isReady={!messLoading}
      />
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

  // --- ROOT ROUTE: 100% EXACT RESPONSIVE LANDING PAGE (/) ---
  // Shown only to unauthenticated visitors or users who explicitly logged out
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
    <div id="shell" className="kk kk-shell">
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
      <main id="app" className="home-active">

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

        {/* --- VIEW: HOME (DASHBOARD) - 100% EXACT REDESIGNED DASHBOARD --- */}
        {tab === 'home' && (
          <div className="kk-view">
            <header className="kk-hero">
              <svg
                className="kk-orn"
                viewBox="0 0 300 300"
                aria-hidden="true"
                fill="none"
                style={{
                  position: 'absolute',
                  right: -96,
                  top: -96,
                  width: 300,
                  height: 300,
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                {Array.from({ length: 14 }).map((_, i) => (
                  <ellipse
                    key={i}
                    cx="150"
                    cy="150"
                    rx="140"
                    ry="48"
                    transform={`rotate(${i * 13} 150 150)`}
                    fill="none"
                    stroke="#D8B46B"
                    strokeWidth="0.7"
                    opacity="0.35"
                  />
                ))}
                <circle cx="150" cy="150" r="146" fill="none" stroke="#D8B46B" strokeWidth="0.7" opacity="0.35" />
                <circle cx="150" cy="150" r="104" fill="none" stroke="#D8B46B" strokeWidth="0.7" opacity="0.35" />
              </svg>
              <div className="kk-ht">
                <button
                  type="button"
                  className="kk-ib"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="মেনু খুলুন"
                  aria-haspopup="dialog"
                >
                  <svg className="kk-i"><use href="#kk-menu" /></svg>
                </button>
                <div className="kk-gr">
                  <small>স্বাগতম,</small>
                  <b>{whoName}</b>
                </div>
                <button
                  type="button"
                  className="kk-ib"
                  onClick={() => setIsNotificationOpen(true)}
                  aria-label="নোটিফিকেশন"
                >
                  <svg className="kk-i"><use href="#kk-bell" /></svg>
                  {unreadNotificationCount > 0 && (
                    <em data-badge>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</em>
                  )}
                </button>
              </div>

              <div className="kk-bt">
                <div className="kk-mon">
                  <button type="button" onClick={() => shiftMonth(-1)} aria-label="আগের মাস">
                    <svg className="kk-i"><use href="#kk-l" /></svg>
                  </button>
                  <span>{banglaMonths[+activeMonthNum - 1]} {activeYear}</span>
                  <button type="button" onClick={() => shiftMonth(1)} aria-label="পরের মাস">
                    <svg className="kk-i" style={{ transform: 'scaleX(-1)' }}><use href="#kk-l" /></svg>
                  </button>
                </div>
                <button
                  type="button"
                  className="kk-hl"
                  disabled={isExportingPDF}
                  onClick={handleDownloadGroupPDF}
                >
                  <svg className="kk-i" width="16" height="16"><use href="#kk-pdf" /></svg>
                  Group PDF
                </button>
              </div>

              <div className="kk-bal">
                <span className="kk-lab">Mess Balance</span>
                <div className="kk-big">
                  <span className="kk-cs">৳</span>
                  <span id="kk-bal">
                    <AnimatedTk amount={monthSummary ? monthSummary.dep - monthSummary.tot : 0} />
                  </span>
                </div>
                <div className="kk-use">
                  <div className="kk-ub">
                    <i
                      id="kk-ubf"
                      style={{
                        width: `${monthSummary && monthSummary.dep > 0 ? Math.min(100, Math.round((monthSummary.tot / monthSummary.dep) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="kk-ul">
                    <span>
                      খরচ {monthSummary ? tk(monthSummary.tot) : '৳0'} ·{' '}
                      {monthSummary && monthSummary.dep > 0 ? Math.min(100, Math.round((monthSummary.tot / monthSummary.dep) * 100)) : 0}%
                    </span>
                    <span>জমা {monthSummary ? tk(monthSummary.dep) : '৳0'}</span>
                  </div>
                </div>
              </div>

              <div className="kk-tri">
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
            </header>

            <main className="kk-sheet">
              {/* Quick Actions */}
              <div className="kk-qa">
                <button type="button" onClick={() => { setMealSubTab('add'); setTab('meal'); }}>
                  <i><svg className="kk-i" width="24" height="24"><use href="#kk-bowl" /></svg></i>
                  Add Meal
                </button>
                <button type="button" onClick={() => setTab(isManager ? 'deposit' : 'member_deposit')}>
                  <i><svg className="kk-i" width="24" height="24"><use href="#kk-wal" /></svg></i>
                  Add Deposit
                </button>
                <button type="button" onClick={() => setTab('cost')}>
                  <i><svg className="kk-i" width="24" height="24"><use href="#kk-cart" /></svg></i>
                  Add Cost
                </button>
                <button type="button" onClick={() => { setMealSubTab('req'); setTab('meal'); }}>
                  <i><svg className="kk-i" width="24" height="24"><use href="#kk-doc" /></svg></i>
                  Request {pendingReqCount > 0 ? `(${pendingReqCount})` : ''}
                </button>
              </div>

              {/* My Summary Section */}
              <section className="kk-sec">
                <div className="kk-sh">
                  <h2>My Summary</h2>
                  <button
                    type="button"
                    className="kk-lk"
                    disabled={isExportingPDF}
                    onClick={() => handleDownloadIndividualPDF()}
                  >
                    <svg className="kk-i" width="15" height="15"><use href="#kk-pdf" /></svg>
                    My Report PDF
                  </button>
                </div>
                <div className="kk-card">
                  <div className="kk-g4">
                    <div>
                      <small>Meals</small>
                      <b>{fm(mySummary.meals)}</b>
                    </div>
                    <div>
                      <small>Deposit</small>
                      <b>{tk(mySummary.dep)}</b>
                    </div>
                    <div>
                      <small>Cost</small>
                      <b>{tk(mySummary.tot)}</b>
                    </div>
                    <div>
                      <small>Balance</small>
                      <b className={mySummary.bal >= 0 ? 'kk-pos' : 'kk-neg'}>
                        {mySummary.bal >= 0 ? '+' : ''}{tk(mySummary.bal)}
                      </b>
                    </div>
                  </div>
                  <div className="kk-sp2">
                    <i
                      style={{
                        width: `${Math.min(
                          100,
                          mySummary.tot > 0 ? (mySummary.dep / mySummary.tot) * 100 : mySummary.dep > 0 ? 100 : 0
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="kk-lg">
                    <span>খরচ {tk(mySummary.tot)}</span>
                    <span>জমা {tk(mySummary.dep)}</span>
                  </div>
                </div>
              </section>

              {/* Payment Methods Card */}
              <section className="kk-sec">
                <div
                  className="kk-card kk-pay"
                  onClick={() => setTab(isManager ? 'payment_methods' : 'member_deposit')}
                  style={{ cursor: 'pointer' }}
                >
                  <i><svg className="kk-i" width="22" height="22"><use href="#kk-wal" /></svg></i>
                  <div>
                    <b>Payment Methods (পেমেন্ট মেথড)</b>
                    <small>বিকাশ, নগদ, রকেট ও ব্যাংক তথ্য</small>
                    <div className="kk-dots">
                      <s style={{ background: '#E2136E' }} />
                      <s style={{ background: '#F6921E' }} />
                      <s style={{ background: '#8C3494' }} />
                      <s style={{ background: '#1FA874' }} />
                    </div>
                  </div>
                  <svg className="kk-i"><use href="#kk-chev" /></svg>
                </div>
              </section>

              {/* Today's Eaters Section */}
              <section className="kk-sec">
                <div className="kk-sh">
                  <h2>আজ কে কে খাচ্ছে</h2>
                  <span className="kk-ch">{TD}</span>
                </div>
                <div className="kk-card">
                  <div className="kk-eat">
                    <div className="kk-stack">
                      {todayEaters.slice(0, 5).map(m => (
                        <span key={m.id}>{(m.name[0] || '?').toUpperCase()}</span>
                      ))}
                      {todayEaters.length > 5 && (
                        <span className="kk-more">+{todayEaters.length - 5}</span>
                      )}
                    </div>
                    <div>
                      <b>{todayEaters.length} জন খাচ্ছে</b>
                      <small>
                        {todayEaters.length > 0
                          ? `${todayEaters[0].name.split(' ')[0]}${todayEaters.length > 1 ? ` ও আরও ${todayEaters.length - 1} জন` : ''}`
                          : 'আজ কেউ মিল দেয়নি'}
                      </small>
                    </div>
                  </div>
                </div>
              </section>

              {/* Daily Bazar Expense Section */}
              <section className="kk-sec">
                <div className="kk-sh">
                  <h2>দৈনিক বাজার খরচ</h2>
                  <span className="kk-ch">মোট {monthSummary ? tk(monthSummary.baz) : '৳0'}</span>
                </div>
                <div className="kk-card">
                  <div className="kk-bars">
                    {Array.from({ length: dim }, (_, i) => {
                      const amt = dailyBazarAmounts[i] || 0;
                      const isMax = maxBazar > 0 && amt === maxBazar && amt > 0;
                      const heightPct = amt ? Math.max(6, (amt / maxBazar) * 88) : 2;
                      return (
                        <i
                          key={i}
                          className={`${amt ? (isMax ? 'kk-mx' : '') : 'kk-z'}`}
                          data-v={isMax ? tk(amt) : undefined}
                          title={`${i + 1} তারিখ: ${tk(amt)}`}
                          style={{ height: `${heightPct}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="kk-ax">
                    <span>১</span><span>৮</span><span>১৫</span><span>২২</span><span>{dim}</span>
                  </div>
                  <div className="kk-kv">
                    <span>
                      গড়{' '}
                      <b>
                        {tk(
                          Math.round(
                            dailyBazarAmounts.filter(x => x > 0).reduce((a, b) => a + b, 0) /
                              (dailyBazarAmounts.filter(x => x > 0).length || 1)
                          )
                        )}
                      </b>
                      /দিন
                    </span>
                    <span>সর্বোচ্চ <b>{tk(maxBazar > 1 ? maxBazar : 0)}</b></span>
                  </div>
                </div>
              </section>

              {/* Members Accordion Section */}
              <section className="kk-sec">
                <div className="kk-sh">
                  <h2>সদস্যবৃন্দ ({messState.members.length})</h2>
                  <button type="button" className="kk-lk" onClick={() => setTab('members')}>
                    সব দেখুন<svg className="kk-i" width="15" height="15"><use href="#kk-chev" /></svg>
                  </button>
                </div>
                <div className="kk-card kk-pl">
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
                    const b = mSummary.bal;
                    const p = Math.min(
                      100,
                      mSummary.cost > 0 ? (mSummary.dep / mSummary.cost) * 100 : mSummary.dep > 0 ? 100 : 0
                    );
                    return (
                      <details key={m.id} style={{ listStyle: 'none' }}>
                        <summary style={{ listStyle: 'none', WebkitAppearance: 'none' }}>
                          <span className={`kk-mav ${m.id === messState.mgr ? 'kk-mgr' : ''}`}>
                            {(m.name[0] || '?').toUpperCase()}
                          </span>
                          <div className="kk-n">
                            <b>{m.name}</b>
                            <small>
                              {m.id === messState.mgr ? <span className="kk-tag">Manager</span> : null}
                              {m.room || 'Room -'} · মিল {fm(mSummary.meals)}
                            </small>
                          </div>
                          <div className="kk-bv">
                            <b className={b >= 0 ? 'kk-pos' : 'kk-neg'}>
                              {b >= 0 ? '+' : ''}{tk(b)}
                            </b>
                            <small>ব্যালেন্স</small>
                          </div>
                        </summary>
                        <div className="kk-md">
                          <div className="kk-mb2"><i style={{ width: `${p}%` }}></i></div>
                          <div className="kk-mbl">
                            <span>জমা {tk(mSummary.dep)}</span>
                            <span>খরচ {tk(mSummary.tot)}</span>
                          </div>
                          <div className="kk-r"><span>মোট মিল</span><b>{fm(mSummary.meals)}</b></div>
                          <div className="kk-r"><span>মোট জমা</span><b>{tk(mSummary.dep)}</b></div>
                          <div className="kk-r"><span>মিল বাবদ খরচ</span><b>{tk(mSummary.cost)}</b></div>
                          <div className="kk-r"><span>শেয়ার্ড খরচ</span><b>{tk(mSummary.sh)}</b></div>
                          <div className="kk-r kk-t"><span>মোট খরচ</span><b>{tk(mSummary.tot)}</b></div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>
            </main>
          </div>
        )}

        {/* --- VIEW: ADD MEAL --- */}
        {tab === 'meal' && (
          <MealView
            messState={messState}
            activeYM={activeYM}
            setActiveYM={setActiveYM}
            monthSummary={monthSummary}
            isManager={isManager}
            currentMember={currentMember}
            isMonthLocked={isMonthLocked}
            onOpenDrawer={() => setDrawerOpen(true)}
            onBack={() => setTab('home')}
            mealSubTab={mealSubTab}
            setMealSubTab={setMealSubTab}
            mealWho={mealWho}
            setMealWho={setMealWho}
            mealDate={mealDate}
            setMealDate={setMealDate}
            mealDraft={mealDraft}
            setMealDraft={setMealDraft}
            handleSaveMealDraft={handleSaveMealDraft}
            handleSendTargetedPush={handleSendTargetedPush}
            targetedPushLoading={targetedPushLoading}
            pendingReqCount={pendingReqCount}
            handleDeleteDateMeals={handleDeleteDateMeals}
            handleRemoveMemberMeal={handleRemoveMemberMeal}
            handleSubmitMealRequest={handleSubmitMealRequest}
            handleApproveReq={handleApproveReq}
            handleRejectReq={handleRejectReq}
            daysInMonth={daysInMonth}
            setModalConfig={setModalConfig}
            showToast={showToast}
          />
        )}

        {/* --- VIEW: DEPOSIT --- */}
        {tab === 'deposit' && (
          <DepositView
            messState={messState}
            activeYM={activeYM}
            setActiveYM={setActiveYM}
            monthSummary={monthSummary}
            isManager={isManager}
            onOpenDrawer={() => setDrawerOpen(true)}
            onBack={() => setTab('home')}
            depDate={depDate}
            setDepDate={setDepDate}
            depAmt={depAmt}
            setDepAmt={setDepAmt}
            depMember={depMember}
            setDepMember={setDepMember}
            depNote={depNote}
            setDepNote={setDepNote}
            onSaveDeposit={handleSaveDeposit}
            setModalConfig={setModalConfig}
            saveStateToFirestore={saveStateToFirestore}
          />
        )}

        {/* --- VIEW: COST --- */}
        {tab === 'cost' && (
          <CostView
            messState={messState}
            activeYM={activeYM}
            setActiveYM={setActiveYM}
            monthSummary={monthSummary}
            isManager={isManager}
            onOpenDrawer={() => setDrawerOpen(true)}
            onBack={() => setTab('home')}
            costSubTab={costSubTab}
            setCostSubTab={setCostSubTab}
            costDate={costDate}
            setCostDate={setCostDate}
            costAmt={costAmt}
            setCostAmt={setCostAmt}
            costItems={costItems}
            setCostItems={setCostItems}
            costMember={costMember}
            setCostMember={setCostMember}
            costType={costType}
            setCostType={setCostType}
            costAutoDep={costAutoDep}
            setCostAutoDep={setCostAutoDep}
            onSaveCost={handleSaveCost}
            setModalConfig={setModalConfig}
            saveStateToFirestore={saveStateToFirestore}
          />
        )}

        {/* --- VIEW: MEMBERS --- */}
        {tab === 'members' && (
          <MembersListView
            messState={messState}
            activeYM={activeYM}
            setActiveYM={setActiveYM}
            monthSummary={monthSummary}
            isManager={isManager}
            onSelectMember={(memberId) => {
              setDetailMemberId(memberId);
              setTab('detail');
            }}
            onAddMember={() => setIsAddMemberOpen(true)}
            onArchiveMember={handleArchiveMember}
            onOpenDrawer={() => setDrawerOpen(true)}
            onBack={() => setTab('home')}
            setModalConfig={setModalConfig}
          />
        )}

        {/* --- VIEW: MEMBER DETAIL --- */}
        {tab === 'detail' && detailMemberId && (
          <div className="w-full">
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
                <MemberProfileView
                  member={mem}
                  messState={messState}
                  activeYM={activeYM}
                  monthSummary={monthSummary}
                  isCurrentUserManager={isManager}
                  onBack={() => {
                    setTab('members');
                    setDetailMemberId(null);
                  }}
                  onEdit={() => {
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
                  onDelete={() => {
                    setModalConfig({
                      isOpen: true,
                      title: 'সদস্য মুছে ফেলবেন?',
                      message: `আপনি কি "${mem.name}"-কে মেস থেকে রিমুভ ও আর্কাইভ করতে চান? ওনার পূর্বের মিল ও জমার রেকর্ড সংরক্ষিত থাকবে, কিন্তু উনি আর অ্যাক্টিভ লিস্টে থাকবেন না এবং লগইন করতে পারবেন না।`,
                      confirmText: 'মুছে ফেলুন',
                      onConfirm: () => handleArchiveMember(mem),
                    });
                  }}
                  onDownloadPDF={() => handleDownloadIndividualPDF(mem)}
                />
              );
            })()}
          </div>
        )}

        {/* --- VIEW: ACTIVE MONTH SUMMARY & PRINT --- */}
        {tab === 'active' && (
          <ActiveMonthView
            messState={messState}
            activeYM={activeYM}
            setActiveYM={setActiveYM}
            monthSummary={monthSummary}
            isMonthLocked={isMonthLocked}
            isExportingPDF={isExportingPDF}
            handleDownloadGroupPDF={handleDownloadGroupPDF}
            handleDownloadIndividualPDF={handleDownloadIndividualPDF}
            setDetailMemberId={setDetailMemberId}
            setTab={setTab}
            onOpenDrawer={() => setDrawerOpen(true)}
            onBack={() => setTab('home')}
          />
        )}

        {/* --- VIEW: ALL MONTHS HISTORY --- */}
        {tab === 'all' && (
          <AllMonthsView
            messState={messState}
            activeYM={activeYM}
            setActiveYM={setActiveYM}
            setTab={setTab}
            onOpenDrawer={() => setDrawerOpen(true)}
            onBack={() => setTab('home')}
          />
        )}

        {/* --- VIEW: SETTINGS --- */}
        {tab === 'settings' && (
          <SettingsView
            messState={messState}
            isManager={isManager}
            activeYM={activeYM}
            isMonthLocked={isMonthLocked}
            theme={theme}
            setTheme={setTheme}
            setModalConfig={setModalConfig}
            saveStateToFirestore={saveStateToFirestore}
            showToast={showToast}
            onDeleteMess={() => {
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
            onOpenDrawer={() => setDrawerOpen(true)}
            onBack={() => setTab('home')}
          />
        )}

        {/* --- VIEW: PROFILE --- */}
        {tab === 'profile' && (
          <div className="kk-view space-y-4">
            {(() => {
              const myMem = currentMember || messState.members.find(m => (m.uid && m.uid === user.uid) || (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())) || messState.members[0];
              if (!myMem) return <p className="p-4">প্রোফাইল পাওয়া যায়নি</p>;

              return (
                <MemberProfileView
                  member={myMem}
                  messState={messState}
                  activeYM={activeYM}
                  monthSummary={monthSummary}
                  isCurrentUserManager={isManager}
                  onBack={() => setTab('home')}
                  onEdit={() => {
                    setIsChangePasswordOpen(true);
                    setChangePassMsg(null);
                  }}
                  onDownloadPDF={() => handleDownloadIndividualPDF(myMem)}
                />
              );
            })()}

            {/* Password Management Card */}
            <div className="kk-card space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="!mb-0.5 flex items-center gap-1.5 text-base font-bold text-[var(--ink)]">
                    <span>🔒</span>
                    <span>পাসওয়ার্ড পরিবর্তন (Change Password)</span>
                  </h3>
                  <p className="text-xs text-[var(--mut)] m-0">
                    মেম্বার হিসেবে নিজস্ব পছন্দের নতুন পাসওয়ার্ড সেট করুন
                  </p>
                </div>
                <button
                  type="button"
                  className="kk-btn kk-sm font-bold cursor-pointer"
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
                      className="kk-in"
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
                      className="kk-in"
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
                      className="kk-in"
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
                      className="px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs font-semibold cursor-pointer"
                      onClick={() => setIsChangePasswordOpen(false)}
                      disabled={changePassLoading}
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="kk-btn kk-sm font-bold text-xs cursor-pointer"
                      disabled={changePassLoading}
                    >
                      {changePassLoading ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড সেভ করুন'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Mess List & Switcher */}
            <div className="kk-card space-y-3">
              <h3 className="text-base font-bold text-[var(--ink)] m-0">আমার মেসসমূহ</h3>
              <div className="space-y-2 mt-2">
                {userMesses.map(m => (
                  <div key={m.id} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--line)]/20 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <b className="text-sm text-[var(--ink)] block truncate">{m.name}</b>
                      <small className="text-xs text-[var(--mut)] block truncate">Manager: {m.mgrEmail}</small>
                    </div>
                    {m.id === currentMessId ? (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold shrink-0">Active</span>
                    ) : (
                      <button
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer transition-all"
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

              <div className="pt-2">
                <button
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--line)] hover:border-emerald-500/50 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer transition-all"
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
            <div className="kk-card space-y-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-base font-bold text-[var(--ink)] !mb-1">
                  <span>📄</span>
                  <span>মাসিক হিসাব ও PDF স্টেটমেন্ট</span>
                </h3>
                <p className="text-xs text-[var(--mut)] m-0">
                  বর্তমান মাসের ({banglaMonths[+activeMonthNum - 1]} {activeYear}) ব্যক্তিগত খরচ ও মিলের অফিশিয়াল PDF ডাউনলোড করুন
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  className="kk-btn flex-1 flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer shadow-xs py-2.5"
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
                    className="kk-btn flex-1 flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer py-2.5 !bg-[var(--line)] !text-[var(--ink)] hover:!bg-[var(--line)]/80"
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
            <div className="kk-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-1.5 text-base font-bold text-[var(--ink)] m-0">
                    <span>🔔</span>
                    <span>পুশ নোটিফিকেশন (FCM)</span>
                  </h3>
                  <p className="text-xs text-[var(--mut)] mt-0.5 m-0">
                    {profile?.fcmToken
                      ? 'ডিভাইস টোকেন নিবন্ধিত আছে'
                      : 'মিল ও মেসের রিয়েলটাইম অ্যালার্ট পেতে অনুমোদন করুন'}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${profile?.fcmToken ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60' : 'text-amber-700 bg-amber-100 dark:bg-amber-950/60'}`}>
                  {profile?.fcmToken ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  className="flex-1 py-2 px-3 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--line)]/50 text-xs font-semibold cursor-pointer transition-all"
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
                  className="py-2 px-3 rounded-xl border border-[var(--line)] bg-[var(--line)]/30 hover:bg-[var(--line)]/60 text-xs font-semibold cursor-pointer transition-all"
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
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-[var(--ink)]">
                        <span>📢</span>
                        <span>টার্গেটেড মিল পুশ নোটিফিকেশন</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full bg-emerald-500/20">
                        ম্যানেজার অপশন
                      </span>
                    </div>

                    <p className="text-xs text-[var(--mut)] leading-relaxed m-0">
                      আজকের মিল এন্ট্রি করার পর এই বাটনে চাপুন। স্বয়ংক্রিয়ভাবে সদস্যদের বর্তমান মিল রেকর্ড অনুযায়ী নির্দিষ্ট নোটিফিকেশন যাবে:
                      <br />• <b>মিল যুক্ত সদস্যদের:</b> &quot;আপনার আজকের মিল যুক্ত করা হয়েছে।&quot;
                      <br />• <b>মিল না থাকা সদস্যদের:</b> &quot;আপনার এখনো মিল দেওয়া হয় নি।&quot;
                    </p>

                    <button
                      className="kk-btn w-full !py-2.5 flex items-center justify-center gap-2 text-xs font-semibold shadow-xs cursor-pointer"
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
            <div className="kk-card space-y-3">
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
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-all"
                  onClick={handleSignOut}
                >
                  Log out
                </button>
                <button
                  className="px-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--line)]/50 text-xs font-semibold cursor-pointer transition-all"
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
            onBack={() => setTab('home')}
            onOpenDrawer={() => setDrawerOpen(true)}
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
            onBack={() => setTab('home')}
            onOpenDrawer={() => setDrawerOpen(true)}
          />
        )}
      </main>

      {/* Floating Navigation Bar */}
      <nav className="nav" aria-label="Main">
        <button
          className={tab === 'home' ? 'on' : ''}
          onClick={() => { setTab('home'); setDrawerOpen(false); }}
        >
          <svg className="i"><use href="#home" /></svg>
          Home
        </button>

        <button
          className={tab === 'deposit' || tab === 'member_deposit' ? 'on' : ''}
          onClick={() => { setTab(isManager ? 'deposit' : 'member_deposit'); setDrawerOpen(false); }}
        >
          <svg className="i"><use href="#wal" /></svg>
          Deposit
        </button>

        <button
          className={tab === 'meal' ? 'on' : ''}
          onClick={() => { setTab('meal'); setDrawerOpen(false); }}
        >
          <svg className="i"><use href="#bowl" /></svg>
          Meal
          {pendingReqCount > 0 && isManager && (
            <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[var(--red)]"></span>
          )}
        </button>

        <button
          className={tab === 'cost' ? 'on' : ''}
          onClick={() => { setTab('cost'); setDrawerOpen(false); }}
        >
          <svg className="i"><use href="#cart" /></svg>
          Cost
        </button>

        <button
          className={tab === 'members' || tab === 'detail' ? 'on' : ''}
          onClick={() => { setTab('members'); setDrawerOpen(false); }}
        >
          <svg className="i"><use href="#users" /></svg>
          Members
        </button>
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
        messName={messState.mess}
        onNavigateTab={(targetTab) => {
          setTab(targetTab as any);
          setDrawerOpen(false);
        }}
      />

      {/* Global Unauthorized Domain Modal */}
      <UnauthorizedDomainModal
        isOpen={unauthorizedDomainModal}
        onClose={() => setUnauthorizedDomainModal(false)}
        onSelectEmailAuth={() => {
          setUnauthorizedDomainModal(false);
          navigate('/login');
        }}
        onDemoLogin={() => {
          setUnauthorizedDomainModal(false);
          handleUserAuthenticated({
            uid: 'demo_user_manager',
            email: 'info.reduean@gmail.com',
            displayName: 'Reduean Rahat (ম্যানেজার)',
            photoURL: null,
          });
        }}
        projectId="khaonkhata"
      />

      {/* Global Toast */}
      <Toast message={toastMsg} />
    </div>
  );
}
