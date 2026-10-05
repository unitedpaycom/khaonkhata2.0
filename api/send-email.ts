import type { Request, Response } from 'express';
import { Resend } from 'resend';
import type { EmailPayload } from '../src/types';

export type { EmailPayload };

// Generate HTML email for Meal Status Update
function generateMealHtml(payload: EmailPayload, targetAppUrl: string): { subject: string; html: string } {
  const { memberName, messName, data } = payload;
  const dateStr = data.date || new Date().toISOString().split('T')[0];
  const b = data.breakfast ?? 0;
  const l = data.lunch ?? 0;
  const d = data.dinner ?? 0;
  const total = data.totalMeals ?? (b + l + d);
  const actionText =
    data.action === 'approved'
      ? 'অনুমোদিত হয়েছে'
      : data.action === 'requested'
      ? 'রিকোয়েস্ট পাঠানো হয়েছে'
      : 'আপডেট করা হয়েছে';

  const subject = `[KhaonKhata] মিল আপডেট নিশ্চিতকরণ: ${dateStr} (${total} টি মিল)`;

  const html = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 28px 12px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px 28px; text-align: left;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 44px; height: 44px; background-color: #ffffff; border-radius: 10px; display: inline-block; text-align: center; line-height: 44px; font-size: 22px; font-weight: 800; color: #059669; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">
                      খ
                    </div>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                      KhaonKhata – খাওনখাতা
                    </h1>
                    <p style="margin: 3px 0 0; font-size: 12px; color: #d1fae5; font-weight: 500;">
                      মেস: ${messName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 28px;">
              <h2 style="margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #0f172a;">
                মিল স্ট্যাটাস নিশ্চিতকরণ 🍽️
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #475569;">
                প্রিয় <strong>${memberName}</strong>, আপনার <strong>${dateStr}</strong> তারিখের মিল হিসাব সফলভাবে <strong>${actionText}</strong>।
              </p>

              <!-- MEAL SUMMARY TABLE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">তারিখ (Date):</td>
                        <td align="right" style="font-size: 13.5px; font-weight: 700; color: #0f172a;">${dateStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b;">সকালের নাস্তা (Breakfast):</td>
                        <td align="right" style="font-size: 13.5px; font-weight: 600; color: #0f172a;">${b} টি</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b;">দুপুরের খাবার (Lunch):</td>
                        <td align="right" style="font-size: 13.5px; font-weight: 600; color: #0f172a;">${l} টি</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b;">রাতের খাবার (Dinner):</td>
                        <td align="right" style="font-size: 13.5px; font-weight: 600; color: #0f172a;">${d} টি</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 18px; background-color: #ecfdf5; border-radius: 0 0 10px 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 14px; font-weight: 700; color: #065f46;">দিনের সর্বমোট মিল:</td>
                        <td align="right" style="font-size: 18px; font-weight: 800; color: #059669;">${total} টি</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <a href="${targetAppUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 6px rgba(5,150,105,0.25);">
                      মেস ড্যাশবোর্ড দেখুন ›
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
                যে কোনো সময় খাওয়ার স্ট্যাটাস পরিবর্তন করতে মেসের ম্যানেজারের সাথে যোগাযোগ করুন।
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
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
  `.trim();

  return { subject, html };
}

// Generate HTML email for Deposit Confirmation
function generateDepositHtml(payload: EmailPayload, targetAppUrl: string): { subject: string; html: string } {
  const { memberName, messName, data } = payload;
  const amt = Math.round(data.amount || 0);
  const formattedAmt = `৳ ${amt.toLocaleString('en-IN')}`;
  const dateStr = data.depositDate || new Date().toISOString().split('T')[0];
  const methodStr = (data.method || 'Cash / Deposit').toUpperCase();
  const statusStr = data.status === 'approved' ? 'অনুমোদিত (Approved)' : 'গৃহীত (Received)';

  const subject = `[KhaonKhata] টাকা জমা নিশ্চিতকরণ: ${formattedAmt} (${memberName})`;

  const html = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 28px 12px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px 28px; text-align: left;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 44px; height: 44px; background-color: #ffffff; border-radius: 10px; display: inline-block; text-align: center; line-height: 44px; font-size: 22px; font-weight: 800; color: #059669; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">
                      ৳
                    </div>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                      KhaonKhata – খাওনখাতা
                    </h1>
                    <p style="margin: 3px 0 0; font-size: 12px; color: #d1fae5; font-weight: 500;">
                      মেস: ${messName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 28px;">
              <h2 style="margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #0f172a;">
                টাকা জমা নিশ্চিতকরণ রসিদ 💳
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #475569;">
                প্রিয় <strong>${memberName}</strong>, আপনার <strong>${formattedAmt}</strong> জমা মেসে সফলভাবে রেকর্ড করা হয়েছে।
              </p>

              <!-- HIGHLIGHT CARD -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; margin-bottom: 22px; text-align: center;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">জমার পরিমাণ (Deposited Amount)</span>
                    <div style="font-size: 32px; font-weight: 900; color: #15803d; margin: 6px 0;">${formattedAmt}</div>
                    <span style="display: inline-block; padding: 4px 12px; background-color: #dcfce7; border-radius: 20px; font-size: 11.5px; font-weight: 700; color: #166534;">
                      ● ${statusStr}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- DEPOSIT DETAILS TABLE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b;">জমা প্রদানের তারিখ:</td>
                        <td align="right" style="font-size: 13.5px; font-weight: 600; color: #0f172a;">${dateStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b;">পেমেন্ট মেথড:</td>
                        <td align="right" style="font-size: 13.5px; font-weight: 700; color: #047857;">${methodStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${data.senderNumber ? `
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b;">প্রেরক নম্বর (Sender):</td>
                        <td align="right" style="font-size: 13.5px; font-weight: 600; color: #0f172a;">${data.senderNumber}</td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ''}
                ${data.trxId ? `
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b;">ট্রানজেকশন আইডি (TrxID):</td>
                        <td align="right" style="font-size: 13px; font-weight: 600; font-family: monospace; color: #0f172a;">${data.trxId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ''}
                ${data.note ? `
                <tr>
                  <td style="padding: 12px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b;">নোট / মন্তব্য:</td>
                        <td align="right" style="font-size: 13px; font-weight: 500; color: #334155;">${data.note}</td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ''}
              </table>

              <!-- CTA BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <a href="${targetAppUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 6px rgba(5,150,105,0.25);">
                      মেসের বর্তমান হিসাব দেখুন ›
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
                এই রসিদটি স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়েছে। কোনো অসঙ্গতি থাকলে ম্যানেজারের সাথে আলোচনা করুন।
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
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
  `.trim();

  return { subject, html };
}

// Generate HTML email for Welcome Member with Credentials
function generateWelcomeHtml(payload: EmailPayload, targetAppUrl: string): { subject: string; html: string } {
  const { memberName, messName, to, data } = payload;
  const tempPass = data.tempPassword || 'Khaon#1234';
  const loginUrl = data.loginUrl || 'https://khaonkhata.online/login';

  const subject = `[KhaonKhata] স্বাগতম ${memberName}! আপনার মেস একাউন্ট তৈরি হয়েছে`;

  const html = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 28px 12px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px 28px; text-align: left;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 44px; height: 44px; background-color: #ffffff; border-radius: 10px; display: inline-block; text-align: center; line-height: 44px; font-size: 22px; font-weight: 800; color: #059669;">
                      খ
                    </div>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">
                      KhaonKhata – খাওনখাতা
                    </h1>
                    <p style="margin: 3px 0 0; font-size: 12px; color: #d1fae5; font-weight: 500;">
                      মেস: ${messName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 28px;">
              <h2 style="margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #0f172a;">
                স্বাগতম, ${memberName}! 🎉
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #475569;">
                আপনাকে <strong>${messName}</strong> মেসে একজন সদস্য হিসেবে অন্তর্ভুক্ত করা হয়েছে। আপনার মেসের দৈনন্দিন মিল হিসাব, বাজার খরচ ও জমা দেখতে নিচের তথ্য দিয়ে লগইন করুন:
              </p>

              <!-- CREDENTIALS HIGHLIGHT BOX -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <span style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">আপনার লগইন তথ্য (Login Credentials)</span>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px;">
                      <tr>
                        <td style="font-size: 13.5px; color: #475569; padding: 4px 0;">রেজিস্টার্ড ইমেইল / ID:</td>
                        <td align="right" style="font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${to}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13.5px; color: #475569; padding: 4px 0;">অস্থায়ী পাসওয়ার্ড:</td>
                        <td align="right" style="font-size: 16px; font-weight: 800; color: #059669; font-family: monospace;">${tempPass}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="${loginUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; font-weight: 700; font-size: 15px; padding: 13px 32px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(5,150,105,0.3);">
                      লগইন পোর্টালে যান ›
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-top: 16px;">
                <p style="margin: 0; font-size: 12.5px; color: #64748b; line-height: 1.4;">
                  💡 <strong>নিরাপত্তা টিপস:</strong> প্রথমবার লগইন করার পর আপনার প্রোফাইল সেকশন থেকে পাসওয়ার্ড পরিবর্তন করে আপনার নিজস্ব পছন্দের পাসওয়ার্ড সেট করে নিন।
                </p>
              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center;">
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
  `.trim();

  return { subject, html };
}

/**
 * Main Controller Handler for Sending Emails via Resend
 * Supports both Express router and Vercel Serverless Function
 */
export async function sendEmailHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const payload: EmailPayload = req.body;
  if (!payload || !payload.to || !payload.type) {
    return res.status(400).json({ error: 'Missing required fields: to, type' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not defined in environment variables. Email notification skipped.');
    return res.status(200).json({
      success: false,
      message: 'RESEND_API_KEY is not configured. Email skipped gracefully.',
    });
  }

  const targetAppUrl = payload.appUrl || process.env.APP_URL || 'https://khaonkhata.web.app';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'KhaonKhata <onboarding@resend.dev>';

  let emailContent: { subject: string; html: string };
  if (payload.type === 'meal_update') {
    emailContent = generateMealHtml(payload, targetAppUrl);
  } else if (payload.type === 'deposit_confirmation') {
    emailContent = generateDepositHtml(payload, targetAppUrl);
  } else if (payload.type === 'welcome_member') {
    emailContent = generateWelcomeHtml(payload, targetAppUrl);
  } else {
    return res.status(400).json({ error: `Unsupported email type: ${payload.type}` });
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: [payload.to],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully via Resend',
      id: result.data?.id,
    });
  } catch (error: any) {
    console.error('Resend email sending error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send email via Resend',
    });
  }
}

// Default export for Vercel Serverless Function (/api/send-email)
export default sendEmailHandler;
