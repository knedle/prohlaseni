# Sledovací web programového prohlášení vlády — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, no-framework website that lists atomic pledges from the Czech government's programme statement, tagging each with category, priority, and whether it came from the November 2025 draft, the final version, or both — with editorial "fulfilled/not fulfilled" status stored in a checked-in data file.

**Architecture:** A one-time content-extraction pass turns two prose PDFs into a single `data/pledges.json`. A static `index.html` + `app.js` + `style.css` site (no build step, no backend) fetches that JSON client-side, renders filterable cards, and displays a completion counter driven entirely by the `status` field already in the data.

**Tech Stack:** Plain HTML/CSS/JavaScript (ES2020+, no framework). Node.js (v24, already installed) used only for one-off validation/dev-server scripts, never shipped to the site. `pdftotext` (poppler-utils, already installed) for PDF-to-text extraction.

**Spec:** `docs/superpowers/specs/2026-09-15-programove-prohlaseni-design.md`

## Global Constraints

- No build tooling, no JS framework, no npm dependencies — vanilla HTML/CSS/JS only (per spec "Frontend — statický web, bez frameworku").
- No backend, no database — the only persistent store is `data/pledges.json` in the repo (per spec "status — skutečná redakční data").
- All UI copy and data content is Czech.
- `status` (`"splněno"` / `"nesplněno"`) is never toggled from the UI — it is read-only display data, manually maintained in the JSON file over time.
- The 17 categories are fixed and must exactly match the reference site's category names (see Task 2 data) — do not invent new category names or merge/split categories.
- No automated browser/UI tests — verification is manual per spec; automated checks are limited to JSON schema/content validators (appropriate for a data-curation project).

---

### Task 1: Repo setup + reproducible PDF text extraction

**Files:**
- Create: `.gitignore`
- Create/verify: `navrh.txt`, `final.txt` (repo root)
- Modify: none

**Interfaces:**
- Consumes: `Navrh_programoveho_prohlaseni_vlady_Ceske_republiky_listopad_2025.pdf`, `programove-prohlaseni-vlady.pdf` (already present in repo root)
- Produces: `navrh.txt`, `final.txt` — UTF-8 plain-text extracts of the two PDFs, consumed by Task 3

- [ ] **Step 1: Initialize git repo**

Run: `git init`
Expected: `Initialized empty Git repository in E:/docker/prohlaseni/.git/`

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
*.log
```

- [ ] **Step 3: Generate the two text extracts**

Run:
```bash
pdftotext -layout -enc UTF-8 "Navrh_programoveho_prohlaseni_vlady_Ceske_republiky_listopad_2025.pdf" navrh.txt
pdftotext -layout -enc UTF-8 "programove-prohlaseni-vlady.pdf" final.txt
```

- [ ] **Step 4: Verify extraction sanity**

Run: `wc -l navrh.txt final.txt`
Expected: `navrh.txt` ≈ 1492 lines, `final.txt` ≈ 2091 lines (exact counts can drift a little between poppler versions — treat wildly different counts, e.g. under 500 or over 5000, as a failure and re-check the `pdftotext` invocation).

- [ ] **Step 5: Commit**

```bash
git add .gitignore navrh.txt final.txt \
  "Navrh_programoveho_prohlaseni_vlady_Ceske_republiky_listopad_2025.pdf" \
  "programove-prohlaseni-vlady.pdf" readme.txt SPEC.md docs/
