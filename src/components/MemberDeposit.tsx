import React, { useState } from 'react';
import {
  PaymentMethodKey,
  PaymentMethodsConfig,
  MobileBankingConfig,
  BanglaQRConfig,
  MemberDepositRequest,
} from '../types';
import { Icon } from './Icons';
import { PAYMENT_METHODS_META, MethodLogoBadge } from './ManagerPaymentMethods';

interface MemberDepositProps {
  paymentMethods?: PaymentMethodsConfig;
  myDepositRequests?: MemberDepositRequest[];
  onSubmitDeposit: (data: {
    method: PaymentMethodKey;
    amount: number;
    senderNumber: string;
    trxId?: string;
  }) => Promise<void> | void;
  showToast: (msg: string) => void;
  onBack?: () => void;
  onOpenDrawer?: () => void;
}

const ORN = (
  <svg className="kk-orn" viewBox="0 0 300 300" aria-hidden="true">
    {Array.from({ length: 14 }).map((_, i) => (
      <ellipse
        key={i}
        cx="150"
        cy="150"
        rx="140"
        ry="48"
        transform={`rotate(${i * 13} 150 150)`}
      />
    ))}
    <circle cx="150" cy="150" r="146" />
    <circle cx="150" cy="150" r="104" />
  </svg>
);

