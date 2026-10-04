import type { EmailPayload } from '../types';

/**
 * Dispatch an email notification request to the backend /api/send-email endpoint.
 * This works seamlessly on Vercel Serverless Functions and local Express dev server.
 */
export async function dispatchEmailNotification(payload: EmailPayload): Promise<{ success: boolean; message?: string }> {
  if (!payload.to || !payload.to.includes('@')) {
    // If no valid email address is provided, skip silently
    return { success: false, message: 'No valid recipient email provided.' };
  }

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        appUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Email dispatch returned non-ok status:', res.status, errData);
      return { success: false, message: errData.error || 'Failed to send email' };
    }

    const data = await res.json();
    return { success: !!data.success, message: data.message };
  } catch (error) {
    console.warn('Network error attempting to send email notification:', error);
    return { success: false, message: 'Network error sending email' };
  }
}

/**
 * Send meal confirmation email to member
 */
export async function sendMealConfirmationEmail(params: {
  to?: string;
  memberName: string;
  messName: string;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  action?: 'added' | 'updated' | 'requested' | 'approved';
}) {
  if (!params.to) return;
  return dispatchEmailNotification({
    type: 'meal_update',
    to: params.to,
    memberName: params.memberName,
    messName: params.messName,
    data: {
      date: params.date,
      breakfast: params.breakfast,
      lunch: params.lunch,
      dinner: params.dinner,
      totalMeals: params.breakfast + params.lunch + params.dinner,
      action: params.action || 'updated',
    },
  });
}

/**
 * Send deposit/payment confirmation email to member
 */
export async function sendDepositConfirmationEmail(params: {
  to?: string;
  memberName: string;
  messName: string;
  amount: number;
  depositDate?: string;
  method?: string;
  senderNumber?: string;
  trxId?: string;
  note?: string;
  status?: string;
}) {
  if (!params.to) return;
  return dispatchEmailNotification({
    type: 'deposit_confirmation',
    to: params.to,
    memberName: params.memberName,
    messName: params.messName,
    data: {
      amount: params.amount,
      depositDate: params.depositDate || new Date().toISOString().split('T')[0],
      method: params.method,
      senderNumber: params.senderNumber,
      trxId: params.trxId,
      note: params.note,
      status: params.status || 'approved',
    },
  });
}

/**
 * Send Automated Member-Specific Daily Mess Update email
 * Calls /api/send-mess-update which uses Resend Dynamic Template alias 'mess-update'
 * from notice@khaonkhata.online.
 *
 * Variables:
 * - userName: মেম্বারের নাম
 * - dailyMeals: সেদিনের মোট মিল সংখ্যা
 * - totalDeposit: মোট জমার পরিমাণ
 * - currentBalance: বর্তমান অবশিষ্ট ব্যালেন্স
 */
export async function sendMemberDailyMessUpdate(params: {
  to?: string;
  userName: string;
  dailyMeals: number | string;
  totalDeposit: number | string;
  currentBalance: number | string;
  messId?: string;
  memberId?: string;
  date?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!params.to || !params.to.includes('@')) {
    return { success: false, error: 'মেম্বারের কোনো বৈধ ইমেইল এড্রেস নেই।' };
  }

  try {
    const res = await fetch('/api/send-mess-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.to.trim(),
        userName: String(params.userName || 'মেম্বার').trim(),
        dailyMeals: String(params.dailyMeals ?? '0').trim(),
        totalDeposit: String(Math.round(Number(params.totalDeposit) || 0)).trim(),
        currentBalance: String(Math.round(Number(params.currentBalance) || 0)).trim(),
        messId: params.messId,
        memberId: params.memberId,
        date: params.date,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('Failed to send daily mess update email:', data);
      return { success: false, error: data.error || 'ইমেইল পাঠানো সম্ভব হয়নি।' };
    }

    return { success: !!data.success, message: data.message };
  } catch (err: any) {
    console.error('Network error calling /api/send-mess-update:', err);
    return { success: false, error: err?.message || 'নেটওয়ার্ক সমস্যার কারণে ইমেইল পাঠানো যায়নি।' };
  }
}

/**
 * Request Password Reset OTP
 * Calls /api/auth/request-password-reset which generates a 6-digit OTP,
 * saves it to database with 10min expiry, and sends via Resend template 'forgot-password-template'
 * from verify@khaonkhata.online.
 */
export async function requestPasswordResetOTP(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return { success: false, error: 'অনুগ্রহ করে সঠিক ইমেইল এড্রেস প্রদান করুন।' };
  }

  try {
    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'ওটিপি পাঠাতে ব্যর্থ হয়েছে।' };
    }

    return { success: !!data.success, message: data.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'নেটওয়ার্ক সংযোগে সমস্যা হয়েছে।' };
  }
}

/**
 * Verify OTP and Reset Password
 * Calls /api/auth/verify-and-reset-password which validates the OTP against database,
 * hashes the new password, and updates user profile in database.
 */
export async function verifyOTPAndResetPassword(params: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/verify-and-reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email.trim(),
        code: params.code.trim(),
        newPassword: params.newPassword,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।' };
    }

    return { success: !!data.success, message: data.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'নেটওয়ার্ক সংযোগে সমস্যা হয়েছে।' };
  }
}

