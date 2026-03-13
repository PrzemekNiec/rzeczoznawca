import requests
import json
import os

def get_precincts(teryt_gmina):
    # API GUGiK (ULDK) - pobieranie obrębów dla gminy
    # UWAGA: ULDK zazwyczaj używa 7 cyfr BEZ podkreślnika
    clean_id = teryt_gmina.replace("_", "")
    url = f"https://uldk.gugik.gov.pl/?request=GetRegion&id={clean_id}&result=teryt,nazwa"
    try:
        print(f"  Fetching: {url}")
        response = requests.get(url)
        print(f"  Response Code: {response.status_code}")
        print(f"  Raw Response (first 100 chars): {response.text[:100]}")
        if response.status_code == 200:
            lines = response.text.strip().split('\n')
            precincts = []
            for line in lines:
                if ';' in line:
                    full_id, name = line.split(';')
                    # Wyciągamy 4 cyfry po kropce (np. 0005)
                    precinct_no = full_id.split('.')[-1]
                    precincts.append({
                        'id': precinct_no,
                        'name': name.upper()
                    })
            return precincts
    except Exception as e:
        print(f"Błąd dla {teryt_gmina}: {e}")
    return []

# Twoje kluczowe gminy (TERYT 7-cyfrowy z podkreślnikiem)
gminy_do_pobrania = {
    "246101_1": "Bielsko-Biała (gmina miejska)",
    "240201_1": "Szczyrk (gmina miejska)",
    "240202_2": "Bestwina (gmina wiejska)",
    "240203_2": "Buczkowice (gmina wiejska)",
    "240204_4": "Czechowice-Dziedzice (miasto)",
    "240204_5": "Czechowice-Dziedzice (obszar wiejski)",
    "240205_2": "Jasienica (gmina wiejska)",
    "240206_2": "Jaworze (gmina wiejska)",
    "240207_2": "Kozy (gmina wiejska)",
    "240208_2": "Porąbka (gmina wiejska)",
    "240209_4": "Wilamowice (miasto)",
    "240209_5": "Wilamowice (obszar wiejski)",
    "240210_2": "Wilkowice (gmina wiejska)",
    "241001_2": "Goczałkowice-Zdrój (gmina wiejska)",
    "241002_2": "Kobiór (gmina wiejska)",
    "241003_2": "Miedźna (gmina wiejska)",
    "241004_2": "Pawłowice (gmina wiejska)",
    "241005_4": "Pszczyna (miasto)",
    "241005_5": "Pszczyna (obszar wiejski)",
    "241006_2": "Suszec (gmina wiejska)",
    "241401_1": "Bieruń (gmina miejska)",
    "241402_1": "Imielin (gmina miejska)",
    "241403_1": "Lędziny (gmina miejska)",
    "241404_2": "Bojszowy (gmina wiejska)",
    "241405_2": "Chełm Śląski (gmina wiejska)",
    "121301_1": "Oświęcim (gmina miejska)",
    "121302_4": "Brzeszcze (miasto)",
    "121302_5": "Brzeszcze (obszar wiejski)",
    "121303_4": "Chełmek (miasto)",
    "121303_5": "Chełmek (obszar wiejski)",
    "121304_4": "Kęty (miasto)",
    "121304_5": "Kęty (obszar wiejski)",
    "121305_2": "Osiek (gmina wiejska)",
    "121306_2": "Oświęcim (gmina wiejska)",
    "121307_2": "Polanka Wielka (gmina wiejska)",
    "121308_2": "Przeciszów (gmina wiejska)",
    "121309_4": "Zator (miasto)",
    "121309_5": "Zator (obszar wiejski)",
    "121801_4": "Andrychów (miasto)",
    "121801_5": "Andrychów (obszar wiejski)",
    "121802_2": "Brzeźnica (gmina wiejska)",
    "121803_4": "Kalwaria Zebrzydowska (miasto)",
    "121803_5": "Kalwaria Zebrzydowska (obszar wiejski)",
    "121804_2": "Lanckorona (gmina wiejska)",
    "121805_2": "Mucharz (gmina wiejska)",
    "121806_2": "Spytkowice (gmina wiejska)",
    "121807_2": "Stryszów (gmina wiejska)",
    "121808_2": "Tomice (gmina wiejska)",
    "121809_4": "Wadowice (miasto)",
    "121809_5": "Wadowice (obszar wiejski)",
    "121810_2": "Wieprz (gmina wiejska)"
}

def main():
    results = {}
    for code, name in gminy_do_pobrania.items():
        print(f"Pobieranie obrębów dla: {name} (ID: {code})...")
        # Do API ULDK musimy wysłać ID z podkreślnikiem tak jak mamy w systemie
        precincts = get_precincts(code)
        if precincts:
            results[code] = precincts
    
    output_path = r"c:\Users\Przemek\Mój dysk\rzeczoznawca\dashboard-app\public\data\precincts_data.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\nUkończono! Dane zapisano w: {output_path}")

if __name__ == "__main__":
    main()
