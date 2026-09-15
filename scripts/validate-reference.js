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

const filePath = path.join(__dirname, '..', 'data', 'reference-final.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const errors = [];
if (!Array.isArray(data)) errors.push('root is not an array');
if (data.length !== 147) errors.push(`expected 147 entries, got ${data.length}`);
data.forEach((item, i) => {
  if (!item.text || typeof item.text !== 'string') errors.push(`item ${i}: missing/invalid text`);
  if (!ALLOWED_CATEGORIES.has(item.category)) errors.push(`item ${i}: unknown category "${item.category}"`);
  if (!['vysoká', 'nízká'].includes(item.priority)) errors.push(`item ${i}: invalid priority "${item.priority}"`);
});

if (errors.length) {
  console.error(`VALIDATION FAILED (${errors.length} errors):`);
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
} else {
  const byCategory = {};
  data.forEach(i => { byCategory[i.category] = (byCategory[i.category] || 0) + 1; });
  console.log(`OK: ${data.length} reference entries valid across ${Object.keys(byCategory).length} categories.`);
}
