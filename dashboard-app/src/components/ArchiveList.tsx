import { useState, useMemo } from 'react';
import { History, Trash2, Copy, Save, Check } from 'lucide-react';
import type { HistoryEntry } from '../types/property';

interface ArchiveListProps {
  history: HistoryEntry[];
  activeEntryTeryt: string | null;
  onLoadEntry: (entry: HistoryEntry) => void;
  onRemoveEntry: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onClearAll: () => void;
}

const ArchiveList: React.FC<ArchiveListProps> = ({
  history,
  activeEntryTeryt,
  onLoadEntry,
  onRemoveEntry,
  onUpdateName,
  onClearAll,
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'address' | 'name'>('date');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const sortedHistory = useMemo(() =>
    [...history].sort((a, b) => {
      if (sortBy === 'date') return b.timestamp - a.timestamp;
      if (sortBy === 'address') {
        const adrA = a.result.address || a.result.teryt?.formatted || a.result.kw?.raw || '';
        const adrB = b.result.address || b.result.teryt?.formatted || b.result.kw?.raw || '';
        return adrA.localeCompare(adrB);
      }
      if (sortBy === 'name') return (a.customName || '').localeCompare(b.customName || '');
      return 0;
    }),
  [history, sortBy]);

  return (
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
            <button onClick={onClearAll} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Wyczyść archiwum">
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
              onClick={() => onLoadEntry(entry)}
              className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 cursor-pointer group shadow-sm bg-white/5 backdrop-blur-lg ${
                activeEntryTeryt && activeEntryTeryt === entry.result.teryt?.formatted
                  ? 'border-blue-400/40 ring-2 ring-blue-400/20'
                  : 'border-white/10 hover:border-blue-400/30 hover:bg-white/10'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                {editingId === entry.id ? (
                  <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                    <input autoFocus value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)}
                      className="flex-1 border border-white/20 bg-white/10 rounded px-2 py-1 text-sm outline-none focus:border-blue-400/50 text-white" placeholder="Dodaj nazwę..."
                      onKeyDown={(e) => { if (e.key === 'Enter') { onUpdateName(entry.id, editNameValue); setEditingId(null); } }} />
                    <button onClick={() => { onUpdateName(entry.id, editNameValue); setEditingId(null); }} className="text-green-400 hover:bg-green-500/10 p-1 rounded-md">
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
                  <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(entry.id); setEditNameValue(entry.customName || ''); }}
                      className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded" title="Edytuj nazwę"><Save size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); const text = entry.result.teryt?.formatted || entry.result.kw?.raw; if (text) navigator.clipboard.writeText(text); }}
                      className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-white/10 rounded" title="Kopiuj Identyfikator"><Copy size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onRemoveEntry(entry.id); }}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded" title="Usuń"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ArchiveList;
