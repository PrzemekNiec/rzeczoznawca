import { NATIONAL_LINKS, MUNICIPAL_SYSTEMS, TERYT_MAPPINGS, cleanParcelId, slugify } from '../config/links';

export interface Coordinates {
  x: number; // np. układ EPSG:2180 lub EPSG:4326/WGS84, zakładamy uniwersalne proxy lub parametry
  y: number;
}

export interface SpecializedLinks {
  nid: string;
  bdl: string;
  isok: string;
}

export interface GeneratedLinks {
  geoportal: string;
  gunb: string;
  municipal: string | null;
  ekw: string | null;
  planyOgolne: string;
  specialized: SpecializedLinks | null;
}

export class LinkGenerator {
  /**
   * Generuje dedykowane linki dla systemów z niestandardowym adresem URL
   * na podstawie wytycznych z pliku Linkownik_Gminny.md
   */
  private static getCustomMunicipalLink(teryt: string): string | null {
    const clean = cleanParcelId(teryt);
    // Katowice (TERYT 2469) - System Custom emapa.katowice.eu
    if (teryt.startsWith('2469')) {
      return `https://emapa.katowice.eu?identifyParcel=${encodeURIComponent(clean)}`;
    }

    // Kraków (TERYT 1261) - System Custom MSIP
    if (teryt.startsWith('1261')) {
      return `https://msip.krakow.pl/?parcels=${encodeURIComponent(clean)}`;
    }

    return null;
  }

  /**
   * Główne wejście silnika logiki do generowania wszystkich dostępnych linków
   * dla danego kodu TERYT oraz opcjonalnych współrzędnych.
   * 
   * @param teryt Pełny kod TERYT działki
   * @param coords Współrzędne geograficzne/płaskie (opcjonalnie)
   * @returns Obiekt zawierający wygenerowane linki
   */
  public static generateLinks(teryt: string, coords?: Coordinates, ekwParams?: { kodSadu: string; numer: string; cyfra: string }, gminaName?: string): GeneratedLinks {
    const terytPrefix = teryt.substring(0, 6);
    
    // 1. Zbudowanie linku gminnego (MUNICIPAL)
    let municipalLink: string | null = null;
    
    if (teryt.startsWith('2469') || teryt.startsWith('1261')) {
      // Wymuszenie użycia parserów Custom dla Katowic i Krakowa
      municipalLink = this.getCustomMunicipalLink(teryt);
    } else {
      // Pobieranie systemu z links.ts
      const mapping = TERYT_MAPPINGS[terytPrefix];
      if (mapping) {
        if (mapping.system === 'e-mapa') {
          // KROK 4: Jeśli baseUrl jest zdefiniowany na sztywno, użyj go zamiast generowanej subdomeny
          if (mapping.baseUrl) {
            municipalLink = `${mapping.baseUrl}?identifyParcel=${encodeURIComponent(cleanParcelId(teryt))}`;
          } else {
            municipalLink = MUNICIPAL_SYSTEMS['e-mapa'](mapping.slug, teryt);
          }
        } else if (mapping.system === 'geoportal2') {
          municipalLink = MUNICIPAL_SYSTEMS['geoportal2'](mapping.slug, teryt);
        } else if (mapping.system === 'iMap') {
          municipalLink = MUNICIPAL_SYSTEMS['iMap'](mapping.slug, teryt);
        } else if (mapping.system === 'custom') {
          municipalLink = this.getCustomMunicipalLink(teryt);
        }
      }
    }

    // 2. Budowanie linków specjalistycznych na podstawie XY
    let specializedLinks: SpecializedLinks | null = null;
    if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
      const cx = encodeURIComponent(String(coords.x));
      const cy = encodeURIComponent(String(coords.y));
      specializedLinks = {
        // NID - Narodowy Instytut Dziedzictwa
        nid: `https://mapy.zabytek.gov.pl/nid/?x=${cx}&y=${cy}&zoom=14`,
        // BDL - Bank Danych o Lasach
        bdl: `https://www.bdl.lasy.gov.pl/portal/mapy?x=${cx}&y=${cy}&zoom=14`,
        // ISOK - Informatyczny System Osłony Kraju (Wody Polskie)
        isok: `https://wody.isok.gov.pl/imap_kzgw/?x=${cx}&y=${cy}&zoom=10`
      };
    }

    // 3. Obsługa EKW, jeśli podano parametry
    const ekwLink = ekwParams ? NATIONAL_LINKS.ekw(ekwParams.kodSadu, ekwParams.numer, ekwParams.cyfra) : null;

    // 4. Rejestr Planów Ogólnych (wymaga kodu gminy, slug gminy i id działki)
    const teryt6 = teryt.replace(/[^0-9]/g, "").substring(0, 6);
    const gmiSlug = slugify(gminaName || '');
    const planyOgolneLink = NATIONAL_LINKS.planyOgolne(teryt6, gmiSlug, teryt);

    return {
      geoportal: NATIONAL_LINKS.geoportal(teryt),
      gunb: NATIONAL_LINKS.gunb(),
      municipal: municipalLink,
      ekw: ekwLink,
      planyOgolne: planyOgolneLink,
      specialized: specializedLinks
    };
  }
}
