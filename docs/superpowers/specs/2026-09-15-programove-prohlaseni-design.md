# Sledovací web programového prohlášení vlády — návrh (design)

Datum: 2026-09-15

## Cíl

Replikovat a rozšířit referenční web
https://macaly-fq8pakzbd2ljpsyuz63v9gbv.macaly.app/ — checklist sledující plnění
bodů programového prohlášení vlády ČR. Rozšíření oproti referenci: rozlišit u
každého bodu, jestli pochází z návrhu (listopad 2025), z finální verze (leden
2026), nebo z obou, a u bodů, které se z návrhu nedostaly beze změny do finální
verze, zobrazit text, který finální verze vynechala.

## Zdrojová data

- `Navrh_programoveho_prohlaseni_vlady_Ceske_republiky_listopad_2025.pdf` —
  návrh, listopad 2025. Extrahováno do `navrh.txt` (`pdftotext -layout -enc UTF-8`).
- `programove-prohlaseni-vlady.pdf` — finální verze, leden 2026. Extrahováno do
  `final.txt` stejným způsobem.

**Zjištění průzkumem:** Oba dokumenty jsou souvislá próza (kapitola → nadpisy
podsekcí → odstavce), **žádný z nich neobsahuje hotový seznam atomických bodů**
ani explicitní označení priority. Referenční web tedy musel vzniknout
interpretační destilací prózy na atomické sliby s přiřazenou kategorií (=
název kapitoly, shodný v obou dokumentech) a prioritou. Totéž musíme udělat
pro naše zpracování — nejde o strojový/heuristický parsing, ale o obsahovou
LLM-asistovanou extrakci.

Referenční web už jednou zpracoval finální verzi do 147 položek — tato data
(text bodu, kategorie, priorita) jsme si stáhli průzkumem webu a použijeme je
jako kalibrační referenci při extrakci finální verze, aby naše kategorizace
a priority co nejvíc odpovídaly tomu, jak to udělali oni.

## Proces extrakce a párování (jednorázová redakční práce)

Kapitolu po kapitole (18 kapitol, shodné v `navrh.txt` i `final.txt`):

1. Vzít prózu dané kapitoly z obou dokumentů.
2. Rozsekat na atomické sliby (krátké věty ve stylu referenčního webu).
3. Napárovat sliby návrh↔finál podle významu (ne doslovného textu — formulace
   se mezi verzemi liší).
4. Přiřadit každému bodu `sources` (`navrh`, `final`, nebo oba) a v případě, že
   finální verze vynechala část, co byla v návrhu, zaznamenat tu vynechanou
   část do `draftExtra`.
5. Přiřadit `priority` — u bodů co existují ve finální verzi podle stažených
   referenčních dat, u bodů jen v návrhu podle důrazu v textu (např. zařazení
   mezi "Hlavní strategické směry" v preambuli = vysoká priorita).

Bez průběžných kontrolních bodů po kapitolách — hotový výsledek (celý
`data/pledges.json`) se ukáže najednou přes spuštěný lokální web.

## Datový model — `data/pledges.json`

Pole objektů, jeden objekt = jeden atomický slib:

```json
{
  "id": "fin-eet2",
  "text": "Zavést EET 2.0 od roku 2027 s moderním systémem evidence tržeb",
  "category": "Finance a hospodaření státu",
  "priority": "vysoká",
  "sources": ["navrh", "final"],
  "draftExtra": null,
  "status": "nesplněno"
}
```

- `id` — stabilní slug (kvůli bezpečné ruční editaci `status` do budoucna bez
  rizika, že se při přegenerování dat rozjedou identifikátory)
- `text` — finální formulace bodu (pokud existuje ve finále, použije se její
  znění; pokud je jen v návrhu, použije se znění návrhu)
- `category` — název kapitoly (shodný mezi dokumenty)
- `priority` — `"vysoká" | "nízká"`
- `sources` — `["navrh"]`, `["final"]`, nebo `["navrh","final"]` — pokrývá
  pravidlo "v obou = 2 štítky" / "jen návrh" / "jen finál"
- `draftExtra` — text z návrhu, který se nedostal do finální verze (vyplněno
  jen když je relevantní, jinak `null`)
- `status` — `"splněno" | "nesplněno"` — **skutečná redakční data**, ne
  klientský toggle. Uživatel a asistent ji budou průběžně ručně udržovat a
  commitovat do repa, jak se sliby v realitě plní nebo neplní. Web tento stav
  jen zobrazuje, nenabízí veřejné odškrtávání.

## Frontend — statický web, bez frameworku

```
prohlaseni/
├── data/pledges.json
├── index.html
├── app.js
├── style.css
└── docs/superpowers/specs/...
```

- Žádný build krok. Spouští se přes jednoduchý statický server
  (`python -m http.server` / `npx serve`), ne přímo přes `file://` (kvůli
  `fetch` na lokální JSON).
- `app.js`: `fetch('data/pledges.json')` → render karet (text, badge kategorie,
  badge priority, badge(y) původu Návrh/Finální, případně `draftExtra` text) +
  počítadlo `X / N splněno (Y %)` počítané ze `status`.
- Filtry (kategorie, priorita, stav splnění) — čistě klientská logika nad již
  načteným polem, žádné další requesty.
- Vzhled vychází z referenčního webu (karty se štítky), badge pro
  Návrh/Finální přidáme jako další štítek(y) vedle kategorie a priority.

## Testování

Ruční ověření v prohlížeči po spuštění lokálního serveru: filtry fungují
správně samostatně i v kombinaci, počítadlo odpovídá počtu `status: "splněno"`
položek, badge kombinace (návrh/finál/oba + extra text) se zobrazují správně.
Vzhledem k rozsahu (statická stránka, žádná byznys logika mimo filtrování a
zobrazení) nejsou potřeba automatizované testy.

## Mimo rozsah (zatím)

- Nasazení na veřejný hosting — řeší se až později, teď jen lokální spuštění.
- Jakýkoli backend / databáze — stav `status` žije jen v `data/pledges.json`
  v repu.
- Automatické strojové přeparsování při změně zdrojových PDF — extrakce je
  jednorázová redakční práce, ne opakovatelný pipeline skript.
