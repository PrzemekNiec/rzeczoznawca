import type { ResolverResult, TerytData, KWData } from '@/types/property'

// ─── Regex Patterns ────────────────────────────────────────────────
const KW_REGEX = /^[A-Z]{2}[0-9A-Z]{2}\/\d{8}\/\d$/
const FULL_TERYT_REGEX = /^(\d{2})(\d{2})(\d{2})_(\d)\.(\d{4})\.(.+)$/
const RAW_DIGITS_REGEX = /^(\d{6})(\d)(\d{4})(\d+)$/
const GEOPORTAL_LINK_REGEX = /identifyParcel=([^&\s]+)/i
const PARTIAL_PARCEL_REGEX = /^(\d{1,4})(\/\d+)?$/
const TEXT_PARCEL_REGEX = /obr[eę]b\s*(\d+)\s*dz\.?\s*(\d+(?:\/\d+)?)/i

// ─── API Endpoints ─────────────────────────────────────────────────
const GEOCODE_BASE = 'https://services.gugik.gov.pl/uug/'
const ULDK_BASE = 'https://uldk.gugik.gov.pl/'

// ─── 1. Sanity Check ──────────────────────────────────────────────
export function cleanInput(raw: string): string {
  return raw
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── 2. KW Strategy ───────────────────────────────────────────────
function tryKW(input: string): ResolverResult | null {
  const normalized = input.toUpperCase().replace(/\s/g, '')
  if (!KW_REGEX.test(normalized)) return null

  const parts = normalized.split('/')
  const kw: KWData = {
    raw: normalized,
    kodSadu: parts[0],
    numer: parts[1],
    cyfraKontrolna: parts[2],
  }

  return { inputType: 'kw', kw }
}

// ─── 3. TERYT Strategy ────────────────────────────────────────────
function parseTerytString(teryt: string): TerytData {
  const match = teryt.match(FULL_TERYT_REGEX)
  if (!match) throw new Error(`Nie można sparsować TERYT: ${teryt}`)

  const [, woj, pow, gm, typ, obreb, dzialka] = match
  return {
    raw: teryt,
    wojewodztwo: woj,
    powiat: pow,
    gmina: gm,
    typGminy: typ,
    obreb,
    dzialka,
    formatted: teryt,
  }
}

function tryFullTeryt(input: string): ResolverResult | null {
  if (!FULL_TERYT_REGEX.test(input)) return null
  return { inputType: 'teryt', teryt: parseTerytString(input) }
}

function tryRawDigits(input: string): ResolverResult | null {
  const digitsOnly = input.replace(/\D/g, '')
  if (digitsOnly.length < 10) return null

  const match = digitsOnly.match(RAW_DIGITS_REGEX)
  if (!match) return null

  const [, base, typ, obreb, dzialkaRaw] = match
  const formatted = `${base}_${typ}.${obreb}.${dzialkaRaw}`
  return { inputType: 'teryt', teryt: parseTerytString(formatted) }
}

function tryGeoportalLink(input: string): ResolverResult | null {
  const match = input.match(GEOPORTAL_LINK_REGEX)
  if (!match) return null

  const extracted = decodeURIComponent(match[1])
  if (FULL_TERYT_REGEX.test(extracted)) {
    return { inputType: 'geoportal-link', teryt: parseTerytString(extracted) }
  }

  return { inputType: 'geoportal-link', error: `Wyekstrahowano "${extracted}", ale format jest nieprawidłowy.` }
}

function tryTextParcel(input: string): ResolverResult | null {
  const match = input.match(TEXT_PARCEL_REGEX)
  if (!match) return null

  const obreb = match[1].padStart(4, '0')
  const dzialka = match[2]

  return {
    inputType: 'partial',
    teryt: {
      raw: input,
      wojewodztwo: '',
      powiat: '',
      gmina: '',
      typGminy: '',
      obreb,
      dzialka,
      formatted: `??????_?.${obreb}.${dzialka}`,
    },
    error: 'Niepełny TERYT — brak kodu gminy. Doprecyzuj wyszukiwanie lub wybierz z historii.',
  }
}

function tryPartialParcel(input: string): ResolverResult | null {
  const match = input.match(PARTIAL_PARCEL_REGEX)
  if (!match) return null

  return {
    inputType: 'partial',
    teryt: {
      raw: input,
      wojewodztwo: '',
      powiat: '',
      gmina: '',
      typGminy: '',
      obreb: '',
      dzialka: input,
      formatted: '',
    },
    error: 'Podano sam numer działki. Podaj pełny TERYT lub adres, aby kontynuować.',
  }
}

// ─── 4. Address Strategy (Async – Geocode → ULDK GetParcelByXY) ───

interface GeocodeResult {
  x: string
  y: string
  city: string
  street: string
  number: string
}

async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({ request: 'GetAddress', address })
  const response = await fetch(`${GEOCODE_BASE}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Geocoding HTTP ${response.status}`)
  }

  const data = await response.json()

  if (!data.results || data['found objects'] === 0) {
    throw new Error('Nie znaleziono adresu w bazie GUGiK.')
  }

  // Pick first (highest accuracy) result
  const first = data.results['1'] as GeocodeResult
  if (!first?.x || !first?.y) {
    throw new Error('Brak współrzędnych w odpowiedzi geokodowania.')
  }

  return first
}

