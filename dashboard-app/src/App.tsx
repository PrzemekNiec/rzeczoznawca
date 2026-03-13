import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, Image as ImageIcon, Loader2, History, Trash2, Copy, Save, Check, MapPinned, X } from 'lucide-react';
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

  useEffect(() => {
    setLoadingTeryt(true);
    fetch('/data/teryt_data.json')
      .then(res => res.json())
      .then(data => { setTerytData(data); setLoadingTeryt(false); })
      .catch(err => { console.error("Failed to load TERYT data", err); setLoadingTeryt(false); });
  }, []);

  const handleAssembleUldk = useCallback(() => {
    if (selectedGm && obrebNumber && dzialkaNumber) {
      const paddedObreb = obrebNumber.padStart(4, '0');
      const assembled = `${selectedGm.id}.${paddedObreb}.${dzialkaNumber}`;
      setSearchValue(assembled);
    }
  }, [selectedGm, obrebNumber, dzialkaNumber]);

  // --- AKTYWNA DZIAŁKA ---
  const activeParcelId = useMemo(() => {
    if (searchResult?.teryt?.formatted) return searchResult.teryt.formatted;
    if (selectedGm && obrebNumber && dzialkaNumber) {
      const paddedObreb = obrebNumber.padStart(4, '0');
      return `${selectedGm.id}.${paddedObreb}.${dzialkaNumber}`;
    }
    return null;
  }, [searchResult, selectedGm, obrebNumber, dzialkaNumber]);

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
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* HEADER */}
      <header className="flex-shrink-0 flex items-center bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 shadow-sm z-30 relative">
        <h1 className="text-xl font-bold text-blue-600 mr-8 tracking-tight">Dashboard Rzeczoznawcy V2</h1>
        <nav className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'search'
                ? 'bg-blue-50 text-blue-600 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.2)]'
                : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4" /> Rdzeń TERYT
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === 'photo'
                ? 'bg-purple-50 text-purple-600 shadow-[inset_0_0_0_1px_rgba(147,51,234,0.2)]'
                : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Generator Zdjęć
          </button>
        </nav>
      </header>

      <main className="flex-1 w-full h-full relative overflow-hidden flex bg-slate-50">

        {activeTab === 'search' && (
          <div className="w-full h-full flex flex-col md:flex-row relative">

            {/* LEWY PANEL — SIDEBAR */}
            <div className="w-full md:w-[380px] flex-shrink-0 bg-white/90 backdrop-blur-md border-r border-slate-200/50 flex flex-col h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">

              {/* Smart Search Bar */}
              <div className="p-6 border-b border-slate-200/50 bg-white/50 backdrop-blur-md relative z-10 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Smart Search</h3>
                  {inputCategory && searchStatus !== 'idle' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
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
                    className="w-full bg-slate-100/50 border border-slate-200 p-4 pr-12 rounded-xl text-[15px] font-medium transition-all duration-200 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 focus:outline-none placeholder-slate-400 shadow-sm group-hover:border-slate-300"
                    onKeyDown={(e) => { if (e.key === 'Enter') performSearch(); }}
                  />
                  <button
                    onClick={performSearch}
                    disabled={isSearching || !searchValue.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:hover:bg-blue-600 shadow-sm"
                    title="Szukaj (Enter)"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
                {/* Status message */}
                {isSearching && statusMessage && (
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> {statusMessage}
                  </p>
                )}

                {/* Kreator TERYT */}
                <h3 className="text-sm font-bold tracking-wider text-slate-400 mb-3 uppercase border-t pt-4 mt-4 border-slate-200/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>Kreator Działki (TERYT)</span>
                    {loadingTeryt && <Loader2 className="w-3 h-3 animate-spin" />}
                  </div>
                  <button onClick={resetWizard} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Resetuj kreator">
                    <Trash2 size={14} />
                  </button>
                </h3>
                <div className="flex flex-col gap-3">
                  <select value={selectedWoj?.id || ''} onChange={e => { const val = terytData.find(w => w.id === e.target.value); setSelectedWoj(val); setSelectedPow(null); setSelectedGm(null); setSelectedMj(null); }}
                    className="w-full bg-slate-100/50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 text-slate-700 transition-colors">
                    <option value="">Wybierz Województwo...</option>
                    {terytData.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>

                  <select value={selectedPow?.id?.substring(2) || ''} onChange={e => { const val = selectedWoj.powiaty.find((p: any) => p.id.substring(2) === e.target.value); setSelectedPow(val); setSelectedGm(null); setSelectedMj(null); }}
                    disabled={!selectedWoj} className="w-full bg-slate-100/50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 text-slate-700 disabled:opacity-50 transition-colors">
                    <option value="">Wybierz Powiat...</option>
                    {selectedWoj?.powiaty.map((p: any) => <option key={p.id} value={p.id.substring(2)}>{p.name}</option>)}
                  </select>

                  <select value={selectedGm?.id || ''} onChange={e => { const val = selectedPow.gminy.find((g: any) => g.id === e.target.value); setSelectedGm(val); setSelectedMj(null); }}
                    disabled={!selectedPow} className="w-full bg-slate-100/50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 text-slate-700 disabled:opacity-50 transition-colors">
                    <option value="">Wybierz Gminę...</option>
                    {selectedPow?.gminy.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>

                  <select value={selectedMj?.id || ''} onChange={e => { const val = selectedGm.miejscowosci.find((m: any) => m.id === e.target.value); setSelectedMj(val); }}
                    disabled={!selectedGm} className="w-full bg-slate-100/50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 text-slate-700 disabled:opacity-50 transition-colors">
                    <option value="">Wybierz Miejscowość...</option>
                    {selectedGm?.miejscowosci.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>

                  <div className="flex gap-2">
                    <input placeholder="Nr Obrębu (np. 0005)" value={obrebNumber} onChange={e => setObrebNumber(e.target.value.replace(/\D/g, '').substring(0, 4))} disabled={!selectedMj}
                      className="w-32 bg-slate-100/50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 text-slate-700 disabled:opacity-50 transition-colors placeholder:text-slate-400" />
                    <input placeholder="Nr działki (np. 123/4)" value={dzialkaNumber} onChange={e => setDzialkaNumber(e.target.value)} disabled={!obrebNumber}
                      className="flex-1 bg-slate-100/50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 text-slate-700 disabled:opacity-50 transition-colors placeholder:text-slate-400"
                      onKeyDown={e => { if (e.key === 'Enter') handleAssembleUldk(); }} />
                    <button onClick={handleAssembleUldk} disabled={!selectedGm || !obrebNumber || !dzialkaNumber}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-3.5 rounded-lg flex items-center justify-center transition-colors shadow-sm disabled:shadow-none" title="Załaduj ID do paska wyszukiwania">
                      <Check size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Archiwum */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/30">
                <div className="p-4 border-b border-slate-200/50 flex items-center justify-between bg-white/40 shrink-0">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                    <History size={16} /> Archiwum ({history.length})
                  </h3>
                  <div className="flex gap-2 text-xs">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-transparent border border-slate-200 rounded p-1 text-slate-600 outline-none">
                      <option value="date">Daty</option>
                      <option value="address">Adresu</option>
                      <option value="name">Nazwy</option>
                    </select>
                    {history.length > 0 && (
                      <button onClick={clearHistory} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Wyczyść archiwum">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                  {history.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm mt-10">Brak zapisanych wyszukiwań.</div>
                  ) : (
                    sortedHistory.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => loadFromHistory(entry)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 cursor-pointer group shadow-sm bg-white ${
                          searchResult && searchResult.teryt?.formatted === entry.result.teryt?.formatted
                            ? 'border-blue-400 ring-2 ring-blue-400/20'
                            : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          {editingId === entry.id ? (
                            <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                              <input autoFocus value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)}
                                className="flex-1 border rounded px-2 py-1 text-sm outline-none focus:border-blue-500 text-slate-700" placeholder="Dodaj nazwę..."
                                onKeyDown={(e) => { if (e.key === 'Enter') { updateHistoryName(entry.id, editNameValue); setEditingId(null); } }} />
                              <button onClick={() => { updateHistoryName(entry.id, editNameValue); setEditingId(null); }} className="text-green-600 hover:bg-green-50 p-1 rounded-md">
                                <Check size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-800 truncate" title={entry.customName || entry.result.address || 'Nieznany Adres'}>
                                {entry.customName || entry.result.address || 'Brak Adresu'}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate font-mono">
                                {entry.result.teryt?.formatted || entry.result.kw?.raw || entry.input}
                              </p>
                            </div>
                          )}
                          {!editingId && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setEditingId(entry.id); setEditNameValue(entry.customName || ''); }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edytuj nazwę"><Save size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); const text = entry.result.teryt?.formatted || entry.result.kw?.raw; if (text) navigator.clipboard.writeText(text); }}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded" title="Kopiuj Identyfikator"><Copy size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); removeFromHistory(entry.id); }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Usuń"><Trash2 size={14} /></button>
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

                <Toolbar parcelId={activeParcelId} gminaName={activeGminaName} />

                <div className="flex-1 min-h-0 relative">
                  {!activeParcelId ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-500">
                      <div className="flex flex-col items-center gap-6 select-none">
                        <img src="/icons/icon-512x512.png" alt="Dashboard Rzeczoznawcy" className="w-56 h-56 rounded-2xl shadow-lg shadow-blue-500/20 object-contain" />
                        <div className="text-center">
                          <h2 className="text-2xl font-bold text-slate-700 tracking-tight">Dashboard Rzeczoznawcy</h2>
                          <p className="text-sm text-slate-400 mt-2 max-w-sm">Wybierz działkę w panelu bocznym lub wyszukaj po numerze TERYT, aby uruchomić narzędzia.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Minimap parcelId={cleanParcelId(activeParcelId)} className="w-full h-full" />
                  )}
                </div>

                {/* Błąd wyszukiwania */}
                {searchResult?.error && !toast && (
                  <div className="mt-4 shrink-0 bg-red-50 border border-red-200 p-4 rounded-xl text-red-700">
                    <p className="font-semibold text-red-600 mb-1">Błąd wyszukiwania</p>
                    <p className="text-sm">{searchResult.error}</p>
                  </div>
                )}
              </div>

              {/* TOAST */}
              {toast && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-slate-800 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 max-w-md">
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
