import React, { useState } from 'react';

interface UnauthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmailAuth?: () => void;
  onDemoLogin?: () => void;
  projectId?: string;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  isOpen,
  onClose,
  onSelectEmailAuth,
  onDemoLogin,
  projectId = 'khaonkhata',
}) => {
  const [copied, setCopied] = useState(false);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator?.clipboard && hostname) {
      navigator.clipboard.writeText(hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unauthorized-domain-title"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100"
        style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: 'var(--card, #ffffff)',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="p-5 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            padding: '18px 22px',
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <h3
                id="unauthorized-domain-title"
                style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}
              >
                Firebase Auth: ডোমেইন অনুমোদন প্রয়োজন
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#fef3c7' }}>
                Error: auth/unauthorized-domain (OAuth Security Restriction)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="বন্ধ করুন"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '22px' }} className="space-y-4">
          <p style={{ fontSize: '13.5px', lineHeight: '1.6', margin: 0, color: 'var(--ink)' }}>
            Google Sign-In সফল করতে আপনার বর্তমান প্রিভিউ ডোমেইনটি Firebase Console-এর{' '}
            <b>Authorized Domains</b> তালিকায় অন্তর্ভুক্ত থাকতে হবে।
          </p>

          {/* Current Domain Box with 1-Click Copy */}
          <div
            style={{
              background: 'rgba(14, 143, 99, 0.06)',
              border: '1.5px dashed #0E8F63',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--mut)', marginBottom: '4px' }}>
              বর্তমান অ্যাপ ডোমেইন (Current Hostname):
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <code
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0E8F63',
                  wordBreak: 'break-all',
                }}
              >
                {hostname || 'your-app-domain.run.app'}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: copied ? '#059669' : '#0E8F63',
                  color: '#ffffff',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {copied ? '✓ কপি হয়েছে!' : '📋 কপি করুন'}
              </button>
            </div>
          </div>

          {/* 3 Step Instructions */}
          <div
            style={{
              background: 'var(--bg, #f8fafc)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid var(--line, #e2e8f0)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--ink)' }}>
              🛠️ Firebase Console-এ ডোমেইন যোগ করার নিয়ম:
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '12.5px',
                lineHeight: '1.6',
                color: 'var(--mut)',
              }}
            >
              <li>
                নিচের বাটনে ক্লিক করে <b>Firebase Console Authentication Settings</b> এ যান।
              </li>
              <li>
                <b>Authorized domains</b> সেকশনে <b>Add domain</b> বাটনে ক্লিক করুন।
              </li>
              <li>
                উপরের কপি করা ডোমেইনটি পেস্ট করে <b>Save</b> করুন।
              </li>
            </ol>

            <div style={{ marginTop: '12px' }}>
              <a
                href={firebaseSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#2563eb',
                  textDecoration: 'none',
                }}
              >
                <span>🔗 Firebase Console Settings খুলুন (প্রকল্প: {projectId})</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          {/* Instant Alternatives (No waiting required!) */}
          <div style={{ paddingTop: '4px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--mut)',
                marginBottom: '10px',
                textAlign: 'center',
              }}
            >
              ⚡ ডোমেইন অনুমোদন ছাড়াই তাত্ক্ষণিক ব্যবহারের বিকল্প:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectEmailAuth) onSelectEmailAuth();
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--line, #cbd5e1)',
                  background: 'var(--card, #ffffff)',
                  color: 'var(--ink, #1e293b)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ✉️ ইমেইল / পাসওয়ার্ড দিয়ে প্রবেশ
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onDemoLogin) onDemoLogin();
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0E8F63, #0A6B4A)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(14,143,99,0.3)',
                }}
              >
                🚀 ডেমো মোডে প্রবেশ করুন
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--line, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'var(--bg, #f8fafc)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid var(--line, #cbd5e1)',
              background: 'transparent',
              color: 'var(--mut)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
