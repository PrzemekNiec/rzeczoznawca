import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Trash2, Check } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import PhotoGenerator from './components/PhotoGenerator';
import Toolbar from './components/Toolbar';
import Minimap from './components/Minimap';
import Toast from './components/Toast';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ArchiveList from './components/ArchiveList';
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

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-800 text-slate-200 overflow-hidden font-sans">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 w-full h-full relative overflow-hidden flex">

        {activeTab === 'search' && (
          <div className="w-full h-full flex flex-col md:flex-row relative">

            {/* LEWY PANEL — SIDEBAR */}
            <div className="w-full md:w-[380px] flex-shrink-0 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.15)]">

              {/* Smart Search Bar */}
              <div className="p-6 border-b border-white/10 bg-white/[0.03] backdrop-blur-2xl relative z-10 shrink-0">
                <SearchBar
                  value={searchValue}
                  onChange={setSearchValue}
                  onSearch={performSearch}
                  isSearching={isSearching}
                  statusMessage={statusMessage}
                  inputCategory={inputCategory}
                  searchStatus={searchStatus}
                  inputRef={searchInputRef}
                />

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

              <ArchiveList
                history={history}
                activeEntryTeryt={searchResult?.teryt?.formatted || null}
                onLoadEntry={loadFromHistory}
                onRemoveEntry={removeFromHistory}
                onUpdateName={updateHistoryName}
                onClearAll={clearHistory}
              />

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

              {toast && <Toast message={toast} onDismiss={dismissToast} />}
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
