import { EmailPayload } from '../../api/send-email';

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
