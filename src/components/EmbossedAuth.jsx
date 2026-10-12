import React, { useState, useEffect } from 'react';

export default function EmbossedAuth({
  onGoogleSignIn,
  onBackToHome,
  showToast,
  onNavigate,
  onUserAuthenticated
}) {
  const [mode, setMode] = useState(() => (typeof window !== 'undefined' && window.location.hash === '#signup' ? 'signup' : 'login'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isErr: false });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('login-theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch (e) {}
  }, []);

  const toggleTheme = () => {
    let cur = document.documentElement.getAttribute('data-theme');
    if (!cur) cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('login-theme', next); } catch (e) {}
  };

  const handleModeSwitch = (m) => {
    setMode(m);
    setMsg({ text: '', isErr: false });
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', m === 'signup' ? '#signup' : '#login');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const n = name.trim();
    const em = email.trim();
    const p = password;
    const cp = confirmPassword;

    if (mode === 'signup' && !n) {
      setMsg({ text: 'Please enter your full name.', isErr: true });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      setMsg({ text: 'Enter a valid email address.', isErr: true });
      return;
    }
    if (p.length < 6) {
      setMsg({ text: 'Password must be at least 6 characters.', isErr: true });
      return;
    }
    if (mode === 'signup' && p !== cp) {
      setMsg({ text: 'Passwords do not match.', isErr: true });
      return;
    }

    setLoading(true);
    setMsg({ text: '', isErr: false });

    if (mode === 'signup') {
      if (window.KhaonKhataAuth?.signUpWithEmail) {
        try {
          await window.KhaonKhataAuth.signUpWithEmail({ name: n, email: em, password: p });
        } catch (err) {
          setMsg({ text: err?.message || 'Sign up failed.', isErr: true });
        }
      } else {
        setMsg({ text: 'Account created. Welcome aboard!', isErr: false });
      }
    } else {
      if (window.KhaonKhataAuth?.signInWithEmail) {
        try {
          await window.KhaonKhataAuth.signInWithEmail({ email: em, password: p, remember });
        } catch (err) {
          setMsg({ text: err?.message || 'Login failed.', isErr: true });
        }
      } else {
        setMsg({ text: 'Logged in successfully.', isErr: false });
      }
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    if (onGoogleSignIn) {
      try {
        await onGoogleSignIn();
      } catch (err) {
        setMsg({ text: err?.message || 'Google sign in failed.', isErr: true });
      }
    } else if (window.KhaonKhataAuth?.signInWithGoogle) {
      try {
        await window.KhaonKhataAuth.signInWithGoogle();
      } catch (err) {
        setMsg({ text: err?.message || 'Google sign in failed.', isErr: true });
      }
    }
  };

  const handleForgot = () => {
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      setMsg({ text: 'Enter your email above first.', isErr: true });
      return;
    }
    if (window.KhaonKhataAuth?.resetPassword) {
      window.KhaonKhataAuth.resetPassword(em);
    }
    setMsg({ text: 'Password reset link would be sent to ' + em + '.', isErr: false });
  };

  const isSignup = mode === 'signup';

  return (
    <div className="embossed-page">
      <style>{`
        :root {
          --bg: #e4e9f1;
          --card: #e4e9f1;
          --ink: #232a38;
          --muted: #6d778b;
          --accent: #1c64d6;
          --hi: #ffffff;
          --lo: #bcc5d4;
          --ok: #1f8a5b;
          --font: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
          --r: 14px;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) {
            --bg: #22262e; --card: #22262e; --ink: #e9edf5; --muted: #8e98ac;
            --accent: #6aa3ff; --hi: #2d323c; --lo: #171a20; --ok: #4cc58f;
            color-scheme: dark;
          }
        }
        :root[data-theme="dark"] {
          --bg: #22262e; --card: #22262e; --ink: #e9edf5; --muted: #8e98ac;
          --accent: #6aa3ff; --hi: #2d323c; --lo: #171a20; --ok: #4cc58f;
          color-scheme: dark;
        }
        .embossed-page {
          background: var(--bg);
          color: var(--ink);
          font-family: var(--font);
          padding-inline: 16px;
          padding-block: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
          position: relative;
        }
        .embossed-page * { box-sizing: border-box; }
        .raised { box-shadow: 9px 9px 20px var(--lo), -9px -9px 20px var(--hi); }
        .raised-sm { box-shadow: 5px 5px 11px var(--lo), -5px -5px 11px var(--hi); }
        .pressed { box-shadow: inset 5px 5px 10px var(--lo), inset -5px -5px 10px var(--hi); }
        .card {
          width: 100%;
          max-width: 380px;
          background: var(--card);
          border-radius: 30px;
          padding: 34px 28px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .badge {
          width: 84px; height: 84px; border-radius: 50%;
          display: grid; place-items: center;
          background: var(--card);
          margin-bottom: 18px;
        }
        .badge svg { width: 42px; height: 42px; }
        .embossed-page h1 {
          margin: 0; font-size: 1.7rem; font-weight: 800; letter-spacing: -0.01em;
          text-wrap: balance; text-align: center;
        }
        .embossed-page .sub { margin: 6px 0 24px; font-size: 0.82rem; color: var(--muted); text-align: center; }
        .embossed-page form { width: 100%; display: flex; flex-direction: column; gap: 16px; }
        .embossed-page .field { position: relative; width: 100%; }
        .embossed-page .field input {
          width: 100%; height: 52px; border: 0; outline: 0;
          background: var(--card); color: var(--ink);
          border-radius: var(--r);
          padding: 0 48px 0 18px;
          font: 500 0.88rem var(--font);
          box-shadow: inset 5px 5px 10px var(--lo), inset -5px -5px 10px var(--hi);
          transition: box-shadow .2s ease;
        }
        .embossed-page .field input::placeholder { color: var(--muted); font-weight: 500; }
        .embossed-page .field input:focus-visible {
          box-shadow: inset 5px 5px 10px var(--lo), inset -5px -5px 10px var(--hi), 0 0 0 2px var(--accent);
        }
        .embossed-page .eye {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          width: 36px; height: 36px; border: 0; background: transparent; color: var(--muted);
          border-radius: 50%; cursor: pointer; display: grid; place-items: center;
        }
        .embossed-page .eye:focus-visible { outline: 2px solid var(--accent); }
        .embossed-page .eye svg { width: 18px; height: 18px; }
        .embossed-page .row {
          display: flex; justify-content: space-between; align-items: center;
          gap: 10px; flex-wrap: wrap; font-size: 0.74rem; margin-top: -2px;
        }
        .embossed-page .remember { display: inline-flex; align-items: center; gap: 9px; color: var(--muted); cursor: pointer; font-weight: 500; }
        .embossed-page .remember input { position: absolute; opacity: 0; width: 0; height: 0; }
        .embossed-page .box {
          width: 18px; height: 18px; border-radius: 5px; background: var(--card);
          box-shadow: inset 2px 2px 4px var(--lo), inset -2px -2px 4px var(--hi);
          display: grid; place-items: center; color: transparent; transition: color .15s;
        }
        .embossed-page .box svg { width: 11px; height: 11px; }
        .embossed-page .remember input:checked + .box { color: var(--accent); }
        .embossed-page .remember input:focus-visible + .box { outline: 2px solid var(--accent); outline-offset: 2px; }
        .embossed-page .link { color: var(--accent); font-weight: 700; text-decoration: none; background: none; border: 0; padding: 0; font: inherit; cursor: pointer; }
        .embossed-page .link:hover { text-decoration: underline; }
        .embossed-page .link:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
        .embossed-page .primary {
          width: 100%; height: 54px; border: 0; cursor: pointer;
          background: var(--card); color: var(--accent);
          border-radius: var(--r);
          font: 800 0.86rem var(--font); letter-spacing: 0.08em;
          box-shadow: 6px 6px 14px var(--lo), -6px -6px 14px var(--hi);
          transition: box-shadow .15s ease, transform .15s ease;
          margin-top: 4px;
        }
        .embossed-page .primary:hover { transform: translateY(-1px); }
        .embossed-page .primary:active {
          transform: none;
          box-shadow: inset 4px 4px 9px var(--lo), inset -4px -4px 9px var(--hi);
        }
        .embossed-page .primary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        .embossed-page .msg {
          min-height: 1.2em; margin: 2px 0 0; font-size: 0.78rem; font-weight: 600;
          text-align: center; color: var(--ok);
        }
        .embossed-page .msg.err { color: #d2493f; }
        :root[data-theme="dark"] .embossed-page .msg.err { color: #ff8a80; }
        @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .embossed-page .msg.err { color: #ff8a80; } }
        .embossed-page .switch {
          margin-top: 14px; display: flex; align-items: center; gap: 14px;
          font-size: 0.74rem; color: var(--muted); font-weight: 500;
        }
        .embossed-page .round {
          width: 44px; height: 44px; border-radius: 50%; border: 0; cursor: pointer;
          background: var(--card); color: var(--accent);
          display: grid; place-items: center;
          box-shadow: 5px 5px 11px var(--lo), -5px -5px 11px var(--hi);
          transition: box-shadow .15s ease;
        }
        .embossed-page .round svg { width: 18px; height: 18px; transition: transform .3s ease; }
        .embossed-page .round:active { box-shadow: inset 3px 3px 7px var(--lo), inset -3px -3px 7px var(--hi); }
        .embossed-page .round:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        .embossed-page .card.signup .round svg { transform: rotate(45deg); }
        .embossed-page .social { display: flex; gap: 16px; margin-top: 22px; }
        .embossed-page .social button {
          width: 42px; height: 42px; border-radius: 50%; border: 0; cursor: pointer;
          background: var(--card); color: var(--muted);
          font: 700 0.82rem var(--font);
          box-shadow: 4px 4px 9px var(--lo), -4px -4px 9px var(--hi);
          transition: color .15s, box-shadow .15s;
        }
        .embossed-page .social button:hover { color: var(--accent); }
        .embossed-page .social button:active { box-shadow: inset 3px 3px 6px var(--lo), inset -3px -3px 6px var(--hi); }
        .embossed-page .social button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        .embossed-page .theme {
          position: fixed; top: calc(14px + env(safe-area-inset-top, 0px)); right: 16px;
          width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer;
          background: var(--card); color: var(--muted); display: grid; place-items: center;
          box-shadow: 4px 4px 9px var(--lo), -4px -4px 9px var(--hi);
          z-index: 50;
        }
        .embossed-page .theme svg { width: 18px; height: 18px; }
        .embossed-page .theme:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
        @media (max-width: 380px) {
          .embossed-page .card { padding: 28px 20px 26px; }
        }
      `}</style>

      <button className="theme" id="themeBtn" type="button" onClick={toggleTheme} aria-label="Toggle light and dark theme">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
        </svg>
      </button>

      <main className={`card raised ${isSignup ? 'signup' : ''}`} id="card">
        <div className="badge raised-sm" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M15 21v-5a9 9 0 0 1 18 0v5" fill="none" stroke="#8d96a6" strokeWidth="4" strokeLinecap="round"/>
            <rect x="9" y="21" width="30" height="21" rx="5" fill="#e3a72f"/>
            <rect x="9" y="21" width="30" height="8" rx="4" fill="#f3c65a"/>
            <circle cx="24" cy="32" r="3.2" fill="#8a5a12"/>
            <rect x="22.8" y="33" width="2.4" height="5" rx="1.2" fill="#8a5a12"/>
          </svg>
        </div>

        <h1 id="title">{isSignup ? 'Create Account' : 'Welcome'}</h1>
        <p className="sub" id="sub">{isSignup ? 'Sign up to start your journey' : 'Login to continue your journey'}</p>

        <form id="form" onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <div className="field" id="nameField">
              <input
                id="name"
                type="text"
                placeholder="Full Name"
                autoComplete="name"
                aria-label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <input
              id="email"
              type="email"
              placeholder="Email Address"
              autoComplete="email"
              aria-label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="eye"
              id="eye"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" id="eyeIcon">
                {showPassword ? (
                  <path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18 18 0 0 1 5.1-5.9M9.9 4.2A10 10 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2M1 1l22 22"/>
                ) : (
                  <>
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </>
                )}
              </svg>
            </button>
          </div>
          {isSignup && (
            <div className="field" id="confirmField">
              <input
                id="confirm"
                type="password"
                placeholder="Confirm Password"
                autoComplete="new-password"
                aria-label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {!isSignup && (
            <div className="row" id="optRow">
              <label className="remember">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l5 5L20 6"/>
                  </svg>
                </span>
                Remember me
              </label>
              <button className="link" type="button" id="forgot" onClick={handleForgot}>Forgot Password?</button>
            </div>
          )}

          <button className="primary" id="submit" type="submit" disabled={loading}>
            {loading ? (isSignup ? 'CREATING...' : 'LOGGING IN...') : (isSignup ? 'SIGN UP' : 'LOGIN')}
          </button>
          <p className={`msg ${msg.isErr ? 'err' : ''}`} id="msg" role="status" aria-live="polite">
            {msg.text}
          </p>
        </form>

        <div className="switch">
          <span id="switchText">{isSignup ? 'Already have an account?' : "Don't have an account?"}</span>
          <button
            className="round"
            id="switchBtn"
            type="button"
            onClick={() => handleModeSwitch(isSignup ? 'login' : 'signup')}
            aria-label={isSignup ? 'Switch to login' : 'Switch to sign up'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>

        <div className="social">
          <button type="button" onClick={handleGoogle} aria-label="Continue with Google">G</button>
        </div>
      </main>
    </div>
  );
}
