import type { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../src/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';

/**
 * Endpoint: POST /api/auth/verify-and-reset-password
 * Validates the 6-digit OTP from Firestore, verifies expiration, hashes the new password,
 * and updates the user's record in Firestore with salt and passwordHash.
 */
export async function verifyAndResetPasswordHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const { email, code, newPassword } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanCode = typeof code === 'string' ? code.trim() : '';
  const passwordStr = typeof newPassword === 'string' ? newPassword : '';

  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      error: 'অনুগ্রহ করে সঠিক ইমেইল এড্রেস প্রদান করুন।',
    });
  }

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return res.status(400).json({
      success: false,
      error: 'অনুগ্রহ করে সঠিক ৬-সংখ্যার ওটিপি কোড লিখুন।',
    });
  }

  if (!passwordStr || passwordStr.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'নতুন পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।',
    });
  }

  try {
    // 1. Fetch OTP record from Firestore
    const resetRef = doc(db, 'password_resets', cleanEmail);
    const snap = await getDoc(resetRef);

    if (!snap.exists()) {
      return res.status(400).json({
        success: false,
        error: 'এই ইমেইলে কোনো পাসওয়ার্ড রিসেট রিকোয়েস্ট পাওয়া যায়নি। অনুগ্রহ করে পুনরায় ওটিপি কোড চান।',
      });
    }

    const resetData = snap.data();

    // 2. Validate OTP usage and expiration
    if (resetData.used) {
      return res.status(400).json({
        success: false,
        error: 'এই ওটিপি কোডটি ইতিমধ্যে ব্যবহার করা হয়েছে। নতুন কোডের জন্য অনুরোধ করুন।',
      });
    }

    if (Date.now() > (resetData.expiresAt || 0)) {
      return res.status(400).json({
        success: false,
        error: 'ওটিপি কোডের ১০ মিনিটের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার নতুন ওটিপি কোড চান।',
      });
    }

    if (String(resetData.code).trim() !== cleanCode) {
      const attempts = (resetData.attempts || 0) + 1;
      await updateDoc(resetRef, { attempts }).catch(() => null);

      return res.status(400).json({
        success: false,
        error: 'ভুল ওটিপি কোড প্রবেশ করানো হয়েছে। আপনার ইমেইল চেক করে সঠিক কোড দিন।',
      });
    }

    // 3. Hash the new password with a unique cryptographic salt
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.createHash('sha256').update(passwordStr + salt).digest('hex');

    // 4. Update the user profile in Firestore
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('email', '==', cleanEmail));
    const userDocs = await getDocs(q);

    const nowIso = new Date().toISOString();
    if (!userDocs.empty) {
      for (const uDoc of userDocs.docs) {
        await updateDoc(uDoc.ref, {
          passwordHash,
          salt,
          passwordResetAt: nowIso,
          updatedAt: nowIso,
        });
      }
    } else {
      // If user doc doesn't exist by query, create one keyed by email hash
      const emailDocId = 'usr_' + crypto.createHash('md5').update(cleanEmail).digest('hex').slice(0, 12);
      await setDoc(
        doc(db, 'users', emailDocId),
        {
          email: cleanEmail,
          passwordHash,
          salt,
          passwordResetAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    }

    // 5. Invalidate the OTP to prevent replay
    await updateDoc(resetRef, {
      used: true,
      verifiedAt: nowIso,
    });

    return res.status(200).json({
      success: true,
      message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।',
    });
  } catch (error: any) {
    console.error('Password reset verification error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
    });
  }
}

export default verifyAndResetPasswordHandler;
