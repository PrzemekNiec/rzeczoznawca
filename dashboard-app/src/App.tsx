import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, Image as ImageIcon, Loader2, History, Trash2, Copy, Save, Check, X } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import PhotoGenerator from './components/PhotoGenerator';
import Toolbar from './components/Toolbar';
import Minimap from './components/Minimap';
import { KEYBOARD_SHORTCUTS, NATIONAL_LINKS, cleanParcelId } from './config/links';
import type { HistoryEntry } from './types/property';
import { LinkGenerator } from './services/LinkGenerator';
import { useSmartSearch } from './hooks/useSmartSearch';

function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'photo'>('search');

  // --- SMART SEARCH HOOK ---
  const {
    status: searchStatus,
    statusMessage,
    result: searchResult,
    toast,
    inputCategory,
    search,
    history,
    clearHistory,
    removeFromHistory,
    updateHistoryName,
    dismissToast,
  } = useSmartSearch();

  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- TERYT DATA ENGINE ---
  const [terytData, setTerytData] = useState<any[]>([]);
  const [loadingTeryt, setLoadingTeryt] = useState(false);

  const [selectedWoj, setSelectedWoj] = useState<any>(null);
  const [selectedPow, setSelectedPow] = useState<any>(null);
  const [selectedGm, setSelectedGm] = useState<any>(null);
  const [selectedMj, setSelectedMj] = useState<any>(null);
  const [obrebNumber, setObrebNumber] = useState('');
  const [dzialkaNumber, setDzialkaNumber] = useState('');

  // Multi-parcel state (gdy szukamy bez obrębu)
  const [multiParcels, setMultiParcels] = useState<Array<{ teryt: string; wkt: string }>>([]);
  const [multiSearching, setMultiSearching] = useState(false);
  const [selectedFromMulti, setSelectedFromMulti] = useState(false);

  // Centroid działki (do Street View)
  const [parcelCentroid, setParcelCentroid] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setLoadingTeryt(true);

    const DB_NAME = 'teryt-cache';
    const STORE = 'data';
    const KEY = 'teryt_data';

    const openDB = (): Promise<IDBDatabase> =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

    const getFromCache = (db: IDBDatabase): Promise<any[] | undefined> =>
      new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      });

    const saveToCache = (db: IDBDatabase, data: any[]) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, KEY);
    };

    (async () => {
      try {
        const db = await openDB();
        const cached = await getFromCache(db);
        if (cached) {
          setTerytData(cached);
          setLoadingTeryt(false);
          return;
        }
        const res = await fetch('/data/teryt_data.json');
        const data = await res.json();
        setTerytData(data);
        saveToCache(db, data);
      } catch (err) {
        console.error('Failed to load TERYT data', err);
      } finally {
        setLoadingTeryt(false);
      }
    })();
  }, []);

  const handleAssembleUldk = useCallback(async () => {
    if (!selectedGm || !dzialkaNumber) return;

    // Resetuj multi-parcel state
    setMultiParcels([]);
    setSelectedFromMulti(false);

    // Jeśli podano obręb — proste wyszukiwanie (jak wcześniej)
    if (obrebNumber) {
      const paddedObreb = obrebNumber.padStart(4, '0');
      const assembled = `${selectedGm.id}.${paddedObreb}.${dzialkaNumber}`;
      setSearchValue(assembled);
      return;
    }

    // Brak obrębu → multi-fetch po obrębch 0001–0100 (batch po 10)
    setMultiSearching(true);
    const MAX_OBREB = 100;
    const BATCH_SIZE = 10;
    const found: Array<{ teryt: string; wkt: string }> = [];

    const fetchOne = async (id: string) => {
      try {
        const url = `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${id}&result=teryt,geom_wkt&srid=4326`;
        const res = await fetch(url);
        const text = await res.text();
        const lines = text.trim().split('\n');
        const status = lines[0]?.trim();
        if (status !== '0' || lines.length < 2) return null;
        const raw = lines.slice(1).join('').trim();
        const pipeIdx = raw.indexOf('|');
        if (pipeIdx === -1) return null;
        const teryt = raw.substring(0, pipeIdx);
        const wktRaw = raw.substring(pipeIdx + 1);
        const wkt = wktRaw.replace(/^SRID=\d+;/, '');
        if (!wkt.startsWith('POLYGON') && !wkt.startsWith('MULTIPOLYGON')) return null;
        console.log(`[ULDK] HIT: ${id} → ${teryt}`);
        return { teryt, wkt };
      } catch (err) {
        console.warn(`[ULDK] ERROR for ${id}:`, err);
        return null;
      }
    };

    for (let batch = 0; batch < MAX_OBREB; batch += BATCH_SIZE) {
      const ids = [];
      for (let i = batch + 1; i <= Math.min(batch + BATCH_SIZE, MAX_OBREB); i++) {
        ids.push(`${selectedGm.id}.${String(i).padStart(4, '0')}.${dzialkaNumber}`);
      }
      const results = await Promise.all(ids.map(fetchOne));
      for (const r of results) {
        if (r) found.push(r);
      }
    }

    console.log(`[Multi-fetch] gmina=${selectedGm.id} dzialka=${dzialkaNumber} → found ${found.length}`, found);

    setMultiSearching(false);

    if (found.length === 0) {
      dismissToast();
      // Użyj prostego ustawienia — toast zostanie wyświetlony w UI
      setSearchValue('');
      alert('Nie znaleziono działki o tym numerze w żadnym obrębie wybranej gminy.');
    } else if (found.length === 1) {
      // Dokładnie jedna — ustaw i od razu szukaj
      const terytClean = found[0].teryt.replace(/\.AR_\d+\./, '.');
      setSearchValue(terytClean);
      setMultiParcels([]);
      search(terytClean);
    } else {
      // Kilka — pokaż na mapie do wyboru
      setMultiParcels(found);
    }
  }, [selectedGm, obrebNumber, dzialkaNumber, dismissToast, search]);

  // --- AKTYWNA DZIAŁKA ---
  const activeParcelId = useMemo(() => {
    if (searchResult?.teryt?.formatted) return searchResult.teryt.formatted;
    if (selectedGm && obrebNumber && dzialkaNumber) {
      const paddedObreb = obrebNumber.padStart(4, '0');
      return `${selectedGm.id}.${paddedObreb}.${dzialkaNumber}`;
    }
    return null;
  }, [searchResult, selectedGm, obrebNumber, dzialkaNumber]);

  // Reset centroidu przy zmianie działki (Minimap dostarczy nowy)
  useEffect(() => { setParcelCentroid(null); }, [activeParcelId]);

  const activeGminaName = useMemo(() => {
    if (selectedGm?.simple_name) return selectedGm.simple_name;
    if (selectedGm?.name) return selectedGm.name.replace(/\s*\(.*\)$/, '');
    return '';
  }, [selectedGm]);

  // --- EDYCJA NAZWY W ARCHIWUM ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'address' | 'name'>('date');

  const sortedHistory = [...history].sort((a, b) => {
    if (sortBy === 'date') return b.timestamp - a.timestamp;
    if (sortBy === 'address') {
      const adrA = a.result.address || a.result.teryt?.formatted || a.result.kw?.raw || '';
      const adrB = b.result.address || b.result.teryt?.formatted || b.result.kw?.raw || '';
      return adrA.localeCompare(adrB);
    }
    if (sortBy === 'name') return (a.customName || '').localeCompare(b.customName || '');
    return 0;
  });

  // --- PERFORM SEARCH ---
  const performSearch = async () => {
    if (!searchValue.trim()) return;
    const { displayValue } = await search(searchValue);
    // Po znalezieniu działki — pokaż TERYT w pasku zamiast surowego inputu
    if (displayValue !== searchValue) {
      setSearchValue(displayValue);
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setSearchValue(entry.result.teryt?.formatted || entry.input);
    // Re-run search to populate result
    search(entry.result.teryt?.formatted || entry.input);
  };

  // --- ALT+O ---
  const isReportStartActive = !!(searchResult && !searchResult.error && (searchResult.teryt?.formatted || searchResult.kw?.raw));

  const openAllLinks = useCallback(() => {
    if (!searchResult) return;
    if (searchResult.teryt?.formatted) {
      const generatedLinks = LinkGenerator.generateLinks(searchResult.teryt.formatted);
      if (generatedLinks) {
        window.open(generatedLinks.geoportal, '_blank');
        if (generatedLinks.municipal) window.open(generatedLinks.municipal, '_blank');
        if (generatedLinks.ekw) window.open(generatedLinks.ekw, '_blank');
        else window.open(generatedLinks.gunb, '_blank');
        if (searchResult.kw?.raw) navigator.clipboard.writeText(searchResult.kw.raw).catch(console.error);
        if (generatedLinks.specialized) {
          if (generatedLinks.specialized.nid) window.open(generatedLinks.specialized.nid, '_blank');
          if (generatedLinks.specialized.bdl) window.open(generatedLinks.specialized.bdl, '_blank');
          if (generatedLinks.specialized.isok) window.open(generatedLinks.specialized.isok, '_blank');
        }
      }
    } else if (searchResult.kw?.raw) {
      navigator.clipboard.writeText(searchResult.kw.raw).catch(console.error);
      const ekwUrl = NATIONAL_LINKS.ekw(searchResult.kw.kodSadu, searchResult.kw.numer, searchResult.kw.cyfraKontrolna);
      window.open(ekwUrl, '_blank');
      if (searchResult.teryt?.raw) window.open(NATIONAL_LINKS.geoportal(searchResult.teryt.raw), '_blank');
    }
  }, [searchResult]);

  const resetWizard = () => {
    setSelectedWoj(null); setSelectedPow(null); setSelectedGm(null); setSelectedMj(null);
    setObrebNumber(''); setDzialkaNumber('');
  };

  // --- HOTKEYS ---
  useHotkeys(KEYBOARD_SHORTCUTS.multiOpen, (e) => {
    e.preventDefault();
    if (activeTab === 'search' && isReportStartActive) openAllLinks();
  }, { enabled: activeTab === 'search' && isReportStartActive, enableOnFormTags: true });

  useHotkeys(KEYBOARD_SHORTCUTS.search, (e) => {
    e.preventDefault();
    if (activeTab === 'search') performSearch();
  }, { enabled: activeTab === 'search', enableOnFormTags: true });

  useHotkeys(KEYBOARD_SHORTCUTS.clear, () => {
    if (activeTab === 'search') {
      setSearchValue('');
      searchInputRef.current?.focus();
    }
  }, { enabled: activeTab === 'search', enableOnFormTags: true });

  // --- Status helpers ---
  const isSearching = searchStatus === 'searching' || searchStatus === 'geocoding' || searchStatus === 'resolving';

  // Category badge
  const categoryLabel: Record<string, string> = {
    teryt: 'TERYT',
    parcel: 'Nr działki',
    address: 'Adres',
    kw: 'Księga Wieczysta',
    link: 'Link',
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-800 text-slate-200 overflow-hidden font-sans">
      {/* HEADER */}
      <header className="flex-shrink-0 flex items-center bg-white/5 backdrop-blur-2xl border-b border-white/10 px-6 py-4 shadow-lg z-30 relative">
        <div className="flex items-center gap-3 mr-8">
          <img src="/icons/icon-512x512.png" alt="Logo" className="w-9 h-9 rounded-lg shadow-md" />
          <img src="/icons/logo-text-light.svg" alt="Pomocnik Kasi" className="h-9" />
        </div>
        <nav className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'search'
                ? 'bg-blue-500/20 text-blue-300 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.3)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" /> Wyszukiwarka
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'photo'
                ? 'bg-purple-500/20 text-purple-300 shadow-[inset_0_0_0_1px_rgba(192,132,252,0.3)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Generator Zdjęć
          </button>
        </nav>
      </header>

      <main className="flex-1 w-full h-full relative overflow-hidden flex">

        {activeTab === 'search' && (
          <div className="w-full h-full flex flex-col md:flex-row relative">

            {/* LEWY PANEL — SIDEBAR */}
            <div className="w-full md:w-[380px] flex-shrink-0 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.15)]">

              {/* Smart Search Bar */}
              <div className="p-6 border-b border-white/10 bg-white/[0.03] backdrop-blur-2xl relative z-10 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold tracking-wider text-zinc-300 uppercase">Smart Search</h3>
                  {inputCategory && searchStatus !== 'idle' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                      {categoryLabel[inputCategory] || inputCategory}
                    </span>
                  )}
                </div>
                <div className="relative group mb-2">
                  <input
                    ref={searchInputRef}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="TERYT, nr działki, KW lub adres..."
                    className="w-full bg-white/10 border border-white/10 p-4 pr-12 rounded-xl text-[15px] font-medium text-white transition-all duration-200 focus:bg-white/15 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10 focus:outline-none placeholder-zinc-400 shadow-sm group-hover:border-white/20"
                    onKeyDown={(e) => { if (e.key === 'Enter') performSearch(); }}
                  />
                  <button
                    onClick={performSearch}
                    disabled={isSearching || !searchValue.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg px-3 flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:hover:bg-blue-500 shadow-md"
                    title="Szukaj (Enter)"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
                {/* Status message */}
                {isSearching && statusMessage && (
                  <p className="text-xs text-blue-400 mt-1 flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> {statusMessage}
                  </p>
                )}

                {/* Kreator TERYT */}
                <h3 className="text-sm font-bold tracking-wider text-zinc-300 mb-3 uppercase border-t pt-4 mt-4 border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>Kreator Działki (TERYT)</span>
                    {loadingTeryt && <Loader2 className="w-3 h-3 animate-spin" />}
                  </div>
                  <button onClick={resetWizard} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors" title="Resetuj kreator">
                    <Trash2 size={14} />
                  </button>
                </h3>
                <div className="flex flex-col gap-3">
                  <select value={selectedWoj?.id || ''} onChange={e => { const val = terytData.find(w => w.id === e.target.value); setSelectedWoj(val); setSelectedPow(null); setSelectedGm(null); setSelectedMj(null); }}
                    className="w-full bg-white/10 border border-white/10 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400/50 text-slate-200 transition-colors">
                    <option value="" className="bg-slate-800">Wybierz Województwo...</option>
                    {terytData.map(w => <option key={w.id} value={w.id} className="bg-slate-800">{w.name}</option>)}
                  </select>

                  <select value={selectedPow?.id?.substring(2) || ''} onChange={e => { const val = selectedWoj.powiaty.find((p: any) => p.id.substring(2) === e.target.value); setSelectedPow(val); setSelectedGm(null); setSelectedMj(null); }}
                    disabled={!selectedWoj} className="w-full bg-white/10 border border-white/10 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400/50 text-slate-200 disabled:opacity-30 transition-colors">
                    <option value="" className="bg-slate-800">Wybierz Powiat...</option>
                    {selectedWoj?.powiaty.map((p: any) => <option key={p.id} value={p.id.substring(2)} className="bg-slate-800">{p.name}</option>)}
                  </select>

                  <select value={selectedGm?.id || ''} onChange={e => { const val = selectedPow.gminy.find((g: any) => g.id === e.target.value); setSelectedGm(val); setSelectedMj(null); }}
                    disabled={!selectedPow} className="w-full bg-white/10 border border-white/10 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400/50 text-slate-200 disabled:opacity-30 transition-colors">
                    <option value="" className="bg-slate-800">Wybierz Gminę...</option>
                    {selectedPow?.gminy.map((g: any) => <option key={g.id} value={g.id} className="bg-slate-800">{g.name}</option>)}
                  </select>

                  <select value={selectedMj?.id || ''} onChange={e => { const val = selectedGm.miejscowosci.find((m: any) => m.id === e.target.value); setSelectedMj(val); }}
                    disabled={!selectedGm} className="w-full bg-white/10 border border-white/10 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400/50 text-slate-200 disabled:opacity-30 transition-colors">
                    <option value="" className="bg-slate-800">Wybierz Miejscowość...</option>
                    {selectedGm?.miejscowosci.map((m: any) => <option key={m.id} value={m.id} className="bg-slate-800">{m.name}</option>)}
                  </select>

                  <div className="flex gap-2">
                    <input placeholder="Obręb (opcja)" value={obrebNumber} onChange={e => setObrebNumber(e.target.value.replace(/\D/g, '').substring(0, 4))} disabled={!selectedGm}
                      className="w-28 bg-white/10 border border-white/10 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400/50 text-white disabled:opacity-30 transition-colors placeholder:text-zinc-300" />
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <input placeholder="Nr działki (np. 123/4)" value={dzialkaNumber} onChange={e => setDzialkaNumber(e.target.value)} disabled={!selectedGm}
                      className="flex-1 min-w-0 bg-white/10 border border-white/10 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400/50 text-white disabled:opacity-30 transition-colors placeholder:text-zinc-300"
                      onKeyDown={e => { if (e.key === 'Enter') handleAssembleUldk(); }} />
                    <button onClick={handleAssembleUldk} disabled={!selectedGm || !dzialkaNumber}
                      className="w-10 h-10 shrink-0 bg-blue-500 hover:bg-blue-400 disabled:bg-white/5 disabled:text-slate-600 text-white rounded-lg flex items-center justify-center transition-colors shadow-md disabled:shadow-none" title="Szukaj działki">
                      <Check size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Archiwum */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
                  <h3 className="flex items-center gap-2 font-semibold text-white text-sm">
                    <History size={16} /> Archiwum ({history.length})
                  </h3>
                  <div className="flex gap-2 text-xs">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-transparent border border-white/10 rounded p-1 text-zinc-300 outline-none">
                      <option value="date" className="bg-slate-800">Daty</option>
                      <option value="address" className="bg-slate-800">Adresu</option>
                      <option value="name" className="bg-slate-800">Nazwy</option>
                    </select>
                    {history.length > 0 && (
                      <button onClick={clearHistory} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Wyczyść archiwum">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                  {history.length === 0 ? (
                    <div className="text-center text-zinc-400 text-sm mt-10">Brak zapisanych wyszukiwań.</div>
                  ) : (
                    sortedHistory.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => loadFromHistory(entry)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 cursor-pointer group shadow-sm bg-white/5 backdrop-blur-lg ${
                          searchResult && searchResult.teryt?.formatted === entry.result.teryt?.formatted
                            ? 'border-blue-400/40 ring-2 ring-blue-400/20'
                            : 'border-white/10 hover:border-blue-400/30 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          {editingId === entry.id ? (
                            <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                              <input autoFocus value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)}
                                className="flex-1 border border-white/20 bg-white/10 rounded px-2 py-1 text-sm outline-none focus:border-blue-400/50 text-white" placeholder="Dodaj nazwę..."
                                onKeyDown={(e) => { if (e.key === 'Enter') { updateHistoryName(entry.id, editNameValue); setEditingId(null); } }} />
                              <button onClick={() => { updateHistoryName(entry.id, editNameValue); setEditingId(null); }} className="text-green-400 hover:bg-green-500/10 p-1 rounded-md">
                                <Check size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-white truncate" title={entry.customName || entry.result.address || 'Nieznany Adres'}>
                                {entry.customName || entry.result.address || 'Brak Adresu'}
                              </p>
                              <p className="text-xs text-zinc-400 mt-0.5 truncate font-mono">
                                {entry.result.teryt?.formatted || entry.result.kw?.raw || entry.input}
                              </p>
                            </div>
                          )}
                          {!editingId && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setEditingId(entry.id); setEditNameValue(entry.customName || ''); }}
                                className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded" title="Edytuj nazwę"><Save size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); const text = entry.result.teryt?.formatted || entry.result.kw?.raw; if (text) navigator.clipboard.writeText(text); }}
                                className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-white/10 rounded" title="Kopiuj Identyfikator"><Copy size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); removeFromHistory(entry.id); }}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded" title="Usuń"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* PRAWY PANEL — TOOLBAR + LOGO/MINIMAPA */}
            <div className="flex-1 relative flex flex-col isolate overflow-hidden">
              <div className="w-full flex flex-col h-full p-6">

                <Toolbar parcelId={activeParcelId} gminaName={activeGminaName} centroid={parcelCentroid} />

                <div className="flex-1 min-h-0 relative">
                  {multiSearching ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-300">
                      <Loader2 className="w-12 h-12 animate-spin text-amber-400 mb-4" />
                      <p className="text-sm font-semibold text-slate-400">Szukam działki we wszystkich obrębach...</p>
                    </div>
                  ) : multiParcels.length > 0 && !selectedFromMulti ? (
                    <div className="absolute inset-0 flex flex-col">
                      <div className="shrink-0 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl mb-3 text-sm text-amber-300 font-medium">
                        Znaleziono {multiParcels.length} działek o tym numerze. Kliknij właściwą na mapie.
                      </div>
                      <Minimap
                        parcelId={null}
                        multiParcels={multiParcels}
                        onParcelSelect={(teryt) => {
                          setSearchValue(teryt);
                          setSelectedFromMulti(true);
                          search(teryt);
                        }}
                        className="w-full flex-1"
                      />
                    </div>
                  ) : !activeParcelId ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-500">
                      <div className="flex flex-col items-center gap-6 select-none">
                        <img src="/icons/logo-text.svg" alt="Pomocnik Kasi" className="w-[840px] max-w-full" />
                        <p className="text-sm text-zinc-400 mt-2 max-w-sm text-center">Wybierz działkę w panelu bocznym lub wyszukaj po numerze TERYT, aby uruchomić narzędzia.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col">
                      {selectedFromMulti && multiParcels.length > 1 && (
                        <button
                          onClick={() => setSelectedFromMulti(false)}
                          className="shrink-0 mb-3 self-start px-4 py-2 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/15 text-slate-300 transition-colors border border-white/10"
                        >
                          ← Wróć do wyboru ({multiParcels.length} działek)
                        </button>
                      )}
                      <Minimap parcelId={cleanParcelId(activeParcelId)} onCentroidReady={setParcelCentroid} className="w-full flex-1" />
                    </div>
                  )}
                </div>

                {/* Błąd wyszukiwania */}
                {searchResult?.error && !toast && (
                  <div className="mt-4 shrink-0 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-300">
                    <p className="font-semibold text-red-400 mb-1">Błąd wyszukiwania</p>
                    <p className="text-sm">{searchResult.error}</p>
                  </div>
                )}
              </div>

              {/* TOAST */}
              {toast && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-white/10 backdrop-blur-2xl text-white px-5 py-3 rounded-xl shadow-xl border border-white/10 flex items-center gap-3 max-w-md">
                    <p className="text-sm">{toast}</p>
                    <button onClick={dismissToast} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'photo' && (
          <div className="w-full h-full overflow-hidden">
            <PhotoGenerator />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
