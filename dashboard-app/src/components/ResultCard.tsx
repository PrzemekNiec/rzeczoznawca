import React, { useMemo } from 'react';
import type { ResolverResult } from '../types/property';
import { LinkGenerator } from '../services/LinkGenerator';
import { TERYT_MAPPINGS, NATIONAL_LINKS, cleanParcelId, GMINA_NAMES } from '../config/links';
import { Map, MapPinned, FileText, Castle, Trees, Waves, Rocket, FileStack, Copy } from 'lucide-react';

interface ResultCardProps {
  result: ResolverResult;
  onOpenAll: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onOpenAll }) => {
  const links = useMemo(() => {
    if (result.teryt?.formatted) {
      const teryt6 = result.teryt.formatted.replace(/[^0-9]/g, '').substring(0, 6);
      const gminaName = GMINA_NAMES[teryt6] || '';
      return LinkGenerator.generateLinks(result.teryt.formatted, undefined, undefined, gminaName);
    }
    return null;
  }, [result.teryt?.formatted]);

  // Ustalenie czy Gmina to system Custom (wymaga specjalnego bordera)
  const isCustomMunicipal = useMemo(() => {
    if (!result.teryt?.formatted) return false;
    const prefix = result.teryt.formatted.substring(0, 6);
    if (prefix === '246901' || prefix === '126101') return true;
    return TERYT_MAPPINGS[prefix]?.system === 'custom';
  }, [result.teryt?.formatted]);

  if (result.error) {
    return (
      <div className="w-full bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 mt-6 relative z-10 transition-all duration-300">
        <p className="font-semibold text-red-600 mb-1">Błąd wyszukiwania</p>
        <p className="text-sm">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/80 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-sm mt-6 text-slate-800 relative z-10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
      <h2 className="text-xl font-bold mb-4 text-blue-600">Rozpoznana Nieruchomość</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
         <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Format</span>
            <p className="font-medium mt-1 text-rose-500">{result.inputType.toUpperCase()}</p>
         </div>
         {result.teryt?.formatted && (
           <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">TERYT</span>
              <p className="font-mono font-medium mt-1 break-all text-emerald-600">{result.teryt.formatted}</p>
           </div>
         )}
         {result.kw?.raw && (
           <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Księga Wieczysta</span>
              <p className="font-mono font-medium mt-1 break-all text-amber-600">{result.kw.raw}</p>
           </div>
         )}
      </div>

      {(links || result.kw?.raw) && (
        <div className="space-y-6">

          {/* DUŻY PRZYCISK: Otwórz wszystkie portale */}
          <button 
            onClick={() => {
              if (result.kw?.raw) {
                 navigator.clipboard.writeText(result.kw.raw).catch(console.error);
              }
              onOpenAll();
            }}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white p-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-[0_8px_24px_rgba(99,102,241,0.3)] hover:-translate-y-0.5"
          >
            <Rocket size={24} />
            Otwórz wszystkie portale (Skrót: Alt + O)
          </button>
          
          {links && (
          <div>
            {/* GŁÓWNE SYSTEMY */}
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-2 mb-3">
              Główne Serwisy Mapowe
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* GEOPORTAL KRAJOWY */}
              <a 
                href={links.geoportal} 
                target="_blank" rel="noopener noreferrer"
                className="group flex flex-col justify-center items-center gap-2 bg-white/60 p-4 rounded-xl hover:bg-blue-50/80 transition-all border border-slate-200/50 hover:border-blue-300 hover:shadow-md"
                title="Otwórz Geoportal Krajowy"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Map size={20} />
                </div>
                <span className="font-semibold text-sm text-slate-700">Geoportal Krajowy</span>
              </a>

              {/* SYSTEM GMINNY / LOKALNY */}
              {links.municipal ? (
                <a 
                  href={links.municipal} 
                  target="_blank" rel="noopener noreferrer"
                  className={`group flex flex-col justify-center items-center gap-2 bg-white/60 p-4 rounded-xl hover:bg-emerald-50/80 transition-all border ${isCustomMunicipal ? 'border-emerald-300 shadow-sm' : 'border-slate-200/50 hover:border-emerald-300 hover:shadow-md'}`}
                  title={isCustomMunicipal ? "Otwórz Dedykowany System Miejski" : "Otwórz System Gminny"}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${isCustomMunicipal ? 'bg-emerald-200 text-emerald-600' : 'bg-emerald-100 text-emerald-500'}`}>
                    <MapPinned size={20} />
                  </div>
                  <span className="font-semibold text-sm text-slate-700">System Lokalny {isCustomMunicipal && "(Custom)"}</span>
                </a>
              ) : (
                <div 
                  className="flex flex-col justify-center items-center gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200/30 opacity-50 cursor-not-allowed"
                  title="Ten TERYT nie posiada zmapowanego systemu gminnego."
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <MapPinned size={20} />
                  </div>
                  <span className="font-semibold text-sm text-slate-400">Brak Systemu</span>
                </div>
              )}

              {/* E-KW / GUNB (Zależne od tego co mamy dostępne) */}
              <div className="flex flex-col gap-2">
                <a 
                  href={links.ekw ? links.ekw : links.gunb} 
                  target="_blank" rel="noopener noreferrer"
                  onClick={() => {
                    if (links.ekw && result.kw?.raw) {
                      navigator.clipboard.writeText(result.kw.raw).catch(console.error);
                    }
                  }}
                  className={`group flex flex-col justify-center items-center gap-2 bg-white/60 p-4 rounded-xl transition-all border border-slate-200/50 h-full ${links.ekw ? 'hover:bg-rose-50/80 hover:border-rose-300 hover:shadow-md' : 'hover:bg-amber-50/80 hover:border-amber-300 hover:shadow-md'}`}
                  title={links.ekw ? "Otwórz Księgi Wieczyste (Skopiuje numer!)" : "Otwórz Wyszukiwarkę GUNB"}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${links.ekw ? 'bg-rose-100 text-rose-500' : 'bg-amber-100 text-amber-500'}`}>
                    <FileText size={20} />
                  </div>
                  <span className="font-semibold text-sm text-slate-700">{links.ekw ? "Księgi Wieczyste" : "Wyszukiwarka GUNB"}</span>
                </a>
                
                {/* Przyciski pomocnicze (tylko dla GUNB w tym trybie) */}
                {!links.ekw && result.teryt?.formatted && (
                  <button
                    onClick={() => {
                      const cid = cleanParcelId(result.teryt!.formatted);
                      navigator.clipboard.writeText(cid).then(() => {
                        alert(`Skopiowano ID Działki: ${cid}`);
                      });
                    }}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-amber-100/50 hover:bg-amber-200/50 text-amber-700 rounded-lg text-xs font-bold transition-all border border-amber-200/50 shadow-sm hover:shadow-md"
                  >
                    <Copy size={14} /> Kopiuj ID dla GUNB
                  </button>
                )}
              </div>

              {/* PLANY OGÓLNE — zawsze aktywny gdy istnieje TERYT */}
              <a 
                href={links.planyOgolne} 
                target="_blank" rel="noopener noreferrer"
                className="group flex flex-col justify-center items-center gap-2 bg-white/60 p-4 rounded-xl hover:bg-orange-50/80 transition-all border border-slate-200/50 hover:border-orange-300 hover:shadow-md"
                title="Otwórz Plan Ogólny (e-mapa)"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                  <FileStack size={20} />
                </div>
                <span className="font-semibold text-sm text-slate-700">Plany Ogólne</span>
              </a>

            </div>
          </div>
          )}

          {!links && result.kw && (
          <div>
            {/* ZAMIENNIK DLA SAMEGO KW */}
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-2 mb-3">
              Serwisy Ksiąg Wieczystych
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <a 
                href={NATIONAL_LINKS.ekw(result.kw.kodSadu, result.kw.numer, result.kw.cyfraKontrolna)} 
                target="_blank" rel="noopener noreferrer"
                onClick={() => navigator.clipboard.writeText(result.kw!.raw).catch(console.error)}
                className="group flex flex-col justify-center items-center gap-2 bg-white/60 p-4 rounded-xl hover:bg-rose-50/80 transition-all border border-slate-200/50 hover:border-rose-300 hover:shadow-md"
                title="Otwórz Księgi Wieczyste (Skopiuje numer!)"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 bg-rose-100 text-rose-500">
                  <FileText size={20} />
                </div>
                <span className="font-semibold text-sm text-slate-700">Wyszukiwarka E-KW</span>
              </a>
            </div>
          </div>
          )}

          {links && (
          <div>
            {/* SYSTEMY SPECJALISTYCZNE */}
             <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-2 mb-3">
              Rejestry Specjalne
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <a 
                href={links.specialized?.nid || '#'} 
                target={links.specialized?.nid ? "_blank" : undefined}
                rel={links.specialized?.nid ? "noopener noreferrer" : undefined}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border transition-all text-sm font-medium ${
                  links.specialized?.nid 
                  ? 'bg-white/60 border-slate-200/50 hover:bg-purple-50/80 hover:border-purple-300 text-slate-700' 
                  : 'bg-slate-50/40 border-slate-200/30 opacity-50 cursor-not-allowed text-slate-400'
                }`}
                title={!links.specialized?.nid ? "Brak współrzędnych XY dla działki" : "Zabytki NID"}
                onClick={(e) => !links.specialized?.nid && e.preventDefault()}
              >
                <Castle size={16} className={links.specialized?.nid ? "text-purple-500" : ""} /> NID
              </a>

              <a 
                href={links.specialized?.bdl || '#'} 
                target={links.specialized?.bdl ? "_blank" : undefined}
                rel={links.specialized?.bdl ? "noopener noreferrer" : undefined}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border transition-all text-sm font-medium ${
                  links.specialized?.bdl 
                  ? 'bg-white/60 border-slate-200/50 hover:bg-emerald-50/80 hover:border-emerald-300 text-slate-700' 
                  : 'bg-slate-50/40 border-slate-200/30 opacity-50 cursor-not-allowed text-slate-400'
                }`}
                title={!links.specialized?.bdl ? "Brak współrzędnych XY dla działki" : "Bank Danych o Lasach"}
                onClick={(e) => !links.specialized?.bdl && e.preventDefault()}
              >
                <Trees size={16} className={links.specialized?.bdl ? "text-emerald-500" : ""} /> BDL
              </a>

              <a 
                href={links.specialized?.isok || '#'} 
                target={links.specialized?.isok ? "_blank" : undefined}
                rel={links.specialized?.isok ? "noopener noreferrer" : undefined}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border transition-all text-sm font-medium ${
                  links.specialized?.isok 
                  ? 'bg-white/60 border-slate-200/50 hover:bg-blue-50/80 hover:border-blue-300 text-slate-700' 
                  : 'bg-slate-50/40 border-slate-200/30 opacity-50 cursor-not-allowed text-slate-400'
                }`}
                title={!links.specialized?.isok ? "Brak współrzędnych XY dla działki" : "Zagrożenie Powodziowe ISOK"}
                onClick={(e) => !links.specialized?.isok && e.preventDefault()}
              >
                <Waves size={16} className={links.specialized?.isok ? "text-blue-500" : ""} /> ISOK
              </a>
            </div>
          </div>
          )}

        </div>
      )}
    </div>
  );
};
