To świetny wybór architektoniczny – tzw. **Hybrid Cloud**. Łączysz prostotę logowania Google (Firebase) z ogromną i tanią przestrzenią na dokumenty (Cloudflare R2). To podejście, które stosują profesjonalne SaaS-y, aby nie płacić "podatku od sukcesu", gdy ich baza plików rośnie.

Oto kompletny plan bitwy, który zrealizujemy z Claude Opus w końcowej fazie projektu:

---

## 1. Architektura Systemu (High-Level)

|Komponent|Technologia|Rola w Dashboardzie|
|---|---|---|
|**Tożsamość**|Firebase Auth|Logowanie Google, zarządzanie sesją użytkownika.|
|**Baza Metadanych**|Firestore|Przechowywanie historii wyszukiwań, parametrów działek, notatek i linków do plików.|
|**Magazyn Plików**|Cloudflare R2|Przechowywanie operatów (PDF), zdjęć i plików Word (.docx).|
|**Bezpieczeństwo**|Pre-signed URLs|Generowanie tymczasowych, bezpiecznych linków do pobierania plików z R2.|

Eksportuj do Arkuszy

---

## 2. Etapy Implementacji

### Faza 1: Konfiguracja Infrastruktury

1. **Firebase:** Utworzenie projektu, włączenie Firestore w trybie produkcyjnym oraz aktywacja Google Auth.
    
2. **Cloudflare R2:** Utworzenie "Bucketa" (wiadra) o nazwie np. `dashboard-rzeczoznawcy-uploads`.
    
3. **CORS:** Skonfigurowanie zasad dostępu w Cloudflare, aby Twoja domena PWA mogła wysyłać pliki bezpośrednio do R2 (bez pośrednictwa serwera).
    

### Faza 2: Model Danych (Firestore Schema)

Zaprojektujemy bazę tak, aby każdy rekord był przypisany do Twojego ID (`uid`).

- **Kolekcja `users`:** Dane profilowe, ustawienia (np. domyślne stawki).
    
- **Kolekcja `history`:**
    
    - `teryt`: string (7-cyfrowy)
        
    - `label`: string (Nazwa własna/Kowalski)
        
    - `coords`: { lat, lng }
        
    - `files`: array [ { name, type, r2_key, timestamp } ]
        
    - `notes`: string
        

### Faza 3: Integracja z UI (Sidebar & Main Content)

1. **Auth Guard:** Opakowanie aplikacji w `AuthProvider`. Jeśli nie jesteś zalogowany -> widzisz tylko elegancki Landing Page.
    
2. **History Listener:** Wyświetlanie w Sidebarze rekordów z Firestore pobieranych w czasie rzeczywistym (`onSnapshot`).
    
3. **Search Logic:** Przy każdym nowym wyszukiwaniu (ULDK/Adres), system najpierw sprawdza, czy taki TERYT już istnieje w Twojej historii.
    

### Faza 4: Moduł Zarządzania Plikami (Uploader)

To najbardziej techniczna część dla Opusa:

1. **Direct Upload:** Implementacja wysyłania plików bezpośrednio z przeglądarki do Cloudflare R2 przy użyciu protokołu S3.
    
2. **Presigned URLs:** Implementacja logiki, która generuje link do pliku ważny np. tylko przez 15 minut (dla maksymalnego bezpieczeństwa Twoich operatów).
    

---

## 3. Dlaczego to zadziała (Korzyści biznesowe)

- **Darmowość:** Do ok. **1000 operatów** (10 GB) nie zapłacisz ani grosza za utrzymanie systemu.
    
- **Prywatność:** Dane Twoich klientów nie leżą na publicznym serwerze – dostęp do nich masz tylko Ty po zalogowaniu swoim kontem Google.
    
- **Szybkość:** Cloudflare ma jedne z najszybszych serwerów w Polsce, więc PDF-y będą się otwierać błyskawicznie.