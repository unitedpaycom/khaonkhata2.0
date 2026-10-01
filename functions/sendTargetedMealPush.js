/**
 * Firebase Cloud Function: sendTargetedDailyMealPush
 * 
 * Logic:
 * 1. Reads the active mess document and its members list from Cloud Firestore.
 * 2. Checks each member's meal record for today (or specified date).
 * 3. Applies conditional logic:
 *    - Has meal today: "আপনার আজকের মিল যুক্ত করা হয়েছে।" (plus meal count breakdown)
 *    - No meal today: "আপনার এখনো মিল দেওয়া হয় নি।"
 * 4. Queries each member's FCM device token from their Firestore user document (`users/{uid}`).
 * 5. Uses Firebase Admin SDK (`admin.messaging().sendEach`) to dispatch targeted push notifications to each device.
 * 6. Logs the operation results to `mess_notifications` in Firestore for real-time audit & tracking.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * HTTPS Callable Function
 * Call from frontend with:
 * const sendPush = httpsCallable(functions, 'sendTargetedDailyMealPush');
 * await sendPush({ messId: '...', date: 'YYYY-MM-DD' });
 */
exports.sendTargetedDailyMealPush = functions.https.onCall(async (data, context) => {
  // 1. Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to trigger notifications.');
  }

  const { messId, date } = data;
  if (!messId) {
    throw new functions.https.HttpsError('invalid-argument', 'messId is required.');
  }

  const targetDate = date || new Date().toISOString().split('T')[0];

  // 2. Fetch Mess document from Firestore
  const messDoc = await admin.firestore().collection('messes').doc(messId).get();
  if (!messDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Mess document not found.');
  }

  const messData = messDoc.data();
  const members = messData.members || [];
  const mealsForDate = (messData.meals && messData.meals[targetDate]) || {};

  const fcmMessages = [];
  const report = [];

  // 3. Iterate through members and apply conditional notification logic
  for (const member of members) {
    const slot = mealsForDate[member.id];
    const totalMeals = slot ? (slot.b || 0) + (slot.l || 0) + (slot.d || 0) : 0;
    const hasMeal = totalMeals > 0;

    // Targeted notification title & body
    const title = hasMeal
      ? `🍽️ আজকের মিল আপডেট (${targetDate})`
      : `⚠️ আজকের মিল সতর্কতা (${targetDate})`;

    const body = hasMeal
      ? `আপনার আজকের মিল যুক্ত করা হয়েছে। (মোট: ${totalMeals} টি মিল${slot ? ` - স: ${slot.b}, দু: ${slot.l}, রা: ${slot.d}` : ''})`
      : `আপনার এখনো মিল দেওয়া হয় নি।`;

    // 4. Retrieve FCM device token for this member
    let fcmToken = null;

    if (member.uid) {
      const userDoc = await admin.firestore().collection('users').doc(member.uid).get();
      if (userDoc.exists) {
        fcmToken = userDoc.data().fcmToken || null;
      }
    }

    if (!fcmToken && member.email) {
      const userSnap = await admin.firestore().collection('users').where('email', '==', member.email).limit(1).get();
      if (!userSnap.empty) {
        fcmToken = userSnap.docs[0].data().fcmToken || null;
      }
    }

    // 5. If FCM token exists, prepare FCM message payload
    if (fcmToken) {
      fcmMessages.push({
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          messId,
          date: targetDate,
          memberId: member.id,
          hasMeal: String(hasMeal),
          totalMeals: String(totalMeals),
          click_action: '/',
        },
        webpush: {
          notification: {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `meal-${targetDate}-${member.id}`,
            renotify: true,
          },
          fcmOptions: {
            link: '/',
          },
        },
      });
    }

    report.push({
      memberId: member.id,
      memberName: member.name,
      hasMeal,
      totalMeals,
      title,
      body,
      tokenFound: !!fcmToken,
    });
  }

  // 6. Send all FCM messages concurrently via Firebase Admin SDK
  let successCount = 0;
  let failureCount = 0;

  if (fcmMessages.length > 0) {
    const batchResponse = await admin.messaging().sendEach(fcmMessages);
    successCount = batchResponse.successCount;
    failureCount = batchResponse.failureCount;
  }

  // 7. Save audit record in Firestore collection
  await admin.firestore().collection('mess_notifications').add({
    messId,
    messName: messData.mess || '',
    date: targetDate,
    triggeredByUid: context.auth.uid,
    totalMembers: members.length,
    fcmSent: successCount,
    fcmFailed: failureCount,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    summary: report,
  });

  return {
    success: true,
    targetDate,
    totalMembers: members.length,
    fcmSent: successCount,
    fcmFailed: failureCount,
    report,
  };
});
