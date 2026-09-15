# Programové prohlášení vlády — sledovací web (zadání)

## Cíl

Replikovat a rozšířit web:
https://macaly-fq8pakzbd2ljpsyuz63v9gbv.macaly.app/

Jde o web sledující plnění bodů programového prohlášení vlády ČR (listopad 2025) —
seznam bodů s checkboxem "splněno", štítkem kategorie a štítkem priority, filtrací
a průběžným počítadlem "X / 147 splněno (Y %)".

## Zdrojová data

Máme 2 PDF:

1. `Navrh_programoveho_prohlaseni_vlady_Ceske_republiky_listopad_2025.pdf` — **návrh**
2. `programove-prohlaseni-vlady.pdf` — **finální verze**

Referenční web výše je aktuálně postavený jen z finální verze (147 bodů, bez rozlišení
původu). Naším úkolem je zpracovat **oba** dokumenty a spojit je do jednoho datasetu.

## Pravidla sloučení bodů

Pro každé téma/bod porovnáme návrh a finální verzi:

- **je v návrhu i ve finále** → bod dostane **2 štítky** (Návrh + Finální)
- **je jen v návrhu, finále navíc obsahuje text, který v návrhu nebyl** → štítek Návrh +
  zobrazit extra text, který se do finální verze nedostal
- **je jen ve finále** → jen štítek Finální

(Detailní algoritmus párování bodů mezi dokumenty — podle čeho poznáme, že jde o "stejné"
téma v návrhu i finále — je potřeba doladit při implementaci, texty se mezi verzemi mohou
lišit formulací.)

## Struktura referenčního webu (zjištěno průzkumem)

- Nadpis + podnadpis
- Počítadlo: `0 / 147 splněno`, `0 %`
- Filtry (3 dropdowny):
  - **Kategorie** — cca 18 kategorií (Finance a hospodaření státu, Vnitřní bezpečnost
    a veřejná správa, Obranná politika a Armáda ČR, Zahraniční politika, Právo
    a spravedlnost, Hospodářství/průmysl/energetika, Doprava, Vzdělávání, Sociální
    politika a zaměstnanost, Zdravotnictví, Zemědělství, Životní prostředí, Kultura,
    Bydlení a regionální rozvoj, Sport/prevence/zdraví, Věda/výzkum/inovace,
    Digitalizace, ...)
  - **Priorita** — Vysoká důležitost / Nízká důležitost
  - **Stav splnění** — Vše / Splněno / Nesplněno
- Seznam bodů, každý s: checkboxem, textem bodu, štítkem kategorie, štítkem priority

V naší verzi přibude ke každému bodu ještě štítek/štítky původu (Návrh/Finální) a
volitelně extra text pro body, které se z návrhu nedostaly do finální verze beze změny.

## Otevřené otázky pro implementaci

- Jak automaticky napárovat body mezi návrhem a finální verzí (text se liší formulací) —
  ruční mapování, nebo heuristika/LLM porovnání?
- Perzistence stavu "splněno" (jen localStorage v prohlížeči, nebo backend/DB)?
- Technologický stack webu (viz referenční Macaly app — pravděpodobně React/Next.js).

## Zdroje

- Návrh: `Navrh_programoveho_prohlaseni_vlady_Ceske_republiky_listopad_2025.pdf`
- Finální verze: `programove-prohlaseni-vlady.pdf`
- Reference (UI/UX i data pro finální verzi): https://macaly-fq8pakzbd2ljpsyuz63v9gbv.macaly.app/
