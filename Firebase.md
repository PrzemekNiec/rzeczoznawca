## Checklist: Konfiguracja Firebase (Krok po Kroku)

Wykonaj te kroki przed środą, aby środowisko było gotowe na przyjęcie kodu od Claude Code.

### Krok 1: Utworzenie projektu

1. Wejdź na [console.firebase.google.com](https://console.firebase.google.com/) logując się na swoje konto Google Workspace.
    
2. Kliknij **"Add project"** i nazwij go (np. `rzeczoznawca-dashboard`).
    
3. Wyłącz Google Analytics (nie jest potrzebne w tym narzędziu), aby uprościć konfigurację.
    

### Krok 2: Rejestracja aplikacji Web

1. W panelu głównym kliknij ikonę **`</>` (Web)**.
    
2. Nadaj aplikacji pseudonim (np. `Dashboard`).
    
3. Zaznacz opcję **"Also set up Firebase Hosting for this app"**.
    

### Krok 3: Przygotowanie lokalne (W terminalu Antigravity)

W środę, zanim Claude zacznie pisać kod, upewnij się, że masz zainstalowane narzędzia Firebase:

Bash

```
npm install -g firebase-tools
firebase login
firebase init hosting
```

_Podczas `firebase init`: wybierz swój projekt, ustaw folder publiczny na `dist` (bo używamy Vite) i skonfiguruj jako "Single Page App"._

### Krok 4: Domena (Opcjonalnie)

1. W sekcji **Hosting** możesz kliknąć **"Add custom domain"**.
    
2. Wpisz np. `narzedzia.hipoteki.eu`.
    
3. Firebase poda Ci rekordy TXT/A, które musisz dodać w panelu zarządzania domeną `hipoteki.eu`.
    

---

### O czym pamiętać do środy?

- Upewnij się, że na komputerze Kasi jest zainstalowany **Google Drive for Desktop**, a sejf Obsidian znajduje się w folderze synchronizowanym.
    
- Wszystkie pliki `.md`, które przygotowaliśmy, powinny znaleźć się w odpowiednich folderach w sejfie.