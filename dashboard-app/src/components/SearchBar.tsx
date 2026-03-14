import { Search, Loader2 } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  teryt: 'TERYT',
  parcel: 'Nr działki',
  address: 'Adres',
  kw: 'Księga Wieczysta',
  link: 'Link',
};

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  statusMessage: string;
  inputCategory: string;
  searchStatus: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isSearching,
  statusMessage,
  inputCategory,
  searchStatus,
  inputRef,
}) => (
  <>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold tracking-wider text-zinc-300 uppercase">Smart Search</h3>
      {inputCategory && searchStatus !== 'idle' && (
        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
          {CATEGORY_LABELS[inputCategory] || inputCategory}
        </span>
      )}
    </div>
    <div className="relative group mb-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="TERYT, nr działki, KW lub adres..."
        className="w-full bg-white/10 border border-white/10 p-4 pr-12 rounded-xl text-[15px] font-medium text-white transition-all duration-200 focus:bg-white/15 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-400/10 focus:outline-none placeholder-zinc-400 shadow-sm group-hover:border-white/20"
        onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
      />
      <button
        onClick={onSearch}
        disabled={isSearching || !value.trim()}
        className="absolute right-2 top-2 bottom-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg px-3 flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:hover:bg-blue-500 shadow-md"
        title="Szukaj (Enter)"
      >
        {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
      </button>
    </div>
    {isSearching && statusMessage && (
      <p className="text-xs text-blue-400 mt-1 flex items-center gap-1.5">
        <Loader2 size={12} className="animate-spin" /> {statusMessage}
      </p>
    )}
  </>
);

export default SearchBar;
