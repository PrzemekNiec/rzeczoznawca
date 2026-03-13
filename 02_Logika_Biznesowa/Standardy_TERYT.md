# Standardy Identyfikacji Nieruchomości

## 1. TERYT (Identyfikator Działki)
* **Format urzędowy**: `WWPPGG_R.XXXX.NR` (np. `126101_1.0001.125/2`).
* **Walidacja**: Ciąg 14 cyfr przed ukośnikiem. Zera wiodące (np. `02`) są krytyczne.
* **Składowe**: Województwo (WW), Powiat (PP), Gmina (GG), Typ (_R), Obręb (XXXX), Numer (NR).

## 2. Księga Wieczysta (KW)
* **Format**: `XXXX/NNNNNNNN/K`.
* **Regex**: `^[A-Z]{2}[0-9A-Z]{2}/\d{8}/\d$`.

## 3. Adres (API GUGiK ULDK)
* **Endpoint**: `https://uldk.gugik.gov.pl/res/uldk/gugik.php`.
* **Logika**: Użytkownik wpisuje adres -> Aplikacja odpytuje GUGiK o TERYT -> TERYT uruchamia Multi-Link.

## 4. Zasady Implementacji (TerytService.ts)
* **IF input zawiera 14 cyfr bez separatorów** -> Automatycznie parsuj i dodaj kropki w odpowiednich miejscach.
* **IF input jest linkiem z Geoportalu** -> Wyekstrahuj parametr `identifyParcel` za pomocą Regex.
* **Walidacja**: Każdy numer musi zostać przetestowany pod kątem przypadków z `Test_Cases.md`.

## 5. Obsługa Błędów
* W przypadku niepełnego numeru (np. brak obrębu), system musi zasugerować dopytanie użytkownika lub użycie danych z historii.