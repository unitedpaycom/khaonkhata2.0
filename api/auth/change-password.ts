import type { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../src/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Controller: POST /api/auth/change-password
 * Allows an authenticated member to update their password from Profile settings.
 * Supports both Express router and Vercel Serverless Function.
 */
export async function changePasswordHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is supported.' });
  }

  const { uid, email, oldPassword, newPassword } = req.body || {};
  const userUid = typeof uid === 'string' ? uid.trim() : '';
  const userEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const newPass = typeof newPassword === 'string' ? newPassword : '';
  const oldPass = typeof oldPassword === 'string' ? oldPassword : '';

  if (!userUid && !userEmail) {
    return res.status(400).json({
      success: false,
      error: 'ব্যবহারকারীর পরিচয় (User ID / Email) আবশ্যক।',
    });
  }

  if (!newPass || newPass.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'নতুন পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।',
    });
  }

  try {
    let userDocRef = doc(db, 'users', userUid || userEmail);
    let snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      const usersCol = collection(db, 'users');
      let q = userUid ? query(usersCol, where('uid', '==', userUid)) : null;
      let qSnap = q ? await getDocs(q) : null;
      if (!qSnap || qSnap.empty) {
        if (userEmail) {
          const q2 = query(usersCol, where('email', '==', userEmail));
          qSnap = await getDocs(q2);
        }
      }
      if (qSnap && !qSnap.empty) {
        userDocRef = qSnap.docs[0].ref;
        snap = qSnap.docs[0];
      }
    }

    if (!snap.exists()) {
      return res.status(404).json({
        success: false,
        error: 'ব্যবহারকারী অ্যাকাউন্ট পাওয়া যায়নি।',
      });
    }

    const userData = snap.data();

    // If account is archived/disabled
    if (userData.isArchived || userData.status === 'archived') {
      return res.status(403).json({
        success: false,
        error: 'এই মেম্বার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।',
      });
    }

    // If oldPassword is provided and user already has an existing passwordHash, verify it
    if (oldPass && userData.passwordHash && userData.salt) {
      const testOldHash = crypto.createHash('sha256').update(oldPass + userData.salt).digest('hex');
      if (testOldHash !== userData.passwordHash) {
        return res.status(401).json({
          success: false,
          error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।',
        });
      }
    }

    // Generate new salt and hash for the new password
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newPasswordHash = crypto.createHash('sha256').update(newPass + newSalt).digest('hex');

    await updateDoc(userDocRef, {
      salt: newSalt,
      passwordHash: newPasswordHash,
      isTemporaryPassword: false,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'পাসওয়ার্ড পরিবর্তনে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    });
  }
}

export default changePasswordHandler;
