# SOP: Backup i Synchronizacja Danych v1.1

## 1. Synchronizacja Sejfu Obsidian
* **Narzędzie**: Google Drive for Desktop.
* **Wymagana Konfiguracja**: 
    * Tryb: **"Powielaj pliki" (Mirror files)**.
    * Lokalizacja: `C:\Users\Przemek\Mój dysk\rzeczoznawca` (ścieżka lokalna).
* **Cel**: Zapewnienie fizycznej dostępności plików `.md` na dysku twardym. Pozwala to na błyskawiczny odczyt bazy linków przez Dashboard bez opóźnień sieciowych.

## 2. Przepływ Danych (Data Flow)
* **Obsidian -> Aplikacja**: Dashboard działa w trybie **Read-Only** w stosunku do plików Markdown. Nie modyfikuje struktury sejfu.
* **Aplikacja -> LocalStorage**: Bieżąca historia wyszukiwań i ustawienia Kasi są zapisywane wyłącznie w pamięci przeglądarki.
* **Backup Ręczny**: 
    * Mechanizm: Przycisk "Eksportuj Bazę" w Dashboardzie.
    * Format: `dashboard_backup.json`.
    * Miejsce zapisu: `04_Development/Backups/` w sejfie Obsidian.
    * Cel: Zabezpieczenie historii spraw na wypadek czyszczenia cache przeglądarki.

## 3. Środowiska i Bezpieczeństwo
* **Dev**: Przemysław pracuje na lokalnej kopii/gałęzi.
* **Prod**: Kasia korzysta z wersji zhostowanej na Firebase, która łączy się z jej lokalnym folderem `rzeczoznawca`.
* **Zasada No-Cloud**: Żadne dane nieruchomości nie są wysyłane na serwery zewnętrzne (poza darmowym API GUGiK do geokodowania adresu).