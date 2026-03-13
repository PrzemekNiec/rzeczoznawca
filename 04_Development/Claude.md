# Instrukcje Programistyczne - Project: Rzeczoznawca Dashboard

## 🛠️ Styl Pracy (Antigravity Environment)
* **Krótkie Kroki**: Rozbijaj każdą instrukcję na bardzo krótkie, punktowe i logiczne etapy.
* **Logika Warunkowa**: Kładź maksymalny nacisk na precyzyjne instrukcje typu „jeśli X, to Y”.
* **Optymalizacja**: Kod musi być lekki, zoptymalizowany pod kątem wydajności modeli Flash.
* **Komenda STOP**: Jeśli padnie komenda STOP, natychmiast przerwij zadanie i czekaj na nowe instrukcje.

## 📦 Inicjalizacja Środowiska (Pakiety npm)
* Przy starcie zainstaluj: `lucide-react`, `react-hotkeys-hook`, `zod`, `clsx`, `tailwind-merge`, `framer-motion`, `date-fns`.

## 🏗️ Architektura i Integracja
* **Zero-Backend**: Wszystkie dane parsujemy wyłącznie w przeglądarce.
* **Obsidian**: Przy generowaniu linków zawsze sprawdzaj tabelę w `01_Bazy_Danych/Linkownik_Gminny.md`.
* **PropertyResolver**: 
    - Jeśli wejście to KW -> przygotuj link do EKW.
    - Jeśli wejście to adres -> fetch do API GUGiK (ULDK).
    - Jeśli wejście to 14 cyfr -> parsuj jako TERYT.
* **Modułowość**: Każda integracja (Geoportal, KW, GUNB) musi być osobnym serwisem/funkcją.

## 🎨 Wytyczne UI/UX (Desktop First)
* **Stylistyka**: Clean & Dark Mode, wizualnie spójny z estetyką aplikacji Obsidian.
* **Multi-Open**: Implementuj `window.open()` wyzwalane pojedynczym kliknięciem lub skrótem klawiszowym `Alt + O`.