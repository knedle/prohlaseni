const fs = require('fs');
const path = require('path');

const ALLOWED_CATEGORIES = new Set([
  'Finance a hospodaření státu',
  'Vnitřní bezpečnost a veřejná správa',
  'Obranná politika a Armáda České republiky',
  'Zahraniční politika',
  'Právo a spravedlnost',
  'Hospodářství, průmysl a energetika',
  'Doprava',
  'Vzdělávání',
  'Sociální politika a zaměstnanost',
  'Zdravotnictví',
  'Zemědělství',
  'Životní prostředí',
  'Kultura',
  'Bydlení a regionální rozvoj',
  'Sport, prevence a zdraví',
  'Věda, výzkum a inovace',
  'Digitalizace',
]);

const root = path.join(__dirname, '..');
const pledges = JSON.parse(fs.readFileSync(path.join(root, 'data', 'pledges.json'), 'utf8'));
const reference = JSON.parse(fs.readFileSync(path.join(root, 'data', 'reference-final.json'), 'utf8'));

const errors = [];

if (!Array.isArray(pledges)) errors.push('pledges root is not an array');

const seenIds = new Set();
pledges.forEach((p, i) => {
  const where = `pledge[${i}] (id=${p.id})`;
  if (!p.id || typeof p.id !== 'string') {
    errors.push(`${where}: missing/invalid id`);
  } else if (seenIds.has(p.id)) {
    errors.push(`${where}: duplicate id`);
  } else {
    seenIds.add(p.id);
  }
  if (!p.text || typeof p.text !== 'string') errors.push(`${where}: missing text`);
  if (!ALLOWED_CATEGORIES.has(p.category)) errors.push(`${where}: unknown category "${p.category}"`);
  if (!['vysoká', 'nízká'].includes(p.priority)) errors.push(`${where}: invalid priority "${p.priority}"`);
  if (!Array.isArray(p.sources) || p.sources.length === 0) {
    errors.push(`${where}: sources must be a non-empty array`);
  } else if (!p.sources.every(s => s === 'navrh' || s === 'final')) {
    errors.push(`${where}: invalid sources entries`);
  }
  if (p.draftExtra !== null && typeof p.draftExtra !== 'string') errors.push(`${where}: draftExtra must be string or null`);
  if (!['splněno', 'nesplněno', 'čekající'].includes(p.status)) errors.push(`${where}: invalid status "${p.status}"`);
  if (p.statusNote !== null && typeof p.statusNote !== 'string') errors.push(`${where}: statusNote must be string or null`);
  if (typeof p.statusQuo !== 'boolean') errors.push(`${where}: statusQuo must be boolean`);
});

// Note: pledge `text` is intentionally rewritten from the source PDFs to be more
// specific than reference-final.json's short paraphrases (see project history), so
// we cross-check by category+priority multiset (volume/classification) rather than
// exact text — reference-final.json remains a calibration snapshot for *counts*, not
// for wording.
const bucketKey = e => `${e.category}||${e.priority}`;
const refCounts = new Map();
reference.forEach(e => refCounts.set(bucketKey(e), (refCounts.get(bucketKey(e)) || 0) + 1));

const finalPledges = pledges.filter(p => Array.isArray(p.sources) && p.sources.includes('final'));
const pledgeCounts = new Map();
finalPledges.forEach(p => pledgeCounts.set(bucketKey(p), (pledgeCounts.get(bucketKey(p)) || 0) + 1));

for (const [k, count] of refCounts) {
  if (pledgeCounts.get(k) !== count) {
    errors.push(`final-sourced bucket mismatch for "${k}": reference has ${count}, pledges has ${pledgeCounts.get(k) || 0}`);
  }
}
for (const [k, count] of pledgeCounts) {
  if (!refCounts.has(k)) {
    errors.push(`pledges has a final-sourced bucket not present in reference: "${k}" (${count})`);
  }
}

if (errors.length) {
  console.error(`VALIDATION FAILED (${errors.length} errors):`);
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
} else {
  const byCategory = {};
  pledges.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });
  console.log(`OK: ${pledges.length} pledges valid.`);
  console.log(`Final-sourced: ${finalPledges.length} (expected 147)`);
  console.log('By category:', byCategory);
}
