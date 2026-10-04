import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { requestPasswordResetOTP, verifyOTPAndResetPassword } from '../utils/emailClient';

interface LoginPageProps {
  onGoogleSignIn: () => void;
  onBackToHome: () => void;
  unauthorizedDomainModal: boolean;
  setUnauthorizedDomainModal: (val: boolean) => void;
  showToast: (msg: string) => void;
  onNavigate: (path: string) => void;
  onUserAuthenticated?: (user: { uid: string; email: string | null; displayName: string | null; photoURL?: string | null }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToHome,
  setUnauthorizedDomainModal,
  showToast,
  onNavigate,
  onUserAuthenticated,
}) => {
  // Mode: 'login' | 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#signup') {
      return 'signup';
    }
    return 'login';
  });

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Field Errors
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    terms?: string;
  }>({});

  // Banner Message & Loading State
  const [message, setMessage] = useState<{ type: 'info' | 'error' | 'ok'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotCountdown, setForgotCountdown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (forgotCountdown <= 0) return;
    const interval = setInterval(() => {
      setForgotCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [forgotCountdown]);

  // Sync mode with hash if hash changes
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#signup') {
        setMode('signup');
      } else if (window.location.hash === '#login') {
        setMode('login');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrors({});
    setMessage(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', newMode === 'signup' ? '#signup' : '#login');
    }
  };

  // Password Strength Calculation
  const calcPasswordStrength = (val: string): { score: number; label: string; color: string } => {
    if (!val) {
      return {
        score: 0,
        label: 'Use 8+ characters with a mix of letters, numbers and symbols.',
        color: 'var(--line)',
      };
    }
    let s = 0;
    if (val.length >= 8) s++;
    if (/[a-z]/.test(val) && /[A-Z]/.test(val)) s++;
    if (/\d/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;

    const score = Math.min(4, Math.max(1, s));
    const labels = ['', 'Too weak password', 'Weak password', 'Good password', 'Strong password'];
    const colors = ['', '#D6455D', '#F0A93B', '#7ac36a', '#0E8F63'];

    return {
      score,
      label: labels[score] || 'Password',
      color: colors[score] || '#0E8F63',
    };
  };

  const strength = calcPasswordStrength(password);

  // Helper to map Firebase Auth error codes to user-friendly messages
  const getFirebaseErrorMessage = (err: any): string => {
    const code = err?.code || '';
    const rawMsg = err?.message || '';

    if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
      setUnauthorizedDomainModal(true);
      return 'এই ডোমেইনটি Firebase Auth-এ অনুমোদিত নয়। অনুগ্রহ করে এডমিন কনসোলে ডোমেইন যোগ করুন।';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return 'ভুল ইমেইল বা পাসওয়ার্ড। অনুগ্রহ করে পুনরায় যাচাই করুন।';
    }
    if (code === 'auth/user-not-found') {
      return 'এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে Sign up করুন।';
    }
    if (code === 'auth/email-already-in-use') {
      return 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে Log in করুন।';
    }
    if (code === 'auth/weak-password') {
      return 'পাসওয়ার্ড খুব দুর্বল। কমপক্ষে ৮ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।';
    }
    if (code === 'auth/invalid-email') {
      return 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা লিখুন।';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'লগইন পপআপ উইন্ডো বন্ধ করা হয়েছে।';
    }
    if (code === 'auth/too-many-requests') {
      return 'অতিরিক্ত চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।';
    }
    return rawMsg || 'লগইন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  };

  // Google Sign-In
  const handleGoogleAuth = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        // Ensure user doc in Firestore
        const userRef = doc(db, 'users', res.user.uid);
        await setDoc(
          userRef,
          {
            uid: res.user.uid,
            name: res.user.displayName || 'Google User',
            email: res.user.email || '',
            photoURL: res.user.photoURL || undefined,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );

        setMessage({ type: 'ok', text: `Success! Welcome, ${res.user.displayName || 'User'}. Redirecting…` });
        showToast(`স্বাগতম, ${res.user.displayName || 'ব্যবহারকারী'}`);
        setTimeout(() => {
          onNavigate('/app');
        }, 300);
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      setMessage({ type: 'error', text: getFirebaseErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Login
  const handleEmailLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setErrors((prev) => ({ ...prev, email: 'Enter a valid email address.' }));
      return;
    }
    if (!password) {
      setErrors((prev) => ({ ...prev, password: 'Enter your password.' }));
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      // Set persistence according to rememberMe
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
      if (res.user) {
        const appUser = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL,
        };
        try {
          localStorage.setItem('khaonkhata_auth_user', JSON.stringify(appUser));
        } catch {
          // ignore
        }
        if (onUserAuthenticated) {
          onUserAuthenticated(appUser);
        }
        setMessage({ type: 'ok', text: 'Success! Logging in…' });
        showToast(`স্বাগতম, ${res.user.displayName || 'ব্যবহারকারী'}`);
        setTimeout(() => {
          onNavigate('/app');
        }, 200);
      }
    } catch (err: any) {
      console.warn('Firebase email login failed, checking reset password in database...', err?.code);

      // Check if user has an updated password from OTP reset flow
      let loggedIn = false;
      try {
        const verifyRes = await fetch('/api/auth/login-with-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData.success && verifyData.user) {
            loggedIn = true;
            const appUser = {
              uid: verifyData.user.uid,
              email: verifyData.user.email,
              displayName: verifyData.user.name,
              photoURL: verifyData.user.photoURL,
            };
            try {
              localStorage.setItem('khaonkhata_auth_user', JSON.stringify(appUser));
            } catch {
              // ignore
            }
            if (onUserAuthenticated) {
              onUserAuthenticated(appUser);
            }
            setMessage({ type: 'ok', text: 'Success! Logging in…' });
            showToast(`স্বাগতম, ${verifyData.user.name || 'ব্যবহারকারী'}`);
            setTimeout(() => {
              onNavigate('/app');
            }, 200);
            return;
          }
        }
      } catch (checkErr) {
        console.warn('Fallback login check failed:', checkErr);
      }

      if (!loggedIn) {
        console.error('Email login error:', err);
        setMessage({ type: 'error', text: getFirebaseErrorMessage(err) });
      }
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Sign Up
  const handleEmailSignUp = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    const newErrors: { name?: string; email?: string; password?: string; terms?: string } = {};

    if (!cleanName) {
      newErrors.name = 'Please enter your name.';
    }
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!password || password.length < 8) {
      newErrors.password = 'Use at least 8 characters.';
    }
    if (!agreeTerms) {
      newErrors.terms = 'Please accept the terms to continue.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      if (res.user) {
        // 1. Update Firebase display name
        await updateProfile(res.user, { displayName: cleanName });

        // 2. Save user metadata to Firestore 'users' collection
        const userRef = doc(db, 'users', res.user.uid);
        await setDoc(
          userRef,
          {
            uid: res.user.uid,
            name: cleanName,
            email: cleanEmail,
            createdAt: new Date().toISOString(),
            joinedMesses: [],
          },
          { merge: true }
        );

        setMessage({ type: 'ok', text: 'Account created! Redirecting to dashboard…' });
        showToast(`স্বাগতম, ${cleanName}! অ্যাকাউন্ট তৈরি সফল হয়েছে।`);
        setTimeout(() => {
          onNavigate('/app');
        }, 300);
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      setMessage({ type: 'error', text: getFirebaseErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  // Open OTP Password Reset Modal
  const handleOpenForgotModal = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setForgotEmail(email.trim());
    setForgotOtp('');
    setForgotNewPass('');
    setForgotConfirmPass('');
    setForgotError(null);
    setForgotSuccess(null);
    setForgotStep(1);
    setShowForgotModal(true);
  };

  // Step 1: Request 6-Digit OTP via Resend API
  const handleRequestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = forgotEmail.trim().toLowerCase();
    if (!clean || !/^\S+@\S+\.\S+$/.test(clean)) {
      setForgotError('অনুগ্রহ করে সঠিক ইমেইল এড্রেস লিখুন।');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await requestPasswordResetOTP(clean);
      if (res.success) {
        setForgotStep(2);
        setForgotCountdown(60);
        setForgotSuccess(res.message || '৬-সংখ্যার ওটিপি কোড আপনার ইমেইলে পাঠানো হয়েছে (মেয়াদ ১০ মিনিট)।');
        showToast('ওটিপি কোড সফলভাবে পাঠানো হয়েছে!');
      } else {
        setForgotError(res.error || 'ওটিপি পাঠাতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Validate OTP and Hash Password in Database
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = forgotEmail.trim().toLowerCase();
    const code = forgotOtp.trim();

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      setForgotError('অনুগ্রহ করে সঠিক ৬-সংখ্যার ওটিপি কোড লিখুন।');
      return;
    }
    if (!forgotNewPass || forgotNewPass.length < 6) {
      setForgotError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('উভয় পাসওয়ার্ড মেলেনি। আবার পরীক্ষা করুন।');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await verifyOTPAndResetPassword({
        email: clean,
        code,
        newPassword: forgotNewPass,
      });

      if (res.success) {
        setForgotSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
        showToast('পাসওয়ার্ড রিসেট সফল! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।');
        // Pre-fill login email & password
        setEmail(clean);
        setPassword(forgotNewPass);
        setTimeout(() => {
          setShowForgotModal(false);
          setMessage({
            type: 'ok',
            text: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। এখন লগইন বাটনে ক্লিক করুন।',
          });
        }, 1200);
      } else {
        setForgotError(res.error || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।');
    } finally {
      setForgotLoading(false);
    }
  };

  // Legacy fallback password reset
  const handleForgotPassword = (e: React.MouseEvent) => {
    handleOpenForgotModal(e);
  };

  // Expose backend auth interface on window.KhaonKhataAuth for external/headless invocation
  useEffect(() => {
    window.KhaonKhataAuth = {
      signInWithGoogle: handleGoogleAuth,
      signInWithEmail: async ({ email: em, password: pw, remember: rem }) => {
        setEmail(em);
        setPassword(pw);
        if (rem !== undefined) setRememberMe(rem);
        await handleEmailLogin();
      },
      signUpWithEmail: async ({ name: nm, email: em, password: pw }) => {
        setName(nm);
        setEmail(em);
        setPassword(pw);
        await handleEmailSignUp();
      },
      resetPassword: async (em) => {
        setEmail(em);
        await sendPasswordResetEmail(auth, em);
      },
    };

    return () => {
      delete window.KhaonKhataAuth;
    };
  }, [email, password, name, rememberMe, agreeTerms]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (mode === 'signup') {
      handleEmailSignUp();
    } else {
      handleEmailLogin();
    }
  };

  return (
    <div className="auth-page selection:bg-emerald-500 selection:text-white">
      {/* SVG Icon Definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="auth-check" viewBox="0 0 24 24">
            <path d="M5 12l5 5L20 7" />
          </symbol>
          <symbol id="auth-back" viewBox="0 0 24 24">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </symbol>
          <symbol id="auth-bowl" viewBox="0 0 24 24">
            <path d="M3 12h18a9 9 0 01-18 0zM8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4" />
          </symbol>
          <symbol id="auth-sync" viewBox="0 0 24 24">
            <path d="M7 7h12l-3-3M17 17H5l3 3" />
          </symbol>
          <symbol id="auth-calc" viewBox="0 0 24 24">
            <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
          </symbol>
          <symbol id="auth-mail" viewBox="0 0 24 24">
            <path d="M4 5h16v14H4zM4 7l8 6 8-6" />
          </symbol>
        </defs>
      </svg>

      <div className="auth-wrap">
        {/* ============================================================
            BRAND SIDEBAR (DESKTOP)
            ============================================================ */}
        <aside className="auth-brand" aria-hidden="true">
          <a
            className="auth-logo"
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              onBackToHome();
            }}
            tabIndex={-1}
          >
            <i>
              <svg className="i" width="22" height="22">
                <use href="#auth-bowl" />
              </svg>
            </i>
            <span>
              KhaonKhata <small>(খাওনখাতা)</small>
            </span>
          </a>

          <div className="auth-bm">
            <h2>
              Your mess, <em>perfectly in sync.</em>
            </h2>
            <p>
              Meals, deposits and bazaar costs, calculated automatically and visible to everyone, the moment they happen.
            </p>
            <ul className="auth-vp">
              <li>
                <span>
                  <svg className="i">
                    <use href="#auth-sync" />
                  </svg>
                </span>
                Real-time updates for every member
              </li>
              <li>
                <span>
                  <svg className="i">
                    <use href="#auth-calc" />
                  </svg>
                </span>
                Automatic meal rate and balances
              </li>
              <li>
                <span>
                  <svg className="i">
                    <use href="#auth-mail" />
                  </svg>
                </span>
                Email receipts for every deposit
              </li>
            </ul>

            <div className="auth-float">
              <div className="auth-fc auth-f1">
                <small>Mess Balance</small>
                <b>৳3,240</b>
              </div>
              <div className="auth-fc auth-f2">
                <small>Meal Rate</small>
                <b>56.04৳</b>
              </div>
              <div className="auth-fc auth-f3">
                <span>R</span>
                <span>K</span>
                <span>S</span>
                <span>J</span>
                <em>6 eating today</em>
              </div>
            </div>
          </div>

          <div className="auth-bf">© 2026 KhaonKhata. All rights reserved.</div>
        </aside>

        {/* ============================================================
            FORM PANEL (RIGHT SIDE)
            ============================================================ */}
        <section className="auth-panel">
          <div className="auth-top">
            <button
              type="button"
              className="back-btn"
              onClick={onBackToHome}
            >
              <svg className="i" width="18" height="18">
                <use href="#auth-back" />
              </svg>
              <span>Back to home</span>
            </button>
            <span style={{ color: 'var(--mut)' }}>
              <a
                href="mailto:support.khaonkhata@gmail.com"
                style={{ fontWeight: 500, color: 'var(--mut)', textDecoration: 'none' }}
              >
                Need help?
              </a>
            </span>
          </div>

          <div className="auth-card" id="card" data-mode={mode}>
            {/* Mobile Header Logo */}
            <div
              className="auth-logo auth-mlogo"
              onClick={onBackToHome}
              style={{ fontSize: '20px', cursor: 'pointer' }}
            >
              <i style={{ width: '34px', height: '34px' }}>
                <svg className="i" width="19" height="19">
                  <use href="#auth-bowl" />
                </svg>
              </i>
              <span>KhaonKhata</span>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="auth-seg" role="tablist" aria-label="Choose action">
              <i></i>
              <button
                type="button"
                role="tab"
                id="t-login"
                aria-selected={mode === 'login'}
                data-m="login"
                onClick={() => switchMode('login')}
              >
                Log in
              </button>
              <button
                type="button"
                role="tab"
                id="t-signup"
                aria-selected={mode === 'signup'}
                data-m="signup"
                onClick={() => switchMode('signup')}
              >
                Sign up
              </button>
            </div>

            {/* Dynamic Titles */}
            <h1 id="h">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
            <p className="sub" id="s">
              {mode === 'signup' ? 'Start managing your mess in minutes.' : 'Log in to manage your mess.'}
            </p>

            {/* Google Authentication Button */}
            <button
              type="button"
              className="auth-g"
              id="google"
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.5 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="auth-or">or use your email</div>

            {/* Email/Password Form */}
            <form id="form" noValidate onSubmit={handleSubmit}>
              {/* Full Name field (Sign Up Only) */}
              <div className="auth-col su" id="su1">
                <div>
                  <div className={`auth-f ${errors.name ? 'err' : ''}`} id="fn">
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      aria-describedby="name-e"
                      aria-invalid={!!errors.name}
                    />
                    <label htmlFor="name">Full name</label>
                  </div>
                  <div className="auth-er" id="name-e" aria-live="polite">
                    {errors.name}
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className={`auth-f ${errors.email ? 'err' : ''}`} id="fe">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  aria-describedby="email-e"
                  aria-invalid={!!errors.email}
                />
                <label htmlFor="email">Email address</label>
              </div>
              <div className="auth-er" id="email-e" aria-live="polite">
                {errors.email}
              </div>

              {/* Password Field with Eye Toggle */}
              <div className={`auth-f ${errors.password ? 'err' : ''}`} id="fp">
                <input
                  id="pw"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  aria-describedby="pw-e"
                  aria-invalid={!!errors.password}
                />
                <label htmlFor="pw">Password</label>
                <button
                  type="button"
                  className="auth-eye"
                  id="eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="auth-er" id="pw-e" aria-live="polite">
                {errors.password}
              </div>

              {/* Password Strength Meter & Terms Checkbox (Sign Up Only) */}
              <div className="auth-col su" id="su2">
                <div>
                  <div className="auth-str" aria-hidden="true">
                    {[1, 2, 3, 4].map((i) => (
                      <i
                        key={i}
                        style={{
                          background: password && i <= strength.score ? strength.color : '',
                        }}
                      />
                    ))}
                  </div>
                  <div className="auth-sl" id="sl">
                    {strength.label}
                  </div>

                  <label className="auth-ck" style={{ marginTop: '12px' }}>
                    <input
                      type="checkbox"
                      id="tm"
                      checked={agreeTerms}
                      onChange={(e) => {
                        setAgreeTerms(e.target.checked);
                        if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                      }}
                    />
                    <b>
                      <svg className="i">
                        <use href="#auth-check" />
                      </svg>
                    </b>
                    <span>
                      I agree to the{' '}
                      <a
                        href="/#terms"
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate('/terms');
                        }}
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href="/#privacy"
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate('/privacy');
                        }}
                      >
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                  <div className="auth-er" id="tm-e" aria-live="polite">
                    {errors.terms}
                  </div>
                </div>
              </div>

              {/* Remember Me & Forgot Password (Login Only) */}
              <div className="auth-col li" id="li1">
                <div>
                  <div className="auth-row">
                    <label className="auth-ck" style={{ alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        id="rm"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <b style={{ margin: 0 }}>
                        <svg className="i">
                          <use href="#auth-check" />
                        </svg>
                      </b>
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      id="forgot"
                      onClick={handleOpenForgotModal}
                      className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer bg-transparent border-0 p-0 transition-colors"
                      style={{ fontSize: '14px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                className="auth-go"
                id="go"
                type="submit"
                disabled={loading}
              >
                {loading && <span className="auth-sp"></span>}
                <span id="gl">{mode === 'signup' ? 'Create account' : 'Log in'}</span>
              </button>

              {/* Message Alert Banner */}
              {message && (
                <div
                  className={`auth-msg on ${message.type}`}
                  id="msg"
                  role="status"
                  aria-live="polite"
                >
                  {message.text}
                </div>
              )}
            </form>

            {/* Switch Mode Prompt */}
            <p className="auth-sw">
              <span id="sw">
                {mode === 'signup' ? 'Already have an account?' : 'New to KhaonKhata?'}
              </span>{' '}
              <button
                type="button"
                id="swb"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'signup' ? 'Log in' : 'Create an account'}
              </button>
            </p>
          </div>

          <p className="auth-legal">
            Protected sign-in. Your data stays private and is never sold to third parties.
          </p>
        </section>
      </div>

      {/* Forgot Password OTP Modal */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.65)' }}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            style={{ maxWidth: '440px', width: '100%', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#ffffff' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  🔑 পাসওয়ার্ড রিসেট (OTP ভেরিফিকেশন)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#d1fae5' }}>
                  {forgotStep === 1 ? 'রেজিস্টার্ড ইমেইলে ওটিপি কোড পাঠানো হবে' : 'ইমেইল থেকে ওটিপি কোড ও নতুন পাসওয়ার্ড দিন'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}
                title="বন্ধ করুন"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Alert Feedback */}
              {forgotError && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span>⚠️</span>
                  <span>{forgotError}</span>
                </div>
              )}
              {forgotSuccess && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span>✅</span>
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {/* STEP 1: Enter Email & Request OTP */}
              {forgotStep === 1 && (
                <form onSubmit={handleRequestOTP}>
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      আপনার রেজিস্টার্ড ইমেইল এড্রেস:
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. member@gmail.com"
                      required
                      autoFocus
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                      Resend API-এর মাধ্যমে <b>verify@khaonkhata.online</b> থেকে ৬-সংখ্যার ওটিপি কোড পাঠানো হবে।
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      style={{ flex: 2, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#059669', color: '#ffffff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: forgotLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      {forgotLoading ? 'ওটিপি পাঠানো হচ্ছে...' : 'ওটিপি কোড পাঠান ➔'}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Input OTP & New Password */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyAndReset}>
                  <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '13px', color: '#334155' }}>
                      <span>ইমেইল: </span>
                      <b style={{ color: '#059669' }}>{forgotEmail}</b>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setForgotError(null);
                        setForgotSuccess(null);
                      }}
                      style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      পরিবর্তন
                    </button>
                  </div>

                  {/* 6-Digit OTP Code Input */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      ৬-সংখ্যার ওটিপি কোড (OTP):
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      autoFocus
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #059669', fontSize: '22px', fontWeight: 800, textAlign: 'center', letterSpacing: '8px', color: '#0f172a', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', background: '#f0fdf4' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>ইমেইলের ইনবক্স বা স্প্যাম ফোল্ডার দেখুন</span>
                      {forgotCountdown > 0 ? (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>পুনরায় পাঠানো যাবে ({forgotCountdown}s)</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestOTP()}
                          disabled={forgotLoading}
                          style={{ border: 'none', background: 'transparent', color: '#059669', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          পুনরায় ওটিপি পাঠান
                        </button>
                      )}
                    </div>
                  </div>

                  {/* New Password */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      নতুন পাসওয়ার্ড:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showForgotNewPass ? 'text' : 'password'}
                        value={forgotNewPass}
                        onChange={(e) => setForgotNewPass(e.target.value)}
                        placeholder="কমপক্ষে ৮ অক্ষর লিখুন"
                        required
                        style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#64748b' }}
                      >
                        {showForgotNewPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      নতুন পাসওয়ার্ড নিশ্চিত করুন:
                    </label>
                    <input
                      type={showForgotNewPass ? 'text' : 'password'}
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      style={{ flex: 2, padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#059669', color: '#ffffff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: forgotLoading ? 0.7 : 1 }}
                    >
                      {forgotLoading ? 'রিসেট করা হচ্ছে...' : 'পাসওয়ার্ড রিসেট করুন ✅'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

