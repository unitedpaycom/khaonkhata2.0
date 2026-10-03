import React, { useEffect } from 'react';
import { Icon } from './Icons';

interface TermsPageProps {
  onBack: () => void;
  onNavigate?: (path: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack, onNavigate }) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Terms of Service | KhaonKhata (খাওনখাতা)';
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

        {/* Card Content */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
              Terms & Legal Agreements (ব্যবহারের শর্তাবলী)
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Terms of Service (ব্যবহারের সাধারণ শর্তসমূহ)
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Welcome to <strong>KhaonKhata (খাওনখাতা)</strong>. By accessing or using our website, progressive web application, and mess meal management platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </div>

          {/* Section 1: Acceptance */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">1.</span> Acceptance of Terms (শর্তাবলীর সম্মতি)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              By registering an account using Google Authentication, creating a mess, joining an existing mess group, or logging daily meals, you acknowledge that you have read, understood, and agreed to be legally bound by these terms, alongside our{' '}
              <button
                onClick={() => onNavigate?.('/privacy')}
                className="text-emerald-600 dark:text-emerald-400 underline font-medium cursor-pointer"
              >
                Privacy Policy
              </button>.
            </p>
          </div>

          {/* Section 2: User Responsibilities */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">2.</span> User Responsibilities & Accurate Entries (ব্যবহারকারীর দায়িত্ব)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              As a manager or member of a mess on KhaonKhata:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
              <li>
                <strong>Accurate Data Entry:</strong> You agree that all meal counts, bazaar grocery receipts, member deposits, and individual expense logs entered by you or your group are truthful and accurate.
              </li>
              <li>
                <strong>Account Confidentiality:</strong> You are responsible for maintaining the confidentiality of your Google account credentials and for all actions taken under your authenticated session.
              </li>
              <li>
                <strong>Mess Internal Agreements:</strong> KhaonKhata is a digital calculation and ledger tool. Financial transactions, cash exchanges, or external mobile banking transfers (bKash, Nagad, etc.) remain strictly between mess members and managers.
              </li>
            </ul>
          </div>

          {/* Section 3: Fair Use */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">3.</span> Fair Use & Prohibited Conduct (নিষিদ্ধ আচরণ)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              You agree not to misuse KhaonKhata. You may not:
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
              <li>Attempt to disrupt or reverse engineer the service, security rules, or database infrastructure.</li>
              <li>Spam or abuse the automated Resend email notification service or FCM push messaging.</li>
              <li>Create fraudulent mess accounts with malicious or abusive content.</li>
            </ul>
          </div>

          {/* Section 4: Limitation of Liability */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">4.</span> Limitation of Liability (দায়বদ্ধতার সীমাবদ্ধতা)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              KhaonKhata provides this software on an <em>"AS IS"</em> and <em>"AS AVAILABLE"</em> basis. While we strive for 100% calculation accuracy and high uptime, KhaonKhata, its founders, and contributors shall not be liable for any direct, indirect, incidental, or consequential damages resulting from lost offline data, disputes between flatmates, typographical entry mistakes by managers, or unexpected third-party service outages.
            </p>
          </div>

          {/* Section 5: Modifications */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">5.</span> Modifications to the Service
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We reserve the right to improve, update, or modify features of KhaonKhata at any time to enhance the user experience, optimize database schemas, or add new automation capabilities without prior notice.
            </p>
          </div>

          {/* Section 6: Contact */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-emerald-600">6.</span> Questions & Legal Inquiries
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              If you have any questions or require clarifications regarding our Terms of Service, please contact:
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl text-sm space-y-1 border border-slate-200 dark:border-slate-700">
              <p><strong>Email:</strong> <a href="mailto:support.khaonkhata@gmail.com" className="text-emerald-600 dark:text-emerald-400 font-medium">support.khaonkhata@gmail.com</a></p>
              <p><strong>Phone:</strong> <a href="tel:+8809696917004" className="text-emerald-600 dark:text-emerald-400 font-medium">+8809696917004</a></p>
              <p><strong>Location:</strong> Dhaka, Bangladesh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
