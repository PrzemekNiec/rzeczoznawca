import { Search, Image as ImageIcon } from 'lucide-react';

interface HeaderProps {
  activeTab: 'search' | 'photo';
  onTabChange: (tab: 'search' | 'photo') => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => (
  <header className="flex-shrink-0 flex items-center bg-white/5 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 shadow-lg z-30 relative">
    <div className="flex items-center gap-3 mr-4 sm:mr-8">
      <img src="/icons/icon-512x512.png" alt="Logo" className="w-9 h-9 rounded-lg shadow-md" />
      <img src="/icons/logo-text-light.svg" alt="Pomocnik Kasi" className="h-9 hidden sm:block" />
    </div>
    <nav className="flex items-center gap-2 sm:gap-3">
      <button
        onClick={() => onTabChange('search')}
        className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold transition-all duration-200 ${
          activeTab === 'search'
            ? 'bg-blue-500/20 text-blue-300 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.3)]'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        <Search className="w-4 h-4" /> <span className="hidden sm:inline">Wyszukiwarka</span>
      </button>
      <button
        onClick={() => onTabChange('photo')}
        className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold transition-all duration-200 ${
          activeTab === 'photo'
            ? 'bg-purple-500/20 text-purple-300 shadow-[inset_0_0_0_1px_rgba(192,132,252,0.3)]'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        <ImageIcon className="w-4 h-4" /> <span className="hidden sm:inline">Generator Zdjęć</span>
      </button>
    </nav>
  </header>
);

export default Header;
