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

// Format currency cleanly with standard BDT Taka symbol & English comma format
export function formatBDT(amt: number): string {
  const rounded = Math.round(amt);
  return `৳ ${rounded.toLocaleString('en-IN')}`;
}

// Inlined high-resolution crisp vector SVG logo
const LOGO_SVG = `
<svg width="44" height="44" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="display: block; border-radius: 10px; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
  <defs>
    <linearGradient id="pdfLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="pdfSteamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#34D399" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#A7F3D0" stop-opacity="0.2" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#pdfLogoGrad)" />
  <path d="M190 190 C180 155 205 130 195 105" stroke="url(#pdfSteamGrad)" stroke-width="18" stroke-linecap="round" fill="none" />
  <path d="M256 180 C246 140 270 115 260 85" stroke="url(#pdfSteamGrad)" stroke-width="18" stroke-linecap="round" fill="none" />
  <path d="M322 190 C312 155 337 130 327 105" stroke="url(#pdfSteamGrad)" stroke-width="18" stroke-linecap="round" fill="none" />
  <ellipse cx="256" cy="240" rx="160" ry="24" fill="#ECFDF5" />
  <ellipse cx="256" cy="240" rx="146" ry="16" fill="#065F46" />
  <path d="M96 240 C96 350 170 395 256 395 C342 395 416 350 416 240 Z" fill="#FFFFFF" />
  <path d="M110 240 C110 330 178 375 256 375 C334 375 402 330 402 240 C370 270 142 270 110 240 Z" fill="#F0FDF4" opacity="0.6" />
  <path d="M185 390 L170 425 C170 432 180 435 190 435 L322 435 C332 435 342 432 342 425 L327 390 Z" fill="#ECFDF5" />
  <circle cx="256" cy="305" r="28" fill="#10B981" />
  <path d="M246 305 L253 312 L268 297" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
</svg>
`;