async function getParcelByXY(x: string, y: string): Promise<string> {
  const params = new URLSearchParams({
    request: 'GetParcelByXY',
    xy: `${x},${y}`,
    result: 'teryt',
  })
  const response = await fetch(`${ULDK_BASE}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`ULDK HTTP ${response.status}`)
  }

  const text = (await response.text()).trim()

  // ULDK returns "0\n<teryt>" on success, "-1\n..." on error
  if (text.startsWith('-1') || text === '') {
    throw new Error('ULDK nie znalazł działki dla podanych współrzędnych.')
  }

  return text.startsWith('0\n') ? text.slice(2).trim() : text.trim()
}

async function tryAddress(input: string): Promise<ResolverResult> {
  try {
    // Step 1: Geocode address → XY
    const geo = await geocodeAddress(input)

    // Step 2: XY → Parcel TERYT
    const terytRaw = await getParcelByXY(geo.x, geo.y)

    if (FULL_TERYT_REGEX.test(terytRaw)) {
      return {
        inputType: 'address',
        address: input,
        teryt: parseTerytString(terytRaw),
      }
    }

    return {
      inputType: 'address',
      address: input,
      error: `ULDK zwrócił nieoczekiwany format: "${terytRaw}"`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieznany błąd'
    return {
      inputType: 'address',
      address: input,
      error: message,
    }
  }
}

// ─── Main Resolver ─────────────────────────────────────────────────
export async function resolveProperty(rawInput: string): Promise<ResolverResult> {
  const input = cleanInput(rawInput)

  if (!input) {
    return { inputType: 'unknown', error: 'Puste wejście.' }
  }

  // Strategy chain — order matters
  const kw = tryKW(input)
  if (kw) return kw

  const geoportal = tryGeoportalLink(input)
  if (geoportal) return geoportal

  const fullTeryt = tryFullTeryt(input)
  if (fullTeryt) return fullTeryt

  const rawDigits = tryRawDigits(input)
  if (rawDigits) return rawDigits

  const textParcel = tryTextParcel(input)
  if (textParcel) return textParcel

  const partial = tryPartialParcel(input)
  if (partial) return partial

  // Fallback: treat as address
  return tryAddress(input)
}

// ─── Exported helpers for direct use ───────────────────────────────
export { tryKW, tryFullTeryt, tryRawDigits, tryGeoportalLink, tryPartialParcel, tryTextParcel }
