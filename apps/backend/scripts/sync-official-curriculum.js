#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
const catalogPath = path.resolve(__dirname, '..', '..', '..', 'data', 'sri-lanka-curriculum-catalog.json');

dotenv.config({ path: envPath });

function parseArgs(argv) {
  const args = { grades: [], mediums: [], source: 'all', dryRun: false, apply: false, confirmProduction: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;

    const [key, rawValue] = item.slice(2).split('=');
    const value = rawValue ?? 'true';

    if (key === 'dry-run') args.dryRun = value !== 'false';
    else if (key === 'apply') args.apply = value !== 'false';
    else if (key === 'confirm-production') args.confirmProduction = value !== 'false';
    else if (key === 'grades') args.grades = String(value).split(',').map((part) => Number(part.trim())).filter((n) => Number.isFinite(n));
    else if (key === 'mediums') args.mediums = String(value).split(',').map((part) => part.trim()).filter(Boolean);
    else if (key === 'source') args.source = String(value || 'all');
    else if (key === 'help') args.help = true;
  }

  return args;
}

function normalizeMedium(value) {
  const normalized = String(value ?? '').trim();
  const lower = normalized.toLowerCase();
  if (lower === 'sinhala') return 'Sinhala';
  if (lower === 'tamil') return 'Tamil';
  return 'English';
}

function safeReadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Unable to parse JSON at ${filePath}: ${error.message}`);
    return null;
  }
}

function canonicalSubjectKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'subject';
}

function buildOfferingId(subjectId, grade, medium, stream) {
  const normalized = canonicalSubjectKey(`${subjectId}-${grade}-${medium}-${stream ?? 'general'}`);
  return normalized;
}

function printSummary(summary) {
  console.log(JSON.stringify({
    mode: summary.mode,
    canonicalSubjects: summary.canonicalSubjects,
    offerings: summary.offerings,
    gradeCounts: summary.gradeCounts,
    mediumCounts: summary.mediumCounts,
    streamCounts: summary.streamCounts,
    duplicates: summary.duplicates,
    skipped: summary.skipped,
    uncertain: summary.uncertain,
    firestoreWrites: summary.firestoreWrites,
    note: summary.note,
  }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: pnpm curriculum:sync -- --dry-run | --apply --confirm-production --grades 6,7,... --mediums Sinhala,Tamil,English --source all');
    return;
  }

  const dryRun = args.apply ? false : args.dryRun || true;
  const selectedGrades = args.grades.length > 0 ? args.grades : [6, 7, 8, 9, 10, 11, 12, 13];
  const selectedMediums = args.mediums.length > 0 ? args.mediums.map(normalizeMedium) : ['Sinhala', 'Tamil', 'English'];
  const sourceFilter = String(args.source || 'all').toLowerCase();
  const projectId = process.env.FIREBASE_PROJECT_ID || 'edunexa-d34ae';

  if (process.env.NODE_ENV === 'production' && !args.confirmProduction && args.apply) {
    console.error('Refusing to apply in production without --confirm-production.');
    process.exit(1);
  }

  const catalog = safeReadJson(catalogPath);
  if (!catalog) {
    console.error(`Catalog not found at ${catalogPath}`);
    process.exit(1);
  }

  const canonicalSubjects = Array.isArray(catalog.subjects) ? catalog.subjects : [];
  const offerings = Array.isArray(catalog.offerings) ? catalog.offerings : [];

  const gradeCounts = {};
  const mediumCounts = {};
  const streamCounts = {};
  const duplicates = [];
  const skipped = [];
  const uncertain = [];
  const filteredOfferings = [];
  const seen = new Set();

  for (const offering of offerings) {
    const gradeValue = Number(offering.grade);
    const mediumValue = normalizeMedium(offering.medium);
    const streamValue = String(offering.stream ?? 'Common');

    if (!selectedGrades.includes(gradeValue)) {
      skipped.push({ id: offering.id, reason: 'grade-filter' });
      continue;
    }

    if (!selectedMediums.includes(mediumValue)) {
      skipped.push({ id: offering.id, reason: 'medium-filter' });
      continue;
    }

    if (sourceFilter !== 'all' && String(offering.source ?? '').toLowerCase() !== sourceFilter) {
      skipped.push({ id: offering.id, reason: 'source-filter' });
      continue;
    }

    if (offering.confidence === 'uncertain') {
      uncertain.push({ id: offering.id, grade: gradeValue, medium: mediumValue, stream: streamValue });
    }

    const uniqueKey = `${gradeValue}|${offering.subjectId}|${mediumValue}|${streamValue}`;
    if (seen.has(uniqueKey)) {
      duplicates.push({ id: offering.id, key: uniqueKey });
      continue;
    }
    seen.add(uniqueKey);

    filteredOfferings.push(offering);
    gradeCounts[gradeValue] = (gradeCounts[gradeValue] ?? 0) + 1;
    mediumCounts[mediumValue] = (mediumCounts[mediumValue] ?? 0) + 1;
    streamCounts[streamValue] = (streamCounts[streamValue] ?? 0) + 1;
  }

  for (const grade of selectedGrades) {
    gradeCounts[grade] = gradeCounts[grade] ?? 0;
  }
  for (const medium of selectedMediums) {
    mediumCounts[medium] = mediumCounts[medium] ?? 0;
  }

  const summary = {
    mode: args.apply ? 'apply' : 'dry-run',
    canonicalSubjects: canonicalSubjects.length,
    offerings: filteredOfferings.length,
    gradeCounts,
    mediumCounts,
    streamCounts,
    duplicates,
    skipped,
    uncertain,
    firestoreWrites: 0,
    note: args.apply ? 'Firestore writes will be committed on apply.' : 'Dry run only — Firestore writes: exactly zero.',
  };

  if (dryRun) {
    printSummary(summary);
    return;
  }

  const credentialConfig = {
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  };

  admin.initializeApp({
    projectId,
    credential:
      credentialConfig.clientEmail && credentialConfig.privateKey
        ? admin.credential.cert(credentialConfig)
        : admin.credential.applicationDefault(),
  });

  const db = admin.firestore();
  const batch = db.batch();
  const subjectRefMap = new Map();

  for (const subject of canonicalSubjects) {
    const subjectId = String(subject.id || subject.normalizedKey || canonicalSubjectKey(subject.canonicalName));
    const ref = db.collection('subjects').doc(subjectId);
    subjectRefMap.set(subjectId, ref);
    batch.set(ref, {
      id: subjectId,
      canonicalName: subject.canonicalName || subject.id,
      normalizedKey: subject.normalizedKey || subjectId,
      names: subject.names || {},
      officialSourceUrls: Array.isArray(subject.officialSourceUrls) ? subject.officialSourceUrls : [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  for (const offering of filteredOfferings) {
    const mediumValue = normalizeMedium(offering.medium);
    const streamValue = String(offering.stream ?? 'General');
    const offeringId = buildOfferingId(offering.subjectId, offering.grade, mediumValue, streamValue);
    const ref = db.collection('curriculumOfferings').doc(offeringId);
    const existing = await ref.get();
    const next = {
      id: offeringId,
      subjectId: offering.subjectId,
      canonicalSubjectKey: offering.canonicalSubjectKey || offering.subjectId,
      officialName: offering.officialName || offering.subjectId,
      grade: Number(offering.grade),
      medium: mediumValue,
      stream: streamValue,
      source: offering.source || 'official',
      sourceUrl: offering.sourceUrl || '',
      accessEnabled: existing.exists && typeof existing.data()?.accessEnabled === 'boolean'
        ? existing.data().accessEnabled
        : offering.accessEnabled !== false,
      confidence: offering.confidence || 'verified',
      reviewStatus: offering.reviewStatus || 'approved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'curriculum-sync',
    };
    batch.set(ref, next, { merge: true });
  }

  const importRunRef = db.collection('catalogImportRuns').doc();
  batch.set(importRunRef, {
    id: importRunRef.id,
    status: 'success',
    totalSubjects: canonicalSubjects.length,
    totalOfferings: filteredOfferings.length,
    grades: selectedGrades,
    mediums: selectedMediums,
    source: sourceFilter,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await batch.commit();

  printSummary({
    ...summary,
    mode: 'apply',
    firestoreWrites: filteredOfferings.length + canonicalSubjects.length + 1,
  });
}

main().catch((error) => {
  console.error('Curriculum sync failed');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
