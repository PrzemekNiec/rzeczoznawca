import { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, Check } from 'lucide-react';

interface TerytWizardProps {
  onSearchValueChange: (value: string) => void;
  onMultiResult: (parcels: Array<{ teryt: string; wkt: string }>) => void;
  onMultiSearchingChange: (searching: boolean) => void;
  onGminaChange: (gmina: { id: string; name: string; simple_name?: string; miejscowosci?: any[] } | null, obreb: string, dzialka: string) => void;
  search: (value: string) => Promise<any>;
  dismissToast: () => void;
}

const TerytWizard: React.FC<TerytWizardProps> = ({
  onSearchValueChange,
  onMultiResult,
  onMultiSearchingChange,
  onGminaChange,
  search,
  dismissToast,
}) => {
  const [terytData, setTerytData] = useState<any[]>([]);
  const [loadingTeryt, setLoadingTeryt] = useState(false);

  const [selectedWoj, setSelectedWoj] = useState<any>(null);
  const [selectedPow, setSelectedPow] = useState<any>(null);
  const [selectedGm, setSelectedGm] = useState<any>(null);
  const [selectedMj, setSelectedMj] = useState<any>(null);
  const [obrebNumber, setObrebNumber] = useState('');
  const [dzialkaNumber, setDzialkaNumber] = useState('');

  // Notify parent of gmina/obreb/dzialka changes
  useEffect(() => {
    onGminaChange(selectedGm, obrebNumber, dzialkaNumber);
  }, [selectedGm, obrebNumber, dzialkaNumber, onGminaChange]);

  // IndexedDB cache for TERYT data
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

    onMultiResult([]);

    if (obrebNumber) {
      const paddedObreb = obrebNumber.padStart(4, '0');
      const assembled = `${selectedGm.id}.${paddedObreb}.${dzialkaNumber}`;
      onSearchValueChange(assembled);
      return;
    }

    onMultiSearchingChange(true);
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

    onMultiSearchingChange(false);

    if (found.length === 0) {
      dismissToast();
      onSearchValueChange('');
      alert('Nie znaleziono działki o tym numerze w żadnym obrębie wybranej gminy.');
    } else if (found.length === 1) {
      const terytClean = found[0].teryt.replace(/\.AR_\d+\./, '.');
      onSearchValueChange(terytClean);
      onMultiResult([]);
      search(terytClean);
    } else {
      onMultiResult(found);
    }
  }, [selectedGm, obrebNumber, dzialkaNumber, dismissToast, search, onSearchValueChange, onMultiResult, onMultiSearchingChange]);

  const resetWizard = () => {
    setSelectedWoj(null); setSelectedPow(null); setSelectedGm(null); setSelectedMj(null);
    setObrebNumber(''); setDzialkaNumber('');
  };

  return (
    <>
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
    </>
  );
};

export default TerytWizard;
