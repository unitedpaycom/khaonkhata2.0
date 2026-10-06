import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MessState, Member } from '../types';
import { MonthSummary, fm } from './calc';

export interface IndividualReportOptions {
  member: Member;
  messState: MessState;
  ym: string;
  summary: MonthSummary;
}

export interface GroupReportOptions {
  messState: MessState;
  ym: string;
  summary: MonthSummary;
}

// Format month YYYY-MM to readable string e.g. "October 2026"
export function formatMonthName(ym: string): string {
  try {
    const [y, m] = ym.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return ym;
  }
}

// Format current date and time
function formatDateTime(d = new Date()): string {
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format currency cleanly with standard BDT Taka symbol
export function formatBDT(amt: number): string {
  const rounded = Math.round(amt);
  return `৳ ${rounded.toLocaleString('en-IN')}`;
}

/**
 * Download Individual Monthly Expense & Meal Summary PDF
 * Matches 100% exact styling provided in user statement template
 */
export async function downloadIndividualReportPDF({
  member,
  messState,
  ym,
  summary,
}: IndividualReportOptions): Promise<void> {
  const memberStats = summary.mm[member.id] || {
    meals: 0,
    dep: 0,
    ind: 0,
    cost: 0,
    sh: 0,
    tot: 0,
    bal: 0,
  };

  const isRefund = memberStats.bal >= 0;
  const absBal = Math.abs(memberStats.bal);
  const monthName = formatMonthName(ym);

  // Filter member deposits for this month
  const deposits = (messState.deposits || []).filter(
    (d) => d.m === member.id && d.date.startsWith(ym)
  );

  const container = document.createElement('div');
  container.id = 'pdf-individual-export';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // 210mm in pixels at 96dpi
  container.style.minHeight = '1123px'; // 297mm in pixels at 96dpi
  container.style.backgroundColor = '#FDFCF8';
  container.style.zIndex = '99999';
  container.style.boxSizing = 'border-box';

  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .pdf-statement-page {
        --green: #3D8C68;
        --green-d: #1F5A42;
        --green-t: #E7F3EC;
        --saff: #F6C96B;
        --saff-t: #FFF3D3;
        --coral: #D9663F;
        --coral-t: #FDEBE3;
        --bg: #FDFCF8;
        --ink: #1E2B25;
        --mute: #6B7A72;
        --line: #E4EAE5;

        width: 794px;
        min-height: 1123px;
        margin: 0 auto;
        background: var(--bg);
        padding: 38px 42px 30px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Segoe UI', Arial, sans-serif;
        color: var(--ink);
        font-size: 14px;
        line-height: 1.5;
        font-variant-numeric: tabular-nums;
      }

      .pdf-statement-page > * {
        flex: none;
      }

      /* Hero */
      .pdf-hero {
        background: var(--green);
        border-radius: 18px;
        color: #fff;
        padding: 14px 22px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        overflow: hidden;
      }
      .pdf-hero::before {
        content: "";
        position: absolute;
        right: -50px;
        top: -70px;
        width: 220px;
        height: 220px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
      }
      .pdf-hero::after {
        content: "";
        position: absolute;
        right: 60px;
        bottom: -90px;
        width: 160px;
        height: 160px;
        border-radius: 50%;
        background: rgba(246, 201, 107, 0.14);
      }
      .pdf-brand {
        display: flex;
        align-items: center;
        gap: 14px;
        position: relative;
        z-index: 1;
      }
      .pdf-brand svg {
        width: 62px;
        height: 62px;
        flex: none;
      }
      .pdf-brand b {
        font-size: 26px;
        font-weight: 700;
        line-height: 1.1;
        display: block;
      }
      .pdf-brand span {
        font-size: 12.5px;
        color: rgba(255, 255, 255, 0.85);
      }
      .pdf-doc {
        text-align: right;
        position: relative;
        z-index: 1;
      }
      .pdf-doc small {
        font-size: 12px;
        color: var(--saff);
        font-weight: 600;
      }
      .pdf-doc h1 {
        font-size: 23px;
        font-weight: 700;
        line-height: 1.25;
        margin: 2px 0 0;
      }
      .pdf-month {
        display: inline-block;
        margin-top: 6px;
        background: var(--saff);
        color: var(--green-d);
        font-weight: 700;
        font-size: 13.5px;
        padding: 1px 16px;
        border-radius: 99px;
      }

      /* Member Card */
      .pdf-member {
        display: grid;
        grid-template-columns: 1.9fr 1fr 1.1fr;
        gap: 12px;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 12px 18px !important;
        align-items: center;
      }
      .pdf-l {
        font-size: 12px;
        color: var(--mute);
      }
      .pdf-v {
        font-size: 15px;
        font-weight: 600;
      }
      .pdf-who {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .pdf-av {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--saff);
        color: var(--green-d);
        font-size: 23px;
        font-weight: 700;
        display: grid;
        place-items: center;
        flex: none;
      }
      .pdf-name {
        font-size: 18px;
        font-weight: 700;
        line-height: 1.2;
      }
      .pdf-mail {
        font-size: 12px;
        color: var(--mute);
      }
      .pdf-ok {
        display: inline-block;
        margin-top: 3px;
        background: var(--green-t);
        color: var(--green-d);
        border-radius: 99px;
        font-size: 12px;
        font-weight: 600;
        padding: 0 11px;
      }
      .pdf-member .pdf-col > div + div {
        margin-top: 7px;
      }

      /* Stats */
      .pdf-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 11px;
      }
      .pdf-stat {
        border-radius: 16px;
        padding: 13px 16px;
      }
      .pdf-stat .pdf-big {
        font-size: 27px;
        font-weight: 700;
        line-height: 1.25;
      }
      .pdf-stat .pdf-n {
        font-size: 12px;
        color: var(--mute);
      }
      .pdf-s1 { background: var(--green-t); }
      .pdf-s1 .pdf-big { color: var(--green-d); }
      .pdf-s2 { background: var(--saff-t); }
      .pdf-s2 .pdf-big { color: #8A5A00; }
      .pdf-s3 { background: var(--coral-t); }
      .pdf-s3 .pdf-big { color: var(--coral); }

      /* Refund / Due Banner */
      .pdf-refund {
        background: var(--green-d);
        color: #fff;
        border-radius: 16px;
        padding: 10px 22px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-left: 8px solid var(--saff);
      }
      .pdf-refund.due {
        background: #2b1814;
        border-left: 8px solid var(--coral);
      }
      .pdf-refund .pdf-l {
        color: rgba(255, 255, 255, 0.8);
        font-size: 13px;
      }
      .pdf-refund .pdf-amt {
        font-size: 34px;
        font-weight: 700;
        color: var(--saff);
        line-height: 1.15;
      }
      .pdf-refund.due .pdf-amt {
        color: #ffc9be;
      }
      .pdf-refund .pdf-pill {
        background: var(--saff);
        color: var(--green-d);
        font-weight: 700;
        font-size: 14px;
        padding: 3px 20px;
        border-radius: 99px;
      }
      .pdf-refund.due .pdf-pill {
        background: var(--coral);
        color: #fff;
      }

      /* Boxes & Tables */
      .pdf-box {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 16px;
        overflow: hidden;
      }
      .pdf-box h2 {
        font-size: 15px;
        font-weight: 700;
        padding: 7px 18px;
        background: var(--green-t);
        color: var(--green-d);
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      .pdf-box h2 em {
        font-style: normal;
        font-size: 12px;
        font-weight: 500;
        color: var(--mute);
      }
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
      }
      .pdf-table th {
        font-size: 12px;
        color: var(--mute);
        font-weight: 600;
        text-align: left;
        padding: 6px 18px;
        border-bottom: 1px solid var(--line);
      }
      .pdf-table td {
        padding: 6px 18px;
        border-bottom: 1px solid var(--line);
        font-size: 14px;
      }
      .pdf-table tr:last-child td {
        border-bottom: 0;
      }
      .pdf-table td small {
        display: block;
        font-size: 12px;
        color: var(--mute);
      }
      .pdf-table .r {
        text-align: right;
      }
      .pdf-table td.r {
        font-weight: 700;
      }
      .pdf-table tr.total td {
        background: var(--saff-t);
        font-weight: 700;
      }
      .pdf-table tr.final td {
        background: var(--green);
        color: #fff;
        font-weight: 700;
        font-size: 15px;
      }
      .pdf-table tr.final.due td {
        background: #b91c1c;
      }
      .pdf-table tr.final td.r {
        color: var(--saff);
        font-size: 16.5px;
      }

      /* Signature & Stamp */
      .pdf-sign {
        margin-top: auto !important;
        display: flex;
        gap: 80px;
        padding: 0 30px;
      }
      .pdf-sign > div {
        flex: 1;
        border-top: 1.5px dashed #9BB0A5;
        padding-top: 5px;
        font-size: 12.5px;
        color: var(--mute);
        text-align: center;
        position: relative;
        margin-top: 48px;
      }
      .pdf-stamp {
        position: absolute;
        left: 50%;
        bottom: 12px;
        width: 110px;
        height: 110px;
        transform: translateX(-50%) rotate(-9deg);
        opacity: 0.88;
        mix-blend-mode: multiply;
        pointer-events: none;
      }

      .pdf-footer {
        display: flex;
        justify-content: space-between;
        font-size: 11.5px;
        color: var(--mute);
        border-top: 1px solid var(--line);
        padding-top: 7px;
      }
      .pdf-footer b {
        color: var(--green);
      }
    </style>

    <div class="pdf-statement-page">
      <!-- HERO SECTION -->
      <section class="pdf-hero">
        <div class="pdf-brand">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="KhaonKhata logo">
            <circle cx="50" cy="50" r="48" fill="#2F7556" />
            <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.4" stroke-dasharray="3 4" />
            <g fill="none" stroke="#FFEAB0" stroke-width="3.4" stroke-linecap="round">
              <path d="M38 14 q-5 5 0 9 t0 9" />
              <path d="M50 12 q-5 5 0 9 t0 9" />
              <path d="M62 14 q-5 5 0 9 t0 9" />
            </g>
            <path d="M27 62 A23 23 0 0 1 73 62 Z" fill="#fff" />
            <path d="M22 62 H78 A28 28 0 0 1 22 62 Z" fill="#F6C96B" />
            <path d="M40 70 L47 77 L61 63" fill="none" stroke="#2F7556" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div>
            <b>KhaonKhata · খাওনখাতা</b>
            <span>Smart Mess Meal &amp; Account Management System</span>
          </div>
        </div>
        <div class="pdf-doc">
          <small>Official Member Statement</small>
          <h1>সদস্যের মাসিক বিবরণী</h1>
          <span class="pdf-month">📅 ${monthName}</span>
        </div>
      </section>

      <!-- MEMBER INFORMATION -->
      <section class="pdf-member">
        <div class="pdf-who">
          <div class="pdf-av">${(member.name[0] || 'M').toUpperCase()}</div>
          <div>
            <div class="pdf-l">সদস্যের নাম (Member Name)</div>
            <div class="pdf-name">${member.name}</div>
            <div class="pdf-mail">${member.email || member.phone || 'ID: ' + member.id}</div>
            <span class="pdf-ok">সক্রিয় সদস্য</span>
          </div>
        </div>
        <div class="pdf-col">
          <div><div class="pdf-l">মেস (Mess)</div><div class="pdf-v">${messState.mess}</div></div>
          <div><div class="pdf-l">রুম নং (Room)</div><div class="pdf-v">${member.room || 'Room -'}</div></div>
        </div>
        <div class="pdf-col">
          <div><div class="pdf-l">মিল রেট (Meal Rate)</div><div class="pdf-v">৳ ${(summary.rate || 0).toFixed(1)} / মিল</div></div>
          <div><div class="pdf-l">জেনারেট তারিখ</div><div class="pdf-v">${formatDateTime()}</div></div>
        </div>
      </section>

      <!-- METRIC HIGHLIGHT STATS -->
      <section class="pdf-stats">
        <div class="pdf-stat pdf-s1">
          <div class="pdf-l">মোট জমা (Deposit)</div>
          <div class="pdf-big">${formatBDT(memberStats.dep)}</div>
          <div class="pdf-n">মাসিক মোট প্রদত্ত জমা</div>
        </div>
        <div class="pdf-stat pdf-s2">
          <div class="pdf-l">মোট মিল (Meals)</div>
          <div class="pdf-big">${fm(memberStats.meals)} টি</div>
          <div class="pdf-n">রেট: ৳ ${(summary.rate || 0).toFixed(1)}/মিল</div>
        </div>
        <div class="pdf-stat pdf-s3">
          <div class="pdf-l">মোট খরচ (Total Cost)</div>
          <div class="pdf-big">${formatBDT(memberStats.tot)}</div>
          <div class="pdf-n">মিল ও শেয়ার খরচ সহ</div>
        </div>
      </section>

      <!-- REFUND / DUE BANNER -->
      <section class="pdf-refund ${isRefund ? '' : 'due'}">
        <div>
          <div class="pdf-l">ব্যালেন্স (${isRefund ? 'Refund / পাওনা' : 'Due / দেনা'})</div>
          <div class="pdf-amt">${isRefund ? '+' : '-'}${formatBDT(absBal)}</div>
        </div>
        <div class="pdf-pill">${isRefund ? 'পাওনা (Refund)' : 'দেনা (Payable)'}</div>
      </section>

      <!-- COST CALCULATION BREAKDOWN -->
      <section class="pdf-box">
        <h2>
          <span>মাসিক খরচের বিস্তারিত বিবরণ</span>
          <em>Cost Calculation Breakdown · মিল রেট ৳ ${(summary.rate || 0).toFixed(1)}</em>
        </h2>
        <table class="pdf-table">
          <tr>
            <th>খাত / বিবরণ (Item Description)</th>
            <th class="r">পরিমাণ</th>
          </tr>
          <tr>
            <td>
              খাবার ও মিল খরচ (Meal Expense)
              <small>${fm(memberStats.meals)} মিল × ৳ ${(summary.rate || 0).toFixed(1)}</small>
            </td>
            <td class="r">${formatBDT(memberStats.cost)}</td>
          </tr>
          <tr>
            <td>
              মেসের অন্যান্য শেয়ার খরচ (Shared Utilities &amp; Expenses)
              <small>সমান বণ্টন (${(messState.members || []).length} জন সদস্য)</small>
            </td>
            <td class="r">${formatBDT(memberStats.sh)}</td>
          </tr>
          ${memberStats.ind > 0 ? `
            <tr>
              <td>
                ব্যক্তিগত অতিরিক্ত খরচ (Individual Expenses)
                <small>সরাসরি ব্যক্তিগত খাত</small>
              </td>
              <td class="r">${formatBDT(memberStats.ind)}</td>
            </tr>
          ` : ''}
          <tr class="total">
            <td>সর্বমোট খরচ (Total Monthly Cost)</td>
            <td class="r">${formatBDT(memberStats.tot)}</td>
          </tr>
          <tr>
            <td>মোট পরিশোধিত জমা (Total Deposit Paid)</td>
            <td class="r">${formatBDT(memberStats.dep)}</td>
          </tr>
          <tr class="final ${isRefund ? '' : 'due'}">
            <td>চূড়ান্ত ব্যালেন্স (${isRefund ? 'মেম্বার ফেরত পাবে / Refund' : 'মেম্বারকে দিতে হবে / Due'})</td>
            <td class="r">${isRefund ? '+' : '-'}${formatBDT(absBal)}</td>
          </tr>
        </table>
      </section>

      <!-- DEPOSITS RECORD TABLE -->
      <section class="pdf-box">
        <h2>
          <span>জমার তালিকা</span>
          <em>${monthName} — Deposits Record</em>
        </h2>
        <table class="pdf-table">
          <tr>
            <th>বিবরণ / নোট (Description / Note)</th>
            <th>তারিখ (Date)</th>
            <th class="r">পরিমাণ</th>
          </tr>
          ${deposits.length === 0 ? `
            <tr>
              <td colspan="3" style="text-align: center; color: var(--mute);">এই মাসে কোনো জমা রেকর্ড নেই</td>
            </tr>
          ` : deposits.map(d => `
            <tr>
              <td>${d.note || 'নিয়মিত মেস জমা'}</td>
              <td>${d.date}</td>
              <td class="r">${formatBDT(d.amt)}</td>
            </tr>
          `).join('')}
          <tr class="total">
            <td colspan="2">মোট জমা</td>
            <td class="r">${formatBDT(memberStats.dep)}</td>
          </tr>
        </table>
      </section>

      <!-- SIGNATURE LINES WITH OFFICIAL STAMP -->
      <div class="pdf-sign">
        <div>সদস্যের স্বাক্ষর (Member)</div>
        <div>
          <svg class="pdf-stamp" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" aria-label="Official stamp">
            <defs>
              <path id="arcTop" d="M 28,70 A 42,42 0 0 1 112,70"/>
              <path id="arcBot" d="M 19,70 A 51,51 0 0 0 121,70"/>
              <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="warp"/>
                <feDisplacementMap in="SourceGraphic" in2="warp" scale="1.8" result="d"/>
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="8" result="n"/>
                <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.9" result="speck"/>
                <feComposite in="d" in2="speck" operator="in"/>
              </filter>
            </defs>
            <g filter="url(#ink)" fill="#22389B" stroke="#22389B">
              <circle cx="70" cy="70" r="65" fill="none" stroke-width="3.2"/>
              <circle cx="70" cy="70" r="60" fill="none" stroke-width="1"/>
              <circle cx="70" cy="70" r="37" fill="none" stroke-width="1.6"/>
              <text stroke="none" font-size="10" font-weight="700" letter-spacing="2.2" text-anchor="middle">
                <textPath href="#arcTop" startOffset="50%">KHAONKHATA MESS</textPath>
              </text>
              <text stroke="none" font-size="8.5" font-weight="700" letter-spacing="1.8" text-anchor="middle">
                <textPath href="#arcBot" startOffset="50%">${(messState.mess || 'MESS').toUpperCase()} · OFFICIAL</textPath>
              </text>
              <text stroke="none" x="20" y="74" font-size="10" text-anchor="middle">★</text>
              <text stroke="none" x="120" y="74" font-size="10" text-anchor="middle">★</text>
              <text stroke="none" x="70" y="63" font-size="12.5" font-weight="700" text-anchor="middle">খাওনখাতা</text>
              <line x1="48" y1="69" x2="92" y2="69" stroke-width="1.2"/>
              <text stroke="none" x="70" y="83" font-size="11" font-weight="700" letter-spacing="1.6" text-anchor="middle">VERIFIED</text>
              <text stroke="none" x="70" y="94" font-size="7" font-weight="600" letter-spacing="1.4" text-anchor="middle">MANAGER</text>
            </g>
          </svg>
          ম্যানেজারের স্বাক্ষর (Manager)
        </div>
      </div>

      <!-- FOOTER -->
      <footer class="pdf-footer">
        <span><b>KhaonKhata</b> Mess Management System · www.khaonkhata.web.app</span>
        <span>পৃষ্ঠা ১ / ১ (Page 1 of 1)</span>
      </footer>
    </div>
  `;

  document.body.appendChild(container);

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FDFCF8',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 210mm x 297mm full-bleed A4
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    const sanitizedName = member.name.replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_') || 'Member';
    pdf.save(`KhaonKhata_${sanitizedName}_${ym}_Statement.pdf`);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Download Group Mess Summary Report PDF
 */
export async function downloadGroupReportPDF({
  messState,
  ym,
  summary,
}: GroupReportOptions): Promise<void> {
  const monthName = formatMonthName(ym);
  const totalBalance = summary.dep - summary.tot;
  const isSurplus = totalBalance >= 0;

  const monthBazar = (messState.bazar || []).filter((b) => b.date.startsWith(ym));
  const monthOther = (messState.other || []).filter((o) => o.date.startsWith(ym));

  const container = document.createElement('div');
  container.id = 'pdf-group-export';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.minHeight = '1123px';
  container.style.backgroundColor = '#FDFCF8';
  container.style.zIndex = '99999';
  container.style.boxSizing = 'border-box';

  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .pdf-group-page {
        --green: #3D8C68; --green-d: #1F5A42; --green-t: #E7F3EC;
        --saff: #F6C96B; --saff-t: #FFF3D3; --coral: #D9663F;
        --bg: #FDFCF8; --ink: #1E2B25; --mute: #6B7A72; --line: #E4EAE5;
        width: 794px; min-height: 1123px; margin: 0 auto; background: var(--bg);
        padding: 38px 42px 30px; display: flex; flex-direction: column; gap: 12px;
        font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
      }
      .pdf-group-hero {
        background: var(--green); border-radius: 18px; color: #fff; padding: 16px 22px;
        display: flex; justify-content: space-between; align-items: center;
      }
      .pdf-group-hero h1 { font-size: 22px; font-weight: 700; margin: 0; }
      .pdf-gbox { background: #fff; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
      .pdf-gbox h2 { font-size: 14px; font-weight: 700; padding: 8px 16px; background: var(--green-t); color: var(--green-d); }
      .pdf-gtable { width: 100%; border-collapse: collapse; font-size: 13px; }
      .pdf-gtable th { text-align: left; padding: 6px 14px; border-bottom: 1px solid var(--line); color: var(--mute); }
      .pdf-gtable td { padding: 6px 14px; border-bottom: 1px solid var(--line); }
      .pdf-gtable .r { text-align: right; }
      .pdf-gtable tr.total td { background: var(--saff-t); font-weight: 700; }
    </style>
    <div class="pdf-group-page">
      <div class="pdf-group-hero">
        <div>
          <b style="font-size: 24px;">KhaonKhata · খাওনখাতা</b>
          <p style="margin: 2px 0 0; font-size: 12px; opacity: 0.9;">মেস: ${messState.mess} | সামগ্রিক মাসিক বিবরণী</p>
        </div>
        <div style="text-align: right;">
          <span style="background: var(--saff); color: var(--green-d); font-weight: 700; padding: 2px 14px; border-radius: 99px; font-size: 13px;">
            📅 ${monthName}
          </span>
          <p style="margin: 4px 0 0; font-size: 10px; opacity: 0.8;">জেনারেট: ${formatDateTime()}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        <div style="background: #e7f3ec; padding: 10px 14px; border-radius: 12px;">
          <small style="color: #6b7a72; font-size: 11px;">মোট বাজার খরচ</small>
          <div style="font-size: 18px; font-weight: 700; color: #1f5a42;">${formatBDT(summary.baz)}</div>
        </div>
        <div style="background: #fff3d3; padding: 10px 14px; border-radius: 12px;">
          <small style="color: #6b7a72; font-size: 11px;">মোট মিল</small>
          <div style="font-size: 18px; font-weight: 700; color: #8a5a00;">${fm(summary.meals)} টি</div>
        </div>
        <div style="background: #e7f3ec; padding: 10px 14px; border-radius: 12px;">
          <small style="color: #6b7a72; font-size: 11px;">মিল রেট</small>
          <div style="font-size: 18px; font-weight: 700; color: #1f5a42;">${formatBDT(summary.rate)}</div>
        </div>
        <div style="background: ${isSurplus ? '#e7f3ec' : '#fdebe3'}; padding: 10px 14px; border-radius: 12px;">
          <small style="color: #6b7a72; font-size: 11px;">মেস স্থিতি</small>
          <div style="font-size: 18px; font-weight: 700; color: ${isSurplus ? '#1f5a42' : '#d9663f'};">
            ${isSurplus ? '+' : ''}${formatBDT(totalBalance)}
          </div>
        </div>
      </div>

      <!-- MEMBERS BREAKDOWN TABLE -->
      <div class="pdf-gbox">
        <h2>সদস্যভিত্তিক হিসাব সংক্ষেপ (Member Summaries)</h2>
        <table class="pdf-gtable">
          <thead>
            <tr>
              <th>সদস্যের নাম</th>
              <th class="r">মিল</th>
              <th class="r">জমা</th>
              <th class="r">মিল খরচ</th>
              <th class="r">শেয়ার</th>
              <th class="r">মোট খরচ</th>
              <th class="r">ব্যালেন্স</th>
            </tr>
          </thead>
          <tbody>
            ${messState.members.map((m) => {
              const ms = summary.mm[m.id] || { meals: 0, dep: 0, cost: 0, sh: 0, tot: 0, bal: 0 };
              const isPos = ms.bal >= 0;
              return `
                <tr>
                  <td><b>${m.name}</b></td>
                  <td class="r">${fm(ms.meals)}</td>
                  <td class="r">${formatBDT(ms.dep)}</td>
                  <td class="r">${formatBDT(ms.cost)}</td>
                  <td class="r">${formatBDT(ms.sh)}</td>
                  <td class="r">${formatBDT(ms.tot)}</td>
                  <td class="r" style="font-weight: 700; color: ${isPos ? '#166534' : '#e11d48'};">
                    ${isPos ? '+' : ''}${formatBDT(ms.bal)}
                  </td>
                </tr>
              `;
            }).join('')}
            <tr class="total">
              <td>মোট</td>
              <td class="r">${fm(summary.meals)}</td>
              <td class="r">${formatBDT(summary.dep)}</td>
              <td class="r">${formatBDT(summary.baz)}</td>
              <td class="r">${formatBDT(summary.oth)}</td>
              <td class="r">${formatBDT(summary.tot)}</td>
              <td class="r">${isSurplus ? '+' : ''}${formatBDT(totalBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: auto; display: flex; justify-content: space-between; border-top: 1px solid #e4eae5; padding-top: 8px; font-size: 11px; color: #6b7a72;">
        <span><b>KhaonKhata</b> · মেস ম্যানেজমেন্ট সিস্টেম</span>
        <span>পৃষ্ঠা ১ / ১</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FDFCF8',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    const sanitizedMess = messState.mess.replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_') || 'Mess';
    pdf.save(`KhaonKhata_${sanitizedMess}_${ym}_Overall_Report.pdf`);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
