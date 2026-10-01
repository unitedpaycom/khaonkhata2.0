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
}

export const MemberDeposit: React.FC<MemberDepositProps> = ({
  paymentMethods = {},
  myDepositRequests = [],
  onSubmitDeposit,
  showToast,
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
    <div className="pg space-y-4">
      {/* Header card */}
      <div className="card">
        <h3 className="text-base font-bold flex items-center gap-2">
          <span>💳</span>
          <span>মেসের টাকা জমা দিন (Deposit)</span>
        </h3>
        <p className="text-xs text-[var(--mut)] mt-1">
          ম্যানেজারের নির্দিষ্ট অ্যাকাউন্টে টাকা পাঠিয়ে নিচের ফর্মে জমা রিকোয়েস্ট সাবমিট করুন। ম্যানেজার অনুমোদন দিলে আপনার ব্যালেন্সে যোগ হবে।
        </p>

        {/* 5 Options Selector with Official Logos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
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
                {/* Official Logo Badge */}
                <MethodLogoBadge method={key} size={36} />

                <span className="text-xs font-semibold">{meta.bnName}</span>

                {hasAccount ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 ring-2 ring-white dark:ring-gray-900" title="অ্যাকাউন্ট যুক্ত আছে"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 absolute top-2 right-2" title="অ্যাকাউন্ট নেই"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Payment & Form Container */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
          <MethodLogoBadge method={selectedMethod} size={32} />
          <div>
            <b className="text-sm block">
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
            <b className="text-sm block text-[var(--fg)]">
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
              /* Mobile Banking (Bkash, Nagad, Rocket, Upay) */
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
                    <span className="text-[var(--mut)]">ম্যানেজারের নাম:</span>
                    <b className="text-[var(--fg)]">{(config as MobileBankingConfig).accountName}</b>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--card)] border border-[var(--line)]">
                    <div>
                      <span className="text-[10px] text-[var(--mut)] block">হিসাব নম্বর ({selectedMeta.bnName}):</span>
                      <b className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                        {(config as MobileBankingConfig).phoneNumber}
                      </b>
                    </div>

                    <button
                      type="button"
                      className="btn s !bg-emerald-600 !text-white flex items-center gap-1.5 cursor-pointer text-xs font-semibold shadow-xs hover:!bg-emerald-700"
                      onClick={() => handleCopyNumber((config as MobileBankingConfig).phoneNumber)}
                    >
                      <Icon name="copy" size={14} />
                      <span>নম্বর কপি করুন</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Bangla QR Display */
              <div className="p-5 rounded-2xl bg-teal-500/5 border border-teal-500/20 text-center space-y-3">
                {/* Caption ABOVE the image */}
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-red-600 text-white font-bold text-xs shadow-xs tracking-wider uppercase">
                    Payment Only
                  </span>
                  <h4 className="text-sm font-bold mt-1 text-[var(--fg)]">
                    বাংলা কিউআর কোড স্ক্যান করে পেমেন্ট করুন
                  </h4>
                </div>

                {/* Display Bangla QR Code Image */}
                <div className="relative inline-block mx-auto p-3 bg-white rounded-2xl shadow-md border border-gray-200">
                  <img
                    src={(config as BanglaQRConfig).qrImageUrl}
                    alt="Bangla QR Code"
                    className="w-56 h-56 object-contain mx-auto rounded-lg"
                  />
                  {/* Caption BELOW the image: 'Payment Only' */}
                  <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold text-xs px-3.5 py-0.5 rounded-full shadow-md whitespace-nowrap">
                    Payment Only
                  </span>
                </div>

                <p className="text-xs text-[var(--fg)] font-medium">
                  আপনার যেকোনো ব্যাংক বা MFS অ্যাপ (বিকাশ, নগদ, রকেট, উপায় ইত্যাদি) দিয়ে কিউআর কোড স্ক্যান করে পেমেন্ট সম্পন্ন করুন।
                </p>

                {(config as BanglaQRConfig).accountName && (
                  <p className="text-xs text-[var(--mut)]">
                    অ্যাকাউন্ট: {(config as BanglaQRConfig).accountName}
                  </p>
                )}
              </div>
            )}

            {/* Member Deposit Request Submission Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--mut)]">
                টাকা পাঠানোর বিবরণ (Deposit Confirmation)
              </h4>

              <div>
                <label className="text-xs font-semibold block mb-1">
                  জমার পরিমাণ (Amount in ৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="10"
                  step="1"
                  required
                  placeholder="যেমন: ৫০০"
                  className="w-full text-base font-semibold"
                  value={amount}
                  onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">
                  যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বরটি দিন <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="আপনার ফোন নম্বর (Sender Number)"
                  className="w-full font-mono text-sm"
                  value={senderNumber}
                  onChange={e => setSenderNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">
                  ট্রানজেকশন আইডি / TrxID (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 9H7B3Q..."
                  className="w-full font-mono text-xs uppercase"
                  value={trxId}
                  onChange={e => setTrxId(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn big !bg-emerald-600 !text-white hover:!bg-emerald-700 w-full flex items-center justify-center gap-2 cursor-pointer text-sm font-semibold shadow-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>জমা রিকোয়েস্ট পাঠানো হচ্ছে...</span>
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
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-1.5">
              <span>📋</span>
              <span>আমার পূর্ববর্তী জমা রিকোয়েস্টসমূহ</span>
            </h4>
            <span className="tag text-xs font-semibold">
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
                      <span>{meta.bnName}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                        ৳ {req.amount}
                      </span>
                    </div>

                    <span
                      className={`tag text-[10px] font-bold ${
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
