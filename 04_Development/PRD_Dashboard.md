# Product Requirements Document (PRD) - Dashboard Rzeczoznawcy v1.4

## 1. Cel Produktu i Kontekst
* Stworzenie desktopowego „centrum dowodzenia” dla rzeczoznawcy majątkowego (Kasi).
* Narzędzie ma automatyzować agregację danych z rozproszonych źródeł na podstawie adresu, numeru działki (TERYT) lub numeru KW.

## 2. Główne Funkcjonalności (Unified Search)
* **Smart Resolver**: Jedno pole wyszukiwania obsługujące:
    * **Adres**: Automatyczna zamiana na TERYT przez API ULDK GUGiK.
    * **TERYT**: Obsługa pełnych kodów, surowych 14 cyfr oraz linków z Geoportalu.
    * **KW**: Walidacja formatu i bezpośredni link do EKW.
* **Multi-Link Launcher**: Przycisk/skrót (`Alt + O`) otwierający zestaw kart (Mapy Gminne, KW, GUNB, Geoportal).
* **Teryt Resolver**: Silnik rozbijający kod na jednostki (województwo, gmina, obręb).
* **Historia Wyszukiwań**: Lokalna lista spraw z możliwością filtrowania i eksportu do JSON.

## 3. User Flow (Desktop-First)
* **Krok 1**: Wklejenie danych (Adres/TERYT/KW) do Smart Search.
* **Krok 2**: Natychmiastowa walidacja i konwersja (np. Adres -> TERYT) z podglądem jednostki.
* **Krok 3**: Aktywacja Multi-Link (Alt + O) i praca na wielu otwartych kartach zewnętrznych.

## 4. Architektura i Stos Technologiczny
* **Frontend**: React + Vite (zoptymalizowane pod modele Flash).
* **Stylizacja**: Tailwind CSS + Shadcn/UI (Dark Mode Obsidian).
* **Storage**: Wyłącznie `localStorage` lub `IndexedDB` (Zero-backend).
* **📂 Struktura Katalogów**:
    * `/src/services/` – „Mózg” (PropertyResolver, LinkGenerator).
    * `/src/hooks/` – Stan (Historia, File Access).
    * `/src/components/` – UI (Shadcn).
    * `/src/config/` – Mapowanie linków z Obsidiana.

## 5. Wytyczne UI/UX (Power User)
* **High Density**: Maksymalne wykorzystanie szerokich ekranów (sidebar + panel główny).
* **Skróty Klawiszowe**: Pełna obsługa bez myszki (Enter, Alt+O, Esc).
* **Quick Copy**: Przyciski kopiowania czystych danych obok każdego wyniku.

## 6. Zasady Modularności ("Klocki")
* **Logic-First**: Każda funkcja obliczeniowa w osobnym module w `/src/services`.
* **Testowalność**: Każdy klocek logiczny musi przechodzić testy z pliku `Test_Cases.md`.

## 7. Bezpieczeństwo i Prywatność
* **Lokalne przetwarzanie**: Dane nie opuszczają przeglądarki użytkownika.
* **Transparentność**: Informowanie o konieczności odblokowania pop-upów.

## 8. Deployment i Środowiska
* **Hosting**: Firebase Hosting (Darmowy plan Spark).
* **Obsidian Sync**: Aplikacja czyta konfigurację z plików Markdown w sejfie Kasi na Dysku Google.
## 9. Layout Dashboardu (Widok)

* **Sidebar (20%)**: 
    * Lista "Ostatnie Sprawy".
    * Każdy element: `Adres | Data`.
    * Przycisk "Wyczyść historię".
* **Panel Główny (80%)**:
    * **Góra**: Wielki Search Bar (Unified Search) z ikoną lupy.
    * **Środek**: "Karta Wyniku" (pojawia się po wyszukaniu).
        * Lewa strona karty: Dane TERYT (rozbite na Województwo, Powiat, Gminę, Obręb).
        * Prawa strona karty: Grid dużych przycisków z ikonami (Geoportal, KW, GUNB, Mapa Lokalna).
    * **Dół**: Pasek statusu z informacją o skrótach klawiszowych (np. `Alt+O: Otwórz wszystko`).