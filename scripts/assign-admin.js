const admin = require('firebase-admin');

const allowedRoles = ['student', 'teacher', 'reviewer', 'admin'];

if (!process.env.FIREBASE_PROJECT_ID) {
  console.error('Set FIREBASE_PROJECT_ID before running this script.');
  process.exit(1);
}

admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });

const uid = process.argv[2];
const role = (process.argv[3] || 'student').trim();

if (!uid) {
  console.error('Usage: node scripts/assign-admin.js <uid> [student|teacher|reviewer|admin]');
  process.exit(1);
}

if (!allowedRoles.includes(role)) {
  console.error(`Invalid role "${role}". Allowed values: ${allowedRoles.join(', ')}`);
  process.exit(1);
}

(async () => {
  const user = await admin.auth().getUser(uid).catch(() => null);

  if (!user) {
    console.error(`No Firebase user found for uid "${uid}".`);
    process.exit(1);
  }

  await admin.auth().setCustomUserClaims(uid, { role });

  const profile = await admin.firestore().collection('users').doc(uid).get();
  const existing = profile.exists ? profile.data() || {} : {};

  await admin.firestore().collection('users').doc(uid).set(
    {
      id: uid,
      email: existing.email || user.email || '',
      displayName: existing.displayName || user.displayName || user.email?.split('@')[0] || 'EduNexa user',
      role,
      grade: existing.grade ?? 0,
      medium: existing.medium || 'English',
      emailVerified: existing.emailVerified ?? user.emailVerified ?? false,
      disabled: existing.disabled ?? false,
      onboardingCompleted: existing.onboardingCompleted ?? false,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  console.log(`Assigned role "${role}" to user ${uid}`);
  process.exit(0);
})();
