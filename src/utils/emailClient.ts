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
 * Dispatch Welcome Email with Auto-Generated Credentials & Login Link
 */
export async function sendWelcomeMemberEmail(params: {
  to: string;
  memberName: string;
  messName: string;
  tempPassword?: string;
  loginUrl?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!params.to || !params.to.includes('@')) {
    return { success: false, error: 'বৈধ ইমেইল এড্রেস নেই' };
  }

  return dispatchEmailNotification({
    type: 'welcome_member',
    to: params.to.trim(),
    memberName: params.memberName,
    messName: params.messName,
    data: {
      tempPassword: params.tempPassword,
      loginUrl: params.loginUrl || 'https://khaonkhata.online/login',
    },
  });
}

/**
 * Change member password from Profile settings
 */
export async function changeUserPassword(params: {
  uid: string;
  email?: string;
  oldPassword?: string;
  newPassword: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' };
    }
    return { success: true, message: data?.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'নেটওয়ার্ক সমস্যার কারণে পাসওয়ার্ড পরিবর্তন করা যায়নি।' };
  }
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
  messName?: string;
}): Promise<{ success: boolean; message?: string; error?: string; id?: string }> {
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
        messName: params.messName,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`[Mess Update Email] Failed for ${params.userName} (${params.to}):`, data?.error || res.statusText);
      return { success: false, error: data.error || 'ইমেইল পাঠানো সম্ভব হয়নি।' };
    }

    return { success: !!data.success, message: data.message, id: data.id };
  } catch (err: any) {
    console.error(`[Mess Update Email] Network error for ${params.userName} (${params.to}):`, err);
    return { success: false, error: err?.message || 'নেটওয়ার্ক সমস্যার কারণে ইমেইল পাঠানো যায়নি।' };
  }
}

/**
 * Send Automated Member-Specific Daily Mess Update to Multiple Members
 *
 * Implements:
 * 1. Batch Delay / Rate Limiting: 300ms sequential delay between iterations (avoids Resend max 2-3 req/s limit)
 * 2. Safe Loop Execution: Independent try...catch per member so failure of one never terminates the loop
 * 3. Detailed Console Log: Prints complete list of sent and failed recipients
 */
export async function sendBatchMemberDailyMessUpdates(
  membersList: Array<{
    to?: string;
    userName: string;
    dailyMeals: number | string;
    totalDeposit: number | string;
    currentBalance: number | string;
    messId?: string;
    memberId?: string;
    date?: string;
    messName?: string;
  }>
): Promise<{
  total: number;
  sentCount: number;
  failedCount: number;
  successful: Array<{ name: string; email: string }>;
  failed: Array<{ name: string; email: string; error: string }>;
}> {
  const successful: Array<{ name: string; email: string }> = [];
  const failed: Array<{ name: string; email: string; error: string }> = [];

  console.log(`[Batch Email Execution] Starting sequential email dispatch for ${membersList.length} members with 300ms delay...`);

  for (let i = 0; i < membersList.length; i++) {
    const member = membersList[i];
    const memberName = member.userName || 'সদস্য';
    const targetEmail = (member.to || '').trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      console.warn(`[Batch Email] ⚠️ Skipped member: "${memberName}" (No valid email)`);
      failed.push({
        name: memberName,
        email: targetEmail || 'none',
        error: 'বৈধ ইমেইল এড্রেস নেই',
      });
      continue;
    }

    // Safe Loop Execution: Independent try-catch per member
    try {
      console.log(`[Batch Email] (${i + 1}/${membersList.length}) Sending to: ${memberName} (${targetEmail})...`);

      const result = await sendMemberDailyMessUpdate(member);

      if (result.success) {
        successful.push({ name: memberName, email: targetEmail });
        console.log(`[Batch Email] ✅ (${i + 1}/${membersList.length}) Sent successfully: ${memberName} (${targetEmail})`);
      } else {
        failed.push({
          name: memberName,
          email: targetEmail,
          error: result.error || 'ইমেইল সেন্ড ব্যর্থ হয়েছে',
        });
        console.error(`[Batch Email] ❌ (${i + 1}/${membersList.length}) Failed for: ${memberName} (${targetEmail}):`, result.error);
      }
    } catch (memberErr: any) {
      failed.push({
        name: memberName,
        email: targetEmail,
        error: memberErr?.message || 'অপ্রত্যাশিত নেটওয়ার্ক এরর',
      });
      console.error(`[Batch Email] ❌ (${i + 1}/${membersList.length}) Exception for ${memberName} (${targetEmail}):`, memberErr?.message || memberErr);
    }

    // Batch Delay / Rate Limiting: 300ms pause between member calls
    if (i < membersList.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  console.log(`[Batch Email Report] Processed: ${membersList.length} | Succeeded: ${successful.length} | Failed: ${failed.length}`);
  if (successful.length > 0) {
    console.log('[Batch Email Successful Members]:', successful.map(s => `${s.name} <${s.email}>`).join(', '));
  }
  if (failed.length > 0) {
    console.warn('[Batch Email Failed Members]:', failed);
  }

  return {
    total: membersList.length,
    sentCount: successful.length,
    failedCount: failed.length,
    successful,
    failed,
  };
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

