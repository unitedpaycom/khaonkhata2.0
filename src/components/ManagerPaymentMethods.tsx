import React, { useState, useRef } from 'react';
import {
  PaymentMethodKey,
  PaymentMethodsConfig,
  MobileBankingConfig,
  BanglaQRConfig,
  MemberDepositRequest,
} from '../types';
import { Icon } from './Icons';

interface ManagerPaymentMethodsProps {
  messId: string;
  paymentMethods?: PaymentMethodsConfig;
  depositRequests?: MemberDepositRequest[];
  onSaveMethods: (updated: PaymentMethodsConfig) => Promise<void> | void;
  onApproveDeposit: (req: MemberDepositRequest) => Promise<void> | void;
  onRejectDeposit: (reqId: string) => Promise<void> | void;
  showToast: (msg: string) => void;
}

export const PAYMENT_METHODS_META: Record<
  PaymentMethodKey,
  {
    name: string;
    bnName: string;
    logoUrl: string;
    color: string;
    bg: string;
    border: string;
    iconLabel: string;
  }
> = {
  bkash: {
    name: 'bKash',
    bnName: 'বিকাশ',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/c/cb/BKash-Bangla-Logo-01.png?utm_source=en.wikipedia.org&utm_campaign=index&utm_content=original',
    color: '#E2136E',
    bg: 'bg-[#E2136E]/10',
    border: 'border-[#E2136E]/30',
    iconLabel: 'বিকাশ',
  },
  nagad: {
    name: 'Nagad',
    bnName: 'নগদ',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/bn/9/97/%E0%A6%A8%E0%A6%97%E0%A6%A6%E0%A7%87%E0%A6%B0_%E0%A6%B2%E0%A7%8B%E0%A6%97%E0%A7%8B.svg?utm_source=bn.wikipedia.org&utm_campaign=index&utm_content=original',
    color: '#F7941D',
    bg: 'bg-[#F7941D]/10',
    border: 'border-[#F7941D]/30',
    iconLabel: 'নগদ',
  },
  rocket: {
    name: 'Rocket',
    bnName: 'রকেট',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/4/45/Rocket_mobile_banking_logo.svg?utm_source=bn.wikipedia.org&utm_campaign=index&utm_content=original',
    color: '#8C3494',
    bg: 'bg-[#8C3494]/10',
    border: 'border-[#8C3494]/30',
    iconLabel: 'রকেট',
  },
  upay: {
    name: 'Upay',
    bnName: 'উপায়',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/d/d5/Upay_logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original',
    color: '#005CA9',
    bg: 'bg-[#005CA9]/10',
    border: 'border-[#005CA9]/30',
    iconLabel: 'উপায়',
  },
  bangla_qr: {
    name: 'Bangla QR',
    bnName: 'বাংলা কিউআর',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/8/8b/Bangla_QR_Logo.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original',
    color: '#0D9488',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    iconLabel: 'বাংলা QR',
  },
};

