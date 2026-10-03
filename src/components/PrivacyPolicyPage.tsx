import React, { useEffect } from 'react';
import { Icon } from './Icons';

interface PrivacyPolicyPageProps {
  onBack: () => void;
  onNavigate?: (path: string) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Privacy Policy | KhaonKhata (খাওনখাতা)';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <i><Icon name="chevron-down" size={16} className="rotate-90 inline-block" /></i>
            <span>হোমে ফিরে যান (Back to Home)</span>
          </button>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            সর্বশেষ আপডেট: অক্টোবর ৩, ২০২৬ (Last Updated: October 3, 2026)
          </div>
        </div>

        {/* Header Content */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
              Legal & Transparency (আইনি ও নিরাপত্তা নীতি)
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Privacy Policy (গোপনীয়তা নীতি)
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              At <strong>KhaonKhata (খাওনখাতা)</strong>, accessible from{' '}
              <a href="https://khaonkhata.web.app" className="text-emerald-600 dark:text-emerald-400 underline">
                https://khaonkhata.web.app
              </a>
              , one of our main priorities is the privacy of our visitors and registered mess members. This Privacy Policy document outlines the types of information that is collected and recorded by KhaonKhata and how we use it.
            </p>
          </div>

          {/* Section 1: Overview */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">1.</span> Information We Collect (আমরা যে তথ্য সংগ্রহ করি)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              When you use KhaonKhata to manage your hostel, flat, or bachelor mess, we collect the minimum necessary data to provide our automated ledger and notification services:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
              <li>
                <strong>Account & Profile Information:</strong> Your name, Google account email address, and profile picture provided during Google OAuth authentication.
              </li>
              <li>
                <strong>Mess Accounting & Ledger Data:</strong> Member names, room numbers, daily meal counts (breakfast, lunch, dinner), manager deposits, grocery and bazaar expense receipts, other mess costs, and payment submission records.
              </li>
              <li>
                <strong>Device & Notification Data:</strong> FCM push notification device tokens (only if explicitly permitted by the user) to notify members regarding daily meal statuses.
              </li>
              <li>
                <strong>Inquiry & Contact Data:</strong> Name, email address, and message submitted through our customer support contact forms.
              </li>
            </ul>
          </div>

          {/* Section 2: Storage & Security */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">2.</span> How We Protect & Store Your Data (তথ্য সংরক্ষণ ও নিরাপত্তা)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              KhaonKhata utilizes <strong>Google Cloud Firestore</strong> and <strong>Firebase Authentication</strong> to guarantee industry-standard encryption, strict access control rules (RBAC), and persistent cloud storage.
            </p>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
              <strong>Strict Data Privacy Guarantee:</strong> We do <u>not</u> sell, rent, trade, or monetize your personal information or your mess ledger data to third-party data brokers or marketing companies under any circumstances.
            </div>
          </div>

          {/* Section 3: Third Party Services */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">3.</span> Third-Party Services & Integrations (তৃতীয় পক্ষের সেবা)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              KhaonKhata partners with reliable, enterprise-grade cloud providers to operate essential application capabilities:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <li>
                <strong>Google Firebase:</strong> Used for secure user identity authentication, real-time database sync, and serverless background event management.
              </li>
              <li>
                <strong>Resend (Transactional Email Service):</strong> Used to deliver instant HTML confirmation receipts to member emails whenever meal counts are updated or deposits are submitted. Only your email address, member name, and relevant receipt details are transmitted for email generation.
              </li>
              <li>
                <strong>Google AdSense & Web Cookies:</strong> KhaonKhata may display non-intrusive advertisements served by Google AdSense to sustain free server and maintenance costs. Google, as a third-party vendor, uses cookies (including the DoubleClick DART cookie) to serve ads based on your visit to this and other websites. Users may opt out of personalized advertising by visiting Google Ads Settings.
              </li>
            </ul>
          </div>

          {/* Section 4: Log Files & Analytics */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">4.</span> Log Files, Cache & Offline LocalStorage
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              To support <strong>Offline Mode (PWA)</strong>, KhaonKhata securely caches active mess records in your browser's local <strong>IndexedDB</strong> and <strong>LocalStorage</strong>. This ensures you can view meal charts and calculate balances even without active internet connectivity. This data remains on your local physical device until cleared.
            </p>
          </div>

          {/* Section 5: User Rights */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">5.</span> Your Rights & Data Erasure (ব্যবহারকারীর অধিকার)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Every KhaonKhata user has the right to:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
              <li>Request an export copy of their mess ledger history in PDF format.</li>
              <li>Request correction or updating of their personal information.</li>
              <li>Request deletion of their account or removal from a specific mess group by contacting the mess manager or our support team.</li>
            </ul>
          </div>

          {/* Section 6: Contact */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">6.</span> Contacting Our Data Privacy Team
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              If you have any questions, suggestions, or concerns regarding our Privacy Policy or data security practices, please contact us directly:
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl text-sm space-y-1 border border-slate-200 dark:border-slate-700">
              <p><strong>Service:</strong> KhaonKhata (খাওনখাতা)</p>
              <p>
                <strong>Email:</strong>{' '}
                <a href="mailto:support.khaonkhata@gmail.com" className="text-emerald-600 dark:text-emerald-400 font-medium">
                  support.khaonkhata@gmail.com
                </a>
              </p>
              <p>
                <strong>Phone:</strong>{' '}
                <a href="tel:+8809696917004" className="text-emerald-600 dark:text-emerald-400 font-medium">
                  +8809696917004
                </a>
              </p>
              <p><strong>Headquarters:</strong> Dhaka, Bangladesh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
