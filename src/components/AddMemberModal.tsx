import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Member, UserProfile } from '../types';
import { TD, uid } from '../utils/calc';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (newMember: Member) => Promise<void>;
  existingEmails: string[];
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onAddMember,
  existingEmails,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [joinDate, setJoinDate] = useState(TD);

  const [isSearching, setIsSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setName('');
      setRoom('');
      setJoinDate(TD);
      setSearchedUser(null);
      setSearchStatus('idle');
      setErrorMessage(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  // Debounced search when email looks valid
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setSearchedUser(null);
      setSearchStatus('idle');
      setErrorMessage(null);
      return;
    }

    const timer = setTimeout(() => {
      searchUserByEmail(trimmed);
    }, 450);

    return () => clearTimeout(timer);
  }, [email]);

  const searchUserByEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsSearching(true);
    setSearchStatus('searching');
    setErrorMessage(null);

    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userData = snap.docs[0].data() as UserProfile;
        setSearchedUser(userData);
        setSearchStatus('found');
        if (userData.name) {
          setName(userData.name);
        }
      } else {
        setSearchedUser(null);
        setSearchStatus('not_found');
      }
    } catch (err) {
      console.error('Error searching user by email:', err);
      setSearchStatus('not_found');
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail) {
      setErrorMessage('সদস্যের ইমেইল অ্যাড্রেস দিন');
      return;
    }
    if (!cleanName) {
      setErrorMessage('সদস্যের নাম লিখুন');
      return;
    }

    if (existingEmails.map(e => e.toLowerCase()).includes(cleanEmail)) {
      setErrorMessage('এই ইমেইলের সদস্য ইতোমধ্যে মেসে যুক্ত আছেন');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const newMember: Member = {
        id: 'm_' + uid(),
        uid: searchedUser?.uid || undefined,
        name: cleanName,
        email: cleanEmail,
        room: room.trim() || undefined,
        join: joinDate || TD,
        photoURL: searchedUser?.photoURL || undefined,
      };

      await onAddMember(newMember);
      onClose();
    } catch (err) {
      console.error('Failed to add member:', err);
      setErrorMessage('সদস্য যোগ করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={e => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ background: 'var(--card)', color: 'var(--ink)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold m-0 font-serif">নতুন সদস্য যোগ করুন</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[var(--line)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email Input with Verify button */}
          <div>
            <label className="block text-xs font-medium text-[var(--mut)] mb-1">
              সদস্যের ইমেইল (Google Email) <span className="text-[var(--bad)]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="যেমন: user@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => searchUserByEmail(email)}
                disabled={isSearching || !email.includes('@')}
                className="px-3.5 py-2 rounded-xl bg-[var(--pri)] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSearching ? 'খোঁজা হচ্ছে...' : 'যাচাই'}
              </button>
            </div>
          </div>

          {/* Search result indicator */}
          {searchStatus === 'searching' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              ডাটাবেজে ব্যবহারকারী খোঁজা হচ্ছে...
            </div>
          )}

          {searchStatus === 'found' && searchedUser && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-base overflow-hidden flex-shrink-0">
                {searchedUser.photoURL ? (
                  <img src={searchedUser.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  (searchedUser.name[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <b className="text-sm truncate text-emerald-950 dark:text-emerald-100">
                    {searchedUser.name}
                  </b>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold">
                    গুগল একাউন্ট
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 truncate m-0">
                  {searchedUser.email}
                </p>
              </div>
            </div>
          )}

          {searchStatus === 'not_found' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
              ℹ এই ইমেইলে এখনো কোনো একাউন্ট পাওয়া যায়নি। আপনি নাম লিখে যোগ করে রাখতে পারেন—উনি পরবর্তীতে Google দিয়ে লগইন করলেই সরাসরি মেসে যুক্ত হয়ে যাবেন।
            </div>
          )}

          {/* Member Name */}
          <div>
            <label className="block text-xs font-medium text-[var(--mut)] mb-1">
              সদস্যের নাম <span className="text-[var(--bad)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="সদস্যের পুরো নাম লিখুন"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none text-sm"
            />
            {searchedUser?.name && (
              <p className="text-[11px] text-[var(--ok)] mt-1 mb-0">
                ✓ গুগল একাউন্ট থেকে স্বয়ংক্রিয় নাম নেওয়া হয়েছে
              </p>
            )}
          </div>

          {/* Room Number */}
          <div>
            <label className="block text-xs font-medium text-[var(--mut)] mb-1">
              রুম নং (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: Room 102"
              value={room}
              onChange={e => setRoom(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none text-sm"
            />
          </div>

          {/* Joining Date */}
          <div>
            <label className="block text-xs font-medium text-[var(--mut)] mb-1">
              যোগদানের তারিখ
            </label>
            <input
              type="date"
              value={joinDate}
              onChange={e => setJoinDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none text-sm"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-[var(--bad)] font-semibold mb-0">
              {errorMessage}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn g text-sm py-2 px-4"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn text-sm py-2 px-5"
            >
              {submitting ? 'যুক্ত করা হচ্ছে...' : 'সদস্য যোগ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
