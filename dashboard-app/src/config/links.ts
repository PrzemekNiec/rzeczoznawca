/**
 * PROJEKT: Dashboard Rzeczoznawcy
 * CEL: Automatyzacja generowania linków do rejestrów (e-mapa, EKW, Rejestr Planów)
 */

// --- 1. UTILS ---

export const slugify = (text: string): string => {
  const mapping: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'a', 'Ć': 'c', 'Ę': 'e', 'Ł': 'l', 'Ń': 'n', 'Ó': 'o', 'Ś': 's', 'Ź': 'z', 'Ż': 'z'
  };
  return text
    .toString()
    .toLowerCase()
    .split('')
    .map(char => mapping[char] || char)
    .join('')
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')         // Remove all non-word chars
    .replace(/--+/g, '-');          // Replace multiple - with single -
};

export const cleanParcelId = (id: string): string => {
  // Usuń segment .AR_[numer]. jeśli istnieje (sekcja arkusza)
  return id.replace(/\.AR_\d+\./g, ".");
};

// --- 2. TERYT TO SYSTEM MAPPING ---

export const KEYBOARD_SHORTCUTS = {
  search: 'enter',
  multiOpen: 'alt+o',
  clear: 'escape'
};

export const VOIVODESHIPS: Record<string, string> = {
  "02": "dolnoslaskie", "04": "kujawsko-pomorskie", "06": "lubelskie",
  "08": "lubuskie", "10": "lodzkie", "12": "malopolskie",
  "14": "mazowieckie", "16": "opolskie", "18": "podkarpackie",
  "20": "podlaskie", "22": "pomorskie", "24": "slaskie",
  "26": "swietokrzyskie", "28": "warminsko-mazurskie",
  "30": "wielkopolskie", "32": "zachodniopomorskie"
};

// Obiekt uzupełniony przez z Linkownik_Gminny.md
export const COUNTIES: Record<string, string> = {
  "1201": "bochenski",
  "1202": "brzeski",
  "1203": "chrzanowski",
  "1204": "dabrowski",
  "1205": "gorlicki",
  "1206": "krakowski",
  "1207": "limanowski",
  "1208": "miechowski",
  "1209": "myslenicki",
  "1210": "nowosadecki",
  "1211": "nowotarski",
  "1212": "olkuski",
  "1213": "oswiecimski",
  "1214": "proszowicki",
  "1215": "suski",
  "1216": "tarnowski",
  "1217": "tatrzanski",
  "1218": "wadowicki",
  "1219": "wielicki",
  "1261": "krakow",
  "1262": "nowy-sacz",
  "1263": "tarnow",
  "2401": "bedzinski",
  "2402": "bielski",
  "2414": "bierunsko-ledzinski",
  "2403": "cieszynski",
  "2404": "czestochowski",
  "2405": "gliwicki",
  "2406": "klobucki",
  "2407": "lubliniecki",
  "2408": "mikolowski",
  "2409": "myszkowski",
  "2410": "pszczynski",
  "2411": "raciborski",
  "2412": "rybnicki",
  "2413": "tarnogorski",
  "2415": "wodzislawski",
  "2416": "zawiercianski",
  "2417": "zywiecki",
  "2461": "bielsko-biala",
  "2462": "bytom",
  "2463": "chorzow",
  "2464": "czestochowa",
  "2465": "dabrowa-gornicza",
  "2466": "gliwice",
  "2467": "jastrzebie-zdroj",
  "2468": "jaworzno",
  "2469": "katowice",
  "2470": "myslowice",
  "2471": "piekary-slaskie",
  "2472": "ruda-slaska",
  "2473": "rybnik",
  "2474": "siemianowice-slaskie",
  "2475": "sosnowiec",
  "2476": "swietochlowice",
  "2477": "tychy",
  "2478": "zabrze",
  "2479": "zory"
};

// Przygotowujemy statyczne mocki dla Gmin i Obrębów w celach testowania Sidebar Kreatora
export const MOCK_GMINY: Record<string, { id: string; name: string }[]> = {
  "2410": [
    { id: "241003_2", name: "Miedźna" }, // Wiejska
    { id: "241004_4", name: "Pszczyna - Miasto" },
    { id: "241004_5", name: "Pszczyna - Obszar Wiejski" },
    { id: "241006_2", name: "Suszec" }
  ]
};

