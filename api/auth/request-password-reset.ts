import type { Request, Response } from 'express';
import { Resend } from 'resend';
import { db } from '../../src/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Endpoint: POST /api/auth/request-password-reset
 * Generates a 6-digit random OTP, saves it in Firestore with expiration time (10 min),
 * and dispatches email via Resend API using template alias 'forgot-password-template'
 * from verify@khaonkhata.online with {{{Code}}}.
 */
export async function requestPasswordResetHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const { email } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail) || cleanEmail.endsWith('@example.com') || cleanEmail.endsWith('@test.com')) {
    return res.status(400).json({
      success: false,
      error: 'অনুগ্রহ করে একটি সঠিক ইমেইল এড্রেস লিখুন (Please enter a valid email address).',
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured in server environment.');
    return res.status(500).json({
      success: false,
      error: 'ইমেইল সার্ভিস কনফিগার করা নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।',
    });
  }

  try {
    // 1. Generate 6-digit random OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // 2. Check if a recent OTP was requested in the last 30 seconds (rate limiting)
    const resetRef = doc(db, 'password_resets', cleanEmail);
    const existingSnap = await getDoc(resetRef).catch(() => null);

    if (existingSnap && existingSnap.exists()) {
      const data = existingSnap.data();
      const lastCreated = data.createdAt ? new Date(data.createdAt).getTime() : 0;
      if (Date.now() - lastCreated < 30 * 1000) {
        return res.status(429).json({
          success: false,
          error: 'অনুগ্রহ করে ৩০ সেকেন্ড অপেক্ষা করে পুনরায় ওটিপি কোডের জন্য অনুরোধ করুন।',
        });
      }
    }

    // 3. Save OTP in Firestore with expiration time
    await setDoc(resetRef, {
      email: cleanEmail,
      code: otpCode,
      expiresAt,
      createdAt: new Date().toISOString(),
      used: false,
      attempts: 0,
    });

    // 4. Send email via Resend API using template alias 'forgot-password-template'
    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_VERIFY || 'KhaonKhata Verification <verify@khaonkhata.online>';

    let resendResult;
    try {
      resendResult = await resend.emails.send({
        from: fromAddress,
        to: [cleanEmail],
        template: {
          id: 'forgot-password-template',
          variables: {
            Code: String(otpCode),
          },
        },
      } as any);

      if (resendResult?.error) {
        throw new Error(resendResult.error.message || 'Template send failed');
      }
    } catch (sendErr: any) {
      console.warn('Resend template send failed, falling back to direct email:', sendErr);
      // Fallback in case template alias is not ready
      resendResult = await resend.emails.send({
        from: fromAddress,
        to: [cleanEmail],
        subject: `KhaonKhata - পাসওয়ার্ড রিসেট কোড: ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #059669; margin-top: 0;">KhaonKhata • পাসওয়ার্ড রিসেট</h2>
            <p>আপনার অ্যাকাউন্ট পাসওয়ার্ড রিসেট করার জন্য ৬-সংখ্যার ওটিপি কোড নিচে দেওয়া হলো:</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #059669; font-family: monospace;">${otpCode}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">কোডটি আগামী <b>১০ মিনিট</b> কার্যকর থাকবে। আপনি যদি এই অনুরোধ না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন।</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 11px; text-align: center;">© KhaonKhata (খাওনখাতা) • স্মার্ট মেস ব্যবস্থাপনা</p>
          </div>
        `,
      });

      if (resendResult?.error) {
        throw new Error(resendResult.error.message || 'Direct email send failed');
      }
    }

    return res.status(200).json({
      success: true,
      message: '৬-সংখ্যার ওটিপি কোড আপনার ইমেইলে সফলভাবে পাঠানো হয়েছে। কোডটির মেয়াদ ১০ মিনিট।',
      email: cleanEmail,
      resendId: resendResult?.data?.id,
    });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
    });
  }
}

export default requestPasswordResetHandler;
