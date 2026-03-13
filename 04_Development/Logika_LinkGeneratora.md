# Wytyczne dla LinkGenerator.ts

## 1. Cel
Konwersja sformatowanego numeru TERYT na zestaw aktywnych linków do systemów zewnętrznych.

## 2. Logika Mapowania
* **Krok 1**: Odczytaj bazę z `01_Bazy_Danych/Linkownik_Gminny.md`.
* **Krok 2**: Wyciągnij kod Gminy z TERYT (pierwsze 6 cyfr).
* **Krok 3**: Dopasuj kod do nazwy gminy w tabeli (Claude musi mieć mapę TERYT -> Nazwa Gminy).
* **Krok 4**: Zidentyfikuj system (e-mapa / iMap / Custom).

## 3. Formaty linków
* **E-mapa**: `${BaseURL}?identifyParcel=${TERYT}`
* **iMap (Geoportal2)**: `${BaseURL}/map/www/mapa.php?id_dzialki=${TERYT}`
* **Geoportal Krajowy**: `https://mapy.geoportal.gov.pl/imap/Imgp_2.html?identifyParcel=${TERYT}`
* **GUNB**: `https://wyszukiwarka.gunb.gov.pl/wyniki/?dzialka=${TERYT}`

## 4. Wyjątki (Custom)
* **Kraków (MSIP)**: Jeśli TERYT zaczyna się od `1261`, linkuj do: `https://msip.krakow.pl/?search=${TERYT}`
* **Katowice**: Jeśli TERYT zaczyna się od `2469`, linkuj do: `https://emapa.katowice.eu/msip?identifyParcel=${TERYT}`

**5. Format TERYT w URL**

- **Zasada**: Większość systemów (e-mapa, iMap, ULDK) nie akceptuje kropek ani podkreślników.
    
- **Akcja**: Przed wstrzyknięciem TERYT do URL, wykonaj: `teryt.replace(/\D/g, '')` (zostaw same cyfry).
    

**6. Link do EKW (Księgi Wieczyste)**

- **Format**: `https://przegladarka-ekw.ms.gov.pl/e-sad/ekw/wyszukiwanieKsiegi?komunikat=PROSZE_PODAC_KOD_SADU&kodSadu=${kodSadu}&numerKsiegi=${numer}&cyfraKontrolna=${cyfraKontrolna}&uzytkownikNiezalogowany=true`
    
- **Logika**: Ten link generujemy tylko, gdy `ResolverResult` zawiera obiekt `kw`.
    

**7. Fallback (Gdy gminy nie ma w Linkowniku)**

- **JEŚLI** kod gminy z TERYT nie pasuje do żadnego wiersza w `Linkownik_Gminny.md` -> **TO** wyświetl tylko linki ogólnopolskie (Geoportal Krajowy, GUNB, EKW) oraz przycisk „Szukaj w Google: [Nazwa Gminy] Geoportal”.