export const MemberDeposit: React.FC<MemberDepositProps> = ({
  paymentMethods = {},
  myDepositRequests = [],
  onSubmitDeposit,
  showToast,
  onBack,
  onOpenDrawer,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodKey>('bkash');
  const [amount, setAmount] = useState<number | ''>('');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedMeta = PAYMENT_METHODS_META[selectedMethod];
  const isBanglaQr = selectedMethod === 'bangla_qr';
  const config = paymentMethods[selectedMethod];
  const isConfigured = isBanglaQr
    ? !!(config as BanglaQRConfig)?.qrImageUrl
    : !!(config as MobileBankingConfig)?.phoneNumber;

  const handleCopyNumber = (num: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(num);
      showToast(`✅ ${num} কপি করা হয়েছে!`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      showToast('টাকার সঠিক পরিমাণ দিন');
      return;
    }
    if (!senderNumber.trim()) {
      showToast('যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বরটি দিন');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitDeposit({
        method: selectedMethod,
        amount: numAmt,
        senderNumber: senderNumber.trim(),
        trxId: trxId.trim(),
      });
      showToast('✅ জমা রিকোয়েস্ট সফলভাবে ম্যানেজারের কাছে পাঠানো হয়েছে!');
      setAmount('');
      setSenderNumber('');
      setTrxId('');
    } catch (err: any) {
      console.error('Error submitting deposit:', err);
      const msg = err?.message ? String(err.message).slice(0, 70) : '';
      showToast(msg ? `রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে: ${msg}` : 'রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="kk-view space-y-4">
      {/* Top Hero Header */}
      <header className="kk-hero">
        {ORN}

        <div className="kk-ht">
          {onBack && (
            <button
              type="button"
              className="kk-ib"
              onClick={onBack}
              aria-label="হোমে ফিরে যান"
              title="হোম ড্যাশবোর্ড"
            >
              <svg className="kk-i"><use href="#kk-l" /></svg>
            </button>
          )}
          <div className="kk-gr">
            <h2>মেসের টাকা জমা দিন</h2>
            <span>ক্যাশলেস জমা রিকোয়েস্ট গেটওয়ে</span>
          </div>
          {onOpenDrawer && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="kk-ib"
                onClick={onOpenDrawer}
                aria-label="মেনু"
                title="মেনু খুলুন"
              >
                <svg className="kk-i"><use href="#kk-menu" /></svg>
              </button>
            </div>
          )}
        </div>

        <div className="kk-bt">
          <span className="text-xs text-[var(--gold)] font-medium flex items-center gap-1.5">
            <span>💳</span> ৫টি জনপ্রিয় ডিজিটাল পেমেন্ট মেথড
          </span>
          <span className="text-xs text-[var(--mut)]">
            অনুমোদনের পর ব্যালেন্সে যোগ হবে
          </span>
        </div>
      </header>

      {/* Select Payment Method Card */}
      <div className="kk-card">
        <h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2 m-0 mb-1">
          <span>📱</span>
          <span>পেমেন্ট মেথড নির্বাচন করুন</span>
        </h3>
        <p className="text-xs text-[var(--mut)] m-0 mb-3">
          ম্যানেজারের নির্দিষ্ট অ্যাকাউন্টে টাকা পাঠিয়ে নিচের ফর্মে জমা রিকোয়েস্ট সাবমিট করুন
        </p>

        {/* 5 Options Selector with Official Logos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {(['bkash', 'nagad', 'rocket', 'upay', 'bangla_qr'] as PaymentMethodKey[]).map(key => {
            const meta = PAYMENT_METHODS_META[key];
            const isSelected = selectedMethod === key;
            const itemConfig = paymentMethods[key];
            const hasAccount = key === 'bangla_qr'
              ? !!(itemConfig as BanglaQRConfig)?.qrImageUrl
              : !!(itemConfig as MobileBankingConfig)?.phoneNumber;

            return (
              <button
                key={key}
                type="button"
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-2 shadow-sm font-bold bg-white dark:bg-gray-800'
                    : 'border-[var(--line)] bg-[var(--card)] hover:bg-[var(--line)]/50'
                }`}
                style={{
                  borderColor: isSelected ? meta.color : undefined,
                  boxShadow: isSelected ? `0 4px 12px ${meta.color}25` : undefined,
                }}
                onClick={() => setSelectedMethod(key)}
              >
                <MethodLogoBadge method={key} size={36} />
                <span className="text-xs font-semibold">{meta.bnName}</span>

                {hasAccount ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute top-2 right-2 ring-2 ring-white dark:ring-gray-900" title="অ্যাকাউন্ট যুক্ত আছে" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 absolute top-2 right-2" title="অ্যাকাউন্ট নেই" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Payment & Form Container */}
      <div className="kk-card space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
          <MethodLogoBadge method={selectedMethod} size={32} />
          <div>
            <b className="text-sm block text-[var(--ink)]">
              {selectedMeta.bnName} ({selectedMeta.name}) মাধ্যমে জমা
            </b>
            <span className="text-[11px] text-[var(--mut)]">
              {isConfigured ? 'ম্যানেজার অ্যাকাউন্ট সক্রিয়' : 'অ্যাকাউন্ট সেটআপ করা হয়নি'}
            </span>
          </div>
        </div>

        {/* CASE 1: Manager has NOT configured this method */}
        {!isConfigured ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--line)]/30 border border-dashed border-[var(--line)] space-y-3">
            <span className="text-3xl block">⚠️</span>
            <b className="text-sm block text-[var(--ink)]">
              {isBanglaQr
                ? 'ম্যানেজারের কোনো বাংলা QR কোড যুক্ত করা নেই।'
                : `ম্যানেজারের কোনো ${selectedMeta.bnName} অ্যাকাউন্ট যুক্ত করা নেই।`}
            </b>
            <p className="text-xs text-[var(--mut)] max-w-sm mx-auto">
              অনুগ্রহ করে অন্য কোনো সক্রিয় পেমেন্ট মেথড নির্বাচন করুন অথবা ম্যানেজারের সাথে সরাসরি যোগাযোগ করুন।
            </p>
          </div>
        ) : (
          /* CASE 2: Manager HAS configured this method */
          <div className="space-y-4">
            {/* Payment Details Box */}
            {!isBanglaQr ? (
              <div className="p-4 rounded-2xl bg-[var(--line)]/40 border border-[var(--line)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="tag text-xs font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60">
                    নির্দেশনা: {(config as MobileBankingConfig).instructions || ((config as MobileBankingConfig).accountType === 'Agent' ? 'Cash Out করুন' : 'Send Money করুন')}
                  </span>
                  <span className="tag text-xs font-bold">
                    হিসাবের ধরন: {(config as MobileBankingConfig).accountType}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--mut)]">ম্যানেজারের নম্বর:</span>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      onClick={() => handleCopyNumber((config as MobileBankingConfig).phoneNumber)}
                    >
                      <span>{(config as MobileBankingConfig).phoneNumber}</span>
                      <Icon name="copy" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Bangla QR Box */
              <div className="p-4 rounded-2xl bg-[var(--line)]/40 border border-[var(--line)] space-y-3 text-center">
                <span className="text-xs text-[var(--mut)] block">যেকোনো ব্যাংক বা ওয়ালেট অ্যাপ দিয়ে স্ক্যান করে টাকা দিন</span>
                <div className="flex justify-center py-2">
                  <img
                    src={(config as BanglaQRConfig).qrImageUrl}
                    alt="Bangla QR Code"
                    className="w-48 h-48 object-contain rounded-xl border border-[var(--line)] bg-white p-2 shadow-sm"
                  />
                </div>
                {(config as BanglaQRConfig).instructions && (
                  <p className="text-xs text-[var(--mut)]">
                    {(config as BanglaQRConfig).instructions}
                  </p>
                )}
              </div>
            )}

            {/* Deposit Request Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                  জমার পরিমাণ (টাকা) <span className="text-[var(--bad)]">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  placeholder="যেমন: ১০০০"
                  value={amount}
                  onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="kk-in"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                  প্রেরকের নম্বর / অ্যাকাউন্ট <span className="text-[var(--bad)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন (যেমন: 017xxxxxxxx)"
                  value={senderNumber}
                  onChange={e => setSenderNumber(e.target.value)}
                  className="kk-in"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                  ট্রানজেকশন আইডি (TrxID) <span className="text-[var(--mut)] font-normal">(ঐচ্ছিক)</span>
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 9J28DA71"
                  value={trxId}
                  onChange={e => setTrxId(e.target.value)}
                  className="kk-in font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="kk-btn w-full py-3 flex items-center justify-center gap-2 font-bold cursor-pointer shadow-md mt-4"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>রিকোয়েস্ট পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" size={16} />
                    <span>জমা রিকোয়েস্ট পাঠান (Submit Deposit Request)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Member's Previous Deposit Requests History */}
      {myDepositRequests.length > 0 && (
        <div className="kk-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 m-0">
              <span>📋</span>
              <span>আমার পূর্ববর্তী জমা রিকোয়েস্টসমূহ</span>
            </h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--line)] text-[var(--mut)]">
              মোট: {myDepositRequests.length} টি
            </span>
          </div>

          <div className="space-y-2 mt-2">
            {myDepositRequests.map(req => {
              const meta = PAYMENT_METHODS_META[req.method] || { bnName: req.method, color: '#666' };
              return (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--card)] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <div className="flex items-center gap-2">
                      <MethodLogoBadge method={req.method} size={24} />
                      <span className="text-[var(--ink)]">{meta.bnName}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                        ৳ {req.amount}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'pending'
                          ? 'text-amber-700 bg-amber-100 dark:bg-amber-950/60'
                          : req.status === 'approved'
                          ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60'
                          : 'text-red-700 bg-red-100 dark:bg-red-950/60'
                      }`}
                    >
                      {req.status === 'pending'
                        ? 'অপেক্ষমান'
                        : req.status === 'approved'
                        ? 'অনুমোদিত'
                        : 'বাতিল'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--mut)]">
                    <span>প্রেরক: <span className="font-mono text-[var(--fg)]">{req.senderNumber}</span></span>
                    <span>তারিখ: {req.date}</span>
                  </div>
                  {req.trxId && (
                    <div className="text-[10px] text-[var(--mut)] font-mono">
                      TrxID: <span className="text-[var(--fg)]">{req.trxId}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
