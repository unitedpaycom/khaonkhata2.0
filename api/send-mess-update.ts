import type { Request, Response } from 'express';
import { Resend } from 'resend';

export interface MessUpdateRequestBody {
  to?: string;
  userName?: string;
  dailyMeals?: string | number;
  totalDeposit?: string | number;
  currentBalance?: string | number;
  date?: string;
  messName?: string;
  [key: string]: any;
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
 *
 * Supports both standard Express (req, res) and Vercel Serverless / Edge execution.
 */
export async function sendMessUpdateHandler(req: any, res?: any) {
  // Helper to send standardized JSON response across both Express and Web/Fetch environments
  const sendJsonResponse = (statusCode: number, data: any) => {
    if (res && typeof res.status === 'function') {
      return res.status(statusCode).json(data);
    }
    return new Response(JSON.stringify(data), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  // Method check
  const method = req?.method || 'POST';
  if (method !== 'POST') {
    return sendJsonResponse(405, {
      success: false,
      error: 'Method not allowed. Only POST is supported.',
    });
  }

  try {
    // Parse body safely whether in Express or standard Request
    let body: MessUpdateRequestBody = {};
    if (req?.body && typeof req.body === 'object') {
      body = req.body;
    } else if (typeof req?.json === 'function') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const toEmail = body.to ? String(body.to).trim() : '';
    const memberName = body.userName ? String(body.userName).trim() : 'মেম্বার';
    const mealsCount = body.dailyMeals !== undefined && body.dailyMeals !== null ? String(body.dailyMeals) : '0';
    const depositsTotal = body.totalDeposit !== undefined && body.totalDeposit !== null ? String(body.totalDeposit) : '0';
    const balanceVal = body.currentBalance !== undefined && body.currentBalance !== null ? String(body.currentBalance) : '0';
    const messTitle = body.messName ? String(body.messName).trim() : 'KhaonKhata';
    const targetDate = body.date || new Date().toISOString().split('T')[0];

    // Recipient email validation
    if (!toEmail || !/^\S+@\S+\.\S+$/.test(toEmail)) {
      return sendJsonResponse(400, {
        success: false,
        error: 'মেম্বারের কোনো বৈধ ইমেইল এড্রেস পাওয়া যায়নি। অনুগ্রহ করে মেম্বার প্রোফাইলে সঠিক ইমেইল যোগ করুন।',
      });
    }

    // Check Resend API Key
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not defined in environment variables. Mess update email skipped.');
      return sendJsonResponse(200, {
        success: false,
        message: 'RESEND_API_KEY is not configured on the server. Email skipped gracefully.',
      });
    }

    // Initialize Resend with safe fallback
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

    // Prepare template variables (all strings)
    const templateVariables = {
      userName: String(memberName),
      dailyMeals: String(mealsCount),
      totalDeposit: String(depositsTotal),
      currentBalance: String(balanceVal),
    };

    const senderEmail = process.env.RESEND_FROM_NOTICE || process.env.RESEND_FROM_EMAIL || 'KhaonKhata Mess <notice@khaonkhata.online>';

    let resendResult: any = null;
    let usedFallback = false;

    try {
      // 1. Primary: Dispatch using published template alias 'mess-update'
      resendResult = await resend.emails.send({
        from: senderEmail,
        to: [toEmail],
        template: {
          id: 'mess-update',
          variables: templateVariables,
        },
      } as any);
    } catch (templateErr: any) {
      console.warn('Resend template "mess-update" error, falling back to direct responsive HTML email:', templateErr?.message || templateErr);
      usedFallback = true;

      // 2. Resilient fallback with styled responsive HTML email
      resendResult = await resend.emails.send({
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
          
          <!-- BRAND HEADER -->
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

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 26px 28px;">
              <h2 style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #0f172a;">
                হ্যালো, ${templateVariables.userName}! 👋
              </h2>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: #475569;">
                আপনার মেসের আজকের মিল ও বর্তমান আর্থিক হিসাবের সর্বশেষ আপডেট নিচে দেওয়া হলো:
              </p>

              <!-- SUMMARY BOX -->
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

          <!-- FOOTER -->
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
    }

    return sendJsonResponse(200, {
      success: true,
      message: 'দৈনিক মেস আপডেট সফলভাবে মেম্বারের ইমেইলে পাঠানো হয়েছে।',
      id: resendResult?.data?.id || resendResult?.id,
      recipient: toEmail,
      usedFallback,
      variables: templateVariables,
    });
  } catch (error: any) {
    console.error('Failed to send mess update via Resend:', error);
    return sendJsonResponse(500, {
      success: false,
      error: error?.message || 'Resend API এর মাধ্যমে ইমেইল পাঠাতে ব্যর্থ হয়েছে।',
    });
  }
}

// Default export for Vercel Serverless Function & Express router
export default sendMessUpdateHandler;
