import csv
import json
import os
import sys

# Paths - Adjust based on your environment
BASE_DIR = r"c:\Users\Przemek\Mój dysk\rzeczoznawca"
RAW_DIR = os.path.join(BASE_DIR, "01_Bazy_Danych", "TERYT", "raw")
OUTPUT_FILE = os.path.join(BASE_DIR, "dashboard-app", "public", "data", "teryt_data.json")

def process():
    # 1. Load WMRODZ (Village/Town types)
    wmrodz = {}
    wmrodz_path = os.path.join(RAW_DIR, "WMRODZ_2026-03-13.csv")
    print(f"Loading {wmrodz_path}...")
    with open(wmrodz_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            wmrodz[row['RM']] = row['NAZWA_RM']

    # 2. Process TERC (Województwa, Powiaty, Gminy)
    teryt_tree = {}
    terc_path = os.path.join(RAW_DIR, "TERC_Urzedowy_2026-03-13.csv")
    print(f"Processing {terc_path}...")
    
    with open(terc_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            woj = row.get('WOJ')
            powi = row.get('POW')
            gmi = row.get('GMI')
            rodz = row.get('RODZ_GMI') or row.get('RODZ')
            nazwa = row.get('NAZWA')
            
            if woj and not powi: # Województwo
                teryt_tree[woj] = {'id': woj, 'name': nazwa, 'powiaty': {}}
            elif woj and powi and not gmi: # Powiat
                teryt_tree[woj]['powiaty'][powi] = {'id': woj + powi, 'name': nazwa, 'gminy': {}}
            elif woj and powi and gmi and rodz: # Gmina
                gmina_id = woj + powi + gmi + "_" + rodz
                # Typy gmin dla czytelności
                typ_map = {
                    '1': 'miejska', '2': 'wiejska', '3': 'miejsko-wiejska',
                    '4': 'miasto', '5': 'obszar wiejski', '8': 'dzielnica', '9': 'delegatura'
                }
                typ_str = typ_map.get(rodz, '')
                teryt_tree[woj]['powiaty'][powi]['gminy'][gmina_id] = {
                    'id': gmina_id,
                    'name': f"{nazwa} ({typ_str})",
                    'simple_name': nazwa,
                    'miejscowosci': {}
                }

    # 3. Process SIMC (Miejscowości)
    simc_path = os.path.join(RAW_DIR, "SIMC_Urzedowy_2026-03-13.csv")
    print(f"Processing {simc_path}...")
    
    # Pre-map SIMC to Gminy for faster access
    with open(simc_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            woj = row.get('WOJ')
            powi = row.get('POW')
            gmi = row.get('GMI')
            rodz = row.get('RODZ_GMI') or row.get('RODZ')
            gmina_id = woj + powi + gmi + "_" + rodz
            
            sym = row.get('SYM')
            nazwa = row.get('NAZWA')
            rm = row.get('RM')
            rodz_miejsc = wmrodz.get(rm, '')
            
            try:
                gminy_dict = teryt_tree[woj]['powiaty'][powi]['gminy']
                if gmina_id in gminy_dict:
                    gminy_dict[gmina_id]['miejscowosci'][sym] = {
                        'id': sym,
                        'name': f"{nazwa} ({rodz_miejsc})",
                        'simple_name': nazwa,
                        'ulice': []
                    }
            except KeyError:
                continue

    # 4. Process ULIC (Ulice)
    ulic_path = os.path.join(RAW_DIR, "ULIC_Urzedowy_2026-03-13.csv")
    print(f"Processing {ulic_path} (this might take a while)...")
    
    # We map SYM_UL and Cecha + Nazwa_1
    with open(ulic_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            sym = row.get('SYM')
            woj = row.get('WOJ')
            powi = row.get('POW')
            gmi = row.get('GMI')
            rodz = row.get('RODZ_GMI') or row.get('RODZ')
            gmina_id = woj + powi + gmi + "_" + rodz
            
            cecha = row.get('CECHA')
            nazwa_1 = row.get('NAZWA_1')
            nazwa_2 = row.get('NAZWA_2')
            full_street = f"{cecha} {nazwa_1}" + (f" {nazwa_2}" if nazwa_2 else "")
            
            try:
                gmina = teryt_tree[woj]['powiaty'][powi]['gminy'][gmina_id]
                if sym in gmina['miejscowosci']:
                    gmina['miejscowosci'][sym]['ulice'].append({
                        'id': row.get('SYM_UL'),
                        'name': full_street
                    })
            except KeyError:
                continue

    # Convert nested dicts to sorted lists for the UI
    final_data = []
    for woj_id in sorted(teryt_tree.keys()):
        w = teryt_tree[woj_id]
        powiaty_list = []
        for pow_id in sorted(w['powiaty'].keys()):
            p = w['powiaty'][pow_id]
            gminy_list = []
            for gm_id in sorted(p['gminy'].keys()):
                g = p['gminy'][gm_id]
                miejsc_list = []
                for m_id in sorted(g['miejscowosci'].keys()):
                    m = g['miejscowosci'][m_id]
                    # Sort ulice by name
                    m['ulice'].sort(key=lambda x: x['name'])
                    miejsc_list.append(m)
                
                # Sort miejscowości by name
                miejsc_list.sort(key=lambda x: x['name'])
                g['miejscowosci'] = miejsc_list
                gminy_list.append(g)
            
            # Sort gminy by name
            gminy_list.sort(key=lambda x: x['name'])
            p['gminy'] = gminy_list
            powiaty_list.append(p)
            
        # Sort powiaty by name
        powiaty_list.sort(key=lambda x: x['name'])
        w['powiaty'] = powiaty_list
        final_data.append(w)

    print(f"Saving JSON to {OUTPUT_FILE}...")
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)
    
    print("Done!")

if __name__ == "__main__":
    process()
