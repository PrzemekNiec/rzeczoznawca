import { useState, useEffect } from 'react';

const DB_NAME = 'teryt-cache';
const STORE = 'data';
const KEY = 'teryt_data';

/**
 * Given a TERYT parcelId (e.g. "240209_5.0005.1951/11"), looks up gmina name
 * from cached teryt_data in IndexedDB.
 */
export function useTerytGminaName(parcelId: string | null): string {
  const [name, setName] = useState('');

  useEffect(() => {
    if (!parcelId) {
      setName('');
      return;
    }

    // Extract components: "240209_5.0005.1951/11" → woj="24", pow="2402", gmId="240209_5"
    const digits = parcelId.replace(/[^0-9]/g, '');
    if (digits.length < 7) return;

    const wojId = digits.substring(0, 2);
    const powId = digits.substring(0, 4);
    // gmina ID in teryt_data includes type suffix, e.g. "240209_5"
    const gmBase = digits.substring(0, 6);

    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE, 'readonly');
      const get = tx.objectStore(STORE).get(KEY);
      get.onsuccess = () => {
        const data = get.result as any[] | undefined;
        if (!data) return;

        const woj = data.find((w: any) => w.id === wojId);
        if (!woj) return;

        const pow = woj.powiaty?.find((p: any) => p.id === powId);
        if (!pow) return;

        // Match gmina by first 6 digits of its ID (ignoring _type suffix)
        const gm = pow.gminy?.find((g: any) => g.id.replace(/[^0-9]/g, '').substring(0, 6) === gmBase);
        if (!gm) return;

        const resolved = gm.simple_name || gm.name?.replace(/\s*\(.*\)$/, '') || '';
        setName(resolved);
      };
    };
  }, [parcelId]);

  return name;
}
