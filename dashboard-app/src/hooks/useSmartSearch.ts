import { useState, useCallback, useRef } from 'react';
import type { ResolverResult, HistoryEntry } from '../types/property';
import { resolveProperty, cleanInput } from '../services/PropertyResolver';
import { v4 as uuidv4 } from 'uuid';

// ─── Heuristic patterns ─────────────────────────────────────────
const FULL_TERYT_REGEX = /^\d{6}_\d\.\d{4}\..+$/;
const PARCEL_NUMBER_REGEX = /^[\d./]+$/; // same cyfry, kropki, ukośniki (bez spacji)
const KW_REGEX = /^[A-Z]{2}[0-9A-Z]{2}\/\d{8}\/\d$/i;
const GEOPORTAL_LINK_REGEX = /identifyParcel=/i;

export type InputCategory = 'teryt' | 'parcel' | 'address' | 'kw' | 'link';
export type SearchStatus = 'idle' | 'searching' | 'geocoding' | 'resolving' | 'done' | 'error';

interface SmartSearchState {
  status: SearchStatus;
  statusMessage: string;
  result: ResolverResult | null;
  toast: string | null;
  inputCategory: InputCategory | null;
}

const STORAGE_KEY = 'property_search_history';

// ─── Nominatim geocoding ─────────────────────────────────────────
async function geocodeNominatim(query: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'pl',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'pl' },
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

// ─── ULDK reverse lookup (point → TERYT) ─────────────────────────
async function getParcelByPoint(lon: number, lat: number): Promise<string | null> {
  const url = `https://uldk.gugik.gov.pl/?request=GetParcelByXY&xy=${lon},${lat}&result=teryt&srid=4326`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const text = (await res.text()).trim();
  // ULDK: "0\n<teryt>" on success, "-1\n..." on error
  if (text.startsWith('-1') || text === '') return null;

  const teryt = text.startsWith('0\n') ? text.slice(2).trim() : text.trim();
  return teryt || null;
}

// ─── Classify input ──────────────────────────────────────────────
function classifyInput(input: string): InputCategory {
  const cleaned = cleanInput(input);

  if (GEOPORTAL_LINK_REGEX.test(cleaned)) return 'link';
  if (KW_REGEX.test(cleaned.toUpperCase().replace(/\s/g, ''))) return 'kw';
  if (FULL_TERYT_REGEX.test(cleaned)) return 'teryt';
  if (PARCEL_NUMBER_REGEX.test(cleaned) && cleaned.length >= 1) return 'parcel';
  return 'address';
}

