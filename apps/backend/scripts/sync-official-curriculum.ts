import * as fs from 'fs';
import * as path from 'path';

const rootDir = path.resolve(__dirname, '..', '..', '..');
const catalogPath = path.join(rootDir, 'data', 'sri-lanka-curriculum-catalog.json');
const aliasesPath = path.join(rootDir, 'data', 'subject-aliases.json');

function loadJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeSubjectName(value: string) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

async function main() {
  const catalog = loadJson(catalogPath);
  const aliases = loadJson(aliasesPath);

  const subjects = Array.isArray(catalog.subjects) ? catalog.subjects : [];
  const offerings = Array.isArray(catalog.offerings) ? catalog.offerings : [];

  console.log(JSON.stringify({
    mode: 'dry-run',
    totalSubjects: subjects.length,
    totalOfferings: offerings.length,
    aliasCount: Object.keys(aliases.aliases ?? {}).length,
    sample: subjects[0] ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.error('Official curriculum sync failed');
  console.error(error);
  process.exit(1);
});