export const MethodLogoBadge: React.FC<{
  method: PaymentMethodKey;
  size?: number;
  className?: string;
}> = ({ method, size = 42, className = '' }) => {
  const meta = PAYMENT_METHODS_META[method];
  const [error, setError] = useState(false);

  if (error || !meta.logoUrl) {
    return (
      <span
        className={`rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-xs ${className}`}
        style={{ width: size, height: size, backgroundColor: meta.color }}
      >
        {method === 'bangla_qr' ? 'QR' : meta.iconLabel[0]}
      </span>
    );
  }

  return (
    <span
      className={`rounded-xl bg-white p-1 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-xs flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={meta.logoUrl}
        alt={meta.name}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={() => setError(true)}
      />
    </span>
  );
};

/**
 * Compresses an image file and converts it into an optimized Base64 string.
 * Resizes to max 600px dimension and uses JPEG compression (quality 0.85).
 * Generates lightweight (~40-70KB) Base64 strings directly stored in Cloud Firestore!
 */
export const compressImageToBase64 = (
  file: File,
  maxDim: number = 600,
  quality: number = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ছবি পড়তে সমস্যা হয়েছে'));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('ছবি লোড করা যায়নি'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Fill white background for transparent QR images
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const ManagerPaymentMethods: React.FC<ManagerPaymentMethodsProps> = ({
  messId,
  paymentMethods = {},
  depositRequests = [],
  onSaveMethods,
  onApproveDeposit,
  onRejectDeposit,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'methods' | 'requests'>('methods');
  const [editingMethod, setEditingMethod] = useState<PaymentMethodKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [processingQr, setProcessingQr] = useState(false);

  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Form states for Mobile Banking
  const [accountName, setAccountName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountType, setAccountType] = useState<'Personal' | 'Agent'>('Personal');
  const [instructions, setInstructions] = useState('');

  // Form states for Bangla QR
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [qrAccountName, setQrAccountName] = useState('');
  const [qrTag, setQrTag] = useState('Payment Only');
  const [qrInstructions, setQrInstructions] = useState('');

  const pendingRequests = depositRequests.filter(r => r.status === 'pending');

  const openEditor = (key: PaymentMethodKey) => {
    setEditingMethod(key);
    if (key === 'bangla_qr') {
      const current = paymentMethods.bangla_qr;
      setQrImageUrl(current?.qrImageUrl || '');
      setQrAccountName(current?.accountName || '');
      setQrTag(current?.tag || 'Payment Only');
      setQrInstructions(current?.instructions || 'যেকোনো ব্যাংক বা MFS অ্যাপ দিয়ে স্ক্যান করুন');
    } else {
      const current = paymentMethods[key] as MobileBankingConfig | undefined;
      setAccountName(current?.accountName || '');
      setPhoneNumber(current?.phoneNumber || '');
      setAccountType(current?.accountType || 'Personal');
      setInstructions(
        current?.instructions ||
          (current?.accountType === 'Agent' ? 'Cash Out করুন' : 'Send Money করুন')
      );
    }
  };

  // Image Picker & Base64 Compression (Manager Side)
  const handleQrImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('অনুগ্রহ করে একটি ছবি ফাইল (Image) নির্বাচন করুন');
      return;
    }

    setProcessingQr(true);
    try {
      showToast('⏳ কিউআর কোড প্রসেস ও কমপ্রেস করা হচ্ছে...');
      const base64Data = await compressImageToBase64(file, 600, 0.85);
      setQrImageUrl(base64Data);
      showToast('✅ কিউআর কোড সফলভাবে প্রস্তুত হয়েছে!');
    } catch (err) {
      console.error('Base64 QR conversion error:', err);
      showToast('কিউআর কোড প্রসেস করতে সমস্যা হয়েছে');
    } finally {
      setProcessingQr(false);
      // Reset input value so re-selecting same file triggers event
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  const handleSaveCurrentMethod = async () => {
    if (!editingMethod) return;

    if (editingMethod === 'bangla_qr') {
      if (!qrImageUrl.trim()) {
        showToast('কিউআর কোড ছবি আপলোড করুন');
        return;
      }
      setSaving(true);
      try {
        const updatedBanglaQr: BanglaQRConfig = {
          qrImageUrl: qrImageUrl.trim(), // Base64 string saved directly in Firestore document
          tag: qrTag.trim() || 'Payment Only',
          accountName: qrAccountName.trim() || 'মেস ম্যানেজার একাউন্ট',
          instructions: qrInstructions.trim() || 'Payment Only QR Code',
          updatedAt: new Date().toISOString(),
        };

        const updatedMethods: PaymentMethodsConfig = {
          ...paymentMethods,
          bangla_qr: updatedBanglaQr,
        };

        await onSaveMethods(updatedMethods);
        showToast('✅ বাংলা কিউআর কোড Firestore-এ সফলভাবে সেভ হয়েছে!');
        setEditingMethod(null);
      } catch (err) {
        console.error('Error saving Bangla QR to Firestore:', err);
        showToast('সেভ করতে সমস্যা হয়েছে');
      } finally {
        setSaving(false);
      }
    } else {
      if (!phoneNumber.trim()) {
        showToast('ফোন নম্বর আবশ্যক');
        return;
      }
      if (!accountName.trim()) {
        showToast('অ্যাকাউন্টের নাম আবশ্যক');
        return;
      }

      setSaving(true);
      try {
        const updatedConfig: MobileBankingConfig = {
          accountName: accountName.trim(),
          phoneNumber: phoneNumber.trim(),
          accountType,
          instructions:
            instructions.trim() ||
            (accountType === 'Agent' ? 'Cash Out করুন' : 'Send Money করুন'),
          updatedAt: new Date().toISOString(),
        };

        const updatedMethods: PaymentMethodsConfig = {
          ...paymentMethods,
          [editingMethod]: updatedConfig,
        };

        await onSaveMethods(updatedMethods);
        showToast(`✅ ${PAYMENT_METHODS_META[editingMethod].bnName} অ্যাকাউন্ট সেভ হয়েছে!`);
        setEditingMethod(null);
      } catch (err) {
        console.error('Error saving mobile banking:', err);
        showToast('সেভ করতে সমস্যা হয়েছে');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleRemoveMethod = async (key: PaymentMethodKey) => {
    if (
      !confirm(
        `আপনি কি নিশ্চিত যে ${PAYMENT_METHODS_META[key].bnName} পেমেন্ট মেথডটি মুছে ফেলতে চান?`
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const nextMethods = { ...paymentMethods };
      delete nextMethods[key];
      await onSaveMethods(nextMethods);
      showToast(`${PAYMENT_METHODS_META[key].bnName} মেথড সরানো হয়েছে`);
      if (editingMethod === key) setEditingMethod(null);
    } catch (err) {
      console.error('Error removing method:', err);
      showToast('মুছতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pg space-y-4">
      {/* Sub Tabs */}
      <div className="card !p-1.5 flex gap-1">
        <button
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'methods'
              ? 'bg-[var(--pri)] text-white shadow-sm'
              : 'text-[var(--mut)] hover:bg-[var(--line)]'
          }`}
          onClick={() => setActiveSubTab('methods')}
        >
          <Icon name="wallet" size={15} />
          <span>পেমেন্ট মেথড সেটিংস (৫টি মেথড)</span>
        </button>

        <button
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'requests'
              ? 'bg-[var(--pri)] text-white shadow-sm'
              : 'text-[var(--mut)] hover:bg-[var(--line)]'
          }`}
          onClick={() => setActiveSubTab('requests')}
        >
          <Icon name="req" size={15} />
          <span>মেম্বারদের জমা রিকোয়েস্ট</span>
          {pendingRequests.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'methods' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>💳</span>
                  <span>ম্যানেজার পেমেন্ট মেথড সেটিংস</span>
                </h3>
                <p className="text-xs text-[var(--mut)] mt-0.5">
                  নিচের মেথডগুলো কনফিগার করুন। মেম্বাররা এই অ্যাকাউন্টগুলোতে টাকা পাঠিয়ে জমা
                  রিকোয়েস্ট করতে পারবে।
                </p>
              </div>
            </div>

            {/* The 5 Options Grid with Official Logos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {(
                ['bkash', 'nagad', 'rocket', 'upay', 'bangla_qr'] as PaymentMethodKey[]
              ).map(key => {
                const meta = PAYMENT_METHODS_META[key];
                const isBanglaQr = key === 'bangla_qr';
                const config = paymentMethods[key];
                const isConfigured = isBanglaQr
                  ? !!(config as BanglaQRConfig)?.qrImageUrl
                  : !!(config as MobileBankingConfig)?.phoneNumber;

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border transition-all relative ${
                      isConfigured
                        ? 'bg-[var(--card)] border-[var(--line)] hover:border-emerald-500/50 shadow-sm'
                        : 'bg-[var(--line)]/30 border-dashed border-[var(--line)] hover:bg-[var(--line)]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Official Brand Logo */}
                        <MethodLogoBadge method={key} size={44} />

                        <div>
                          <b className="text-sm block">
                            {meta.bnName} ({meta.name})
                          </b>
                          <span
                            className={`tag text-[10px] font-semibold mt-0.5 ${
                              isConfigured
                                ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60'
                                : 'text-[var(--mut)] bg-[var(--line)]'
                            }`}
                          >
                            {isConfigured ? '✓ কনফিগার করা আছে' : '✕ যুক্ত করা নেই'}
                          </span>
                        </div>
                      </div>

                      <button
                        className="btn s g cursor-pointer text-xs font-semibold"
                        onClick={() => openEditor(key)}
                      >
                        {isConfigured ? 'এডিট করুন' : '+ সেটআপ'}
                      </button>
                    </div>

                    {/* Method Details if Configured */}
                    {isConfigured && (
                      <div className="mt-3 pt-3 border-t border-[var(--line)] text-xs space-y-1.5">
                        {isBanglaQr ? (
                          <div className="flex items-center gap-3 bg-[var(--line)]/30 p-2 rounded-lg">
                            <img
                              src={(config as BanglaQRConfig).qrImageUrl}
                              alt="Bangla QR"
                              className="w-14 h-14 object-contain rounded-md border border-gray-200 bg-white p-0.5"
                            />
                            <div>
                              <span className="tag text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950/60">
                                {(config as BanglaQRConfig).tag || 'Payment Only'}
                              </span>
                              <p className="text-[11px] text-[var(--mut)] mt-1 font-medium">
                                {(config as BanglaQRConfig).accountName || 'কিউআর কোড সক্রিয়'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-[var(--mut)]">নাম:</span>
                              <span className="font-semibold">
                                {(config as MobileBankingConfig).accountName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--mut)]">নম্বর:</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {(config as MobileBankingConfig).phoneNumber}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--mut)]">ধরন:</span>
                              <span className="tag text-[10px] font-semibold">
                                {(config as MobileBankingConfig).accountType}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal for Mobile Banking or Bangla QR */}
      {editingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card !max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div className="flex items-center gap-2.5">
                <MethodLogoBadge method={editingMethod} size={38} />
                <div>
                  <h3 className="text-base font-bold">
                    {PAYMENT_METHODS_META[editingMethod].bnName} (
                    {PAYMENT_METHODS_META[editingMethod].name}) সেটিংস
                  </h3>
                  <p className="text-xs text-[var(--mut)]">অ্যাকাউন্টের তথ্য দিন</p>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-[var(--line)] flex items-center justify-center text-sm font-bold hover:opacity-80 cursor-pointer"
                onClick={() => setEditingMethod(null)}
              >
                ✕
              </button>
            </div>

            {/* Mobile Banking Form (Bkash, Nagad, Rocket, Upay) */}
            {editingMethod !== 'bangla_qr' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">
                    অ্যাকাউন্টের নাম (Account Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full"
                    placeholder="যেমন: রেদোয়ান আহমেদ"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    ফোন নম্বর (Phone Number) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full font-mono"
                    placeholder="যেমন: 017XXXXXXXX"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    অ্যাকাউন্টের ধরন (Account Type) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <label
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold transition-all ${
                        accountType === 'Personal'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                          : 'bg-[var(--card)] border-[var(--line)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="accountType"
                        value="Personal"
                        checked={accountType === 'Personal'}
                        onChange={() => setAccountType('Personal')}
                        className="sr-only"
                      />
                      <span>Personal (ব্যক্তিগত)</span>
                    </label>

                    <label
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold transition-all ${
                        accountType === 'Agent'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                          : 'bg-[var(--card)] border-[var(--line)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="accountType"
                        value="Agent"
                        checked={accountType === 'Agent'}
                        onChange={() => setAccountType('Agent')}
                        className="sr-only"
                      />
                      <span>Agent (এজেন্ট)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    মেম্বারদের জন্য নির্দেশনা (Instructions)
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs"
                    placeholder={
                      accountType === 'Agent' ? 'Cash Out করুন' : 'Send Money করুন'
                    }
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              /* Bangla QR Form with Base64 String directly into Firestore */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold block mb-1">
                    বাংলা কিউআর ছবি নির্বাচন (Upload QR Code){' '}
                    <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="file"
                    ref={qrFileInputRef}
                    accept="image/*"
                    onChange={handleQrImageSelect}
                    className="hidden"
                  />

                  {/* Required "Upload QR Code" button */}
                  <button
                    type="button"
                    disabled={processingQr}
                    onClick={() => qrFileInputRef.current?.click()}
                    className="btn big !bg-teal-600 !text-white hover:!bg-teal-700 w-full flex items-center justify-center gap-2 cursor-pointer text-sm font-semibold shadow-xs"
                  >
                    {processingQr ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>ছবি কমপ্রেস ও কনভার্ট হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="qr" size={18} />
                        <span>Upload QR Code (গ্যালারি থেকে ছবি নির্বাচন)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-[var(--mut)] mt-1">
                    ছবিটি অপটিমাইজড Base64 স্ট্রিং হিসেবে সরাসরি Firestore ডকুমেন্টে সংরক্ষিত হবে।
                  </p>
                </div>

                {/* QR Preview with Payment Only Tag */}
                {qrImageUrl ? (
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 text-center border border-[var(--line)] space-y-2">
                    <div className="relative inline-block mx-auto">
                      <img
                        src={qrImageUrl}
                        alt="Bangla QR Preview"
                        className="w-48 h-48 object-contain mx-auto border border-gray-200 rounded-lg p-1 bg-white shadow-md"
                      />
                      {/* Clear 'Payment Only' Caption */}
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold text-xs px-3.5 py-0.5 rounded-full shadow-md whitespace-nowrap">
                        Payment Only
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ কিউআর কোড প্রস্তুত (Base64)
                    </p>
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl border border-dashed border-[var(--line)] text-xs text-[var(--mut)]">
                    এখনো কোনো কিউআর কোড নির্বাচন করা হয়নি। উপরের &#39;Upload QR Code&#39; বাটনে চাপ দিয়ে ছবি নির্বাচন করুন।
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    ক্যাপশন / লেবেল (Caption)
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs font-semibold"
                    value={qrTag}
                    onChange={e => setQrTag(e.target.value)}
                    placeholder="Payment Only"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">
                    অ্যাকাউন্টের নাম / বিবরণ
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs"
                    value={qrAccountName}
                    onChange={e => setQrAccountName(e.target.value)}
                    placeholder="যেমন: মেস ম্যানেজার একাউন্ট"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              {paymentMethods[editingMethod] && (
                <button
                  className="btn d s text-xs cursor-pointer"
                  onClick={() => handleRemoveMethod(editingMethod)}
                  disabled={saving || processingQr}
                >
                  মেথড মুছুন
                </button>
              )}
              <button
                className="btn big !bg-emerald-600 !text-white hover:!bg-emerald-700 flex-1 text-sm font-semibold cursor-pointer"
                onClick={handleSaveCurrentMethod}
                disabled={saving || processingQr}
              >
                {saving ? 'Firestore-এ সেভ হচ্ছে...' : 'সেভ করুন (Save to Firestore)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab 2: Member Deposit Requests Management */}
      {activeSubTab === 'requests' && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <span>📥</span>
                <span>মেম্বারদের জমা রিকোয়েস্ট</span>
              </h3>
              <p className="text-xs text-[var(--mut)]">
                মেম্বাররা টাকা পাঠানোর পর এখানে রিকোয়েস্ট জমা পড়বে। অনুমোদন দিলে
                স্বয়ংক্রিয়ভাবে জমার খাতায় যোগ হবে।
              </p>
            </div>
            <span className="tag text-xs font-semibold">
              মোট: {depositRequests.length} টি
            </span>
          </div>

          {depositRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--mut)] border border-dashed border-[var(--line)] rounded-xl">
              এখনো কোনো মেম্বার জমা রিকোয়েস্ট পাঠাননি।
            </div>
          ) : (
            <div className="space-y-2.5 mt-2">
              {depositRequests.map(req => {
                const meta = PAYMENT_METHODS_META[req.method] || {
                  name: req.method,
                  bnName: req.method,
                  color: '#666',
                };

                return (
                  <div
                    key={req.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                      req.status === 'pending'
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : req.status === 'approved'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-red-500/5 border-red-500/20 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MethodLogoBadge method={req.method} size={28} />
                        <b className="text-sm">{req.memberName}</b>
                      </div>
                      <div className="flex items-center gap-2">
                        <b className="text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                          ৳ {req.amount}
                        </b>
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
                            ? 'অপেক্ষমান (Pending)'
                            : req.status === 'approved'
                            ? 'অনুমোদিত (Approved)'
                            : 'বাতিল (Rejected)'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-[var(--mut)] bg-[var(--line)]/40 p-2 rounded-lg">
                      <div>
                        <span>প্রেরক নম্বর: </span>
                        <b className="font-mono text-[var(--fg)]">{req.senderNumber}</b>
                      </div>
                      <div>
                        <span>তারিখ: </span>
                        <span className="font-mono">{req.date}</span>
                      </div>
                      {req.trxId && (
                        <div className="col-span-2">
                          <span>TrxID: </span>
                          <span className="font-mono font-semibold text-[var(--fg)]">
                            {req.trxId}
                          </span>
                        </div>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          className="btn s d cursor-pointer text-xs"
                          onClick={() => onRejectDeposit(req.id)}
                        >
                          বাতিল করুন
                        </button>
                        <button
                          className="btn s !bg-emerald-600 !text-white hover:!bg-emerald-700 cursor-pointer text-xs font-semibold"
                          onClick={() => onApproveDeposit(req)}
                        >
                          ✓ অনুমোদন করুন (Approve)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
