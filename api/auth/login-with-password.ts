import type { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../src/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Endpoint: POST /api/auth/login-with-password
 * Allows a user to verify credentials against their database-stored hashed password
 * (created or updated during the OTP Password Reset flow).
 */
export async function loginWithPasswordHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const { email, password } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const passwordStr = typeof password === 'string' ? password : '';

  if (!cleanEmail || !passwordStr) {
    return res.status(400).json({
      success: false,
      error: 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড দুটোই প্রদান করুন।',
    });
  }

  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', cleanEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      return res.status(404).json({
        success: false,
        error: 'এই ইমেইলে কোনো ব্যবহারকারী একাউন্ট পাওয়া যায়নি।',
      });
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();

    if (!userData.passwordHash || !userData.salt) {
      return res.status(400).json({
        success: false,
        error: 'এই অ্যাকাউন্টে রিসেট করা পাসওয়ার্ড নেই। দয়া করে স্ট্যান্ডার্ড লগইন ব্যবহার করুন।',
      });
    }

    const testHash = crypto.createHash('sha256').update(passwordStr + userData.salt).digest('hex');
    if (testHash !== userData.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'ভুল পাসওয়ার্ড প্রবেশ করানো হয়েছে। আবার চেষ্টা করুন।',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'লগইন সফল হয়েছে!',
      user: {
        uid: userData.uid || userDoc.id,
        email: userData.email,
        name: userData.name || userData.displayName || cleanEmail.split('@')[0],
        photoURL: userData.photoURL || null,
      },
    });
  } catch (error: any) {
    console.error('Password login verification error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'সার্ভার ত্রুটির কারণে লগইন যাচাই করা যায়নি।',
    });
  }
}

export default loginWithPasswordHandler;