// ─── Hook ────────────────────────────────────────────────────────
export function useSmartSearch() {
  const [state, setState] = useState<SmartSearchState>({
    status: 'idle',
    statusMessage: '',
    result: null,
    toast: null,
    inputCategory: null,
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const abortRef = useRef<AbortController | null>(null);

  // ─── Save to history ───────────────────────────────────────────
  const saveToHistory = useCallback((input: string, result: ResolverResult) => {
    if (!result.teryt?.formatted && !result.kw?.raw) return;

    setHistory(prev => {
      const existingIndex = prev.findIndex(h =>
        (result.teryt && h.result.teryt?.formatted === result.teryt.formatted) ||
        (result.kw && h.result.kw?.raw === result.kw.raw)
      );

      let newHistory = [...prev];
      if (existingIndex >= 0) {
        newHistory[existingIndex] = { ...newHistory[existingIndex], timestamp: Date.now() };
      } else {
        newHistory = [{
          id: uuidv4(),
          timestamp: Date.now(),
          input,
          result,
        }, ...newHistory];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    if (window.confirm('Czy na pewno chcesz wyczyścić całe archiwum?')) {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(e => e.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const updateHistoryName = useCallback((id: string, name: string) => {
    setHistory(prev => {
      const newHistory = prev.map(e => e.id === id ? { ...e, customName: name } : e);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const dismissToast = useCallback(() => {
    setState(prev => ({ ...prev, toast: null }));
  }, []);

  // ─── Main search ──────────────────────────────────────────────
  const search = useCallback(async (rawInput: string): Promise<{ result: ResolverResult; displayValue: string }> => {
    const input = cleanInput(rawInput);
    if (!input) {
      const r: ResolverResult = { inputType: 'unknown', error: 'Puste wejście.' };
      setState({ status: 'error', statusMessage: '', result: r, toast: null, inputCategory: null });
      return { result: r, displayValue: rawInput };
    }

    // Cancel previous
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const category = classifyInput(input);
    setState({ status: 'searching', statusMessage: 'Rozpoznaję zapytanie...', result: null, toast: null, inputCategory: category });

    try {
      // ─── ADRES → Nominatim → ULDK ─────────────────────────────
      if (category === 'address') {
        setState(prev => ({ ...prev, status: 'geocoding', statusMessage: 'Geokodowanie adresu (Nominatim)...' }));

        const geo = await geocodeNominatim(input);
        if (!geo) {
          // Fallback: try GUGiK geocoder via PropertyResolver
          setState(prev => ({ ...prev, statusMessage: 'Nominatim nie znalazł. Próbuję GUGiK...' }));
          const fallback = await resolveProperty(input);
          const displayValue = fallback.teryt?.formatted || input;
          setState({
            status: fallback.error ? 'error' : 'done',
            statusMessage: '',
            result: fallback,
            toast: fallback.error || null,
            inputCategory: category,
          });
          if (!fallback.error) saveToHistory(input, fallback);
          return { result: fallback, displayValue };
        }

        setState(prev => ({ ...prev, status: 'resolving', statusMessage: `Szukam działki pod: ${geo.displayName.split(',')[0]}...` }));

        const teryt = await getParcelByPoint(geo.lon, geo.lat);
        if (!teryt || teryt.length < 10) {
          const result: ResolverResult = {
            inputType: 'address',
            address: geo.displayName,
            error: 'Znaleziono adres, ale nie przypisano działki. Wybierz ją ręcznie na mapie.',
          };
          setState({ status: 'error', statusMessage: '', result, toast: result.error!, inputCategory: category });
          return { result, displayValue: input };
        }

        // Parse the TERYT
        const fullResult = await resolveProperty(teryt);
        // Enrich with address
        fullResult.address = geo.displayName;
        if (fullResult.inputType === 'unknown') fullResult.inputType = 'address';

        const displayValue = fullResult.teryt?.formatted || teryt;
        setState({
          status: fullResult.error ? 'error' : 'done',
          statusMessage: '',
          result: fullResult,
          toast: null,
          inputCategory: category,
        });
        if (!fullResult.error) saveToHistory(input, fullResult);
        return { result: fullResult, displayValue };
      }

      // ─── TERYT / KW / PARCEL / LINK → PropertyResolver ────────
      setState(prev => ({ ...prev, statusMessage: 'Przetwarzam...' }));
      const result = await resolveProperty(input);
      const displayValue = result.teryt?.formatted || input;

      setState({
        status: result.error ? 'error' : 'done',
        statusMessage: '',
        result,
        toast: result.error || null,
        inputCategory: category,
      });

      if (!result.error) saveToHistory(input, result);
      return { result, displayValue };

    } catch (err) {
      const errorResult: ResolverResult = {
        inputType: 'unknown',
        error: err instanceof Error ? err.message : 'Nieznany błąd wyszukiwania.',
      };
      setState({ status: 'error', statusMessage: '', result: errorResult, toast: errorResult.error!, inputCategory: category });
      return { result: errorResult, displayValue: rawInput };
    }
  }, [saveToHistory]);

  return {
    ...state,
    search,
    history,
    saveToHistory,
    clearHistory,
    removeFromHistory,
    updateHistoryName,
    dismissToast,
  };
}
