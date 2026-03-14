import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import PhotoGenerator from './components/PhotoGenerator';
import Toolbar from './components/Toolbar';
import Minimap from './components/Minimap';
import Toast from './components/Toast';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ArchiveList from './components/ArchiveList';
import TerytWizard from './components/TerytWizard';
import Sidebar from './components/Sidebar';
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

  // Multi-parcel state (from TerytWizard)
  const [multiParcels, setMultiParcels] = useState<Array<{ teryt: string; wkt: string }>>([]);
  const [multiSearching, setMultiSearching] = useState(false);
  const [selectedFromMulti, setSelectedFromMulti] = useState(false);

  // Gmina state (from TerytWizard, needed for activeParcelId/activeGminaName)
  const [wizardGmina, setWizardGmina] = useState<{ id: string; name: string; simple_name?: string } | null>(null);
  const [wizardObreb, setWizardObreb] = useState('');
  const [wizardDzialka, setWizardDzialka] = useState('');

  const handleGminaChange = useCallback((gmina: any, obreb: string, dzialka: string) => {
    setWizardGmina(gmina);
    setWizardObreb(obreb);
    setWizardDzialka(dzialka);
  }, []);

  const handleMultiResult = useCallback((parcels: Array<{ teryt: string; wkt: string }>) => {
    setMultiParcels(parcels);
    setSelectedFromMulti(false);
  }, []);

  // Centroid działki (do Street View)
  const [parcelCentroid, setParcelCentroid] = useState<{ lat: number; lng: number } | null>(null);

  // --- AKTYWNA DZIAŁKA ---
  const activeParcelId = useMemo(() => {
    if (searchResult?.teryt?.formatted) return searchResult.teryt.formatted;
    if (wizardGmina && wizardObreb && wizardDzialka) {
      const paddedObreb = wizardObreb.padStart(4, '0');
      return `${wizardGmina.id}.${paddedObreb}.${wizardDzialka}`;
    }
    return null;
  }, [searchResult, wizardGmina, wizardObreb, wizardDzialka]);

  // Reset centroidu przy zmianie działki (Minimap dostarczy nowy)
  useEffect(() => { setParcelCentroid(null); }, [activeParcelId]);

  const activeGminaName = useMemo(() => {
    if (wizardGmina?.simple_name) return wizardGmina.simple_name;
    if (wizardGmina?.name) return wizardGmina.name.replace(/\s*\(.*\)$/, '');
    return '';
  }, [wizardGmina]);

  // --- PERFORM SEARCH ---
  const performSearch = async () => {
    if (!searchValue.trim()) return;
    const { displayValue } = await search(searchValue);
    if (displayValue !== searchValue) {
      setSearchValue(displayValue);
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setSearchValue(entry.result.teryt?.formatted || entry.input);
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

            <Sidebar>
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

                <TerytWizard
                  onSearchValueChange={setSearchValue}
                  onMultiResult={handleMultiResult}
                  onMultiSearchingChange={setMultiSearching}
                  onGminaChange={handleGminaChange}
                  search={search}
                  dismissToast={dismissToast}
                />
              </div>

              <ArchiveList
                history={history}
                activeEntryTeryt={searchResult?.teryt?.formatted || null}
                onLoadEntry={loadFromHistory}
                onRemoveEntry={removeFromHistory}
                onUpdateName={updateHistoryName}
                onClearAll={clearHistory}
              />
            </Sidebar>

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
