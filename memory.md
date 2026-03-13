# Dashboard Rzeczoznawcy — Memory / Postęp Prac

## Project Overview
- Desktopowe centrum dowodzenia dla rzeczoznawcy majątkowego (Kasia)
- Developer: Przemysław
- Stack: Vite + React 19 + TypeScript + Tailwind CSS v4
- Architektura: Zero-backend, localStorage/IndexedDB, Firebase Hosting (Spark)
- Motyw: Dark mode, estetyka Obsidian (paleta Catppuccin Mocha)

## Key Paths
- Project root: `dashboard-app/`
- Docs: `04_Development/`, `02_Logika_Biznesowa/`, `03_Procedury_Operacyjne (SOP)/`
- Baza linków: `01_Bazy_Danych/Linkownik_Gminny.md`
- Ikony PWA: `logo/` → skopiowane do `dashboard-app/public/icons/`

## Dev Server
- Port: **5180** (5173 i 5174 zajęte przez kalkulator hipoteczny v2)
- Start: `npx vite --host --port 5180`

## Struktura `/src`
- `services/` — logika (PropertyResolver, LinkGenerator)
- `hooks/` — stan (historia, file access)
- `components/` — UI
- `config/links.ts` — mapowania linków (krajowe, gminne, portale miast, skróty klaw.)
- `types/property.ts` — TerytData, KWData, ResolverResult, HistoryEntry
- `lib/utils.ts` — helper `cn()` (clsx + tailwind-merge)

## Completed
1. **Inicjalizacja projektu** — Vite + React 19 + TS, Tailwind v4, npm deps
2. **Struktura katalogów** — services/, hooks/, components/, config/, types/, lib/
3. **Ikony PWA** — skopiowane, manifest gotowy
4. **Config** — `links.ts` (NATIONAL_LINKS, MUNICIPAL_SYSTEMS, CITY_PORTALS, KEYBOARD_SHORTCUTS)
5. **Types** — `property.ts` (TerytData, KWData, ResolverResult, HistoryEntry)
6. **PropertyResolver.ts** — DONE, 32/32 testów PASS
   - `cleanInput()` — sanityzacja (zero-width chars, spacje)
   - KW → regex `^[A-Z]{2}[0-9A-Z]{2}/\d{8}/\d$`
   - Full TERYT → `WWPPGG_R.XXXX.NR`
   - Raw digits → 11+ cyfr, auto-formatowanie
   - Geoportal link → ekstrakcja `identifyParcel=`
   - Text parcel → "obręb X dz. Y"
   - Partial → sam numer działki + hint
   - Address (async) → GUGiK geocoding → XY → ULDK `GetParcelByXY`

## API Discovery
- **ULDK nie ma `GetParcelByAddress`** — wymagany dwuetapowy flow
- Geocoding: `services.gugik.gov.pl/uug/?request=GetAddress&address=...`
- Działka po XY: `uldk.gugik.gov.pl/?request=GetParcelByXY&xy=X,Y&result=teryt`
- ULDK format: success `0\n<teryt>`, error `-1\n...`

## TODO
- [ ] SmartSearch component (UI dla PropertyResolver)
- [ ] Multi-Link Launcher (Alt+O)
- [ ] Historia wyszukiwań (localStorage + hook)
- [ ] LinkGenerator service
- [ ] Layout (sidebar + panel główny)

## Skróty Klawiszowe
- Enter: SmartSearch, Alt+O: Multi-Open, Alt+C: Copy TERYT, Alt+H: Focus Search, Esc: Clear

## Konwencje
- Antigravity: krótkie kroki, logika warunkowa, optymalizacja pod Flash
- Modularność: każda integracja to osobny serwis
- STOP = natychmiastowe przerwanie
