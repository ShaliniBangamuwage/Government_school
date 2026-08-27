#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

const allowedRoles = ['student', 'teacher', 'reviewer', 'admin'];
const args = {};

for (let index = 2; index < process.argv.length; index += 1) {
  const rawArg = process.argv[index];
  if (!rawArg.startsWith('--')) {
    continue;
  }

  const [rawKey, rawValue] = rawArg.split('=');
  const key = rawKey.slice(2);

  if (rawValue !== undefined) {
    args[key] = rawValue;
    continue;
  }

  const nextValue = process.argv[index + 1];
  if (nextValue && !nextValue.startsWith('--')) {
    args[key] = nextValue;
    index += 1;
  } else {
    args[key] = 'true';
  }
}

const scriptDir = __dirname;
const backendDir = path.resolve(scriptDir, '..');
const envPath = path.join(backendDir, '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error && fs.existsSync(envPath)) {
  console.error(`Failed to parse ${envPath}: ${envResult.error.message}`);
  process.exit(1);
}

const email = (args.email || args.e || '').trim().toLowerCase();
const role = (args.role || args.r || '').trim().toLowerCase();
const confirmProduction = Boolean(args['confirm-production']);

function printUsage() {
  console.error('Usage: pnpm --filter backend set-user-role -- --email user@example.com --role teacher [--confirm-production]');
}

if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

if (!email) {
  printUsage();
  console.error('Missing required --email argument.');
  process.exit(1);
}

if (!allowedRoles.includes(role)) {
  printUsage();
  console.error(`Invalid role "${role}". Allowed values: ${allowedRoles.join(', ')}`);
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('Missing FIREBASE_PROJECT_ID in the backend environment.');
  process.exit(1);
}

const productionLike = /prod|production/i.test(projectId) || process.env.NODE_ENV === 'production';
if (productionLike && !confirmProduction) {
  console.error('Refusing to change roles in a production project without --confirm-production.');
  process.exit(1);
}

const credentialConfig = {
  projectId,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  projectId,
  credential:
    credentialConfig.clientEmail && credentialConfig.privateKey
      ? admin.credential.cert(credentialConfig)
      : admin.credential.applicationDefault(),
});

(async () => {
  const user = await admin.auth().getUserByEmail(email).catch(() => null);

  if (!user) {
    console.error(`No Firebase user found for email "${email}".`);
    process.exit(1);
  }

  const profileRef = admin.firestore().collection('users').doc(user.uid);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    console.error(`User profile missing for uid "${user.uid}". Expected Firestore document at users/{uid}.`);
    process.exit(1);
  }

  const existing = profileSnap.data() || {};

  await profileRef.set(
    {
      id: user.uid,
      uid: user.uid,
      email: existing.email || user.email || email,
      displayName: existing.displayName || user.displayName || email.split('@')[0] || 'EduNexa user',
      fullName: existing.fullName || user.displayName || email.split('@')[0] || 'EduNexa user',
      role,
      status: existing.status || 'active',
      grade: existing.grade ?? 0,
      medium: existing.medium || 'English',
      emailVerified: existing.emailVerified ?? user.emailVerified ?? true,
      onboardingCompleted: existing.onboardingCompleted ?? false,
      mustChangePassword: existing.mustChangePassword ?? false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`Updated role for ${email} to "${role}".`);
  process.exit(0);
})().catch((error) => {
  console.error('Failed to update user role:', error?.message || error);
  process.exit(1);
});
