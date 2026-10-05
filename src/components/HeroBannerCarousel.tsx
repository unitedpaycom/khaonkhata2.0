import React, { useState, useEffect, useRef } from 'react';

interface SlideItem {
  id: number;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  badge: string;
  gradient: string;
  icon: string;
  preview: React.ReactNode;
}

interface HeroBannerCarouselProps {
  onAction?: () => void;
}

export const HeroBannerCarousel: React.FC<HeroBannerCarouselProps> = ({ onAction }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const slides: SlideItem[] = [
    {
      id: 0,
      tag: 'REAL-TIME TRACKING',
      tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      title: 'Automated Real-Time Meal Tracking',
      description: 'Instant meal counts, automatic daily meal rates & live balance updates with zero manual errors.',
      badge: 'Live Auto Calculation',
      gradient: 'from-emerald-500/15 via-teal-500/10 to-emerald-600/20',
      icon: '🍽️',
      preview: (
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-emerald-200/60 dark:border-emerald-800/60 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-[var(--ink)]">আজকের মিল হিসাব (Live)</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Active Sync
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <small className="text-[10px] text-[var(--mut)] block">Breakfast</small>
              <b className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">4.5</b>
            </div>
            <div className="p-2 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40">
              <small className="text-[10px] text-[var(--mut)] block">Lunch</small>
              <b className="text-sm text-teal-700 dark:text-teal-400 font-bold">8.0</b>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <small className="text-[10px] text-[var(--mut)] block">Dinner</small>
              <b className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">7.0</b>
            </div>
          </div>
          <div className="flex justify-between items-center pt-1 text-xs">
            <span className="text-[var(--mut)]">সর্বশেষ মিল রেট:</span>
            <b className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">৳54.20 / মিল</b>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      tag: 'INSTANT GMAIL ALERTS',
      tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      title: 'Automated Email Notifications',
      description: 'Members receive automated Gmail notifications on every meal entry, deposit approval & monthly statement.',
      badge: 'Resend API Powered',
      gradient: 'from-blue-500/15 via-indigo-500/10 to-teal-500/20',
      icon: '📩',
      preview: (
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-blue-200/60 dark:border-blue-800/60 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-sm">
              M
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <b className="text-xs text-[var(--ink)] truncate">KhaonKhata Mess</b>
                <span className="text-[10px] text-[var(--mut)]">এখনই</span>
              </div>
              <p className="text-[11px] text-[var(--mut)] truncate m-0">দৈনিক মেস আপডেট ও আর্থিক বিবরণী</p>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[var(--mut)]">আজকের মিল:</span>
              <b className="text-[var(--ink)]">2 টি</b>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--mut)]">মোট জমা:</span>
              <b className="text-[var(--ink)]">৳ 3,000</b>
            </div>
            <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 border-t border-blue-200/60 dark:border-blue-800/60 pt-1">
              <span>অবশিষ্ট ব্যালেন্স:</span>
              <span>৳ 1,420</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-blue-700 dark:text-blue-300 font-medium">
            <span>✓ ইনবক্সে স্বয়ংক্রিয় ডেলিভারি</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 font-bold">100% Verified</span>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      tag: 'MANAGER CONTROL HUB',
      tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      title: 'Seamless Manager Dashboard',
      description: 'Manage bazaar expenses, approve mobile banking deposits (bKash/Nagad/Rocket), and maintain accounts in seconds.',
      badge: 'Zero Math Errors',
      gradient: 'from-amber-500/15 via-emerald-500/10 to-teal-500/20',
      icon: '📊',
      preview: (
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-amber-200/60 dark:border-amber-800/60 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[var(--ink)]">ম্যানেজার হিসাব সারাংশ</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold">
              চলতি মাস
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
              <small className="text-[10px] text-[var(--mut)] block">মোট জমা সংগ্রহ</small>
              <b className="text-base text-emerald-700 dark:text-emerald-300 font-extrabold">৳18,500</b>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40">
              <small className="text-[10px] text-[var(--mut)] block">মোট বাজার খরচ</small>
              <b className="text-base text-rose-700 dark:text-rose-300 font-extrabold">৳12,740</b>
            </div>
          </div>
          <div className="flex items-center justify-between bg-[var(--bg)] p-2 rounded-xl text-xs border border-[var(--line)]">
            <span className="text-[var(--mut)]">পেন্ডিং জমা রিকোয়েস্ট:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">1টি যাচাইযোগ্য ›</span>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      tag: 'CROSS-PLATFORM PWA',
      tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      title: 'PWA & Cross-Platform Access',
      description: 'Install directly on Android, iPhone & Desktop. Works offline with lightning speeds, instant notifications and biometric convenience.',
      badge: 'Native App Feel',
      gradient: 'from-emerald-600/20 via-cyan-500/10 to-teal-600/15',
      icon: '📱',
      preview: (
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-teal-200/60 dark:border-teal-800/60 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-xl font-bold shadow-md">
              খ
            </div>
            <div>
              <b className="text-sm text-[var(--ink)] block">KhaonKhata Web App</b>
              <small className="text-[11px] text-[var(--mut)]">Progressive Web App • TWA Ready</small>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-[var(--mut)]">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span>1-ট্যাপে ইনস্টল (Add to Home Screen)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span>অফলাইন ক্যাশিং ও পুশ নোটিফিকেশন</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              <span>Play Store / APK স্টাইলের স্মুথ পারফরম্যান্স</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Auto-play interval (3.8 seconds)
  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3800);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, slides.length]);

  const goToSlide = (idx: number) => {
    setCurrentSlide(idx);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const active = slides[currentSlide];

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-[var(--line)] bg-[var(--card)] transition-all duration-300 select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Dynamic Background Soft Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${active.gradient} transition-colors duration-700 pointer-events-none`}
      />

      {/* Decorative Blur Circles */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Carousel Main Container */}
      <div className="relative p-6 sm:p-7 min-h-[360px] sm:min-h-[380px] flex flex-col justify-between">
        
        {/* Top Header Row with Tag & Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider border transition-all duration-300 ${active.tagColor}`}
          >
            <span>{active.icon}</span>
            <span>{active.tag}</span>
          </span>

          <span className="text-[11px] font-semibold text-[var(--mut)] bg-[var(--bg)]/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-[var(--line)]">
            {active.badge}
          </span>
        </div>

        {/* Slide Content with Smooth Transition */}
        <div className="space-y-4 my-auto">
          <div className="space-y-1.5 transition-all duration-500 transform">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)] font-serif line-clamp-2">
              {active.title}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--mut)] line-clamp-2 leading-relaxed max-w-md">
              {active.description}
            </p>
          </div>

          {/* Interactive Feature Visual Mockup */}
          <div className="transition-all duration-500 transform hover:scale-[1.01]">
            {active.preview}
          </div>
        </div>

        {/* Carousel Bottom Control Bar: Pagination Dots, Counter & Navigation Arrows */}
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-[var(--line)]/60">
          
          {/* Pagination Indicators (Clickable) */}
          <div className="flex items-center gap-1.5">
            {slides.map((s, index) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer h-2 ${
                  currentSlide === index
                    ? 'w-7 bg-emerald-600 dark:bg-emerald-400'
                    : 'w-2 bg-[var(--line)] hover:bg-[var(--mut)]'
                }`}
              />
            ))}
          </div>

          {/* Controls: Prev / Next buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg)]/90 hover:bg-[var(--bg)] text-[var(--ink)] border border-[var(--line)] text-sm font-bold shadow-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              ‹
            </button>
            <span className="text-[11px] font-semibold text-[var(--mut)] px-1">
              {currentSlide + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg)]/90 hover:bg-[var(--bg)] text-[var(--ink)] border border-[var(--line)] text-sm font-bold shadow-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              ›
            </button>
          </div>
        </div>

        {/* Auto-Slide Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5 overflow-hidden">
          <div
            key={currentSlide}
            className={`h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-[3800ms] ease-linear ${
              isPaused ? 'w-full !opacity-40' : 'w-full animate-in'
            }`}
            style={{
              animation: isPaused ? 'none' : 'carouselProgress 3.8s linear forwards',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default HeroBannerCarousel;
