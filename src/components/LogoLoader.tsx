import React, { useEffect, useState } from 'react';

interface LogoLoaderProps {
  text?: string;
  minDisplayTime?: number; // ms, default 1500
  isReady?: boolean; // when true, progress completes
  onFinish?: () => void;
  fullScreen?: boolean;
}

export const LogoLoader: React.FC<LogoLoaderProps> = ({
  text = 'মেস সেশন যাচাই করা হচ্ছে...',
  minDisplayTime = 1500,
  isReady = false,
  onFinish,
  fullScreen = true,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (isReady) {
          return 100;
        }
        // Smooth random increment up to 92% until isReady is true
        if (prev < 90) {
          const next = prev + Math.random() * 6 + 2;
          return Math.min(next, 92);
        }
        return prev;
      });
    }, 80);

    return () => {
      clearInterval(interval);
    };
  }, [isReady]);

  // When isReady becomes true or progress hits 100, wait minDisplayTime then fade out
  useEffect(() => {
    if (isReady || progress >= 100) {
      setProgress(100);
      const elapsed = Date.now() - startTime;
      const remainingWait = Math.max(0, minDisplayTime - elapsed);

      const t1 = setTimeout(() => {
        setIsFadingOut(true);
        const t2 = setTimeout(() => {
          if (onFinish) onFinish();
        }, 600); // 600ms matching CSS transition
        return () => clearTimeout(t2);
      }, remainingWait);

      return () => clearTimeout(t1);
    }
  }, [isReady, progress, minDisplayTime, startTime, onFinish]);

  return (
    <div
      id="loader"
      role="status"
      aria-live="polite"
      className={isFadingOut ? 'done' : ''}
      style={{
        position: fullScreen ? 'fixed' : 'relative',
        inset: fullScreen ? 0 : undefined,
        width: fullScreen ? '100vw' : '100%',
        height: fullScreen ? '100vh' : '100%',
        minHeight: fullScreen ? undefined : '280px',
        zIndex: fullScreen ? 99999 : 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '22px',
        backgroundColor: '#fcfbf8',
        transition: 'opacity 0.6s cubic-bezier(0.2, 0.7, 0.2, 1), visibility 0.6s ease',
        opacity: isFadingOut ? 0 : 1,
        visibility: isFadingOut ? 'hidden' : 'visible',
      }}
    >
      <style>{`
        #loader.done {
          opacity: 0 !important;
          visibility: hidden !important;
        }

        .logo-loader-svg {
          width: min(64vw, 240px);
          height: auto;
          overflow: visible;
          animation: logoFloat 3s ease-in-out infinite;
        }

        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }

        /* Progress ring around the logo */
        .ring-track {
          fill: none;
          stroke: #3d8c68;
          stroke-opacity: 0.14;
          stroke-width: 6;
        }
        .ring-fill {
          fill: none;
          stroke: #3d8c68;
          stroke-width: 6;
          stroke-linecap: round;
          transition: stroke-dasharray 0.25s ease-out;
        }

        /* Dotted ring slowly rotating */
        .dots {
          fill: none;
          stroke: #8fc7a9;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-dasharray: 1 14;
          transform-origin: 286px 334px;
          animation: spinDots 24s linear infinite;
        }
        @keyframes spinDots {
          to { transform: rotate(360deg); }
        }

        /* Rice dome breathing */
        .dome {
          transform-origin: 286px 390px;
          animation: breatheDome 2.4s ease-in-out infinite;
        }
        @keyframes breatheDome {
          0%, 100% { transform: scale(1, 1); }
          50%      { transform: scale(1.04, 1.07); }
        }

        /* Steam rising */
        .steam {
          fill: none;
          stroke: #ffeeb0;
          stroke-width: 15;
          stroke-linecap: round;
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          opacity: 0;
          animation: steamRise 2.4s ease-in-out infinite;
        }
        .steam.s2 { animation-delay: 0.35s; }
        .steam.s3 { animation-delay: 0.7s; }
        @keyframes steamRise {
          0%   { stroke-dashoffset: 100; opacity: 0; transform: translateY(14px); }
          30%  { opacity: 1; }
          55%  { stroke-dashoffset: 0; opacity: 1; transform: translateY(0); }
          100% { stroke-dashoffset: -100; opacity: 0; transform: translateY(-16px); }
        }

        /* Check mark drawing in the bowl */
        .check {
          fill: none;
          stroke: #3d8c68;
          stroke-width: 22;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          transform-origin: 289px 456px;
          animation: checkDraw 2.4s ease-in-out infinite;
        }
        @keyframes checkDraw {
          0%, 8%   { stroke-dashoffset: 100; transform: scale(1); }
          38%      { stroke-dashoffset: 0; transform: scale(1); }
          46%      { transform: scale(1.12); }
          54%      { transform: scale(1); }
          85%      { stroke-dashoffset: 0; opacity: 1; }
          100%     { stroke-dashoffset: -100; opacity: 0; }
        }

        /* Text */
        .loader-label {
          margin: 0;
          font: 500 16px/1.4 "Hind Siliguri", system-ui, -apple-system, sans-serif;
          color: #2d5a45;
          letter-spacing: 0.03em;
          text-align: center;
        }
        .loader-label i {
          font-style: normal;
          opacity: 0;
          animation: dotBlink 1.4s infinite;
        }
        .loader-label i:nth-child(2) { animation-delay: 0.2s; }
        .loader-label i:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotBlink {
          0%, 20% { opacity: 0; }
          40%, 100% { opacity: 1; }
        }
        .loader-percent {
          font: 600 14px/1 system-ui, sans-serif;
          color: #7d9a8c;
          letter-spacing: 0.05em;
        }

        @media (prefers-reduced-motion: reduce) {
          .logo-loader-svg, .dots, .dome, .steam, .check {
            animation-duration: 8s;
          }
        }
      `}</style>

      <svg className="logo-loader-svg" viewBox="0 0 579 620" role="img" aria-label="Loading KhaonKhata">
        {/* Progress track & dynamic stroke fill */}
        <circle className="ring-track" cx="286" cy="334" r="254" />
        <circle
          className="ring-fill"
          cx="286"
          cy="334"
          r="254"
          pathLength={100}
          transform="rotate(-90 286 334)"
          style={{ strokeDasharray: `${Math.round(progress)} 100` }}
        />

        {/* Main circular bowl background */}
        <circle cx="286" cy="334" r="237" fill="#3d8c68" />
        <circle className="dots" cx="286" cy="334" r="212" />

        {/* Steam rising */}
        <path className="steam" pathLength={100} d="M232 156 C210 182 250 206 228 250" />
        <path className="steam s2" pathLength={100} d="M288 142 C266 168 306 192 284 238" />
        <path className="steam s3" pathLength="100" d="M344 156 C322 182 362 206 340 250" />

        {/* White rice dome & warm golden bowl */}
        <path className="dome" d="M155 390 C160 310 215 262 286 262 C357 262 412 310 417 390 Z" fill="#ffffff" />
        <path d="M104 390 H468 C468 480 390 545 286 545 C182 545 104 480 104 390 Z" fill="#f7c96b" />

        {/* Green checkmark drawn inside bowl */}
        <path className="check" pathLength={100} d="M242 457 L273 488 L336 424" />
      </svg>

      <p className="loader-label">
        <span>{text}</span>
        <i>.</i><i>.</i><i>.</i>
      </p>
      <div className="loader-percent">{Math.round(progress)}%</div>
    </div>
  );
};

export default LogoLoader;
