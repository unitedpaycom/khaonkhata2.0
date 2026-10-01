import React, { useEffect, useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
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
  seedDemoData,
} from './utils/calc';
import { Icon, GoogleIcon, FacebookIcon } from './components/Icons';
import { Modal, ModalField } from './components/Modal';
import { Toast } from './components/Toast';
import { AddMemberModal } from './components/AddMemberModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  requestFcmPermissionAndGetToken,
  setupFcmForegroundListener,
  triggerMealPushNotification,
} from './utils/fcm';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Mess State
  const [currentMessId, setCurrentMessId] = useState<string>(() => {
    return localStorage.getItem('mm_cur_mess_id') || '';
  });
  const [messState, setMessState] = useState<MessState | null>(null);
  const [messLoading, setMessLoading] = useState(false);
  const [userMesses, setUserMesses] = useState<{ id: string; name: string; mgrEmail: string }[]>([]);

  // Navigation & View
  const [tab, setTab] = useState<'home' | 'deposit' | 'meal' | 'cost' | 'members' | 'detail' | 'active' | 'all' | 'settings' | 'profile'>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeYM, setActiveYM] = useState<string>(TD.slice(0, 7));
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Meal Tab specifics
  const [mealSubTab, setMealSubTab] = useState<'add' | 'req' | 'chart'>('add');
  const [mealDate, setMealDate] = useState<string>(TD);
  const [mealWho, setMealWho] = useState<string>('all');
  const [mealDraft, setMealDraft] = useState<Record<string, MealSlot>>({});

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
  const [createWithDemo, setCreateWithDemo] = useState(true);
  const [joinEmailOrId, setJoinEmailOrId] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  // Add Member Modal State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

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

  // Listen to Auth State
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        // Fetch or create user profile
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
        }
      } else {
        setProfile(null);
        setMessState(null);
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

        // If user profile has joinedMesses, include them too
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

  // Real-time listener for currentMessId
  useEffect(() => {
    if (!currentMessId || !user) {
      setMessState(null);
      return;
    }

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
          data.closed = data.closed || {};
          data.cutoff = data.cutoff ?? 21;
          setMessState(data);
        } else {
          showToast('মেসটি পাওয়া যায়নি বা মুছে ফেলা হয়েছে');
          setMessState(null);
          setCurrentMessId('');
          localStorage.removeItem('mm_cur_mess_id');
        }
      },
      (error) => {
        setMessLoading(false);
        handleFirestoreError(error, OperationType.GET, 'messes/' + currentMessId);
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

  // Save updated messState to Firestore (triggers real-time onSnapshot for everyone!)
  const saveStateToFirestore = async (newState: MessState, successMsg?: string) => {
    if (!newState.id) return;
    try {
      newState.updatedAt = new Date().toISOString();
      const messDocRef = doc(db, 'messes', newState.id);
      await setDoc(messDocRef, newState, { merge: true });
      if (successMsg) showToast(successMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'messes/' + newState.id);
      showToast('সেভ করতে সমস্যা হয়েছে');
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
    return (
      messState.members.find(
        m => (m.uid && m.uid === user.uid) || (m.email && m.email.toLowerCase() === user.email?.toLowerCase())
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
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      showToast('গুগল লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  // Sign-out Handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentMessId('');
      localStorage.removeItem('mm_cur_mess_id');
      setMessState(null);
      showToast('লগআউট সম্পন্ন হয়েছে');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  // Create Mess
  const handleCreateMess = async () => {
    if (!user) return;
    const name = createMessName.trim() || 'My Mess';
    const messId = 'mess_' + uid();
    let newState: MessState;

    if (createWithDemo) {
      newState = seedDemoData(name, user.displayName || 'ম্যানেজার', user.email || '', user.uid);
      newState.id = messId;
    } else {
      const m0Id = 'm0';
      newState = {
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
    }

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

  // Add Member
  const handleAddMember = async (newMember: Member) => {
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

    const nextState: MessState = {
      ...messState,
      members: nextMembers,
      memberEmails: allEmails,
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

    const nextState: MessState = {
      ...messState,
      deposits: [...messState.deposits, newDep],
    };

    saveStateToFirestore(nextState, 'জমা যোগ হয়েছে');
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
    }

    saveStateToFirestore(nextState, 'খরচ যোগ হয়েছে');
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

    const nextState: MessState = {
      ...messState,
      meals: nextMeals,
      reqs: nextReqs,
    };

    saveStateToFirestore(nextState, 'মিল সেভ হয়েছে!');

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
        }
      }
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

    const nextState: MessState = {
      ...messState,
      reqs: [...messState.reqs, newReq],
    };

    saveStateToFirestore(nextState, 'রিকোয়েস্ট পাঠানো হয়েছে');
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

    const nextState: MessState = {
      ...messState,
      meals: nextMeals,
      reqs: nextReqs,
    };

    saveStateToFirestore(nextState, 'রিকোয়েস্ট অ্যাপ্রুভ হয়েছে');

    // Trigger push notification for approved meal request
    const targetMember = messState.members.find((m) => m.id === target.m);
    triggerMealPushNotification({
      messId: messState.id,
      messName: messState.mess,
      memberName: targetMember?.name || 'সদস্য',
      date: target.date,
      action: 'approved',
      slotDetails: { b: target.b, l: target.l, d: target.d },
      totalMeals: target.b + target.l + target.d,
    });
  };

  // Reject Meal Request
  const handleRejectReq = (reqId: string) => {
    if (!checkManagerGuard() || !messState) return;
    const nextReqs = messState.reqs.map(r =>
      r.id === reqId ? { ...r, status: 'rejected' as const } : r
    );

    const nextState: MessState = {
      ...messState,
      reqs: nextReqs,
    };

    saveStateToFirestore(nextState, 'রিকোয়েস্ট বাতিল করা হয়েছে');
  };

  // Bengali Month Names
  const banglaMonths = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const [activeYear, activeMonthNum] = activeYM.split('-');

  // Days in active month for Meal Chart
  const daysInMonth = useMemo(() => {
    const dim = new Date(+activeYear, +activeMonthNum, 0).getDate();
    return Array.from({ length: dim }, (_, i) => `${activeYM}-${pad(i + 1)}`);
  }, [activeYear, activeMonthNum, activeYM]);

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--pri)] border-t-transparent animate-spin mx-auto"></div>
          <p className="font-semibold text-lg">KhaonKhata লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // Not signed in: Show Direct Google Login Screen
  if (!user) {
    return (
      <div id="gate">
        <div className="gc">
          <div className="gb">
            <i><Icon name="bowl" size={22} /></i>
            <span className="font-serif">KhaonKhata (খাওনখাতা)</span>
          </div>
          <h2>স্বাগতম</h2>
          <p className="mut mb-6">
            রিয়েলটাইম মেস মিল ও হিসাব দেখতে আপনার Google অ্যাকাউন্ট দিয়ে লগইন করুন।
          </p>

          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-6 rounded-2xl bg-white text-gray-800 font-semibold border border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 flex items-center justify-center gap-3 transition-all cursor-pointer text-base"
          >
            <GoogleIcon size={22} />
            <span>Google দিয়ে চালিয়ে যান</span>
          </button>

          <div className="mt-8 pt-6 border-t border-[var(--line)] text-center text-xs text-[var(--mut)] space-y-1">
            <p>✓ তাৎক্ষণিক রিয়েলটাইম সিঙ্ক (Firestore)</p>
            <p>✓ প্রতিদিনের মিল চার্ট, বাজার খরচ ও জমা</p>
            <p>✓ স্বয়ংক্রিয় মিল রেট ও ব্যালেন্স হিসাব</p>
          </div>
        </div>
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

              <div className="mt-6 pt-4 border-t border-[var(--line)] text-center">
                <button
                  onClick={handleSignOut}
                  className="lnk text-sm text-[var(--bad)] hover:underline"
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

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createWithDemo}
                  onChange={e => setCreateWithDemo(e.target.checked)}
                  className="w-5 h-5 !shadow-none !border-[var(--line)] cursor-pointer"
                />
                <span className="text-sm">ডেমো সদস্য ও মিল ডাটা সহ শুরু করুন (পরবর্তীতে এডিটযোগ্য)</span>
              </label>

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
            {tab === 'deposit' && 'Add Deposit'}
            {tab === 'meal' && 'Add Meal'}
            {tab === 'cost' && 'Add Cost'}
            {tab === 'members' && 'Mess Members'}
            {tab === 'detail' && 'Member Details'}
            {tab === 'active' && 'Active Month Details'}
            {tab === 'all' && 'All Month Details'}
            {tab === 'settings' && 'Mess Settings'}
            {tab === 'profile' && 'Profile'}
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

        {/* Live Status indicator */}
        <div className="flex items-center justify-between text-xs text-[var(--mut)] mb-3 px-1">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            রিয়েলটাইম সিঙ্ক সক্রিয়
          </span>
          <span>মেস: <b>{messState.mess}</b> ({isManager ? 'ম্যানেজার' : 'সদস্য'})</span>
        </div>

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
            <div className="hero2">
              <small>Mess Balance</small>
              <div className="big">
                {monthSummary ? tk(monthSummary.dep - monthSummary.tot) : '৳0'}
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
              <h3>My Summary</h3>
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
            </div>

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
                          saveStateToFirestore(
                            { ...messState, notices: [...messState.notices, newNotice] },
                            'নোটিশ প্রকাশ করা হয়েছে'
                          );
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
            <div className="stabs">
              {isManager && (
                <button
                  className={mealSubTab === 'add' ? 'on' : ''}
                  onClick={() => setMealSubTab('add')}
                >
                  Add Meal
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
            </div>

            {/* TAB: ADD MEAL (Manager) */}
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

                <label>মিলের তারিখ সিলেক্ট করুন</label>
                <input
                  type="date"
                  value={mealDate}
                  onChange={e => setMealDate(e.target.value)}
                />

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
                      return (
                        <div key={m.id} className="card mc">
                          <h3>
                            <span className="flex items-center gap-2">
                              <span className="av">{(m.name[0] || '?').toUpperCase()}</span>
                              <span>{m.name}</span>
                              {slot.rq ? <span className="rq">Request</span> : null}
                            </span>
                            <span>Total: {totalSlot}</span>
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

                <button
                  className="btn big mt-4"
                  onClick={handleSaveMealDraft}
                >
                  Save Realtime Meals
                </button>
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
                        <div className="text-right">
                          <b className={mSummary.bal >= 0 ? 'ok' : 'bad'}>
                            {tk(mSummary.bal)}
                          </b>
                          <br />
                          <small className="text-[var(--mut)]">বিস্তারিত ›</small>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* --- VIEW: MEMBER DETAIL --- */}
        {tab === 'detail' && detailMemberId && (
          <div className="pg space-y-4">
            {(() => {
              const mem = messState.members.find(m => m.id === detailMemberId);
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
                        <br />
                        <small>
                          {mem.email || 'Email নেই'} · {mem.room || 'রুম নেই'} · জয়েনিং: {mem.join || '-'}
                        </small>
                      </div>
                    </div>

                    {isManager && (
                      <div className="acts !justify-start mt-4">
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
                                  onConfirm: () => {
                                    const filtered = messState.members.filter(m => m.id !== mem.id);
                                    saveStateToFirestore(
                                      { ...messState, members: filtered },
                                      'সদস্য মুছে ফেলা হয়েছে'
                                    );
                                    setTab('members');
                                  },
                                });
                              },
                            });
                          }}
                        >
                          Edit / Remove Member
                        </button>
                      </div>
                    )}
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

            <button
              className="btn"
              onClick={() => window.print()}
            >
              রিপোর্ট প্রিন্ট / PDF
            </button>
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

      {/* Add Member with Email Search Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onAddMember={handleAddMember}
        existingEmails={messState.members.map(m => m.email || '').filter(Boolean)}
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

      {/* Global Toast */}
      <Toast message={toastMsg} />
    </div>
  );
}