git commit -m "chore: init repo, extract PDF text sources, add spec/plan"
```

---

### Task 2: Reference calibration data (`data/reference-final.json`)

This file captures the 147 pledge/category/priority triples already published on the
reference site (https://macaly-fq8pakzbd2ljpsyuz63v9gbv.macaly.app/), captured during
brainstorming research. It's the ground truth for how the *final* version should be
categorized and prioritized — Task 3 uses it directly instead of re-deriving final-version
categorization from scratch, and validates against it.

**Files:**
- Create: `data/reference-final.json`
- Create: `scripts/validate-reference.js`

**Interfaces:**
- Produces: `data/reference-final.json` — `Array<{text: string, category: string, priority: "vysoká"|"nízká"}>`, exactly 147 entries. Consumed by Task 3 (as the final-version baseline) and by `scripts/validate-pledges.js` (Task 3's cross-check).

- [ ] **Step 1: Write the validator**

Create `scripts/validate-reference.js`:

```js
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
```

- [ ] **Step 2: Run validator, expect failure (file doesn't exist yet)**

Run: `node scripts/validate-reference.js`
Expected: `Error: ENOENT ... data/reference-final.json`

- [ ] **Step 3: Create `data/reference-final.json`**

```json
[
  { "text": "Udržovat deficit veřejných financí blízko vyrovnané bilance pod 3 %", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Zavést EET 2.0 od roku 2027 s moderním systémem evidence tržeb", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Zavést Digitální daňovou kobru s AI pro odhalení daňových úniků", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Rozšířit kompetence Celní správy a zvýšit platy celníků na min. 50 000 Kč", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Snížit daň z příjmů právnických osob na 19 %", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Zastavit automatické valorizace daně z nemovitostí prostřednictvím inflačních koeficientů", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Zavést 0% DPH na léky na předpis", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Zastavit zvyšování vyměřovacího základu pro sociální pojistné OSVČ (zůstane na 35 %)", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Vrátit daňovou slevu pro pracující studenty", "category": "Finance a hospodaření státu", "priority": "nízká" },
  { "text": "Vrátit školkovné a původní podobu slevy na druhého z manželů", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Zavést daňovou slevu za 4. a další dítě", "category": "Finance a hospodaření státu", "priority": "nízká" },
  { "text": "Zrušit zastropování volnočasových benefitů zaměstnanců", "category": "Finance a hospodaření státu", "priority": "nízká" },
  { "text": "Zkrátit lhůtu pro vrácení DPH z nezaplacených faktur z 6 na 3 měsíce", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Zřídit veřejný registr všech dotací pro neziskové organizace", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Sjednotit DPH na stravovací služby a nealkoholické nápoje na 12 %", "category": "Finance a hospodaření státu", "priority": "nízká" },
  { "text": "Osvobodit dobrovolné spropitné v gastronomii od odvodů a daní", "category": "Finance a hospodaření státu", "priority": "nízká" },
  { "text": "Zřídit jednotné inkasní místo pro daně a pojištění", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Nabídnout státní dluhopisy pro občany (od 1 000 Kč do 3 000 000 Kč)", "category": "Finance a hospodaření státu", "priority": "nízká" },
  { "text": "Navrhnout ukotvení české koruny v Ústavě ČR", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Navýšit nástupní plat policisty a hasiče na 50 000 Kč", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "vysoká" },
  { "text": "Sjednotit platy vojáků, policistů a hasičů na srovnatelnou úroveň", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "vysoká" },
  { "text": "Zavést příspěvek na bydlení pro bezpečnostní složky do výše 6 000 Kč měsíčně", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "vysoká" },
  { "text": "Zastavit rušení policejních služeben", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "vysoká" },
  { "text": "Zvýšit přítomnost policie v problémových lokalitách a veřejné dopravě", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "vysoká" },
  { "text": "Zavést politiku nulové tolerance vůči nelegální migraci", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "vysoká" },
  { "text": "Odmítnout migrační pakt EU a přijmout nový zákon o migraci a azylu", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "vysoká" },
  { "text": "Zpřísnit pravidla pro pobyt cizinců a rychlé vyhošťování pachatelů trestných činů", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "vysoká" },
  { "text": "Připravit síť náborových a výcvikových center pro bezpečnostní složky", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "nízká" },
  { "text": "Posílit kapacity NÚKIB a ochranu kritické infrastruktury", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "vysoká" },
  { "text": "Provést audit hospodaření Ministerstva obrany a akvizic", "category": "Obranná politika a Armáda České republiky", "priority": "vysoká" },
  { "text": "Vypracovat novou Koncepci výstavby AČR 2035 s důrazem na národní priority", "category": "Obranná politika a Armáda České republiky", "priority": "vysoká" },
  { "text": "Odmítnout vytváření paralelních vojenských struktur EU (Armády EU)", "category": "Obranná politika a Armáda České republiky", "priority": "vysoká" },
  { "text": "Maximálně zapojit český průmysl do všech obranných akvizic", "category": "Obranná politika a Armáda České republiky", "priority": "vysoká" },
  { "text": "Modernizovat výstroj, výzbroj a techniku armády", "category": "Obranná politika a Armáda České republiky", "priority": "vysoká" },
  { "text": "Posílit ochranu hranic, vzdušného prostoru a kybernetickou obranu", "category": "Obranná politika a Armáda České republiky", "priority": "vysoká" },
  { "text": "Zajistit důstojné platy a podmínky pro vojáky", "category": "Obranná politika a Armáda České republiky", "priority": "vysoká" },
  { "text": "Prosazovat národní zájmy ČR v rámci EU a NATO", "category": "Zahraniční politika", "priority": "vysoká" },
  { "text": "Bránit suverenitu ČR a odmítnout centralizaci moci v Bruselu", "category": "Zahraniční politika", "priority": "vysoká" },
  { "text": "Nepodporovat přijetí eura", "category": "Zahraniční politika", "priority": "vysoká" },
  { "text": "Posílit ekonomickou diplomacii a podporu exportu", "category": "Zahraniční politika", "priority": "vysoká" },
  { "text": "Odmítnout emisní povolenky ETS2", "category": "Zahraniční politika", "priority": "vysoká" },
  { "text": "Zrychlit soudní řízení a snížit délku soudních sporů", "category": "Právo a spravedlnost", "priority": "vysoká" },
  { "text": "Posílit nezávislost soudnictví a transparentnost", "category": "Právo a spravedlnost", "priority": "vysoká" },
  { "text": "Zpřísnit tresty pro recidivisty a násilné trestné činy", "category": "Právo a spravedlnost", "priority": "vysoká" },
  { "text": "Modernizovat vězeňství a zajistit dostupnou probaci", "category": "Právo a spravedlnost", "priority": "nízká" },
  { "text": "Zlepšit ochranu obětí trestných činů", "category": "Právo a spravedlnost", "priority": "vysoká" },
  { "text": "Zajistit přijatelné ceny energií pro domácnosti i podniky", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Odmítnout emisní povolenky ETS2", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Snížit poplatky za distribuci a přenos elektřiny", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Podpořit rozvoj jaderné energetiky", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Posílit energetickou bezpečnost a soběstačnost státu", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Podpořit domácí zdroje energie a moderní technologie", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Snížit administrativní zátěž pro podnikatele", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Podpořit inovace a digitalizaci průmyslu", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Dokončit dálniční síť D1, D3, D4, D11 a D35", "category": "Doprava", "priority": "vysoká" },
  { "text": "Urychlit výstavbu vysokorychlostních tratí", "category": "Doprava", "priority": "vysoká" },
  { "text": "Modernizovat železniční infrastrukturu", "category": "Doprava", "priority": "vysoká" },
  { "text": "Zlepšit stav silnic druhé a třetí třídy", "category": "Doprava", "priority": "vysoká" },
  { "text": "Podpořit rozvoj veřejné dopravy v regionech", "category": "Doprava", "priority": "vysoká" },
  { "text": "Zjednodušit a zrychlit stavební řízení pro dopravní stavby", "category": "Doprava", "priority": "vysoká" },
  { "text": "Zvýšit platy učitelů", "category": "Vzdělávání", "priority": "vysoká" },
  { "text": "Zajistit dostatek míst ve školkách", "category": "Vzdělávání", "priority": "vysoká" },
  { "text": "Zachovat bezplatné vzdělávání pro všechny", "category": "Vzdělávání", "priority": "vysoká" },
  { "text": "Modernizovat obsah výuky a posílit praktické dovednosti", "category": "Vzdělávání", "priority": "vysoká" },
  { "text": "Podpořit digitalizaci ve školství", "category": "Vzdělávání", "priority": "nízká" },
  { "text": "Zlepšit podmínky pro pedagogy a snížit administrativní zátěž", "category": "Vzdělávání", "priority": "vysoká" },
  { "text": "Posílit finanční gramotnost a výuku práce s AI", "category": "Vzdělávání", "priority": "nízká" },
  { "text": "Zastropovat důchodový věk na 65 letech", "category": "Sociální politika a zaměstnanost", "priority": "vysoká" },
  { "text": "Obnovit spravedlivý systém valorizací důchodů", "category": "Sociální politika a zaměstnanost", "priority": "vysoká" },
  { "text": "Zajistit finančně udržitelný a spravedlivý důchodový systém", "category": "Sociální politika a zaměstnanost", "priority": "vysoká" },
  { "text": "Posílit dostupnost sociálních služeb", "category": "Sociální politika a zaměstnanost", "priority": "vysoká" },
  { "text": "Zlepšit péči o seniory a osoby se zdravotním postižením", "category": "Sociální politika a zaměstnanost", "priority": "vysoká" },
  { "text": "Provést revizi systému sociálních dávek a zabránit zneužívání", "category": "Sociální politika a zaměstnanost", "priority": "vysoká" },
  { "text": "Zvýšit motivaci k práci a aktivnímu zapojení do společnosti", "category": "Sociální politika a zaměstnanost", "priority": "nízká" },
  { "text": "Podpořit rovnováhu mezi pracovním a rodinným životem", "category": "Sociální politika a zaměstnanost", "priority": "nízká" },
  { "text": "Zkrátit čekací lhůty na vyšetření a zákroky", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Zajistit dostupnost léků", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Posílit prevenci nádorových a kardiovaskulárních onemocnění", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Věnovat zvláštní pozornost duševnímu zdraví", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Modernizovat nemocnice a zdravotnické vybavení", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Digitalizovat zdravotnictví", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Posílit personální stabilitu ve zdravotnických profesích", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Zlepšit podmínky pro lékaře a zdravotníky", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Zajistit kvalitní, bezplatné a dostupné zdravotnictví pro všechny", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Podpořit soběstačnost v potravinách", "category": "Zemědělství", "priority": "vysoká" },
  { "text": "Zajistit férové podmínky pro české zemědělce", "category": "Zemědělství", "priority": "vysoká" },
  { "text": "Podpořit tradiční a lokální producenty", "category": "Zemědělství", "priority": "nízká" },
  { "text": "Snížit byrokracii v zemědělství", "category": "Zemědělství", "priority": "vysoká" },
  { "text": "Chránit zemědělskou půdu před nezemědělským využitím", "category": "Zemědělství", "priority": "vysoká" },
  { "text": "Podpořit mladé zemědělce", "category": "Zemědělství", "priority": "nízká" },
  { "text": "Chránit přírodu a krajinu jako základní bohatství země", "category": "Životní prostředí", "priority": "vysoká" },
  { "text": "Provést účinná opatření proti suchu", "category": "Životní prostředí", "priority": "vysoká" },
  { "text": "Obnovit lesy a podpořit zadržování vody v krajině", "category": "Životní prostředí", "priority": "vysoká" },
  { "text": "Posílit ochranu zvířat a zlepšit podmínky pro jejich život", "category": "Životní prostředí", "priority": "nízká" },
  { "text": "Podpořit čistou energii a snížit emise", "category": "Životní prostředí", "priority": "vysoká" },
  { "text": "Zlepšit nakládání s odpady a podporu recyklace", "category": "Životní prostředí", "priority": "nízká" },
  { "text": "Zajistit stabilní financování kultury", "category": "Kultura", "priority": "nízká" },
  { "text": "Podpořit regionální kulturní instituce", "category": "Kultura", "priority": "nízká" },
  { "text": "Chránit kulturní dědictví", "category": "Kultura", "priority": "nízká" },
  { "text": "Podpořit živou kulturu a nezávislé umělce", "category": "Kultura", "priority": "nízká" },
  { "text": "Zpřístupnit kulturu všem generacím", "category": "Kultura", "priority": "nízká" },
  { "text": "Zrychlit a zjednodušit stavební řízení", "category": "Bydlení a regionální rozvoj", "priority": "vysoká" },
  { "text": "Podpořit výstavbu nájemních a družstevních bytů", "category": "Bydlení a regionální rozvoj", "priority": "vysoká" },
  { "text": "Zajistit státní podporu financování bydlení pro mladé rodiny", "category": "Bydlení a regionální rozvoj", "priority": "vysoká" },
  { "text": "Podpořit výstavbu studentských kolejí", "category": "Bydlení a regionální rozvoj", "priority": "nízká" },
  { "text": "Podpořit výstavbu bytů pro seniory", "category": "Bydlení a regionální rozvoj", "priority": "nízká" },
  { "text": "Zajistit podporu bydlení pro klíčové profese", "category": "Bydlení a regionální rozvoj", "priority": "vysoká" },
  { "text": "Vyrovnat rozdíly mezi regiony", "category": "Bydlení a regionální rozvoj", "priority": "nízká" },
  { "text": "Zajistit rozvoj sportu a dostupnost pohybových aktivit pro všechny generace", "category": "Sport, prevence a zdraví", "priority": "nízká" },
  { "text": "Modernizovat sportovní infrastrukturu", "category": "Sport, prevence a zdraví", "priority": "nízká" },
  { "text": "Podpořit mládežnický sport", "category": "Sport, prevence a zdraví", "priority": "nízká" },
  { "text": "Posílit prevenci civilizačních chorob", "category": "Sport, prevence a zdraví", "priority": "vysoká" },
  { "text": "Zajistit podporu vrcholového sportu", "category": "Sport, prevence a zdraví", "priority": "nízká" },
  { "text": "Podpořit investice do vědy, výzkumu a inovací", "category": "Věda, výzkum a inovace", "priority": "vysoká" },
  { "text": "Propojit akademickou sféru s praxí", "category": "Věda, výzkum a inovace", "priority": "vysoká" },
  { "text": "Podpořit start-upy a technologické firmy", "category": "Věda, výzkum a inovace", "priority": "vysoká" },
  { "text": "Zajistit lepší podmínky pro vědce a výzkumníky", "category": "Věda, výzkum a inovace", "priority": "nízká" },
  { "text": "Digitalizovat státní správu", "category": "Digitalizace", "priority": "vysoká" },
  { "text": "Snížit administrativní zátěž prostřednictvím digitalizace", "category": "Digitalizace", "priority": "vysoká" },
  { "text": "Zajistit kybernetickou bezpečnost", "category": "Digitalizace", "priority": "vysoká" },
  { "text": "Podpořit rozvoj digitální infrastruktury", "category": "Digitalizace", "priority": "vysoká" },
  { "text": "Zajistit digitální gramotnost obyvatel", "category": "Digitalizace", "priority": "nízká" },
  { "text": "Zachovat práva legálních držitelů zbraní", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "nízká" },
  { "text": "Podpořit jednotky dobrovolných hasičů jako klíčový prvek bezpečnosti v regionech", "category": "Vnitřní bezpečnost a veřejná správa", "priority": "nízká" },
  { "text": "Odmítnout zákaz spalovacích motorů od roku 2035", "category": "Doprava", "priority": "vysoká" },
  { "text": "Vrátit slevy na jízdné pro studenty a seniory ve výši 75 procent", "category": "Doprava", "priority": "vysoká" },
  { "text": "Zvýšit rodičovský příspěvek na 400 000 Kč", "category": "Sociální politika a zaměstnanost", "priority": "vysoká" },
  { "text": "Zavést věkové valorizace důchodů od 80 let", "category": "Sociální politika a zaměstnanost", "priority": "vysoká" },
  { "text": "Zahájit výstavbu nové fakultní nemocnice v Praze", "category": "Zdravotnictví", "priority": "vysoká" },
  { "text": "Zrušit poplatky za veřejnoprávní média", "category": "Kultura", "priority": "vysoká" },
  { "text": "Zavést vstup zdarma do státních muzeí a galerií pro mládež, seniory a hendikepované", "category": "Kultura", "priority": "nízká" },
  { "text": "Získat stoprocentní kontrolu nad výrobou ve skupině ČEZ", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Zahájit stavební řízení nových jaderných bloků Dukovany 5 a 6", "category": "Hospodářství, průmysl a energetika", "priority": "vysoká" },
  { "text": "Připravit zákon o celostátním referendu", "category": "Právo a spravedlnost", "priority": "vysoká" },
  { "text": "Zrušit trestný čin neoprávněné činnosti pro cizí moc", "category": "Právo a spravedlnost", "priority": "vysoká" },
  { "text": "Připravit nový stavební zákon se zrychlením stavebního řízení", "category": "Bydlení a regionální rozvoj", "priority": "vysoká" },
  { "text": "Dokončit Vltavskou filharmonii v Praze", "category": "Kultura", "priority": "nízká" },
  { "text": "Zvýšit platy pracovníků v kultuře", "category": "Kultura", "priority": "nízká" },
  { "text": "Nástupní plat učitele 50 tisíc korun, garantovaný průměrný plat 75 tisíc korun", "category": "Vzdělávání", "priority": "vysoká" },
  { "text": "Odmítnout Green Deal v současné podobě, prosazovat jeho revizi", "category": "Životní prostředí", "priority": "vysoká" },
  { "text": "Ukotvit právo na hotovost v ústavě", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Zrušit post ministra pro evropské záležitosti", "category": "Zahraniční politika", "priority": "nízká" },
  { "text": "Zrušit funkci ministra pro vědu", "category": "Věda, výzkum a inovace", "priority": "nízká" },
  { "text": "Nástupní plat příslušníků vězeňské služby 50 tisíc korun", "category": "Právo a spravedlnost", "priority": "vysoká" },
  { "text": "Nástupní plat celníků 50 tisíc korun", "category": "Finance a hospodaření státu", "priority": "vysoká" },
  { "text": "Propojit Prahu, ruzyňské letiště a Kladno železnicí do roku 2029", "category": "Doprava", "priority": "vysoká" },
  { "text": "Podpořit projekt modernizace Letiště Praha", "category": "Doprava", "priority": "vysoká" }
]
```

- [ ] **Step 4: Run validator, expect success**

Run: `node scripts/validate-reference.js`
Expected: `OK: 147 reference entries valid across 17 categories.`

- [ ] **Step 5: Commit**

```bash
git add data/reference-final.json scripts/validate-reference.js
git commit -m "feat: add reference calibration dataset for final-version pledges"
```

---

### Task 3: Content extraction & merge → `data/pledges.json`

This is the core content-curation task: reading both prose documents chapter by chapter
and producing the merged, atomic pledge dataset. It is judgment work, not deterministic
parsing — follow the rules below exactly, and use the validator to catch structural or
cross-reference mistakes.

**Files:**
- Create: `data/pledges.json`
- Create: `scripts/validate-pledges.js`

**Interfaces:**
- Consumes: `navrh.txt`, `final.txt` (Task 1), `data/reference-final.json` (Task 2)
- Produces: `data/pledges.json` — `Array<{id: string, text: string, category: string, priority: "vysoká"|"nízká", sources: Array<"navrh"|"final">, draftExtra: string|null, status: "splněno"|"nesplněno"}>`. Consumed by Task 4 (frontend rendering).

**The 17 categories, in document order** (identical in both `navrh.txt` and `final.txt`):
1. Finance a hospodaření státu
2. Vnitřní bezpečnost a veřejná správa
3. Obranná politika a Armáda České republiky
4. Zahraniční politika
5. Právo a spravedlnost
6. Hospodářství, průmysl a energetika
7. Doprava
8. Vzdělávání
9. Sociální politika a zaměstnanost
10. Zdravotnictví
11. Zemědělství
12. Životní prostředí
13. Kultura
14. Bydlení a regionální rozvoj
15. Sport, prevence a zdraví
16. Věda, výzkum a inovace
17. Digitalizace

**Extraction procedure (do this for each of the 17 categories):**

1. Read the chapter's prose in `final.txt` for this category, plus the same category's entries in `data/reference-final.json` (these already give you the correct atomic `text`/`priority` for everything that survived into the final version — reuse them verbatim rather than re-deriving wording or priority from scratch).
2. Read the same category's chapter prose in `navrh.txt`.
3. For each `data/reference-final.json` entry in this category, decide, by reading the matching `navrh.txt` chapter:
   - **Not addressed in navrh.txt at all** → `sources: ["final"]`, `draftExtra: null`.
   - **Addressed in navrh.txt with equivalent or less detail** → `sources: ["navrh", "final"]`, `draftExtra: null`.
   - **Addressed in navrh.txt with a concrete extra commitment, number, or qualifier that final.txt's wording dropped** (e.g. draft names a specific mechanism or figure that the final text no longer states) → `sources: ["navrh", "final"]`, `draftExtra` = a short quote/paraphrase (one sentence) of exactly what was dropped.
4. Separately, scan the `navrh.txt` chapter for any distinct commitment that has **no counterpart at all** among this category's final-version pledges (a topic entirely dropped between draft and final) → add a **new** pledge entry with `sources: ["navrh"]`, `draftExtra: null` (there is nothing "extra" beyond the pledge itself — it just never made it into the final version).
5. Assign `category` = the current chapter name (exact string from the list above, identical in both `text` fields' source pledge and this field).
6. Assign a stable `id`: lowercase ASCII, `<category-prefix>-<slug>`, e.g. `fin-eet2`, `vnitr-nukib`, `doprava-d1-d35`. Prefixes: `fin`, `vnitr`, `obr`, `zahr`, `prav`, `hosp`, `doprava`, `vzdel`, `soc`, `zdrav`, `zem`, `zivpr`, `kult`, `byd`, `sport`, `veda`, `dig`. Never reuse an `id` across entries.
7. Set `status: "nesplněno"` for every entry — nothing has been assessed as fulfilled yet; this field gets updated by hand later, outside this task.

- [ ] **Step 1: Write the validator**

Create `scripts/validate-pledges.js`:

```js
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
  if (!['splněno', 'nesplněno'].includes(p.status)) errors.push(`${where}: invalid status "${p.status}"`);
});

const refKey = e => `${e.text}||${e.category}`;
const refCounts = new Map();
reference.forEach(e => refCounts.set(refKey(e), (refCounts.get(refKey(e)) || 0) + 1));

const finalPledges = pledges.filter(p => Array.isArray(p.sources) && p.sources.includes('final'));
const pledgeCounts = new Map();
finalPledges.forEach(p => pledgeCounts.set(refKey(p), (pledgeCounts.get(refKey(p)) || 0) + 1));

for (const [k, count] of refCounts) {
  if (pledgeCounts.get(k) !== count) {
    errors.push(`final-sourced mismatch for "${k}": reference has ${count}, pledges has ${pledgeCounts.get(k) || 0}`);
  }
}
for (const [k, count] of pledgeCounts) {
  if (!refCounts.has(k)) {
    errors.push(`pledges has a final-sourced item not present in reference: "${k}"`);
  }
}

reference.forEach(refItem => {
  const match = finalPledges.find(p => p.text === refItem.text && p.category === refItem.category);
  if (match && match.priority !== refItem.priority) {
    errors.push(`priority mismatch for "${refItem.text}" (${refItem.category}): reference=${refItem.priority}, pledges=${match.priority}`);
  }
});

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
```

- [ ] **Step 2: Run validator, expect failure (file doesn't exist yet)**

Run: `node scripts/validate-pledges.js`
Expected: `Error: ENOENT ... data/pledges.json`

- [ ] **Step 3: Perform the extraction procedure and write `data/pledges.json`**

Follow the "Extraction procedure" above for all 17 categories, reading the full text of
`navrh.txt` and `final.txt` chapter by chapter (use the Read tool with offsets — each
file is under 2200 lines, readable in a handful of calls per chapter). Write the
resulting array to `data/pledges.json`.

- [ ] **Step 4: Run validator, expect success**

Run: `node scripts/validate-pledges.js`
Expected: `OK: <N> pledges valid.` with `Final-sourced: 147 (expected 147)` and no errors. `<N>` will be ≥ 147 (147 final-sourced entries plus however many draft-only entries were found in step 3).

- [ ] **Step 5: Commit**

```bash
git add data/pledges.json scripts/validate-pledges.js
git commit -m "feat: extract and merge pledges from draft and final programme statements"
```

---

### Task 4: Frontend — static site

**Files:**
- Create: `index.html`
- Create: `app.js`
- Create: `style.css`

**Interfaces:**
- Consumes: `data/pledges.json` (Task 3), fetched client-side at runtime
- Produces: a browsable static site with no further consumers in this plan

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Programové prohlášení vlády — sledování plnění</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<header>
  <h1>Programové prohlášení vlády České republiky</h1>
  <p class="subtitle">Sledování plnění bodů z návrhu (listopad 2025) a finální verze (leden 2026)</p>
  <div class="counter">
    <span id="counter-text">0 / 0 splněno</span>
    <span id="counter-pct">0 %</span>
  </div>
</header>

<section class="filters">
  <h2>Filtry</h2>
  <div class="filter-row">
    <div class="filter-group">
      <label for="filter-category">Kategorie</label>
      <select id="filter-category">
        <option value="all">Všechny kategorie</option>
      </select>
    </div>
    <div class="filter-group">
      <label for="filter-priority">Priorita</label>
      <select id="filter-priority">
        <option value="all">Všechny priority</option>
        <option value="vysoká">Vysoká důležitost</option>
        <option value="nízká">Nízká důležitost</option>
      </select>
    </div>
    <div class="filter-group">
      <label for="filter-status">Stav splnění</label>
      <select id="filter-status">
        <option value="all">Vše</option>
        <option value="splněno">Splněno</option>
        <option value="nesplněno">Nesplněno</option>
      </select>
    </div>
  </div>
</section>

<main id="pledge-list"></main>

<script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `app.js`**

```js
let pledges = [];
const filters = { category: 'all', priority: 'all', status: 'all' };

async function init() {
  const res = await fetch('data/pledges.json');
  pledges = await res.json();
  populateCategoryFilter();
  attachFilterHandlers();
  render();
}

function populateCategoryFilter() {
  const select = document.getElementById('filter-category');
  const categories = [...new Set(pledges.map(p => p.category))].sort((a, b) => a.localeCompare(b, 'cs'));
  for (const cat of categories) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  }
}

function attachFilterHandlers() {
  document.getElementById('filter-category').addEventListener('change', e => {
    filters.category = e.target.value;
    render();
  });
  document.getElementById('filter-priority').addEventListener('change', e => {
    filters.priority = e.target.value;
    render();
  });
  document.getElementById('filter-status').addEventListener('change', e => {
    filters.status = e.target.value;
    render();
  });
}

function matchesFilters(pledge) {
  if (filters.category !== 'all' && pledge.category !== filters.category) return false;
  if (filters.priority !== 'all' && pledge.priority !== filters.priority) return false;
  if (filters.status !== 'all' && pledge.status !== filters.status) return false;
  return true;
}

function render() {
  const list = document.getElementById('pledge-list');
  const visible = pledges.filter(matchesFilters);
  list.innerHTML = visible.map(renderCard).join('');

  const done = pledges.filter(p => p.status === 'splněno').length;
  const total = pledges.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById('counter-text').textContent = `${done} / ${total} splněno`;
  document.getElementById('counter-pct').textContent = `${pct} %`;
}

function renderCard(p) {
  const sourceBadges = p.sources
    .map(s => `<span class="badge badge-source badge-source-${s}">${s === 'navrh' ? 'Návrh' : 'Finální'}</span>`)
    .join('');
  const extra = p.draftExtra
    ? `<p class="pledge-extra">Z návrhu, nedostalo se do finální verze: „${escapeHtml(p.draftExtra)}“</p>`
    : '';
  const checked = p.status === 'splněno' ? 'checked' : '';
  return `
    <div class="pledge-card">
      <label class="pledge-row">
        <input type="checkbox" disabled ${checked}>
        <span class="pledge-text">${escapeHtml(p.text)}</span>
      </label>
      <div class="pledge-badges">
        <span class="badge badge-category">${escapeHtml(p.category)}</span>
        <span class="badge badge-priority badge-priority-${p.priority}">${p.priority === 'vysoká' ? 'Vysoká priorita' : 'Nízká priorita'}</span>
        ${sourceBadges}
      </div>
      ${extra}
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
```

- [ ] **Step 3: Create `style.css`**

```css
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
  --muted: #555555;
  --border: #e2e2e2;
  --badge-bg: #f0f0f0;
  --badge-priority-high-bg: #111111;
  --badge-priority-high-text: #ffffff;
  --badge-priority-low-bg: #eeeeee;
  --badge-priority-low-text: #333333;
  --badge-source-navrh-bg: #fde68a;
  --badge-source-navrh-text: #7c4a03;
  --badge-source-final-bg: #bfdbfe;
  --badge-source-final-text: #1e3a8a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111214;
    --text: #eaeaea;
    --muted: #a0a0a0;
    --border: #2a2a2e;
    --badge-bg: #23242a;
  }
}

* { box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}

header h1 { margin-bottom: 4px; font-size: 1.75rem; }
.subtitle { color: var(--muted); margin-top: 0; }

.counter {
  display: flex;
  gap: 12px;
  align-items: baseline;
  margin: 16px 0;
  font-weight: 600;
}
.counter #counter-pct { color: var(--muted); font-weight: 400; }

.filters {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}
.filters h2 { margin-top: 0; font-size: 1rem; }
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.filter-group { display: flex; flex-direction: column; gap: 4px; min-width: 200px; }
.filter-group label { font-size: 0.85rem; color: var(--muted); }
.filter-group select {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}

.pledge-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.pledge-row { display: flex; align-items: flex-start; gap: 10px; }
.pledge-text { font-size: 0.95rem; }
.pledge-badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0 26px; }
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: var(--badge-bg);
}
.badge-priority-vysoká { background: var(--badge-priority-high-bg); color: var(--badge-priority-high-text); }
.badge-priority-nízká { background: var(--badge-priority-low-bg); color: var(--badge-priority-low-text); }
.badge-source-navrh { background: var(--badge-source-navrh-bg); color: var(--badge-source-navrh-text); }
.badge-source-final { background: var(--badge-source-final-bg); color: var(--badge-source-final-text); }
.pledge-extra {
  margin: 8px 0 0 26px;
  font-size: 0.85rem;
  font-style: italic;
  color: var(--muted);
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html app.js style.css
git commit -m "feat: build static frontend for pledge tracker"
```

---

### Task 5: Local dev server + smoke test

**Files:**
- Create: `serve.js`

**Interfaces:**
- Consumes: `index.html`, `app.js`, `style.css`, `data/pledges.json` (Task 3 & 4)
- Produces: a running local HTTP server for manual browser review (the plan's final deliverable)

- [ ] **Step 1: Create `serve.js`**

```js
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = process.env.PORT || 8787;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

http.createServer((req, res) => {
  const filePath = path.join(root, req.url === '/' ? '/index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
```

- [ ] **Step 2: Start the server in the background**

Run: `node serve.js &` (or run in a background-capable shell/task) and confirm the
"Server running at http://localhost:8787/" log line appears.

- [ ] **Step 3: Smoke-test the three served files**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/data/pledges.json
```
Expected: both print `200`.

- [ ] **Step 4: Hand off for manual review**

Report the URL (`http://localhost:8787/`) so it can be opened in a browser. Manually
verify (per spec): each filter works alone and combined with the others, the counter
matches the number of `status: "splněno"` entries, and badge combinations (návrh/finál/
both + `draftExtra` note) render correctly.

- [ ] **Step 5: Commit**

```bash
git add serve.js
git commit -m "chore: add local static file server for manual review"
```
