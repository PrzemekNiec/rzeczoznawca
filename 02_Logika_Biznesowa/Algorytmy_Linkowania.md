# Algorytmy Generowania Linków Zewnętrznych

## 1. Rejestry Główne (Zawsze otwierane)
* **Geoportal Krajowy**: `https://mapy.geoportal.gov.pl/imap/Imgp_2.html?identifyParcel=${TERYT}`
* **GUNB (Pozwolenia)**: `https://wyszukiwarka.gunb.gov.pl/wyniki/?dzialka=${TERYT}`
* **EKW (Księgi)**: `https://ekw.ms.gov.pl/e-sad/ekw/wyszukiwanieKsiegi` (jeśli podano KW).

## 2. Systemy Gminne (Mapowanie z Linkownik_Gminny.md)
* **E-mapa**: `https://${gmina}.e-mapa.net?identifyParcel=${TERYT}`
* **iMap (Geoportal2)**: `https://${gmina}.geoportal2.pl/map/www/mapa.php?id_dzialki=${TERYT}`

## 3. Launcher (Skrót Klawiszowy)
* **Akcja**: Jednoczesne otwarcie wszystkich kart dla zidentyfikowanego TERYT.
* **Bezpieczeństwo**: Wyświetlenie instrukcji odblokowania pop-upów przy pierwszej próbie.