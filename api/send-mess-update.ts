import type { Request, Response } from 'express';
import { Resend } from 'resend';
import { db } from '../src/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { calcMonth, mt } from '../src/utils/calc';
import type { MessState } from '../src/types';

export interface MessUpdateRequestBody {
  to?: string;
  userName?: string;
  dailyMeals?: string | number;
  totalDeposit?: string | number;
  currentBalance?: string | number;
  messId?: string;
  memberId?: string;
  date?: string;
}

/**
 * Controller: POST /api/send-mess-update
 * Sends automated member-specific daily mess update email via Resend API
 * using published template alias 'mess-update' from notice@khaonkhata.online.
 *
 * Variables passed in 100% String format:
 * - userName: মেম্বারের নাম
 * - dailyMeals: সেদিনের মোট মিল সংখ্যা
 * - totalDeposit: মোট জমার পরিমাণ
 * - currentBalance: বর্তমান অবশিষ্ট ব্যালেন্স
 */
export async function sendMessUpdateHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const body: MessUpdateRequestBody = req.body || {};
  let toEmail = body.to ? String(body.to).trim() : '';
  let memberName = body.userName ? String(body.userName).trim() : '';
  let mealsCount = body.dailyMeals !== undefined ? String(body.dailyMeals) : '';
  let depositsTotal = body.totalDeposit !== undefined ? String(body.totalDeposit) : '';
  let balanceVal = body.currentBalance !== undefined ? String(body.currentBalance) : '';

  // If messId & memberId are provided, automatically pull details from Firestore
  if (body.messId && body.memberId) {
    try {
      const messDocRef = doc(db, 'messes', body.messId);
      const messSnap = await getDoc(messDocRef);

      if (messSnap.exists()) {
        const messState = messSnap.data() as MessState;
        const member = (messState.members || []).find((m) => m.id === body.memberId);

        if (member) {
          if (!toEmail && member.email) {
            toEmail = member.email.trim();
          }
          if (!memberName) {
            memberName = member.name;
          }

          const targetDate = body.date || new Date().toISOString().split('T')[0];
          const activeYM = targetDate.slice(0, 7);

          // Calculate daily meals for target date if not provided
          if (mealsCount === '') {
            const slot = messState.meals?.[targetDate]?.[body.memberId];
            mealsCount = String(mt(slot));
          }

          // Calculate summary for active month if not provided
          if (depositsTotal === '' || balanceVal === '') {
            const summary = calcMonth(messState, activeYM);
            const mSummary = summary.mm[body.memberId] || { dep: 0, bal: 0 };
            if (depositsTotal === '') {
              depositsTotal = String(Math.round(mSummary.dep || 0));
            }
            if (balanceVal === '') {
              balanceVal = String(Math.round(mSummary.bal || 0));
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('Failed to fetch mess details from Firestore for mess update email:', dbErr);
    }
  }

  // Error handling: Check if recipient email address exists
  if (!toEmail || !/^\S+@\S+\.\S+$/.test(toEmail)) {
    return res.status(400).json({
      success: false,
      error: 'মেম্বারের কোনো বৈধ ইমেইল এড্রেস পাওয়া যায়নি। অনুগ্রহ করে মেম্বার প্রোফাইলে সঠিক ইমেইল যোগ করুন।',
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not defined in environment variables.');
    return res.status(500).json({
      success: false,
      error: 'RESEND_API_KEY সার্ভারে কনফিগার করা নেই।',
    });
  }

  // Ensure all variables are clean strings
  const templateVariables = {
    userName: String(memberName || 'সদস্য'),
    dailyMeals: String(mealsCount || '0'),
    totalDeposit: String(depositsTotal || '0'),
    currentBalance: String(balanceVal || '0'),
  };

  const senderEmail = process.env.RESEND_FROM_NOTICE || 'KhaonKhata Mess <notice@khaonkhata.online>';

  try {
    const resend = new Resend(apiKey);

    let resendResult;
    try {
      // Primary: Dispatch using dynamic template alias 'mess-update'
      resendResult = await resend.emails.send({
        from: senderEmail,
        to: [toEmail],
        template: {
          id: 'mess-update',
          variables: templateVariables,
        },
      } as any);
    } catch (templateErr: any) {
      console.warn('Template dispatch error, falling back to direct formatted email:', templateErr);

      // Resilient fallback with exact same content & layout
      resendResult = await resend.emails.send({
        from: senderEmail,
        to: [toEmail],
        subject: `Daily Mess Update - ${templateVariables.userName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 18px 20px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 18px;">KhaonKhata • দৈনিক মেস আপডেট</h2>
            </div>
            <p style="font-size: 15px; color: #334155;">Hello <b>${templateVariables.userName}</b>,</p>
            <p style="font-size: 14px; color: #64748b;">Here is your latest mess update:</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 6px 0; font-size: 14px; color: #1e293b;">• <b>Total Meals Today:</b> ${templateVariables.dailyMeals}</p>
              <p style="margin: 6px 0; font-size: 14px; color: #1e293b;">• <b>Total Deposit:</b> ৳${templateVariables.totalDeposit}</p>
              <p style="margin: 6px 0; font-size: 14px; color: #1e293b;">• <b>Current Balance:</b> ৳${templateVariables.currentBalance}</p>
            </div>

            <p style="color: #64748b; font-size: 13px;">If you have any questions, please contact the mess manager.</p>
            <p style="color: #64748b; font-size: 13px; margin-top: 18px;">Thanks,<br/><b>KhaonKhata Mess Management</b></p>
          </div>
        `,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'দৈনিক মেস আপডেট সফলভাবে মেম্বারের ইমেইলে পাঠানো হয়েছে।',
      id: resendResult?.data?.id,
      recipient: toEmail,
      variables: templateVariables,
    });
  } catch (error: any) {
    console.error('Failed to send mess update via Resend:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Resend API এর মাধ্যমে ইমেইল পাঠাতে ব্যর্থ হয়েছে।',
    });
  }
}

export default sendMessUpdateHandler;
