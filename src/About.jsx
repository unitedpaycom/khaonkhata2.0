import React from 'react';

export default function About() {
  return (
    <div className="about-page max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          About KhaonKhata (খাওনখাতা)
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Smart mess and meal management web application developed by Reduean A. Rahat.
        </p>
      </header>

      <section className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Founder &amp; Developer
        </h2>
        <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
          Reduean A. Rahat
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Graphic Designer &amp; Web Developer from Mymensingh, Bangladesh.
        </p>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-sm font-medium">
          <span className="text-slate-800 dark:text-slate-200 font-bold">
            Contact: <a href="tel:+8801965097004" className="text-emerald-600 dark:text-emerald-400 underline">+8801965097004</a>
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Email: <a href="mailto:support.khaonkhata@gmail.com" className="text-emerald-600 dark:text-emerald-400 underline">support.khaonkhata@gmail.com</a>
          </span>
        </div>
      </section>

      <section className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-500">
        <p>Public Contact &amp; Support: Contact: +8801965097004 | Available for users and automated crawlers.</p>
      </section>
    </div>
  );
}
