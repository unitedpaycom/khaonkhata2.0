import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Member, UserProfile } from '../types';
import { TD, uid } from '../utils/calc';
import { sendWelcomeMemberEmail } from '../utils/emailClient';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (newMember: Member, initialDeposit?: number) => Promise<void>;
  existingEmails: string[];
  messName?: string;
}

// Generate random secure temporary password like Khaon#4821
function generateRandomTempPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Khaon#${digits}`;
}

// Browser SHA-256 hash using Web Crypto API
async function sha256Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onAddMember,
  existingEmails,
  messName = 'KhaonKhata',
}) => {
  const [name, setName] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [room, setRoom] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [joinDate, setJoinDate] = useState(TD);
  const [tempPassword, setTempPassword] = useState(generateRandomTempPassword());

  const [isSearching, setIsSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success state to show credentials to manager
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    loginId: string;
    password: string;
    emailSent: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmailOrUsername('');
      setPhone('');
      setRoom('');
      setInitialDeposit('');
      setJoinDate(TD);
      setTempPassword(generateRandomTempPassword());
      setSearchedUser(null);
      setSearchStatus('idle');
      setErrorMessage(null);
      setSubmitting(false);
      setCreatedCredentials(null);
      setCopied(false);
    }
  }, [isOpen]);

  // Search existing user if real email entered
  const searchUserByEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

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
    const cleanName = name.trim();
    const cleanInput = emailOrUsername.trim();

    if (!cleanName) {
      setErrorMessage('সদস্যের নাম লিখুন');
      return;
    }
    if (!cleanInput) {
      setErrorMessage('সদস্যের ইমেইল অথবা ইউজারনেম দিন');
      return;
    }

    const isRealEmail = cleanInput.includes('@') && cleanInput.includes('.');
    const cleanEmail = isRealEmail ? cleanInput.toLowerCase() : `${cleanInput.toLowerCase()}@khaonkhata.online`;
    const cleanUsername = cleanInput.toLowerCase();

    // Check duplicate email
    if (isRealEmail && existingEmails.map(e => e.toLowerCase()).includes(cleanEmail)) {
      setErrorMessage('এই ইমেইলের সদস্য ইতোমধ্যে মেসে যুক্ত আছেন');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const memberUid = searchedUser?.uid || 'u_' + uid();
      const memberId = 'm_' + uid();
      const passwordToUse = tempPassword.trim() || generateRandomTempPassword();

      // Generate salt & passwordHash for database password login
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const passwordHash = await sha256Hex(passwordToUse + salt);

      // Create or update user account in Firestore
      try {
        const userRef = doc(db, 'users', memberUid);
        await setDoc(
          userRef,
          {
            uid: memberUid,
            name: cleanName,
            email: cleanEmail,
            username: cleanUsername,
            phone: phone.trim() || '',
            salt,
            passwordHash,
            isTemporaryPassword: true,
            isArchived: false,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (authDbErr) {
        console.warn('Could not store credentials in users doc:', authDbErr);
      }

      // Add to mess state
      const newMember: Member = {
        id: memberId,
        uid: memberUid,
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim() || undefined,
        room: room.trim() || undefined,
        join: joinDate || TD,
        photoURL: searchedUser?.photoURL || undefined,
        tempPassword: passwordToUse,
        isArchived: false,
      };

      const depAmt = Number(initialDeposit) || 0;
      await onAddMember(newMember, depAmt > 0 ? depAmt : undefined);

      // Dispatch Welcome Email via Resend if real email provided
      let emailSent = false;
      if (isRealEmail) {
        try {
          const emailRes = await sendWelcomeMemberEmail({
            to: cleanEmail,
            memberName: cleanName,
            messName,
            tempPassword: passwordToUse,
            loginUrl: 'https://khaonkhata.online/login',
          });
          emailSent = !!emailRes.success;
        } catch (mailErr) {
          console.warn('Welcome email could not be sent (ignored):', mailErr);
          emailSent = false;
        }
      }

      // Show Manager Credentials Display Screen
      setCreatedCredentials({
        name: cleanName,
        loginId: isRealEmail ? cleanEmail : cleanUsername,
        password: passwordToUse,
        emailSent,
      });
    } catch (err: any) {
      console.error('Failed to add member:', err);
      setErrorMessage(err?.message || 'সদস্য যোগ করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentialsText = () => {
    if (!createdCredentials) return;
    const text = `🎉 KhaonKhata মেস লগইন তথ্য:\nমেস: ${messName}\nনাম: ${createdCredentials.name}\nলগইন আইডি / ইমেইল: ${createdCredentials.loginId}\nঅস্থায়ী পাসওয়ার্ড: ${createdCredentials.password}\nলগইন লিঙ্ক: https://khaonkhata.online/login\n(লগইন করার পর পাসওয়ার্ড পরিবর্তন করে নিন)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getWhatsAppShareUrl = () => {
    if (!createdCredentials) return '#';
    const text = `🎉 KhaonKhata মেস লগইন তথ্য:\nমেস: ${messName}\nনাম: ${createdCredentials.name}\nলগইন আইডি: ${createdCredentials.loginId}\nঅস্থায়ী পাসওয়ার্ড: ${createdCredentials.password}\nলগইন লিঙ্ক: https://khaonkhata.online/login`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
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
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card)', color: 'var(--ink)' }}
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--line)]">
          <h3 className="text-lg font-bold m-0 font-serif flex items-center gap-2">
            <span>👤</span>
            <span>{createdCredentials ? 'সদস্য লগইন ক্রেডেনশিয়াল' : 'নতুন সদস্য যোগ ও ক্রেডেনশিয়াল তৈরি'}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[var(--line)] cursor-pointer hover:bg-[var(--mut)]/20"
          >
            ✕
          </button>
        </div>

        {/* SUCCESS CREDENTIALS VIEW FOR MANAGER */}
        {createdCredentials ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 rounded-xl text-center">
              <span className="text-3xl">🎉</span>
              <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-100 mt-1 mb-1">
                সদস্য সফলভাবে যুক্ত করা হয়েছে!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 m-0">
                {createdCredentials.emailSent
                  ? 'মেম্বারের ইমেইলে স্বয়ংক্রিয় ওয়েলকাম ইমেইল পাঠানো হয়েছে।'
                  : 'আপনি নিচের ক্রেডেনশিয়াল মেম্বারকে মুখে বা মেসেজে সরাসরি দিতে পারেন।'}
              </p>
            </div>

            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--mut)]">সদস্যের নাম:</span>
                <b className="text-[var(--ink)]">{createdCredentials.name}</b>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--mut)]">লগইন আইডি / ইমেইল:</span>
                <code className="bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {createdCredentials.loginId}
                </code>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--mut)]">অস্থায়ী পাসওয়ার্ড:</span>
                <code className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 rounded-md font-mono font-extrabold text-base tracking-wider">
                  {createdCredentials.password}
                </code>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-[var(--line)]">
                <span className="text-[var(--mut)]">লগইন লিংক:</span>
                <a
                  href="https://khaonkhata.online/login"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  khaonkhata.online/login
                </a>
              </div>
            </div>

            <p className="text-xs text-[var(--mut)] text-center m-0">
              💡 এই পাসওয়ার্ডটি মেম্বার কার্ডেও দেখতে পাবেন। মেম্বার প্রথমবার লগইন করার পর প্রোফাইল থেকে নিজের পাসওয়ার্ড বদলে নিতে পারবেন।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={copyCredentialsText}
                className="btn s flex items-center justify-center gap-1.5 font-bold cursor-pointer"
              >
                <span>{copied ? '✓ কপি হয়েছে!' : '📋 তথ্য কপি করুন'}</span>
              </button>
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noreferrer"
                className="btn s !bg-emerald-600 !text-white hover:!bg-emerald-700 flex items-center justify-center gap-1.5 font-bold cursor-pointer text-center"
              >
                <span>💬 WhatsApp-এ পাঠান</span>
              </a>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn big g w-full font-bold mt-2"
            >
              সম্পন্ন
            </button>
          </div>
        ) : (
          /* ADD MEMBER FORM */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Member Name */}
            <div>
              <label className="block text-xs font-semibold text-[var(--mut)] mb-1">
                সদস্যের নাম <span className="text-[var(--bad)]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: রাহাত আহমেদ"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none text-sm font-medium"
              />
            </div>

            {/* Email or Username */}
            <div>
              <label className="block text-xs font-semibold text-[var(--mut)] mb-1">
                ইমেইল অথবা ইউজারনেম (লগইন আইডি) <span className="text-[var(--bad)]">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="যেমন: rahat@gmail.com অথবা rahat12"
                  value={emailOrUsername}
                  onChange={e => setEmailOrUsername(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none text-sm"
                />
                {emailOrUsername.includes('@') && (
                  <button
                    type="button"
                    onClick={() => searchUserByEmail(emailOrUsername)}
                    disabled={isSearching}
                    className="px-3.5 py-2 rounded-xl bg-[var(--pri)] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSearching ? '...' : 'যাচাই'}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[var(--mut)] mt-1 mb-0">
                ইমেইল দিলে স্বয়ংক্রিয় ওয়েলকাম ইমেইল ও লগইন ক্রেডেনশিয়াল পাঠানো হবে।
              </p>
            </div>

            {/* Search result indicator */}
            {searchStatus === 'found' && searchedUser && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                <span>✓ ডাটাবেজে পাওয়া গেছে: <b>{searchedUser.name}</b> ({searchedUser.email})</span>
              </div>
            )}

            {/* Auto-Generated Temporary Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-[var(--mut)]">
                  অস্থায়ী পাসওয়ার্ড (সিস্টেম জেনারেটেড)
                </label>
                <button
                  type="button"
                  onClick={() => setTempPassword(generateRandomTempPassword())}
                  className="text-[11px] text-[var(--pri)] hover:underline cursor-pointer flex items-center gap-1"
                >
                  🔄 নতুন পাসওয়ার্ড
                </button>
              </div>
              <input
                type="text"
                required
                value={tempPassword}
                onChange={e => setTempPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 font-mono font-bold text-sm text-emerald-800 dark:text-emerald-200 outline-none"
              />
              <p className="text-[11px] text-[var(--mut)] mt-1 mb-0">
                🔒 এই পাসওয়ার্ডটি মেম্বারকে জানাবেন। প্রথমবার লগইন করে উনি এটি পরিবর্তন করতে পারবেন।
              </p>
            </div>

            {/* Phone & Room in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--mut)] mb-1">
                  ফোন নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="tel"
                  placeholder="যেমন: 017XXXXXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--mut)] mb-1">
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
            </div>

            {/* Initial Deposit & Joining Date in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--mut)] mb-1">
                  প্রাথমিক জমা (টাকা - ঐচ্ছিক)
                </label>
                <input
                  type="number"
                  placeholder="যেমন: 2000"
                  value={initialDeposit}
                  onChange={e => setInitialDeposit(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--mut)] mb-1">
                  যোগদানের তারিখ
                </label>
                <input
                  type="date"
                  value={joinDate}
                  onChange={e => setJoinDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none text-sm"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-[var(--bad)] font-semibold mb-0 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                ⚠️ {errorMessage}
              </p>
            )}

            <div className="flex gap-2 justify-end pt-3 border-t border-[var(--line)]">
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
                className="btn text-sm py-2 px-5 font-bold !bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-xs cursor-pointer"
              >
                {submitting ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'সদস্য তৈরি ও ক্রেডেনশিয়াল সংরক্ষণ'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddMemberModal;
