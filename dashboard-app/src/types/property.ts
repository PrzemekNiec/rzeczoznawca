export interface TerytData {
  raw: string
  wojewodztwo: string
  powiat: string
  gmina: string
  typGminy: string
  obreb: string
  dzialka: string
  formatted: string
}

export interface KWData {
  raw: string
  kodSadu: string
  numer: string
  cyfraKontrolna: string
}

export type InputType = 'teryt' | 'kw' | 'address' | 'geoportal-link' | 'partial' | 'unknown'

export interface ResolverResult {
  inputType: InputType
  teryt?: TerytData
  kw?: KWData
  address?: string
  error?: string
}

export interface HistoryEntry {
  id: string
  timestamp: number
  input: string
  result: ResolverResult
  customName?: string
}
