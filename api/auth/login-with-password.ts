import type { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../src/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Endpoint: POST /api/auth/login-with-password
 * Allows a user to verify credentials against their database-stored hashed password.
 * Supports login via Email OR Username.
 * Checks for archived/disabled status.
 */
export async function loginWithPasswordHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const { email, username, password } = req.body || {};
  const loginInput = typeof email === 'string' ? email.trim() : typeof username === 'string' ? username.trim() : '';
  const cleanInput = loginInput.toLowerCase();
  const passwordStr = typeof password === 'string' ? password : '';

  if (!cleanInput || !passwordStr) {
    return res.status(400).json({
      success: false,
      error: 'অনুগ্রহ করে ইমেইল / ইউজারনেম এবং পাসওয়ার্ড দুটোই প্রদান করুন।',
    });
  }

  try {
    const usersCol = collection(db, 'users');

    // Query by email first
    let q = query(usersCol, where('email', '==', cleanInput));
    let snap = await getDocs(q);

    // If not found by email, try query by username
    if (snap.empty) {
      q = query(usersCol, where('username', '==', cleanInput));
      snap = await getDocs(q);
    }

    if (snap.empty) {
      return res.status(404).json({
        success: false,
        error: 'এই ইমেইল বা ইউজারনেমে কোনো ব্যবহারকারী একাউন্ট পাওয়া যায়নি।',
      });
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();

    // Check if account is archived / disabled by manager
    if (userData.isArchived === true || userData.status === 'archived') {
      return res.status(403).json({
        success: false,
        error: 'এই মেম্বার অ্যাকাউন্টটি ম্যানেজার দ্বারা নিষ্ক্রিয় (Archived) করা হয়েছে। আপনি আর লগইন করতে পারবেন না।',
      });
    }

    if (!userData.passwordHash || !userData.salt) {
      return res.status(400).json({
        success: false,
        error: 'এই অ্যাকাউন্টে কোনো পাসওয়ার্ড সেট করা নেই। অনুগ্রহ করে গুগল দিয়ে লগইন করুন বা পাসওয়ার্ড রিসেট করুন।',
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
        name: userData.name || userData.displayName || cleanInput,
        photoURL: userData.photoURL || null,
        isTemporaryPassword: !!userData.isTemporaryPassword,
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