// --- 4. GMINA NAMES MAPPING (for Plan Ogólny e-mapa deep-links) ---
// Keys are 6-digit TERYT (without AR section)
export const GMINA_NAMES: Record<string, string> = {
  "241003": "Miedźna",
  "120101": "Bochnia",
  "120103": "Drwinia",
  "121304": "Kęty",
  "241401": "Bieruń",
  "241404": "Bojszowy",
  "240201": "Czechowice-Dziedzice",
  "246901": "Katowice",
  "126101": "Kraków",
  // TODO: Add more from Linkownik_Gminny.md as needed or build dynamically
};

export const MOCK_REGIONS: Record<string, { id: string; name: string }[]> = {
  "241003_2": [
    { id: "0003", name: "Miedźna" },
    { id: "0006", name: "Wola" },
    { id: "0001", name: "Frydek" },
    { id: "0002", name: "Góra" }
  ]
};

export const TERYT_MAPPINGS: Record<string, { system: string; slug: string; baseUrl?: string }> = {};

// Validate subdomain slug — only safe chars allowed (a-z, 0-9, -)
const safeDomainSlug = (slug: string): string => slug.replace(/[^a-z0-9-]/gi, '').toLowerCase();

export const MUNICIPAL_SYSTEMS = {
  'e-mapa': (slug: string, teryt: string) => `https://${safeDomainSlug(slug)}.e-mapa.net?identifyParcel=${encodeURIComponent(cleanParcelId(teryt))}`,
  'geoportal2': (slug: string, teryt: string) => `https://${safeDomainSlug(slug)}.geoportal2.pl/map/www/mapa.php?dzialka=${encodeURIComponent(cleanParcelId(teryt))}`,
  'iMap': (slug: string, teryt: string) => `https://sip.gison.pl/${safeDomainSlug(slug)}?dzialka=${encodeURIComponent(cleanParcelId(teryt))}`
};

export const NATIONAL_LINKS = {
  geoportal: (teryt: string) => `https://mapy.geoportal.gov.pl/imap/Imgp_2.html?identifyParcel=${encodeURIComponent(cleanParcelId(teryt))}`,
  ekw: (kodSadu: string, numer: string, cyfra: string) => `https://przegladarka-ekw.ms.gov.pl/eukw_prz/KsiegiWieczyste/wyszukiwanieKW?komunikaty=true&kodWydzialuInput=${encodeURIComponent(kodSadu)}&nrKsiegiWieczystej=${encodeURIComponent(numer)}&cyfraKontrolna=${encodeURIComponent(cyfra)}`,
  gunb: () => `https://wyszukiwarka.gunb.gov.pl/`,
  // format: https://e-mapa.net/plan_ogolny/[teryt6]-[gmina-slug]?dzialka=[cleanId]
  planyOgolne: (teryt6: string, gminaSlug: string, parcelId: string) =>
    `https://e-mapa.net/plan_ogolny/${encodeURIComponent(teryt6)}-${safeDomainSlug(gminaSlug)}?dzialka=${encodeURIComponent(cleanParcelId(parcelId))}`,
};

// --- 3. GENERATORY LINKÓW ---

/**
 * Link do e-mapa.net (Nowy uproszczony format bezpośredni)
 */
export const getEMapaUrl = (teryt: string): string => {
  return `https://e-mapa.net/polska/${encodeURIComponent(cleanParcelId(teryt))}`;
};

/**
 * Link do Rejestru Planów Ogólnych
 */
export const getPlanOgolnyUrl = (teryt: string, gminaName: string): string | null => {
  const clean = teryt.replace(/[^0-9]/g, "");
  const teryt6 = clean.substring(0, 6);
  const gmiSlug = slugify(gminaName);
  return NATIONAL_LINKS.planyOgolne(teryt6, gmiSlug, teryt);
};

export const getGeoportalUrl = (teryt: string): string | null => {
  return NATIONAL_LINKS.geoportal(teryt);
};