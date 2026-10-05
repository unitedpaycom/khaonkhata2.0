import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { HeroBannerCarousel } from './HeroBannerCarousel';

interface LandingPageProps {
  user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null } | User | null;
  onNavigate: (path: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  showToast: (msg: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  onNavigate,
  showToast,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Contact Form State
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cMsg, setCMsg] = useState('');

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = cName.trim();
    const email = cEmail.trim();
    const msg = cMsg.trim();

    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !msg) {
      showToast('নাম, সঠিক ইমেইল ও মেসেজ দিন');
      return;
    }

    showToast('ইমেইল অ্যাপ খুলছে…');
    const mailtoUrl = `mailto:support.khaonkhata@gmail.com?subject=${encodeURIComponent(
      'KhaonKhata inquiry from ' + name
    )}&body=${encodeURIComponent(msg + '\n\nFrom: ' + name + ' <' + email + '>')}`;
    window.location.href = mailtoUrl;
  };

  const handleAuthAction = () => {
    if (user) {
      onNavigate('/app');
    } else {
      onNavigate('/login');
    }
  };

  return (
    <div id="land" className={mobileOpen ? 'mo' : ''}>
      {/* ============================================================
          HEADER & NAVIGATION BAR
          ============================================================ */}
      <header className="lh">
        <div className="lw">
          <a
            className="lb"
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <i>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12h18a9 9 0 01-18 0zM8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4" />
              </svg>
            </i>
            <span>
              KhaonKhata <span style={{ fontWeight: 500, fontSize: '15px' }}>(খাওনখাতা)</span>
            </span>
          </a>

          <button
            className="burger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </button>

          <nav className="ln" aria-label="Main">
            <button
              type="button"
              className="nav-link"
              onClick={() => scrollToSection('features')}
            >
              Features
            </button>
            <button
              type="button"
              className="nav-link"
              onClick={() => scrollToSection('how')}
            >
              How It Works
            </button>
            <button
              type="button"
              className="nav-link"
              onClick={() => scrollToSection('why')}
            >
              Why Digital
            </button>
            <button
              type="button"
              className="nav-link"
              onClick={() => scrollToSection('about')}
            >
              About Us
            </button>
            <button
              type="button"
              className="nav-link"
              onClick={() => scrollToSection('privacy')}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              className="nav-link"
              onClick={() => scrollToSection('terms')}
            >
              Terms
            </button>
            <button
              type="button"
              className="nav-link"
              onClick={() => scrollToSection('contact')}
            >
              Contact
            </button>
            <button
              type="button"
              className="cta"
              onClick={handleAuthAction}
            >
              {user ? 'ড্যাশবোর্ড (Dashboard)' : 'Get Started / Login'}
            </button>
          </nav>
        </div>
      </header>

      {/* ============================================================
          HERO SECTION (.hero3)
          ============================================================ */}
      <main>
        <section className="lw hero3">
          <div>
            <span className="kick">Mess &amp; hostel management, simplified</span>
            <h1>
              Smart, Automated &amp; <em>Real-Time</em> Mess &amp; Meal Management
            </h1>
            <p>
              Effortlessly track daily meals, manager deposits, bazaar expenses, and instant meal rates for your hostel or mess.
            </p>
            <button
              type="button"
              className="bigcta"
              onClick={handleAuthAction}
            >
              {user ? 'ওপেন ড্যাশবোর্ড (Open Dashboard)' : 'Get Started Now'}
            </button>
          </div>

          <div className="w-full">
            <HeroBannerCarousel onAction={handleAuthAction} />
          </div>
        </section>

        {/* ============================================================
            FEATURES SECTION (#features)
            ============================================================ */}
        <section className="sec" id="features">
          <div className="lw">
            <h2>Everything your mess needs, in one place</h2>
            <p className="sub">
              KhaonKhata replaces the notebook, the calculator and the group chat arguments with one shared, always-correct ledger.
            </p>
            <div className="fg">
              {/* Feature 1 */}
              <div className="fc">
                <i>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 7h12l-3-3M17 17H5l3 3" />
                  </svg>
                </i>
                <h3>Real-Time Sync</h3>
                <p>Every update reaches all members instantly. Managers and members always look at the same, up-to-date numbers.</p>
              </div>

              {/* Feature 2 */}
              <div className="fc">
                <i>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12h18a9 9 0 01-18 0zM8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4" />
                  </svg>
                </i>
                <h3>Daily Meal Tracker</h3>
                <p>Log breakfast, lunch and dinner for each member in a few taps, with half-meal support.</p>
              </div>

              {/* Feature 3 */}
              <div className="fc">
                <i>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
                  </svg>
                </i>
                <h3>Automated Calculations</h3>
                <p>Meal rate, total deposits, individual costs and remaining balances are calculated for you the moment data changes.</p>
              </div>

              {/* Feature 4 */}
              <div className="fc">
                <i>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" />
                  </svg>
                </i>
                <h3>Automated Email Receipts</h3>
                <p>A clear HTML receipt is emailed for every deposit and meal status update, so there is always a written record.</p>
              </div>

              {/* Feature 5 */}
              <div className="fc">
                <i>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 4h2l2.5 11h10L20 7H6.5M9 20h.01M17 20h.01" />
                  </svg>
                </i>
                <h3>Bazaar Expense Management</h3>
                <p>Record daily grocery and bazaar spending with date, buyer and item list, visible to the whole mess.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            HOW IT WORKS SECTION (#how)
            ============================================================ */}
        <section className="sec alt" id="how">
          <div className="lw">
            <h2>How It Works</h2>
            <p className="sub">Get your whole mess running in minutes.</p>
            <div className="fg stp">
              {/* Step 1 */}
              <div className="fc">
                <h3>
                  <button
                    type="button"
                    onClick={handleAuthAction}
                    style={{ all: 'unset', cursor: 'pointer', color: 'inherit' }}
                  >
                    Sign in
                  </button>
                </h3>
                <p>Log in securely with your account to get started.</p>
              </div>

              {/* Step 2 */}
              <div className="fc">
                <h3>Create or join a mess</h3>
                <p>Managers create a mess. Members join with the manager’s email.</p>
              </div>

              {/* Step 3 */}
              <div className="fc">
                <h3>Record daily activity</h3>
                <p>Add meals, deposits and bazaar costs as they happen.</p>
              </div>

              {/* Step 4 */}
              <div className="fc">
                <h3>See everything live</h3>
                <p>Meal rate and every member’s balance update automatically.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            WHY DIGITAL SECTION (#why)
            ============================================================ */}
        <section className="sec" id="why">
          <div className="lw">
            <h2>Why digital mess management matters</h2>
            <p className="sub">
              Running a shared kitchen is mostly about trust and arithmetic. Getting both right by hand, every month, is harder than it looks.
            </p>
            <div className="art">
              <article>
                <h3>Eliminate calculation errors</h3>
                <p>
                  Paper ledgers depend on one person adding dozens of daily entries without a slip. A single missed meal or mistyped bazaar amount changes everyone’s final bill. When the app records each entry once and calculates automatically, those slips disappear.
                </p>
                <div className="formula">
                  Meal rate = Total bazaar cost ÷ Total meals
                  <br />
                  Member cost = Member meals × Meal rate
                  <br />
                  Balance = Deposit − Cost
                </div>
              </article>

              <article>
                <h3>Ensure financial transparency</h3>
                <p>
                  Most mess disputes are not about money itself but about not being able to see where it went. With a shared view, every member can check deposits, bazaar entries and their own meal count at any time. Open records reduce suspicion and make the manager’s job easier and fairer.
                </p>
              </article>

              <article>
                <h3>Save hours of bookkeeping</h3>
                <p>
                  Month-end used to mean collecting scattered notes, re-adding columns and double-checking totals. Here, the totals are ready as the month goes on, and closing a month is a single step. Managers get their evenings back, and members get answers instantly.
                </p>
              </article>

              <article>
                <h3>Built for real shared living</h3>
                <p>
                  Hostels, student housing and bachelor messes all share the same needs: flexible meals per day, deposits at different times, and costs that are either shared by all or belong to one person. KhaonKhata handles each of these without extra spreadsheets.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ============================================================
            ABOUT US & FOUNDER SECTION (#about)
            ============================================================ */}
        <section className="sec alt" id="about">
          <div className="lw doc">
            <h2>About Us &amp; Founder</h2>
            <p>
              KhaonKhata (খাওনখাতা) was created with a clear vision: to modernize student and bachelor mess management with seamless, real-time digital automation. For too long, shared kitchens and hostels across Bangladesh have relied on paper registers, handwritten diaries, mental math, and contentious debates at the end of every month.
            </p>
            <p>
              Envisioned and built by <strong>Reduean A Rahat</strong> (Founder &amp; Lead Developer), KhaonKhata eliminates manual mess management hassles by providing an intuitive, transparent platform that runs seamlessly on any smartphone or browser. Reduean designed the system to give managers an effortless way to record daily meals, deposits, and bazaar costs, while giving every resident an instantaneous, verified view of their own meal count, active meal rate, and account balance.
            </p>
            <p>
              Under Reduean’s direction, the platform continues to evolve with modern offline-first capabilities, automated transaction receipts, and zero-error arithmetic tailored specifically for community living. If you have questions, ideas, or feedback, please{' '}
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('contact');
                }}
                style={{ color: 'var(--pri)' }}
              >
                reach out to us
              </a>
              .
            </p>
          </div>
        </section>

        {/* ============================================================
            PRIVACY POLICY SECTION (#privacy)
            ============================================================ */}
        <section className="sec" id="privacy">
          <div className="lw doc">
            <h2>Privacy Policy</h2>
            <p>
              <small>Last updated: October 2026</small>
            </p>
            <p>
              KhaonKhata respects your privacy. This policy explains what we collect, why, and how we protect it.
            </p>

            <h3>Information we collect</h3>
            <ul>
              <li>
                <b>Name and email address</b> – used to identify your account and to send notifications and receipts.
              </li>
              <li>
                <b>Mess data</b> – meal counts, deposits, bazaar and other expense records you or your manager enter.
              </li>
            </ul>

            <h3>How we use it</h3>
            <p>
              We use this information only to operate KhaonKhata: showing balances, calculating meal rates, syncing data between members and sending transactional emails.
            </p>

            <h3>Storage and security</h3>
            <p>
              Your data is stored securely using Google Firebase / Firestore. We do not sell your personal data to third parties.
            </p>

            <h3>Third-party services</h3>
            <ul>
              <li>
                <b>Resend</b> – delivers transactional emails such as deposit and meal receipts.
              </li>
              <li>
                <b>Google AdSense</b> – we may display ads. Google and its partners may use cookies to serve ads based on your visits to this and other sites. You can manage personalised advertising at{' '}
                <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
                  Google Ads Settings
                </a>
                .
              </li>
            </ul>

            <h3>Cookies</h3>
            <p>
              Cookies and similar technologies are used to keep you signed in and, through advertising partners, to show relevant ads.
            </p>

            <h3>Your choices</h3>
            <p>
              You can request access, correction or deletion of your data at any time by emailing{' '}
              <a href="mailto:support.khaonkhata@gmail.com">support.khaonkhata@gmail.com</a>.
            </p>

            <h3>Changes</h3>
            <p>
              We may update this policy from time to time. Continued use of KhaonKhata means you accept the updated policy.
            </p>
          </div>
        </section>

        {/* ============================================================
            TERMS OF SERVICE SECTION (#terms)
            ============================================================ */}
        <section className="sec alt" id="terms">
          <div className="lw doc">
            <h2>Terms of Service</h2>
            <p>
              <small>Last updated: October 2026</small>
            </p>

            <h3>1. Acceptance of terms</h3>
            <p>
              By accessing or using KhaonKhata you agree to these terms. If you do not agree, please do not use the service.
            </p>

            <h3>2. Accounts and roles</h3>
            <p>
              You are responsible for your account and for activity under it. A mess manager controls the data of the mess they create; members have view access unless the manager allows otherwise.
            </p>

            <h3>3. Accuracy of entries</h3>
            <p>
              Users are responsible for entering accurate meal and financial information. KhaonKhata calculates results from the data provided and cannot verify its correctness.
            </p>

            <h3>4. Acceptable use</h3>
            <p>
              Do not misuse the service, attempt unauthorised access, upload unlawful content or interfere with other users.
            </p>

            <h3>5. Advertising</h3>
            <p>
              The service may display third-party advertisements, such as Google AdSense.
            </p>

            <h3>6. Limitation of liability</h3>
            <p>
              KhaonKhata is provided “as is”. To the extent permitted by law, we are not liable for indirect or consequential losses, disputes between mess members, or errors resulting from incorrect data entry or service interruptions.
            </p>

            <h3>7. Termination and changes</h3>
            <p>
              We may suspend accounts that violate these terms and may update the terms at any time. Continued use means acceptance.
            </p>
          </div>
        </section>

        {/* ============================================================
            CONTACT US SECTION (#contact)
            ============================================================ */}
        <section className="sec" id="contact">
          <div className="lw">
            <h2>Contact Us</h2>
            <p className="sub">Questions, feedback or a data request? We’d love to hear from you.</p>
            <div className="cg">
              <div className="ci">
                <div>
                  <b>Email</b>
                  <a href="mailto:support.khaonkhata@gmail.com">support.khaonkhata@gmail.com</a>
                </div>
                <div>
                  <b>Phone</b>
                  <a href="tel:+8809696917004">+8809696917004</a>
                </div>
              </div>

              <div className="card">
                <form onSubmit={handleContactSubmit}>
                  <label>
                    Name
                    <input
                      id="cn"
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      id="ce"
                      type="email"
                      autoComplete="email"
                      placeholder="you@gmail.com"
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Message
                    <textarea
                      id="cm"
                      rows={4}
                      placeholder="Your question or feedback..."
                      value={cMsg}
                      onChange={(e) => setCMsg(e.target.value)}
                    />
                  </label>
                  <p style={{ marginTop: '16px' }}>
                    <button type="submit" className="btn big">
                      Send Message
                    </button>
                  </p>
                  <small className="mut" style={{ display: 'block', marginTop: '8px' }}>
                    This opens your email app with the message ready to send.
                  </small>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================
          FOOTER (.lf)
          ============================================================ */}
      <footer className="lf">
        <div className="lw">
          <div>© 2026 KhaonKhata. All rights reserved.</div>
          <div>
            <a
              href="#privacy"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('privacy');
              }}
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('terms');
              }}
            >
              Terms of Service
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('about');
              }}
            >
              About Us
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('contact');
              }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