// Common CSS styling injected into report container for pixel-perfect Bangla and table rendering
const COMMON_PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body, div, table, p, h1, h2, h3, h4, th, td, span {
    font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Kalpurush', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  }

  .pdf-table {
    width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
    margin-top: 10px !important;
    border: 1px solid #cbd5e1 !important;
    background-color: #ffffff !important;
  }

  .pdf-table th {
    background-color: #f1f5f9 !important;
    color: #1e293b !important;
    padding: 8px 10px !important;
    font-weight: 700 !important;
    font-size: 11.5px !important;
    border: 1px solid #cbd5e1 !important;
    line-height: 1.3 !important;
  }

  .pdf-table td {
    padding: 8px 10px !important;
    border: 1px solid #e2e8f0 !important;
    font-size: 11px !important;
    color: #334155 !important;
    line-height: 1.35 !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
  }

  .metric-card {
    flex: 1 1 0;
    min-width: 0;
    border-radius: 8px;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
`;

/**
 * Download Individual Monthly Expense & Meal Summary PDF
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

  // Filter individual other costs for this member
  const indCosts = (messState.other || []).filter(
    (o) => o.type === 'ind' && o.m === member.id && o.date.startsWith(ym)
  );

  const container = document.createElement('div');
  container.id = 'pdf-individual-export';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '760px'; // sized for 180mm printable area
  container.style.padding = '0 0 20px 0';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '99999';

  container.innerHTML = `
    <style>${COMMON_PDF_STYLES}</style>

    <!-- HEADER WITH TOP MARGIN & CARD BACKGROUND -->
    <div style="margin-top: 20px; background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 14px;">
        ${LOGO_SVG}
        <div>
          <h2 style="margin: 0; font-size: 21px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; line-height: 1.2;">
            KhaonKhata – খাওনখাতা
          </h2>
          <p style="margin: 2px 0 0; font-size: 11.5px; color: #64748b; font-weight: 500;">
            Smart Mess Meal & Account Management System
          </p>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; display: inline-block; font-size: 11px; font-weight: 700; color: #1e293b;">
          মেস: <span style="color: #047857;">${messState.mess}</span>
        </div>
        <p style="margin: 4px 0 0; font-size: 10px; color: #64748b;">জেনারেট তারিখ: ${formatDateTime()}</p>
      </div>
    </div>

    <!-- REPORT TITLE BANNER -->
    <div style="margin-top: 14px; background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #10b981; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #059669; display: block;">
          Official Member Statement (সদস্যের মাসিক বিবরণী)
        </span>
        <h1 style="margin: 2px 0 0; font-size: 17px; font-weight: 800; color: #0f172a; line-height: 1.2;">
          Individual Monthly Expense & Meal Summary
        </h1>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 12.5px; font-weight: 700; color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 16px; display: inline-block;">
          📅 ${monthName}
        </span>
      </div>
    </div>

    <!-- MEMBER DETAILS & METADATA -->
    <div style="margin-top: 12px; display: flex; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; width: 100%;">
      <div style="flex: 2;">
        <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">সদস্যের নাম (Member Name)</span>
        <div style="font-size: 14.5px; font-weight: 700; color: #0f172a; margin-top: 2px;">${member.name}</div>
        <div style="font-size: 10.5px; color: #64748b; margin-top: 1px;">${member.email || member.phone || 'ID: ' + member.id}</div>
      </div>
      <div style="flex: 1;">
        <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">রুম নং (Room)</span>
        <div style="font-size: 13.5px; font-weight: 600; color: #0f172a; margin-top: 2px;">${member.room || 'নির্ধারিত নয়'}</div>
      </div>
      <div style="flex: 1;">
        <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">স্ট্যাটাস (Status)</span>
        <div style="margin-top: 2px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;">
            সক্রিয় সদস্য
          </span>
        </div>
      </div>
    </div>

    <!-- METRIC HIGHLIGHT CARDS (FULL-WIDTH FLEX CONTAINER) -->
    <div style="margin-top: 12px; display: flex; gap: 10px; width: 100%;">
      <div class="metric-card" style="background-color: #f0fdf4; border-color: #86efac;">
        <span style="font-size: 10.5px; font-weight: 700; color: #166534;">মোট জমা (Deposit)</span>
        <div style="font-size: 17px; font-weight: 800; color: #15803d; margin: 4px 0;">${formatBDT(memberStats.dep)}</div>
        <span style="font-size: 9.5px; color: #166534; font-weight: 500;">মাসিক মোট প্রদত্ত জমা</span>
      </div>

      <div class="metric-card" style="background-color: #eff6ff; border-color: #93c5fd;">
        <span style="font-size: 10.5px; font-weight: 700; color: #1e40af;">মোট মিল (Meals)</span>
        <div style="font-size: 17px; font-weight: 800; color: #1d4ed8; margin: 4px 0;">${fm(memberStats.meals)} টি</div>
        <span style="font-size: 9.5px; color: #1e40af; font-weight: 500;">রেট: ${formatBDT(summary.rate)}/মিল</span>
      </div>

      <div class="metric-card" style="background-color: #fff7ed; border-color: #fdba74;">
        <span style="font-size: 10.5px; font-weight: 700; color: #9a3412;">মোট খরচ (Total Cost)</span>
        <div style="font-size: 17px; font-weight: 800; color: #c2410c; margin: 4px 0;">${formatBDT(memberStats.tot)}</div>
        <span style="font-size: 9.5px; color: #9a3412; font-weight: 500;">মিল ও শেয়ার খরচ সহ</span>
      </div>

      <div class="metric-card" style="background-color: ${isRefund ? '#f0fdf4' : '#fff1f2'}; border: 2px solid ${isRefund ? '#22c55e' : '#f43f5e'};">
        <span style="font-size: 10.5px; font-weight: 800; color: ${isRefund ? '#166534' : '#9f1239'};">
          ব্যালেন্স (${isRefund ? 'Refund / পাওনা' : 'Due / বকেয়া'})
        </span>
        <div style="font-size: 17px; font-weight: 900; color: ${isRefund ? '#15803d' : '#e11d48'}; margin: 4px 0;">
          ${isRefund ? '+' : '-'}${formatBDT(absBal)}
        </div>
        <span style="font-size: 9.5px; font-weight: 700; color: ${isRefund ? '#16a34a' : '#be123c'};">
          ${isRefund ? 'পাওনা (Refund)' : 'মেসে প্রদেয় (Payable)'}
        </span>
      </div>
    </div>

    <!-- COST CALCULATION BREAKDOWN TABLE -->
    <div style="margin-top: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
        <h3 style="font-size: 12.5px; font-weight: 700; color: #334155; margin: 0; text-transform: uppercase; letter-spacing: 0.3px;">
          মাসিক খরচের বিস্তারিত বিবরণ (Cost Calculation Breakdown)
        </h3>
        <span style="font-size: 10.5px; color: #64748b;">মিল রেট: <strong>${formatBDT(summary.rate)}</strong></span>
      </div>
      <table class="pdf-table">
        <colgroup>
          <col style="width: 48%;">
          <col style="width: 27%;">
          <col style="width: 25%;">
        </colgroup>
        <thead>
          <tr>
            <th style="text-align: left;">খাত / বিবরণ (Item Description)</th>
            <th style="text-align: center;">হিসাবের ভিত্তি (Calculation Basis)</th>
            <th style="text-align: right;">মোট টাকা (Amount in BDT)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 600;">খাবার ও মিল খরচ (Meal Expense)</td>
            <td style="text-align: center; color: #475569;">${fm(memberStats.meals)} মিল × ${formatBDT(summary.rate)}</td>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatBDT(memberStats.cost)}</td>
          </tr>
          <tr>
            <td style="font-weight: 600;">মেসের অন্যান্য শেয়ার খরচ (Shared Utilities & Expenses)</td>
            <td style="text-align: center; color: #475569;">সমান বণ্টন (${messState.members.length} জন সদস্য)</td>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatBDT(memberStats.sh)}</td>
          </tr>
          ${memberStats.ind > 0 ? `
          <tr>
            <td style="font-weight: 600;">ব্যক্তিগত অতিরিক্ত খরচ (Individual Personal Expenses)</td>
            <td style="text-align: center; color: #475569;">সরাসরি ব্যক্তিগত খাত</td>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${formatBDT(memberStats.ind)}</td>
          </tr>` : ''}
          <tr style="background-color: #f8fafc; font-weight: 700;">
            <td style="color: #0f172a;">সর্বমোট খরচ (Total Monthly Cost)</td>
            <td style="text-align: center; color: #64748b;">মিল + শেয়ার + ব্যক্তিগত</td>
            <td style="text-align: right; color: #c2410c; font-size: 12px; font-weight: 800;">${formatBDT(memberStats.tot)}</td>
          </tr>
          <tr style="background-color: #f8fafc; font-weight: 700;">
            <td style="color: #166534;">মোট পরিশোধিত জমা (Total Deposit Paid)</td>
            <td style="text-align: center; color: #64748b;">চালু মাসে সংগৃহীত</td>
            <td style="text-align: right; color: #166534; font-size: 12px; font-weight: 800;">${formatBDT(memberStats.dep)}</td>
          </tr>
          <tr style="background-color: ${isRefund ? '#ecfdf5' : '#fff1f2'}; font-weight: 800;">
            <td style="color: ${isRefund ? '#166534' : '#9f1239'}; font-size: 12px;">
              চূড়ান্ত ব্যালেন্স (${isRefund ? 'মেম্বার ফেরত পাবে / Refund' : 'মেসে পরিশোধ করতে হবে / Due'})
            </td>
            <td style="text-align: center; color: ${isRefund ? '#15803d' : '#be123c'}; font-size: 11px;">
              ${isRefund ? 'উদ্বৃত্ত জমা (Credit Surplus)' : 'বকেয়া পাওনা (Payable to Mess)'}
            </td>
            <td style="text-align: right; color: ${isRefund ? '#15803d' : '#e11d48'}; font-size: 13.5px;">
              ${isRefund ? '+' : '-'}${formatBDT(absBal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- DEPOSITS ITEMIZED TABLE -->
    <div style="margin-top: 14px;">
      <h3 style="font-size: 12.5px; font-weight: 700; color: #334155; margin: 0 0 2px; text-transform: uppercase; letter-spacing: 0.3px;">
        জমার তালিকা (${monthName}) — Deposits Record
      </h3>
      ${deposits.length === 0 ? `
        <div style="padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; color: #94a3b8; font-style: italic;">
          এই মাসে সদস্যের কোনো জমা রেকর্ড করা নেই।
        </div>
      ` : `
        <table class="pdf-table">
          <colgroup>
            <col style="width: 25%;">
            <col style="width: 50%;">
            <col style="width: 25%;">
          </colgroup>
          <thead>
            <tr>
              <th style="text-align: left;">তারিখ (Date)</th>
              <th style="text-align: left;">বিবরণ / নোট (Description / Note)</th>
              <th style="text-align: right;">জমার পরিমাণ (Amount in BDT)</th>
            </tr>
          </thead>
          <tbody>
            ${deposits.map(d => `
              <tr>
                <td style="color: #334155; font-weight: 600;">${d.date}</td>
                <td style="color: #475569;">${d.note || 'নিয়মিত মেস জমা'}</td>
                <td style="text-align: right; font-weight: 700; color: #166534;">${formatBDT(d.amt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- FOOTER & AUDIT VERIFICATION -->
    <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="display: flex; gap: 40px; margin-bottom: 20px;">
          <div>
            <div style="width: 140px; border-bottom: 1px dashed #94a3b8; height: 26px;"></div>
            <p style="margin: 4px 0 0; font-size: 10px; color: #64748b; font-weight: 600;">সদস্যের স্বাক্ষর (Member)</p>
          </div>
          <div>
            <div style="width: 140px; border-bottom: 1px dashed #94a3b8; height: 26px;"></div>
            <p style="margin: 4px 0 0; font-size: 10px; color: #64748b; font-weight: 600;">ম্যানেজারের স্বাক্ষর (Manager)</p>
          </div>
        </div>
        <p style="margin: 0; font-size: 9.5px; color: #94a3b8;">
          KhaonKhata Mess Management System • www.khaonkhata.web.app
        </p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 10px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 4px; font-weight: 600;">
          পৃষ্ঠা ১ / ১ (Page 1 of 1)
        </span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for fonts to be ready
    if (document.fonts) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const margin = 15; // 15mm margin
    const pdfWidth = 210;
    const printWidth = pdfWidth - (margin * 2); // 180mm
    const printHeight = (canvas.height * printWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', margin, margin, printWidth, printHeight);
    const sanitizedName = member.name.replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_') || 'Member';
    pdf.save(`KhaonKhata_${sanitizedName}_${ym}_Summary.pdf`);
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

  // Bazar expenses for this month
  const monthBazar = (messState.bazar || []).filter((b) => b.date.startsWith(ym));
  // Other expenses for this month
  const monthOther = (messState.other || []).filter((o) => o.date.startsWith(ym));

  // Find manager member
  const mgrMember = messState.members.find(
    (m) => m.id === messState.mgr || m.email === messState.mgrEmail
  );

  const container = document.createElement('div');
  container.id = 'pdf-group-export';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '760px'; // sized for 180mm printable area
  container.style.padding = '0 0 20px 0';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '99999';

  container.innerHTML = `
    <style>${COMMON_PDF_STYLES}</style>

    <!-- HEADER WITH TOP MARGIN & CARD BACKGROUND -->
    <div style="margin-top: 20px; background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 14px;">
        ${LOGO_SVG}
        <div>
          <h2 style="margin: 0; font-size: 21px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; line-height: 1.2;">
            KhaonKhata – খাওনখাতা
          </h2>
          <p style="margin: 2px 0 0; font-size: 11.5px; color: #64748b; font-weight: 500;">
            Smart Mess Meal & Account Management System
          </p>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; display: inline-block; font-size: 11px; font-weight: 700; color: #1e293b;">
          মেস: <span style="color: #047857;">${messState.mess}</span>
        </div>
        <p style="margin: 4px 0 0; font-size: 10px; color: #64748b;">ম্যানেজার: ${mgrMember?.name || messState.mgrEmail || 'Manager'}</p>
        <p style="margin: 2px 0 0; font-size: 9.5px; color: #94a3b8;">তারিখ: ${formatDateTime()}</p>
      </div>
    </div>

    <!-- REPORT TITLE BANNER -->
    <div style="margin-top: 14px; background: #0f172a; color: #ffffff; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #34d399; display: block;">
          Official Mess Audit (মেসের সার্বিক মাসিক হিসাব রিপোর্ট)
        </span>
        <h1 style="margin: 2px 0 0; font-size: 18px; font-weight: 800; color: #ffffff; line-height: 1.2;">
          Group Mess Summary Report
        </h1>
        <p style="margin: 2px 0 0; font-size: 10.5px; color: #94a3b8;">
          সকল মেম্বারের মিল, বাজার খরচ, মোট জমা ও চূড়ান্ত ব্যালেন্সের অডিট টেবিল
        </p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 12.5px; font-weight: 800; color: #064e3b; background: #34d399; padding: 5px 14px; border-radius: 16px; display: inline-block;">
          📅 ${monthName}
        </span>
      </div>
    </div>

    <!-- GROUP METRIC HIGHLIGHTS (FULL-WIDTH FLEX CONTAINER) -->
    <div style="margin-top: 12px; display: flex; gap: 10px; width: 100%;">
      <div class="metric-card" style="background-color: #f0fdf4; border-color: #86efac;">
        <span style="font-size: 10.5px; font-weight: 700; color: #166534;">মোট মেস জমা (Deposits)</span>
        <div style="font-size: 17px; font-weight: 800; color: #15803d; margin: 4px 0;">${formatBDT(summary.dep)}</div>
        <span style="font-size: 9.5px; color: #166534; font-weight: 500;">সদস্যদের প্রদত্ত মোট জমা</span>
      </div>

      <div class="metric-card" style="background-color: #fff7ed; border-color: #fdba74;">
        <span style="font-size: 10.5px; font-weight: 700; color: #9a3412;">মোট মেস খরচ (Total Costs)</span>
        <div style="font-size: 17px; font-weight: 800; color: #c2410c; margin: 4px 0;">${formatBDT(summary.tot)}</div>
        <span style="font-size: 9.5px; color: #9a3412; font-weight: 500;">বাজার: ${formatBDT(summary.baz)} + অন্যান্য</span>
      </div>

      <div class="metric-card" style="background-color: #eff6ff; border-color: #93c5fd;">
        <span style="font-size: 10.5px; font-weight: 700; color: #1e40af;">মোট মিল ও রেট (Meals)</span>
        <div style="font-size: 17px; font-weight: 800; color: #1d4ed8; margin: 4px 0;">${fm(summary.meals)} টি</div>
        <span style="font-size: 9.5px; color: #1e40af; font-weight: 700;">মিল রেট: ${formatBDT(summary.rate)}</span>
      </div>

      <div class="metric-card" style="background-color: ${isSurplus ? '#f0fdf4' : '#fff1f2'}; border: 2px solid ${isSurplus ? '#22c55e' : '#f43f5e'};">
        <span style="font-size: 10.5px; font-weight: 800; color: ${isSurplus ? '#166534' : '#9f1239'};">
          মেস ক্যাশ স্থিতি (Cash in Hand)
        </span>
        <div style="font-size: 17px; font-weight: 900; color: ${isSurplus ? '#15803d' : '#e11d48'}; margin: 4px 0;">
          ${isSurplus ? '+' : '-'}${formatBDT(Math.abs(totalBalance))}
        </div>
        <span style="font-size: 9.5px; font-weight: 700; color: ${isSurplus ? '#16a34a' : '#be123c'};">
          ${isSurplus ? 'উদ্বৃত্ত ক্যাশ জমা (Surplus)' : 'ঘাটতি / শর্টেজ (Deficit)'}
        </span>
      </div>
    </div>

    <!-- STRUCTURED OVERVIEW TABLE FOR ALL MEMBERS -->
    <div style="margin-top: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
        <h3 style="font-size: 12.5px; font-weight: 700; color: #334155; margin: 0; text-transform: uppercase; letter-spacing: 0.3px;">
          সদস্যদের মিল ও হিসাব সারাংশ (${messState.members.length} জন সদস্য)
        </h3>
        <span style="font-size: 10.5px; color: #64748b;">লাইভ মিল রেট: <strong>${formatBDT(summary.rate)}</strong></span>
      </div>
      <table class="pdf-table">
        <colgroup>
          <col style="width: 5%;">
          <col style="width: 25%;">
          <col style="width: 10%;">
          <col style="width: 12%;">
          <col style="width: 12%;">
          <col style="width: 12%;">
          <col style="width: 12%;">
          <col style="width: 12%;">
        </colgroup>
        <thead>
          <tr>
            <th style="text-align: center;">#</th>
            <th style="text-align: left;">সদস্যের নাম (Member)</th>
            <th style="text-align: center;">মিল</th>
            <th style="text-align: right;">মিল খরচ</th>
            <th style="text-align: right;">শেয়ার খরচ</th>
            <th style="text-align: right;">মোট খরচ</th>
            <th style="text-align: right;">মোট জমা</th>
            <th style="text-align: right;">ব্যালেন্স</th>
          </tr>
        </thead>
        <tbody>
          ${messState.members.map((m, idx) => {
            const st = summary.mm[m.id] || { meals: 0, dep: 0, ind: 0, cost: 0, sh: 0, tot: 0, bal: 0 };
            const isRef = st.bal >= 0;
            const balAbs = Math.abs(st.bal);
            return `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="text-align: center; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                <td style="font-weight: 600; color: #0f172a;">
                  ${m.name}
                  ${m.room ? `<span style="font-size: 10px; color: #64748b; font-weight: 400; margin-left: 2px;">(${m.room})</span>` : ''}
                </td>
                <td style="text-align: center; font-weight: 600; color: #1e40af;">${fm(st.meals)}</td>
                <td style="text-align: right; color: #334155;">${formatBDT(st.cost)}</td>
                <td style="text-align: right; color: #334155;">${formatBDT(st.sh + st.ind)}</td>
                <td style="text-align: right; font-weight: 700; color: #c2410c;">${formatBDT(st.tot)}</td>
                <td style="text-align: right; font-weight: 700; color: #166534;">${formatBDT(st.dep)}</td>
                <td style="text-align: right; font-weight: 800; color: ${isRef ? '#15803d' : '#e11d48'};">
                  ${isRef ? '+' : '-'}${formatBDT(balAbs)}
                </td>
              </tr>
            `;
          }).join('')}
          <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; color: #0f172a;">
            <td style="text-align: center;" colspan="2">সর্বমোট মেস হিসাব (Total)</td>
            <td style="text-align: center; color: #1d4ed8;">${fm(summary.meals)}</td>
            <td style="text-align: right;">${formatBDT(summary.baz)}</td>
            <td style="text-align: right;">${formatBDT(summary.oth)}</td>
            <td style="text-align: right; color: #c2410c;">${formatBDT(summary.tot)}</td>
            <td style="text-align: right; color: #166534;">${formatBDT(summary.dep)}</td>
            <td style="text-align: right; color: ${isSurplus ? '#15803d' : '#e11d48'};">
              ${isSurplus ? '+' : '-'}${formatBDT(Math.abs(totalBalance))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- BAZAR & EXPENSES MINI OVERVIEW -->
    <div style="margin-top: 14px; display: flex; gap: 12px; width: 100%;">
      <div style="flex: 1;">
        <h4 style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569;">
          বাজার খরচের রেকর্ড (${monthBazar.length} টি আইটেম, মোট ${formatBDT(summary.baz)})
        </h4>
        <table class="pdf-table" style="margin-top: 0 !important;">
          <colgroup>
            <col style="width: 30%;">
            <col style="width: 45%;">
            <col style="width: 25%;">
          </colgroup>
          <thead>
            <tr>
              <th style="text-align: left; padding: 5px 8px !important; font-size: 10px !important;">তারিখ</th>
              <th style="text-align: left; padding: 5px 8px !important; font-size: 10px !important;">আইটেম</th>
              <th style="text-align: right; padding: 5px 8px !important; font-size: 10px !important;">টাকা</th>
            </tr>
          </thead>
          <tbody>
            ${monthBazar.slice(0, 4).map(b => `
              <tr>
                <td style="padding: 5px 8px !important; font-size: 10px !important; color: #475569;">${b.date}</td>
                <td style="padding: 5px 8px !important; font-size: 10px !important; font-weight: 500;">${b.items}</td>
                <td style="padding: 5px 8px !important; font-size: 10px !important; text-align: right; font-weight: 600; color: #c2410c;">${formatBDT(b.amt)}</td>
              </tr>
            `).join('')}
            ${monthBazar.length === 0 ? '<tr><td colspan="3" style="padding: 8px; color: #94a3b8; text-align: center; font-size: 10px;">কোনো বাজার লগ করা হয়নি।</td></tr>' : ''}
          </tbody>
        </table>
      </div>

      <div style="flex: 1;">
        <h4 style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569;">
          অন্যান্য শেয়ার খরচ (${monthOther.length} টি, মোট ${formatBDT(summary.oth)})
        </h4>
        <table class="pdf-table" style="margin-top: 0 !important;">
          <colgroup>
            <col style="width: 30%;">
            <col style="width: 45%;">
            <col style="width: 25%;">
          </colgroup>
          <thead>
            <tr>
              <th style="text-align: left; padding: 5px 8px !important; font-size: 10px !important;">তারিখ</th>
              <th style="text-align: left; padding: 5px 8px !important; font-size: 10px !important;">খাত</th>
              <th style="text-align: right; padding: 5px 8px !important; font-size: 10px !important;">টাকা</th>
            </tr>
          </thead>
          <tbody>
            ${monthOther.slice(0, 4).map(o => `
              <tr>
                <td style="padding: 5px 8px !important; font-size: 10px !important; color: #475569;">${o.date}</td>
                <td style="padding: 5px 8px !important; font-size: 10px !important; font-weight: 500;">${o.note}</td>
                <td style="padding: 5px 8px !important; font-size: 10px !important; text-align: right; font-weight: 600; color: #334155;">${formatBDT(o.amt)}</td>
              </tr>
            `).join('')}
            ${monthOther.length === 0 ? '<tr><td colspan="3" style="padding: 8px; color: #94a3b8; text-align: center; font-size: 10px;">কোনো খরচ নেই।</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>

    <!-- AUDIT FOOTER & VERIFICATION -->
    <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="display: flex; gap: 40px; margin-bottom: 20px;">
          <div>
            <div style="width: 150px; border-bottom: 1px dashed #94a3b8; height: 26px;"></div>
            <p style="margin: 4px 0 0; font-size: 10px; color: #64748b; font-weight: 600;">ম্যানেজার অডিট স্বাক্ষর</p>
          </div>
          <div>
            <div style="width: 150px; border-bottom: 1px dashed #94a3b8; height: 26px;"></div>
            <p style="margin: 4px 0 0; font-size: 10px; color: #64748b; font-weight: 600;">মেম্বার অডিট প্রতিনিধি</p>
          </div>
        </div>
        <p style="margin: 0; font-size: 9.5px; color: #94a3b8;">
          KhaonKhata Mess Management System • www.khaonkhata.web.app
        </p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 10px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 4px; font-weight: 600;">
          অফিসিয়াল কপি • পৃষ্ঠা ১ / ১
        </span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for fonts to be ready
    if (document.fonts) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const margin = 15; // 15mm margin
    const pdfWidth = 210;
    const printWidth = pdfWidth - (margin * 2); // 180mm
    const printHeight = (canvas.height * printWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', margin, margin, printWidth, printHeight);
    const sanitizedMess = messState.mess.replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_') || 'Mess';
    pdf.save(`KhaonKhata_${sanitizedMess}_${ym}_Group_Summary.pdf`);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
