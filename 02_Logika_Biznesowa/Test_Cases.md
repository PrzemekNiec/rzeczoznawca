# Zestaw Testowy dla Parsera TERYT

Poniższe przypadki testowe służą do walidacji poprawności działania modułu `TerytResolver`. System musi poprawnie zidentyfikować składowe dla każdego z formatów.

|Lp.|Wejście (Input)|Typ|Oczekiwany Wynik (Rozbicie)|
|---|---|---|---|
|**1**|`126101_1.0001.125/2`|Pełny TERYT|Woj: 12, Gmina: 6101 (Kraków), Typ: 1, Obręb: 0001, Działka: 125/2|
|**2**|`126101100011252`|Ciąg cyfr|Woj: 12, Gmina: 6101, Obręb: 0001, Działka: 1252 (obsługa braku "/")|
|**3**|`026401_1.0022.4/15`|TERYT z zerem|Woj: 02 (Dolnośląskie), Gmina: 6401 (Wrocław), Obręb: 0022, Działka: 4/15|
|**4**|`125/2`|Tylko numer|Działka: 125/2 (Wymaga dopytania o gminę/obręb lub użycia ostatnio wybranej)|
|**5**|`obręb 1 dz. 125/2`|Tekstowy|Wyekstrahowanie: Obręb 0001, Działka 125/2|
|**6**|`https://mapy.geoportal.gov.pl/...&identifyParcel=126101_1.0001.125/2`|Link|Wyekstrahowanie czystego TERYT z parametru URL|
### Warunki Brzegowe (Edge Cases):

- **Błędna długość:** Ciąg mający np. 8 cyfr powinien zgłosić błąd: "Niekompletny numer TERYT".
    
- **Znaki specjalne:** Ignorowanie spacji przed i po numerze.
    
- **Wielkość liter:** TERYT z małym "p" lub dużym "P" (jeśli dotyczy) traktowany tak samo.