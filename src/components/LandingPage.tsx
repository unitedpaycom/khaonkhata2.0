import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';

interface LandingPageProps {
  user?: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null } | User | null;
  onNavigate: (path: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  showToast?: (msg: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  onNavigate,
}) => {
  // Calculator state
  const [bz, setBz] = useState<number>(18000);
  const [tm, setTm] = useState<number>(240);
  const [mm, setMm] = useState<number>(62);
  const [dp, setDp] = useState<number>(3500);

  // Animated display values
  const [displayRate, setDisplayRate] = useState<string>('৭৫');
  const [displayCost, setDisplayCost] = useState<string>('৪,৬৫০ ৳');
  const [displayBal, setDisplayBal] = useState<string>('১,১৫০ ৳');
  const [isBalPositive, setIsBalPositive] = useState<boolean>(false);
  const [isSmallRate, setIsSmallRate] = useState<boolean>(false);

  // Reference for tweening tokens
  const dispRef = useRef<{ r: number; c: number; b: number }>({ r: 0, c: 0, b: 0 });
  const tokRef = useRef<{ r: number; c: number; b: number }>({ r: 0, c: 0, b: 0 });

  // Handle CTA Click
  const handleCta = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (user) {
      onNavigate('/dashboard');
    } else {
      onNavigate('/login');
    }
  };

  // Bangla Number Formatter
  const bnf = useRef(new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 2 }));

  // Calculator animation tween logic
  useEffect(() => {
    const f = bnf.current;
    const rateVal = tm > 0 ? bz / tm : 0;
    const costVal = rateVal * mm;
    const balVal = dp - costVal;

    setIsBalPositive(balVal >= 0);

    const animateNumber = (
      key: 'r' | 'c' | 'b',
      target: number,
      setter: (v: string) => void,
      suffix = '',
      onCheck?: (txt: string) => void
    ) => {
      const from = dispRef.current[key] || 0;
      const id = ++tokRef.current[key];
      let t0: number | null = null;

      const step = (t: number) => {
        if (id !== tokRef.current[key]) return;
        if (!t0) t0 = t;
        const p = Math.min((t - t0) / 450, 1);
        const v = from + (target - from) * (1 - Math.pow(1 - p, 3));
        const txt = f.format(v);
        dispRef.current[key] = v;
        setter(txt + suffix);
        if (onCheck) onCheck(txt);
        if (p < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    animateNumber('r', rateVal, setDisplayRate, '', (txt) => {
      setIsSmallRate(txt.length > 6);
    });
    animateNumber('c', costVal, setDisplayCost, ' ৳');
    animateNumber('b', Math.abs(balVal), setDisplayBal, ' ৳');
  }, [bz, tm, mm, dp]);

  // Trigger page reveal animations on mount
  useEffect(() => {
    document.body.classList.add('go');

    // Scroll reveal observer
    const els = document.querySelectorAll('.rv');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      els.forEach((el) => io.observe(el));
      return () => io.disconnect();
    } else {
      els.forEach((el) => el.classList.add('in'));
    }
  }, []);

  return (
    <div className="landing-root">
      <style>{`
        :root {
          --paper: #FBF9F2;
          --card: #FFFEFB;
          --ink: #16261F;
          --muted: #55675E;
          --line: #D6E4EC;
          --green: #0A7A54;
          --deep: #0B3B2E;
          --hl: #FFE680;
          --red: #E2563F;
        }

        .landing-root {
          background: var(--paper);
          color: var(--ink);
          font: 400 17px/1.8 "Hind Siliguri", "Noto Sans Bengali", system-ui, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .landing-root h1, .landing-root h2, .landing-root h3 {
          font-family: "Anek Bangla", "Hind Siliguri", sans-serif;
          margin: 0;
          line-height: 1.4;
          color: var(--deep);
        }

        .landing-root h1 { font-size: clamp(34px, 7.4vw, 54px); font-weight: 600; }
        .landing-root h2 { font-size: clamp(28px, 5vw, 38px); font-weight: 600; }
        .landing-root h3 { font-size: 20px; font-weight: 600; }
        .landing-root p { margin: 0; }
        .landing-root a { color: inherit; }

        .landing-root .wrap {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 20px;
          position: relative;
        }

        .landing-root .btn {
          display: inline-block;
          font-weight: 500;
          font-size: 17px;
          text-decoration: none;
          padding: 12px 26px;
          border-radius: 10px;
          background: var(--green);
          color: #fff;
          cursor: pointer;
          border: none;
          transition: transform .25s cubic-bezier(.2,.7,.2,1), background .25s;
        }

        .landing-root .btn:hover {
          transform: translateY(-2px);
          background: #086848;
        }

        .landing-root .btn.o {
          background: transparent;
          color: var(--ink);
          border: 1.5px solid #B9CBC0;
        }

        .landing-root .btn.o:hover {
          background: var(--card);
        }

        /* Hand-drawn bits */
        .landing-root .hl {
          background-image: linear-gradient(transparent 55%, var(--hl) 55%, var(--hl) 92%, transparent 92%);
          background-repeat: no-repeat;
          background-size: 100% 100%;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
          padding: 0 4px;
          margin: 0 -4px;
          transition: background-size .9s cubic-bezier(.2,.7,.2,1);
        }

        .landing-root .dr path {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1;
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 1s cubic-bezier(.4,.1,.2,1) .35s;
        }

        /* Hero */
        .landing-root .hero {
          position: relative;
          overflow: hidden;
          padding: 32px 0 88px;
          background: repeating-linear-gradient(180deg, transparent 0 35px, rgba(110,160,190,.2) 35px 36px);
        }

        .landing-root .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(251,249,242,0) 60%, var(--paper));
        }

        .landing-root .hero::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: max(10px, calc(50% - 556px));
          width: 1.5px;
          background: rgba(226,86,63,.35);
        }

        .landing-root .nb {
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 12px 0 0;
          pointer-events: none;
          animation: ni .8s cubic-bezier(.2,.7,.2,1) both;
        }

        .landing-root .nbar {
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(255,254,251,.97);
          border: 1px solid #E4DFCF;
          border-radius: 999px;
          padding: 8px 8px 8px 14px;
          box-shadow: 0 12px 30px -16px rgba(22,38,31,.4);
        }

        .landing-root .logo {
          display: flex;
          align-items: center;
          gap: 9px;
          font: 600 20px "Anek Bangla", sans-serif;
          text-decoration: none;
          color: var(--deep);
          cursor: pointer;
        }

        .landing-root .logo i {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: var(--deep);
          color: var(--hl);
          font-style: normal;
          font-size: 18px;
          transform: rotate(-4deg);
        }

        .landing-root .lk {
          display: none;
          gap: 32px;
        }

        .landing-root .lk a {
          position: relative;
          text-decoration: none;
          color: var(--muted);
          font-size: 16px;
          transition: color .25s;
        }

        .landing-root .lk a::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -3px;
          height: 2px;
          border-radius: 2px;
          background: var(--green);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .3s cubic-bezier(.2,.7,.2,1);
        }

        .landing-root .lk a:hover {
          color: var(--deep);
        }

        .landing-root .lk a:hover::after {
          transform: scaleX(1);
        }

        .landing-root .go-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--deep);
          color: #fff;
          font-weight: 500;
          font-size: 16px;
          text-decoration: none;
          padding: 9px 16px 9px 20px;
          border-radius: 999px;
          cursor: pointer;
          border: none;
          transition: background .25s, transform .25s;
        }

        .landing-root .go-btn svg {
          width: 16px;
          height: 16px;
          stroke: currentColor;
          stroke-width: 2.2;
          fill: none;
          transition: transform .25s;
        }

        .landing-root .go-btn:hover {
          background: var(--green);
        }

        .landing-root .go-btn:hover svg {
          transform: translateX(3px);
        }

        @keyframes ni {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .landing-root .hg {
          position: relative;
          display: grid;
          gap: 48px;
          align-items: center;
          padding-top: 32px;
        }

        .landing-root .sub {
          color: var(--muted);
          max-width: 29em;
          margin: 20px 0 28px;
        }

        .landing-root .cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .landing-root .ld {
          animation: up .8s cubic-bezier(.2,.7,.2,1) forwards;
        }

        /* Notebook Calculator */
        .landing-root .hint {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          margin: 0 0 4px 10px;
          font: 500 20px/1.3 Atma, "Hind Siliguri", sans-serif;
          color: var(--green);
          transform: rotate(-3deg);
          transform-origin: left;
        }

        .landing-root .hint svg {
          width: 52px;
          height: 40px;
          flex: none;
          stroke: var(--green);
          stroke-width: 2.2;
        }

        .landing-root .pad {
          position: relative;
          background: var(--card);
          border: 1px solid #E7E2D2;
          border-radius: 6px;
          padding: 28px 22px 22px 52px;
          box-shadow: 0 26px 40px -26px rgba(22,38,31,.45);
          transform: rotate(.6deg);
        }

        .landing-root .pad::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 34px;
          width: 1.5px;
          background: rgba(226,86,63,.4);
        }

        .landing-root .tape {
          position: absolute;
          top: -13px;
          left: 50%;
          width: 96px;
          height: 26px;
          margin-left: -48px;
          background: rgba(255,230,128,.8);
          transform: rotate(-3deg);
          box-shadow: 0 1px 3px rgba(0,0,0,.08);
        }

        .landing-root .pad h2 {
          font-size: 20px;
          margin-bottom: 6px;
        }

        .landing-root .rw {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 48px;
          border-bottom: 1px solid var(--line);
        }

        .landing-root .rw label, .landing-root .rw > span {
          color: var(--muted);
        }

        .landing-root .rw b {
          font-weight: 500;
        }

        .landing-root .rw .f {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .landing-root .rw input {
          width: 116px;
          font: 500 20px "Hind Siliguri", sans-serif;
          text-align: right;
          color: var(--deep);
          background: transparent;
          border: 0;
          border-radius: 6px;
          padding: 2px 8px;
          transition: background .2s;
          -moz-appearance: textfield;
        }

        .landing-root .rw input::-webkit-outer-spin-button,
        .landing-root .rw input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .landing-root .rw input:focus {
          outline: none;
          background: var(--hl);
        }

        .landing-root .rt {
          text-align: center;
          padding: 16px 0 6px;
        }

        .landing-root .rt > span {
          display: block;
          color: var(--muted);
        }

        .landing-root .circ {
          position: relative;
          width: 204px;
          height: 84px;
          margin: 2px auto 0;
          display: grid;
          place-items: center;
        }

        .landing-root .circ svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          stroke: var(--red);
          stroke-width: 2.6;
        }

        .landing-root .circ b {
          font: 600 52px/1 "Anek Bangla", sans-serif;
          color: var(--deep);
        }

        .landing-root .circ b.sm {
          font-size: 38px;
        }

        .landing-root .unit {
          font-size: 14px;
          color: var(--muted);
        }

        .landing-root .bal {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          font-weight: 500;
        }

        .landing-root .bal b {
          font: 600 20px "Anek Bangla", sans-serif;
        }

        .landing-root .bal.pos b {
          background: linear-gradient(transparent 55%, #A7F0CB 55%);
          padding: 0 4px;
        }

        .landing-root .bal.neg b {
          background: linear-gradient(transparent 55%, #FFC9BE 55%);
          padding: 0 4px;
        }

        /* Sections */
        .landing-root section.s {
          padding: 80px 0;
        }

        .landing-root .lead {
          color: var(--muted);
          max-width: 30em;
          margin: 10px 0 0;
        }

        .landing-root .rv {
          opacity: 1;
          transform: none;
          transition: opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1);
        }

        .landing-root .notes {
          list-style: none;
          margin: 36px 0 0;
          padding: 0;
          max-width: 760px;
        }

        .landing-root .notes li {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 12px;
          padding: 20px 0;
          border-top: 1px solid var(--line);
        }

        .landing-root .notes li:last-child {
          border-bottom: 1px solid var(--line);
        }

        .landing-root .notes em {
          font: 500 28px/1.2 Atma, sans-serif;
          color: var(--red);
          font-style: normal;
        }

        .landing-root .notes h3 {
          display: inline-block;
          position: relative;
        }

        .landing-root .notes h3 svg {
          position: absolute;
          left: 0;
          bottom: -6px;
          width: 100%;
          height: 9px;
          stroke: var(--red);
          stroke-width: 2;
          overflow: visible;
        }

        .landing-root .notes p {
          color: var(--muted);
          margin-top: 8px;
        }

        .landing-root .fg {
          display: grid;
          gap: 36px;
        }

        .landing-root .ft {
          margin: 0;
        }

        .landing-root .fr {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 14px;
          padding: 20px 0;
          border-top: 1px solid var(--line);
        }

        .landing-root .fr:last-child {
          border-bottom: 1px solid var(--line);
        }

        .landing-root .fr svg {
          width: 30px;
          height: 30px;
          stroke: var(--green);
          stroke-width: 2.6;
          margin-top: 2px;
        }

        .landing-root .fr dt {
          font: 600 20px "Anek Bangla", sans-serif;
          color: var(--deep);
        }

        .landing-root .fr dd {
          margin: 0;
          color: var(--muted);
        }

        .landing-root .steps {
          background: var(--card);
          border-top: 1px solid #ECE7D8;
          border-bottom: 1px solid #ECE7D8;
        }

        .landing-root .sl {
          list-style: none;
          margin: 40px 0 0;
          padding: 0;
          display: grid;
          gap: 32px;
        }

        .landing-root .sl li {
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 16px;
          align-items: start;
        }

        .landing-root .num {
          position: relative;
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          font: 600 28px "Anek Bangla", sans-serif;
          color: var(--deep);
        }

        .landing-root .num svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          stroke: var(--green);
          stroke-width: 2.4;
        }

        .landing-root .sl p {
          color: var(--muted);
          margin-top: 2px;
        }

        .landing-root details {
          border-top: 1px solid var(--line);
          padding: 18px 0;
        }

        .landing-root details:last-of-type {
          border-bottom: 1px solid var(--line);
        }

        .landing-root summary {
          cursor: pointer;
          font: 600 20px "Anek Bangla", sans-serif;
          color: var(--deep);
          list-style: none;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .landing-root summary::-webkit-details-marker {
          display: none;
        }

        .landing-root summary::after {
          content: "+";
          color: var(--green);
          font-size: 28px;
          line-height: 1;
          transition: transform .3s;
        }

        .landing-root details[open] summary::after {
          transform: rotate(45deg);
        }

        .landing-root details p {
          margin-top: 8px;
          color: var(--muted);
        }

        .landing-root details ul {
          margin: 8px 0 0;
          padding-left: 20px;
          color: var(--muted);
        }

        .landing-root details li {
          margin-top: 6px;
        }

        .landing-root details li b {
          font-weight: 500;
          color: var(--deep);
        }

        .landing-root .note {
          position: relative;
          max-width: 640px;
          margin: 0 auto;
          background: var(--hl);
          border-radius: 4px;
          padding: 48px 24px 40px;
          text-align: center;
          transform: rotate(-1.2deg);
          box-shadow: 0 26px 40px -26px rgba(80,60,0,.5);
        }

        .landing-root .note h2 {
          color: #2A2100;
          margin-bottom: 10px;
        }

        .landing-root .note p {
          color: #4A3E10;
          margin-bottom: 22px;
        }

        .landing-root .note .btn {
          background: var(--deep);
        }

        .landing-root .ab {
          display: grid;
          gap: 40px;
          align-items: start;
        }

        .landing-root .ab p {
          color: var(--muted);
          margin-top: 14px;
          max-width: 30em;
        }

        .landing-root .fc {
          position: relative;
          background: var(--card);
          border: 1px solid #E7E2D2;
          border-radius: 8px;
          padding: 26px 24px;
          box-shadow: 0 22px 36px -26px rgba(22,38,31,.4);
        }

        .landing-root .fh {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .landing-root .fh b {
          display: block;
          font: 600 20px/1.4 "Anek Bangla", sans-serif;
          color: var(--deep);
        }

        .landing-root .fh small {
          font-size: 14px;
          color: var(--muted);
        }

        .landing-root .fc p.en {
          margin: 0;
          color: var(--muted);
        }

        .landing-root .cg {
          display: grid;
          gap: 16px;
          margin-top: 32px;
        }

        .landing-root .cc {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--card);
          border: 1px solid #E7E2D2;
          border-radius: 8px;
          padding: 18px 20px;
          text-decoration: none;
          transition: transform .3s cubic-bezier(.2,.7,.2,1), border-color .3s;
        }

        .landing-root .cc:hover {
          transform: translateY(-3px);
          border-color: var(--green);
        }

        .landing-root .cc i {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: var(--hl);
          flex: none;
        }

        .landing-root .cc svg {
          width: 22px;
          height: 22px;
          stroke: var(--deep);
          stroke-width: 2;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .landing-root .cc small {
          display: block;
          font-size: 14px;
          color: var(--muted);
          line-height: 1.5;
        }

        .landing-root .cc b {
          display: block;
          font: 500 17px/1.5 "Hind Siliguri", sans-serif;
          color: var(--deep);
          word-break: break-all;
        }

        .landing-root .lg {
          max-width: 760px;
          margin-top: 28px;
        }

        .landing-root .foot {
          background: var(--card);
          border-top: 1px solid #E7E2D2;
          padding: 56px 0 28px;
        }

        .landing-root .fgd {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px 20px;
        }

        .landing-root .fb {
          grid-column: 1 / -1;
        }

        .landing-root .fb p {
          color: var(--muted);
          margin-top: 12px;
          max-width: 22em;
        }

        .landing-root .fcol h4 {
          font: 500 14px "Hind Siliguri", sans-serif;
          color: var(--muted);
          margin: 0 0 10px;
        }

        .landing-root .fcol a {
          display: block;
          text-decoration: none;
          color: var(--deep);
          padding: 3px 0;
          font-size: 16px;
          word-break: break-word;
          transition: color .2s, transform .25s;
        }

        .landing-root .fcol a:hover {
          color: var(--green);
          transform: translateX(3px);
        }

        .landing-root .fbot {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 8px 20px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid var(--line);
          color: var(--muted);
          font-size: 14px;
        }

        @keyframes up {
          to { opacity: 1; transform: none; }
        }

        @media (min-width: 800px) {
          .landing-root .lk { display: flex; }
          .landing-root .ab { grid-template-columns: 1fr 1fr; gap: 72px; }
          .landing-root .cg { grid-template-columns: 1fr 1fr; max-width: 760px; }
          .landing-root .fgd { grid-template-columns: 1.5fr 1fr 1fr 1.4fr; }
          .landing-root .fb { grid-column: auto; }
          .landing-root .hg { grid-template-columns: 1.05fr .95fr; gap: 64px; }
          .landing-root .fg { grid-template-columns: .85fr 1.15fr; gap: 72px; }
          .landing-root .fg .hd { position: sticky; top: 40px; align-self: start; }
          .landing-root .sl { grid-template-columns: repeat(3, 1fr); gap: 32px; }
          .landing-root .sl li { grid-template-columns: 1fr; gap: 12px; }
        }
      `}</style>

      {/* STICKY NAVIGATION BAR */}
      <div className="nb">
        <div className="wrap">
          <div className="nbar">
            <a className="logo" onClick={handleCta}>
              <i>খ</i>খাওনখাতা
            </a>
            <nav className="lk" aria-label="প্রধান মেনু">
              <a href="#feat">ফিচার</a>
              <a href="#steps">কীভাবে কাজ করে</a>
              <a href="#faq">প্রশ্ন</a>
              <a href="#about">আমাদের কথা</a>
            </nav>
            <button type="button" className="go-btn" onClick={handleCta}>
              <span>অ্যাপ খুলুন</span>
              <svg viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* HERO SECTION */}
      <header className="hero">
        <div className="wrap">
          <div className="hg">
            <div>
              <h1 className="ld">
                মাস শেষের হিসাব নিয়ে আর <span className="hl">ঝগড়া নয়</span>
              </h1>
              <p className="sub ld">
                মিল, জমা আর বাজারের খরচ লিখে রাখুন এক জায়গায়। মিল রেট আর প্রত্যেকের পাওনা-দেনা বের করবে খাওনখাতা,
                আপনাকে ক্যালকুলেটর নিয়ে বসতে হবে না।
              </p>
              <div className="cta ld">
                <button type="button" className="btn" onClick={handleCta}>
                  আপনার মেস শুরু করুন
                </button>
                <a className="btn o" href="#calc">
                  নিচে হিসাব করে দেখুন
                </a>
              </div>
            </div>

            <div>
              <div className="hint ld">
                নিজে চেষ্টা করে দেখুন
                <svg viewBox="0 0 52 40" fill="none" className="dr now">
                  <path pathLength="1" d="M4 4C24 2 42 14 46 32M36 26l10 8 5-12" />
                </svg>
              </div>

              {/* INTERACTIVE NOTEBOOK CALCULATOR PAD */}
              <div className="pad" id="calc">
                <i className="tape"></i>
                <h2>মিল রেট কত দাঁড়ায়?</h2>

                <div className="rw">
                  <label htmlFor="bz">মোট বাজার খরচ</label>
                  <span className="f">
                    <input
                      id="bz"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={bz || ''}
                      onChange={(e) => setBz(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                    ৳
                  </span>
                </div>

                <div className="rw">
                  <label htmlFor="tm">মেসের মোট মিল</label>
                  <span className="f">
                    <input
                      id="tm"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={tm || ''}
                      onChange={(e) => setTm(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </span>
                </div>

                <div className="rw">
                  <label htmlFor="mm">আপনার মিল</label>
                  <span className="f">
                    <input
                      id="mm"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={mm || ''}
                      onChange={(e) => setMm(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </span>
                </div>

                <div className="rw">
                  <label htmlFor="dp">আপনার জমা</label>
                  <span className="f">
                    <input
                      id="dp"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={dp || ''}
                      onChange={(e) => setDp(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                    ৳
                  </span>
                </div>

                <div aria-live="polite">
                  <div className="rt">
                    <span>মিল রেট</span>
                    <div className="circ">
                      <svg viewBox="0 0 204 84" fill="none" className="dr now">
                        <path
                          pathLength="1"
                          d="M10 42C8 17 62 6 104 7C150 8 196 17 194 42C192 66 130 78 96 76C50 74 12 66 10 40"
                        />
                      </svg>
                      <b id="rate" className={isSmallRate ? 'sm' : ''}>
                        {displayRate}
                      </b>
                    </div>
                    <div className="unit">টাকা প্রতি মিল</div>
                  </div>

                  <div className="rw">
                    <span>আপনার খরচ</span>
                    <b id="cost">{displayCost}</b>
                  </div>

                  <div className={`bal ${isBalPositive ? 'pos' : 'neg'}`} id="balbox">
                    <span id="bl">{isBalPositive ? 'আপনি পাবেন' : 'আপনাকে দিতে হবে'}</span>
                    <b id="bn">{displayBal}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION: KHATAR HISHAB */}
      <section className="s">
        <div className="wrap">
          <h2 className="rv">
            খাতার হিসাবে যা যা <span className="hl">গোলমাল</span> হয়
          </h2>
          <p className="lead rv">বাংলাদেশের প্রায় প্রতিটি মেসেই মাস শেষে একই দৃশ্য দেখা যায়।</p>
          <ol className="notes">
            <li className="rv">
              <em>১.</em>
              <div>
                <h3>
                  যোগফলে ভুল
                  <svg viewBox="0 0 200 9" fill="none" className="dr">
                    <path pathLength="1" d="M2 5C25 1 45 8 70 4S120 1 145 6S185 4 198 3" />
                  </svg>
                </h3>
                <p>হাতে হাতে যোগ করতে গিয়ে একটা সংখ্যা এদিক-ওদিক হলেই পুরো হিসাব নড়ে যায়।</p>
              </div>
            </li>
            <li className="rv">
              <em>২.</em>
              <div>
                <h3>
                  ম্যানেজারের একার চাপ
                  <svg viewBox="0 0 200 9" fill="none" className="dr">
                    <path pathLength="1" d="M2 5C25 1 45 8 70 4S120 1 145 6S185 4 198 3" />
                  </svg>
                </h3>
                <p>একজনকেই সবার মিল, জমা আর বাজার মনে রাখতে হয়।</p>
              </div>
            </li>
            <li className="rv">
              <em>৩.</em>
              <div>
                <h3>
                  “আমার হিসাবে তো অন্যরকম”
                  <svg viewBox="0 0 200 9" fill="none" className="dr">
                    <path pathLength="1" d="M2 5C25 1 45 8 70 4S120 1 145 6S185 4 198 3" />
                  </svg>
                </h3>
                <p>সবার সামনে একই হিসাব না থাকলে তর্ক লেগেই থাকে।</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* SECTION: FEATURES */}
      <section className="s steps" id="feat">
        <div className="wrap fg">
          <div className="hd">
            <h2 className="rv">
              একটা অ্যাপে মেসের <span className="hl">পুরো হিসাব</span>
            </h2>
            <p className="lead rv">যা যা লিখতে হয়, সবই এক জায়গায়। বাকি গণনা অ্যাপ করে।</p>
          </div>
          <dl className="ft">
            <div className="fr rv">
              <svg viewBox="0 0 24 24" fill="none" className="dr">
                <path pathLength="1" d="M3 13l6 6L21 5" />
              </svg>
              <div>
                <dt>দৈনিক মিল</dt>
                <dd>প্রতিদিন কে কত বেলা খেয়েছে, তারিখ ধরে লেখা থাকে।</dd>
              </div>
            </div>
            <div className="fr rv">
              <svg viewBox="0 0 24 24" fill="none" className="dr">
                <path pathLength="1" d="M3 13l6 6L21 5" />
              </svg>
              <div>
                <dt>জমার হিসাব</dt>
                <dd>কে কবে কত টাকা দিয়েছে, তার তালিকা সবসময় হাতের কাছে।</dd>
              </div>
            </div>
            <div className="fr rv">
              <svg viewBox="0 0 24 24" fill="none" className="dr">
                <path pathLength="1" d="M3 13l6 6L21 5" />
              </svg>
              <div>
                <dt>বাজার খরচ</dt>
                <dd>বাজারের প্রতিটি খরচ লিখে রাখুন। মাস শেষে আলাদা করে মেলাতে হবে না।</dd>
              </div>
            </div>
            <div className="fr rv">
              <svg viewBox="0 0 24 24" fill="none" className="dr">
                <path pathLength="1" d="M3 13l6 6L21 5" />
              </svg>
              <div>
                <dt>তাৎক্ষণিক মিল রেট</dt>
                <dd>মিল বা বাজার বদলালেই রেট নিজে নিজে আপডেট হয়।</dd>
              </div>
            </div>
            <div className="fr rv">
              <svg viewBox="0 0 24 24" fill="none" className="dr">
                <path pathLength="1" d="M3 13l6 6L21 5" />
              </svg>
              <div>
                <dt>পাওনা-দেনা</dt>
                <dd>কার কত পাওনা, কার কত দেনা, এক নজরে দেখা যায়।</dd>
              </div>
            </div>
            <div className="fr rv">
              <svg viewBox="0 0 24 24" fill="none" className="dr">
                <path pathLength="1" d="M3 13l6 6L21 5" />
              </svg>
              <div>
                <dt>রিয়েল-টাইম হিসাব</dt>
                <dd>হিসাব সবসময় হালনাগাদ, মাস শেষের জন্য অপেক্ষা করতে হয় না।</dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      {/* SECTION: STEPS */}
      <section className="s" id="steps">
        <div className="wrap">
          <h2 className="rv">
            শুরু করা <span className="hl">সহজ</span>
          </h2>
          <p className="lead rv">তিনটি ধাপেই মেস চালু।</p>
          <ol className="sl">
            <li className="rv">
              <span className="num">
                <svg viewBox="0 0 60 60" fill="none" className="dr">
                  <path
                    pathLength="1"
                    d="M30 5C46 4 56 16 55 31C54 46 43 56 28 55C13 54 4 42 5 28C6 15 17 6 33 7"
                  />
                </svg>
                ১
              </span>
              <div>
                <h3>মেস খুলুন</h3>
                <p>মেসের নাম দিন আর সদস্যদের যোগ করুন।</p>
              </div>
            </li>
            <li className="rv">
              <span className="num">
                <svg viewBox="0 0 60 60" fill="none" className="dr">
                  <path
                    pathLength="1"
                    d="M30 5C46 4 56 16 55 31C54 46 43 56 28 55C13 54 4 42 5 28C6 15 17 6 33 7"
                  />
                </svg>
                ২
              </span>
              <div>
                <h3>রোজ লিখুন</h3>
                <p>মিল, জমা আর বাজার খরচ যোগ করুন।</p>
              </div>
            </li>
            <li className="rv">
              <span className="num">
                <svg viewBox="0 0 60 60" fill="none" className="dr">
                  <path
                    pathLength="1"
                    d="M30 5C46 4 56 16 55 31C54 46 43 56 28 55C13 54 4 42 5 28C6 15 17 6 33 7"
                  />
                </svg>
                ৩
              </span>
              <div>
                <h3>হিসাব দেখুন</h3>
                <p>মিল রেট আর প্রত্যেকের হিসাব তৈরি পাবেন।</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* SECTION: FAQ */}
      <section className="s" id="faq" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2 className="rv">সাধারণ প্রশ্ন</h2>
          <div style={{ marginTop: '28px', maxWidth: '760px' }}>
            <details className="rv">
              <summary>মিল রেট কীভাবে বের হয়?</summary>
              <p>মোট বাজার খরচকে মোট মিল দিয়ে ভাগ করলে মিল রেট পাওয়া যায়। উপরের খাতায় সংখ্যা বদলে নিজেই দেখে নিন।</p>
            </details>
            <details className="rv">
              <summary>মোবাইলে ব্যবহার করা যাবে?</summary>
              <p>হ্যাঁ। ফোনের ব্রাউজারেই চলে, চাইলে হোম স্ক্রিনে যোগ করে অ্যাপের মতো খুলতে পারবেন।</p>
            </details>
            <details className="rv">
              <summary>হোস্টেলের জন্যও কি চলবে?</summary>
              <p>হ্যাঁ। ব্যাচেলর মেস আর হোস্টেল, দুই জায়গার মিল হিসাবের জন্যই এটি বানানো।</p>
            </details>
          </div>
        </div>
      </section>

      {/* SECTION: ABOUT US & FOUNDER */}
      <section className="s" id="about">
        <div className="wrap ab">
          <div>
            <h2 className="rv">
              আমাদের <span className="hl">কথা</span>
            </h2>
            <p className="rv">
              খাওনখাতা মেস ও হোস্টেলের জন্য বানানো একটি মিল ম্যানেজমেন্ট অ্যাপ। মিল, জমা আর বাজারের খরচ এক জায়গায় লিখে
              রাখলে মিল রেট আর প্রত্যেকের পাওনা-দেনা নিজে নিজেই বের হয়।
            </p>
            <p className="rv">
              আমাদের লক্ষ্য সহজ: খাতা-কলমের ভুল হিসাব আর মাস শেষের তর্ক কমানো, যাতে মেসের সবাই একই স্বচ্ছ হিসাব দেখতে পায়।
            </p>
          </div>
          <div className="fc rv" id="founder">
            <div className="fh">
              <span className="num">
                <svg viewBox="0 0 60 60" fill="none" className="dr">
                  <path
                    pathLength="1"
                    d="M30 5C46 4 56 16 55 31C54 46 43 56 28 55C13 54 4 42 5 28C6 15 17 6 33 7"
                  />
                </svg>
                R
              </span>
              <div>
                <b>Reduean A Rahat</b>
                <small>Founder, KhaonKhata</small>
              </div>
            </div>
            <p className="en">
              Reduean A Rahat is the founder of KhaonKhata, a meal and expense manager built for shared mess and hostel
              life. His goal is simple: replace paper notebooks and month-end arguments with one clear, shared record that
              everyone can trust.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: CONTACT */}
      <section className="s" id="contact" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2 className="rv">
            কিছু জানার আছে? <span className="hl">যোগাযোগ করুন</span>
          </h2>
          <p className="lead rv">সাহায্য, পরামর্শ বা অভিযোগ, যেকোনো কিছু জানাতে পারেন।</p>
          <div className="cg rv">
            <a className="cc" href="tel:+8809696917004">
              <i>
                <svg viewBox="0 0 24 24">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
                </svg>
              </i>
              <span>
                <small>ফোন</small>
                <b>+8809696917004</b>
              </span>
            </a>
            <a className="cc" href="mailto:support.khaonkhata@gmail.com">
              <i>
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              </i>
              <span>
                <small>ইমেইল</small>
                <b>support.khaonkhata@gmail.com</b>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION STICKY NOTE */}
      <section className="s" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="note rv">
            <i className="tape" style={{ background: 'rgba(255,255,255,.6)' }}></i>
            <h2>এই মাসের হিসাব খাওনখাতায় রাখুন</h2>
            <p>খাতা আর ক্যালকুলেটর সরিয়ে রাখুন। মেসের সবাই একই হিসাব দেখুক।</p>
            <button type="button" className="btn" onClick={handleCta}>
              এখনই শুরু করুন
            </button>
          </div>
        </div>
      </section>

      {/* SECTION: LEGAL POLICIES */}
      <section className="s" id="legal" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2 className="rv">নীতিমালা ও শর্তাবলি</h2>
          <p className="lead rv">সর্বশেষ হালনাগাদ: অক্টোবর ২০২৬</p>
          <div className="lg">
            <details className="rv" id="terms">
              <summary>শর্তাবলি (Terms)</summary>
              <ul>
                <li>খাওনখাতা ব্যবহার করলে আপনি এই শর্তগুলো মেনে নিচ্ছেন।</li>
                <li>মিল, জমা ও খরচের তথ্য সঠিকভাবে লেখার দায়িত্ব ব্যবহারকারীর। মিল রেট ও হিসাব আপনার দেওয়া তথ্যের ওপর নির্ভর করে।</li>
                <li>নিজের অ্যাকাউন্টের নিরাপত্তা রক্ষা করুন এবং অন্যের তথ্য অনুমতি ছাড়া ব্যবহার করবেন না।</li>
                <li>ভুয়া তথ্য দেওয়া, সেবার অপব্যবহার বা অন্যের ক্ষতি হয় এমন কাজ করা যাবে না।</li>
                <li>খাওনখাতা হিসাব সহজ করার একটি টুল। সদস্যদের মধ্যকার টাকার লেনদেনের বিষয়টি সদস্যদেরই মিটিয়ে নিতে হবে।</li>
                <li>সেবা উন্নত করতে আমরা সময়ে সময়ে ফিচার বা শর্ত বদলাতে পারি। বড় পরিবর্তন হলে জানানোর চেষ্টা করব।</li>
              </ul>
            </details>
            <details className="rv" id="privacy">
              <summary>প্রাইভেসি পলিসি (Privacy Policy)</summary>
              <ul>
                <li><b>কী তথ্য নিই:</b> আপনার নাম, ফোন বা ইমেইল, এবং মেসে আপনি যে তথ্য যোগ করেন (সদস্য, মিল, জমা, বাজার খরচ)।</li>
                <li><b>কেন ব্যবহার করি:</b> হিসাব তৈরি, অ্যাকাউন্ট চালু রাখা, সাপোর্ট দেওয়া এবং সেবা ভালো করার জন্য।</li>
                <li><b>কে দেখতে পায়:</b> একই মেসের সদস্যরা সেই মেসের শেয়ার করা হিসাব দেখতে পারেন।</li>
                <li>আমরা আপনার ব্যক্তিগত তথ্য বিক্রি করি না।</li>
                <li><b>নিরাপত্তা:</b> তথ্য সুরক্ষিত রাখতে আমরা যুক্তিসংগত ব্যবস্থা নিই। তবে ইন্টারনেটে কোনো ব্যবস্থাই শতভাগ নিরাপদ নয়।</li>
                <li><b>আপনার অধিকার:</b> আপনার তথ্য দেখতে, সংশোধন করতে বা মুছে ফেলতে চাইলে support.khaonkhata@gmail.com-এ জানান।</li>
              </ul>
            </details>
            <details className="rv" id="copyright">
              <summary>কপিরাইট (Copyright)</summary>
              <ul>
                <li>© ২০২৬ খাওনখাতা। সর্বস্বত্ব সংরক্ষিত।</li>
                <li>ওয়েবসাইট ও অ্যাপের লেখা, ডিজাইন, লোগো ও সফটওয়্যার খাওনখাতার সম্পত্তি।</li>
                <li>লিখিত অনুমতি ছাড়া এগুলো কপি, বিক্রি বা পুনঃপ্রকাশ করা যাবে না।</li>
                <li>কপিরাইট নিয়ে কোনো অভিযোগ থাকলে support.khaonkhata@gmail.com-এ জানান।</li>
              </ul>
            </details>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="wrap">
          <div className="fgd">
            <div className="fb">
              <a className="logo" onClick={handleCta}>
                <i>খ</i>খাওনখাতা
              </a>
              <p>মেস ও হোস্টেলের মিল, জমা আর বাজারের হিসাব এক জায়গায়।</p>
            </div>
            <div className="fcol">
              <h4>পরিচিতি</h4>
              <a href="#about">আমাদের সম্পর্কে</a>
              <a href="#founder">প্রতিষ্ঠাতা</a>
              <a href="#contact">যোগাযোগ</a>
            </div>
            <div className="fcol">
              <h4>আইনি</h4>
              <a href="#terms">শর্তাবলি</a>
              <a href="#privacy">প্রাইভেসি পলিসি</a>
              <a href="#copyright">কপিরাইট</a>
            </div>
            <div className="fcol">
              <h4>যোগাযোগ</h4>
              <a href="tel:+8809696917004">+8809696917004</a>
              <a href="mailto:support.khaonkhata@gmail.com">support.khaonkhata@gmail.com</a>
            </div>
          </div>
          <div className="fbot">
            <span>© ২০২৬ খাওনখাতা। সর্বস্বত্ব সংরক্ষিত।</span>
            <span>Founder: Reduean A Rahat</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
