import type { Request, Response } from 'express';
import { Resend } from 'resend';

export interface MessUpdateMemberPayload {
  to?: string;
  userName?: string;
  name?: string;
  dailyMeals?: string | number;
  totalDeposit?: string | number;
  currentBalance?: string | number;
  date?: string;
  messName?: string;
  [key: string]: any;
}

export interface MessUpdateRequestBody extends MessUpdateMemberPayload {
  members?: MessUpdateMemberPayload[];
}

/**
 * Rate limiting delay helper
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to safely send an individual email using Resend
 * Primary: Published template alias 'mess-update' with string variables
 * Fallback: Responsive branded HTML email
 */
async function sendSingleMessUpdateEmail(
  resend: any,
  senderEmail: string,
  memberData: MessUpdateMemberPayload
): Promise<{ success: boolean; id?: string; error?: string; usedFallback?: boolean }> {
  const toEmail = memberData.to ? String(memberData.to).trim() : '';
  const memberName = memberData.userName || memberData.name || 'সদস্য';
  const mealsCount = memberData.dailyMeals !== undefined && memberData.dailyMeals !== null ? String(memberData.dailyMeals) : '0';
  const depositsTotal = memberData.totalDeposit !== undefined && memberData.totalDeposit !== null ? String(memberData.totalDeposit) : '0';
  const balanceVal = memberData.currentBalance !== undefined && memberData.currentBalance !== null ? String(memberData.currentBalance) : '0';
  const messTitle = memberData.messName ? String(memberData.messName).trim() : 'KhaonKhata';
  const targetDate = memberData.date || new Date().toISOString().split('T')[0];

  if (!toEmail || !/^\S+@\S+\.\S+$/.test(toEmail)) {
    return {
      success: false,
      error: `Invalid or missing email address for member: ${memberName} (${toEmail || 'none'})`,
    };
  }

  const templateVariables = {
    userName: String(memberName),
    dailyMeals: String(mealsCount),
    totalDeposit: String(depositsTotal),
    currentBalance: String(balanceVal),
  };

  try {
    // 1. Primary: Dispatch using template alias 'mess-update'
    const result = await resend.emails.send({
      from: senderEmail,
      to: [toEmail],
      template: {
        id: 'mess-update',
        variables: templateVariables,
      },
    } as any);

    return {
      success: true,
      id: result?.data?.id || result?.id,
      usedFallback: false,
    };
  } catch (templateErr: any) {
    console.warn(`[Resend] Template 'mess-update' dispatch error for ${memberName} (${toEmail}):`, templateErr?.message || templateErr);

    // 2. Resilient fallback with branded responsive HTML email
    try {
      const fallbackResult = await resend.emails.send({
        from: senderEmail,
        to: [toEmail],
        subject: `[KhaonKhata] দৈনিক মেস আপডেট: ${templateVariables.userName} (${targetDate})`,
        html: `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>দৈনিক মেস আপডেট</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 28px 12px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 22px 28px; text-align: left;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 42px; height: 42px; background-color: #ffffff; border-radius: 10px; display: inline-block; text-align: center; line-height: 42px; font-size: 20px; font-weight: 800; color: #059669;">
                      খ
                    </div>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 19px; font-weight: 800; color: #ffffff;">
                      KhaonKhata – দৈনিক মেস আপডেট
                    </h1>
                    <p style="margin: 2px 0 0; font-size: 12px; color: #d1fae5;">
                      মেস: ${messTitle} • তারিখ: ${targetDate}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 26px 28px;">
              <h2 style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #0f172a;">
                হ্যালো, ${templateVariables.userName}! 👋
              </h2>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: #475569;">
                আপনার মেসের আজকের মিল ও বর্তমান আর্থিক হিসাবের সর্বশেষ আপডেট নিচে দেওয়া হলো:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 22px;">
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13.5px; color: #64748b;">আজকের মিল সংখ্যা (Daily Meals):</td>
                        <td align="right" style="font-size: 15px; font-weight: 700; color: #059669;">${templateVariables.dailyMeals} টি</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13.5px; color: #64748b;">মাসে মোট জমা (Total Deposit):</td>
                        <td align="right" style="font-size: 15px; font-weight: 700; color: #0f172a;">৳ ${templateVariables.totalDeposit}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; background-color: #f0fdf4; border-radius: 0 0 10px 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 14px; font-weight: 700; color: #166534;">বর্তমান ব্যালেন্স (Current Balance):</td>
                        <td align="right" style="font-size: 17px; font-weight: 800; color: #15803d;">৳ ${templateVariables.currentBalance}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                কোনো তথ্যে অমিল থাকলে অনুগ্রহ করে আপনার মেস ম্যানেজারের সাথে যোগাযোগ করুন।
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 28px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © KhaonKhata (খাওনখাতা) • স্মার্ট মেস ও মিল ম্যানেজমেন্ট সিস্টেম
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
      });

      return {
        success: true,
        id: fallbackResult?.data?.id || fallbackResult?.id,
        usedFallback: true,
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        error: fallbackErr?.message || 'Both template and HTML fallback email failed to send',
      };
    }
  }
}

/**
 * Controller: POST /api/send-mess-update
 * Sends automated member-specific daily mess update email via Resend API.
 * Supports:
 * 1. Single member request: { to, userName, dailyMeals, totalDeposit, currentBalance }
 * 2. Batch request: { members: [ ... ] } or array payload [ ... ]
 *
 * Implements:
 * - Rate Limiting: 300ms sequential delay between iterations (avoids Resend 2-3 req/s limit)
 * - Safe Loop Execution: Individual try...catch per member so failure of 1 member never stops the rest
 * - Detailed Console Log: Success and failure per member
 */
export async function sendMessUpdateHandler(req: any, res?: any) {
  const sendJsonResponse = (statusCode: number, data: any) => {
    if (res && typeof res.status === 'function') {
      return res.status(statusCode).json(data);
    }
    return new Response(JSON.stringify(data), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const method = req?.method || 'POST';
  if (method !== 'POST') {
    return sendJsonResponse(405, {
      success: false,
      error: 'Method not allowed. Only POST is supported.',
    });
  }

  try {
    let body: any = {};
    if (req?.body && typeof req.body === 'object') {
      body = req.body;
    } else if (typeof req?.json === 'function') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not defined in environment variables. Mess update email skipped.');
      return sendJsonResponse(200, {
        success: false,
        message: 'RESEND_API_KEY is not configured on the server. Email skipped gracefully.',
      });
    }

    // Initialize Resend SDK with dynamic fallback
    let ResendClass: any = Resend;
    if (!ResendClass) {
      try {
        const resendModule: any = await import('resend');
        ResendClass = resendModule.Resend || resendModule.default?.Resend || resendModule.default;
      } catch (impErr: any) {
        console.error('Failed to import Resend SDK dynamically:', impErr);
        return sendJsonResponse(500, {
          success: false,
          error: 'Resend SDK import failed: ' + (impErr?.message || 'Module not found'),
        });
      }
    }

    const resend = new ResendClass(apiKey);
    const senderEmail =
      process.env.RESEND_FROM_NOTICE ||
      process.env.RESEND_FROM_EMAIL ||
      'KhaonKhata Mess <notice@khaonkhata.online>';

    // Check if this is a batch request (array of members)
    const isBatch = Array.isArray(body) || (Array.isArray(body?.members) && body.members.length > 0);

    if (isBatch) {
      const memberList: MessUpdateMemberPayload[] = Array.isArray(body) ? body : body.members;
      console.log(`[Resend Batch] Received batch request for ${memberList.length} members. Executing with 300ms sequential rate limit delay...`);

      const successful: Array<{ name: string; email: string; id?: string }> = [];
      const failed: Array<{ name: string; email: string; error: string }> = [];

      for (let i = 0; i < memberList.length; i++) {
        const item = memberList[i];
        const mName = item.userName || item.name || 'সদস্য';
        const mEmail = (item.to || item.email || '').trim();

        // Safe loop execution: Independent try...catch per member
        try {
          console.log(`[Resend Batch] (${i + 1}/${memberList.length}) Processing email for: ${mName} (${mEmail})...`);
          const result = await sendSingleMessUpdateEmail(resend, senderEmail, item);

          if (result.success) {
            successful.push({ name: mName, email: mEmail, id: result.id });
            console.log(`[Resend Batch] ✅ Email successfully sent to: ${mName} (${mEmail}) | ID: ${result.id}`);
          } else {
            failed.push({ name: mName, email: mEmail, error: result.error || 'Failed' });
            console.error(`[Resend Batch] ❌ Email send failed for: ${mName} (${mEmail}):`, result.error);
          }
        } catch (itemError: any) {
          failed.push({
            name: mName,
            email: mEmail,
            error: itemError?.message || 'Unexpected exception',
          });
          console.error(`[Resend Batch] ❌ Unexpected exception for: ${mName} (${mEmail}):`, itemError?.message || itemError);
        }

        // Sequential Rate Limiting: 300ms delay between iterations to prevent Resend 429
        if (i < memberList.length - 1) {
          await delay(300);
        }
      }

      console.log(`[Resend Batch Summary] Total: ${memberList.length} | Sent: ${successful.length} | Failed: ${failed.length}`);
      if (failed.length > 0) {
        console.table(failed);
      }

      return sendJsonResponse(200, {
        success: true,
        batch: true,
        total: memberList.length,
        sentCount: successful.length,
        failedCount: failed.length,
        successful,
        failed,
      });
    }

    // Single member request execution
    const singleName = body.userName || body.name || 'সদস্য';
    const singleEmail = (body.to || body.email || '').trim();

    if (!singleEmail) {
      return sendJsonResponse(400, {
        success: false,
        error: 'মেম্বারের কোনো বৈধ ইমেইল এড্রেস পাওয়া যায়নি। অনুগ্রহ করে মেম্বার প্রোফাইলে সঠিক ইমেইল যোগ করুন।',
      });
    }

    console.log(`[Resend] Sending single mess update to: ${singleName} (${singleEmail})...`);
    const singleResult = await sendSingleMessUpdateEmail(resend, senderEmail, body);

    if (singleResult.success) {
      console.log(`[Resend] ✅ Successfully sent mess update to: ${singleName} (${singleEmail}) | ID: ${singleResult.id}`);
      return sendJsonResponse(200, {
        success: true,
        message: 'দৈনিক মেস আপডেট সফলভাবে মেম্বারের ইমেইলে পাঠানো হয়েছে।',
        id: singleResult.id,
        recipient: singleEmail,
        usedFallback: singleResult.usedFallback,
      });
    } else {
      console.error(`[Resend] ❌ Failed to send mess update to: ${singleName} (${singleEmail}):`, singleResult.error);
      return sendJsonResponse(500, {
        success: false,
        error: singleResult.error || 'Resend API এর মাধ্যমে ইমেইল পাঠাতে ব্যর্থ হয়েছে।',
      });
    }
  } catch (error: any) {
    console.error('Fatal exception in sendMessUpdateHandler:', error);
    return sendJsonResponse(500, {
      success: false,
      error: error?.message || 'সার্ভার প্রক্রিয়াকরণে অপ্রত্যাশিত ত্রুটি ঘটেছে।',
    });
  }
}

export default sendMessUpdateHandler;
