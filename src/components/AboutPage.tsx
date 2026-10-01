import React, { useEffect, useState } from 'react';
import { Icon, FacebookIcon, GoogleIcon } from './Icons';

interface AboutPageProps {
  onBack?: () => void;
  standalone?: boolean;
  onLogin?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onBack,
  standalone = false,
  onLogin,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Profile Image URL specified by user
  const primaryImgUrl = 'https://drive.google.com/uc?export=view&id=1G3FTZF9MUET6Kx2MRETvr2OMWa9jm7Td';
  // Fast high-availability mirror fallback for Google Drive
  const fallbackImgUrl = 'https://lh3.googleusercontent.com/d/1G3FTZF9MUET6Kx2MRETvr2OMWa9jm7Td';

  useEffect(() => {
    // Dynamic SEO Metadata for Google Search Indexing
    const prevTitle = document.title;
    document.title = 'About Us | Reduean A. Rahat - Founder of KhaonKhata';

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : null;

    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Learn about Reduean A. Rahat, Founder and Lead Developer of KhaonKhata, and the story behind building simple mess management solutions.'
      );
    }

    // Ensure Person Schema is present in head
    const existingScript = document.getElementById('founder-person-schema');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'founder-person-schema';
      script.type = 'application/ld+json';
      script.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: 'Reduean A. Rahat',
          alternateName: 'MD REDUEAN AHAMED RAHAT',
          jobTitle: 'Founder & Lead Developer',
          image: primaryImgUrl,
          worksFor: {
            '@type': 'Organization',
            name: 'KhaonKhata',
          },
        },
      });
      document.head.appendChild(script);
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) {
        metaDesc.setAttribute('content', prevDesc);
      }
    };
  }, []);

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${standalone ? 'p-4 md:p-8 min-h-screen' : 'pb-12'}`}>
      {/* Top Header / Back Bar */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-[var(--line)] hover:bg-[var(--card)] text-[var(--fg)] border border-[var(--line)] transition-all cursor-pointer flex items-center justify-center"
              title="ফিরে যান"
              aria-label="Back"
            >
              <span className="text-sm font-bold">←</span>
            </button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--fg)] font-serif">
              About Us (আমাদের সম্পর্কে)
            </h1>
            <p className="text-xs text-[var(--mut)]">
              KhaonKhata-র পেছনের গল্প, মিশন ও প্রতিষ্ঠাতা পরিচিতি
            </p>
          </div>
        </div>

        {standalone && onLogin && (
          <button
            onClick={onLogin}
            className="btn s !bg-emerald-600 !text-white flex items-center gap-2 cursor-pointer shadow-sm hover:!bg-emerald-700"
          >
            <GoogleIcon size={16} />
            <span>লগইন করুন</span>
          </button>
        )}
      </div>

      {/* Hero Founder Profile Card */}
      <div className="card p-6 md:p-8 border border-[var(--line)] bg-gradient-to-br from-emerald-500/5 via-[var(--card)] to-emerald-500/10 rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          {/* Profile Picture */}
          <div className="relative flex-shrink-0 group">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden ring-4 ring-emerald-500/20 shadow-md bg-[var(--line)] flex items-center justify-center">
              {!imgError ? (
                <img
                  src={primaryImgUrl}
                  alt="Reduean A. Rahat (MD REDUEAN AHAMED RAHAT) - Founder & Lead Developer of KhaonKhata"
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => {
                    // Try fallback mirror URL if primary direct link blocks referrer
                    setImgError(true);
                  }}
                />
              ) : (
                <img
                  src={fallbackImgUrl}
                  alt="Reduean A. Rahat - Founder of KhaonKhata"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={() => {
                    // Avatar icon fallback
                  }}
                />
              )}
              {/* Spinner while loading */}
              {!imgLoaded && !imgError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--line)]">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-xl shadow-md border-2 border-[var(--card)]" title="Verified Creator">
              <Icon name="check" size={14} />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Founder &amp; Lead Developer
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--fg)] tracking-tight">
              Reduean A. Rahat
            </h2>
            <p className="text-sm font-medium text-[var(--mut)]">
              MD REDUEAN AHAMED RAHAT
            </p>

            {/* Quote / Short Bio */}
            <div className="pt-2">
              <blockquote className="p-4 rounded-2xl bg-[var(--line)]/50 border-l-4 border-emerald-600 text-sm md:text-base text-[var(--fg)] italic leading-relaxed">
                &ldquo;I am Reduean A. Rahat, Founder and Lead Developer of KhaonKhata. I built KhaonKhata to simplify mess management, expense tracking, and meal planning into a seamless and user-friendly experience.&rdquo;
              </blockquote>
            </div>

            {/* Quick Contact & Links */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
              <a
                href="https://www.facebook.com/share/1DmkXxdFDk/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] dark:bg-[#1877F2]/20 dark:hover:bg-[#1877F2]/30 dark:text-[#5890ff] flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer"
                title="Facebook Profile of Reduean A. Rahat"
              >
                <FacebookIcon size={14} />
                <span>Facebook Profile</span>
              </a>

              <a
                href="https://www.facebook.com/share/1VCSom58hc/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer"
                title="Direct Support"
              >
                <Icon name="bell" size={14} />
                <span>Community &amp; Support</span>
              </a>

              <a
                href="mailto:redueanahamedrahat@gmail.com"
                className="px-3.5 py-1.5 rounded-xl bg-[var(--line)] hover:bg-[var(--card)] text-[var(--fg)] border border-[var(--line)] flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer"
              >
                <span>✉️ Email</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Story & Vision of KhaonKhata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mission Card */}
        <div className="card p-6 border border-[var(--line)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Icon name="bowl" size={20} />
          </div>
          <h3 className="text-lg font-bold text-[var(--fg)]">
            KhaonKhata তৈরির মূল উদ্দেশ্য
          </h3>
          <p className="text-sm text-[var(--mut)] leading-relaxed">
            বাংলাদেশের ব্যাচেলর মেস, হোস্টেল বা শেয়ারড ফ্ল্যাটে মাসের শেষে খাতা-কলমের হিসাব মেলাতে গিয়ে হিসাবের গড়মিল এবং সদস্যদের মধ্যে ভুল বোঝাবুঝি প্রায়ই ঘটে। 
            <strong>খাওনখাতা</strong> তৈরি করা হয়েছে যাতে মেসের প্রতিটি মিল, বাজার খরচ ও জমা টাকা এক জায়গায় রিয়েলটাইমে শতভাগ স্বচ্ছতার সাথে সংরক্ষণ করা যায়।
          </p>
        </div>

        {/* Key Features */}
        <div className="card p-6 border border-[var(--line)] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Icon name="wallet" size={20} />
          </div>
          <h3 className="text-lg font-bold text-[var(--fg)]">
            আধুনিক সুবিধা ও স্বচ্ছতা
          </h3>
          <p className="text-sm text-[var(--mut)] leading-relaxed">
            স্বয়ংক্রিয় মিল রেট ক্যালকুলেশন, বিকাশ/নগদ ডিপোজিট রিকোয়েস্ট যাচাই, প্রতিদিনের মিল অন/অফ রিকোয়েস্ট, এবং মোবাইল পুশ নোটিফিকেশন—সব কিছুই রাখা হয়েছে অতি সাধারণ ও ইউজার-ফ্রেন্ডলি ইন্টারফেসে।
          </p>
        </div>
      </div>

      {/* Technical Excellence & Core Pillars */}
      <div className="card p-6 border border-[var(--line)] space-y-4">
        <h3 className="text-base font-bold text-[var(--fg)] flex items-center gap-2">
          <Icon name="shield" size={18} className="text-emerald-600" />
          <span>খাওনখাতার মূল বৈশিষ্ট্যসমূহ</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-[var(--line)]/40 flex items-start gap-3">
            <span className="text-emerald-600 font-bold text-base mt-0.5">✓</span>
            <div>
              <b className="text-[var(--fg)] block">রিয়েলটাইম সিঙ্ক</b>
              <span className="text-xs text-[var(--mut)]">গুগল ফায়ারস্টোর ক্লাউডের মাধ্যমে যেকোনো ডিভাইসে তাৎক্ষণিক আপডেট।</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--line)]/40 flex items-start gap-3">
            <span className="text-emerald-600 font-bold text-base mt-0.5">✓</span>
            <div>
              <b className="text-[var(--fg)] block">সঠিক আর্থিক হিসাব</b>
              <span className="text-xs text-[var(--mut)]">বাজার খরচ, অতিরিক্ত অন্যান্য খরচ (ওয়াইফাই, বাড়িভাড়া ইত্যাদি) ও সঠিক ব্যালেন্স।</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--line)]/40 flex items-start gap-3">
            <span className="text-emerald-600 font-bold text-base mt-0.5">✓</span>
            <div>
              <b className="text-[var(--fg)] block">পুশ নোটিফিকেশন</b>
              <span className="text-xs text-[var(--mut)]">মিল অনুরোধ, জমা অনুমোদন এবং মেস নোটিশের তাৎক্ষণিক বার্তা।</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--line)]/40 flex items-start gap-3">
            <span className="text-emerald-600 font-bold text-base mt-0.5">✓</span>
            <div>
              <b className="text-[var(--fg)] block">PWA ইনস্টল সুবিধা</b>
              <span className="text-xs text-[var(--mut)]">প্লে-স্টোর ছাড়াই মোবাইল হোমস্ক্রিনে অ্যাপ হিসেবে দ্রুত ব্যবহারের সুবিধা।</span>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button Action */}
      {onBack && (
        <div className="pt-2 flex justify-center">
          <button
            onClick={onBack}
            className="btn big !bg-[var(--line)] hover:!bg-[var(--card)] !text-[var(--fg)] border border-[var(--line)] px-6 py-2.5 rounded-2xl cursor-pointer font-semibold text-sm transition-all"
          >
            ← মূল ড্যাশবোর্ডে ফিরুন
          </button>
        </div>
      )}
    </div>
  );
};
