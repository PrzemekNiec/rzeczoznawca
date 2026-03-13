import React from 'react';
import { Map, Globe, FileStack, Search, Copy } from 'lucide-react';
import { cleanParcelId, NATIONAL_LINKS, slugify, GMINA_NAMES } from '../config/links';

interface ToolbarProps {
  parcelId: string | null; // full TERYT formatted id, e.g. "241003_2.0003.123/4"
  gminaName?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({ parcelId, gminaName }) => {
  const cleanId = parcelId ? cleanParcelId(parcelId) : null;
  const teryt6 = parcelId ? parcelId.replace(/[^0-9]/g, '').substring(0, 6) : null;
  const resolvedGminaName = gminaName || (teryt6 ? GMINA_NAMES[teryt6] || '' : '');
  const gminaSlug = slugify(resolvedGminaName);

  const buttons = [
    {
      label: 'e-Mapa',
      icon: <Map size={22} />,
      color: 'blue',
      href: cleanId ? `https://e-mapa.net/polska/${cleanId}` : null,
      onClick: undefined,
    },
    {
      label: 'Geoportal Krajowy',
      icon: <Globe size={22} />,
      color: 'emerald',
      href: cleanId ? NATIONAL_LINKS.geoportal(parcelId!) : null,
      onClick: undefined,
    },
    {
      label: 'Plany Ogólne',
      icon: <FileStack size={22} />,
      color: 'orange',
      href: cleanId && teryt6 ? NATIONAL_LINKS.planyOgolne(teryt6, gminaSlug, parcelId!) : null,
      onClick: undefined,
    },
    {
      label: 'Wyszukiwarka GUNB',
      icon: <Search size={22} />,
      color: 'amber',
      href: NATIONAL_LINKS.gunb(),
      onClick: cleanId
        ? () => {
            navigator.clipboard.writeText(cleanId).catch(console.error);
          }
        : undefined,
    },
  ];

  const colorMap: Record<string, { bg: string; hover: string; icon: string; border: string }> = {
    blue: {
      bg: 'bg-blue-50/80',
      hover: 'hover:bg-blue-100/80 hover:border-blue-300',
      icon: 'text-blue-500',
      border: 'border-blue-200/50',
    },
    emerald: {
      bg: 'bg-emerald-50/80',
      hover: 'hover:bg-emerald-100/80 hover:border-emerald-300',
      icon: 'text-emerald-500',
      border: 'border-emerald-200/50',
    },
    orange: {
      bg: 'bg-orange-50/80',
      hover: 'hover:bg-orange-100/80 hover:border-orange-300',
      icon: 'text-orange-500',
      border: 'border-orange-200/50',
    },
    amber: {
      bg: 'bg-amber-50/80',
      hover: 'hover:bg-amber-100/80 hover:border-amber-300',
      icon: 'text-amber-500',
      border: 'border-amber-200/50',
    },
  };

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {buttons.map((btn) => {
        const colors = colorMap[btn.color];
        const isActive = !!btn.href;

        if (!isActive && btn.label !== 'Wyszukiwarka GUNB') {
          return (
            <div
              key={btn.label}
              className="h-24 flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/30 bg-slate-50/50 opacity-50 cursor-not-allowed"
              title="Wprowadź działkę w panelu bocznym"
            >
              <span className="text-slate-400">{btn.icon}</span>
              <span className="text-xs font-semibold text-slate-400">{btn.label}</span>
            </div>
          );
        }

        return (
          <a
            key={btn.label}
            href={btn.href || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (btn.onClick) btn.onClick();
              if (btn.label === 'Wyszukiwarka GUNB' && cleanId) {
                // Visual feedback for clipboard
                const el = e.currentTarget.querySelector('.gunb-copy-hint');
                if (el) {
                  el.textContent = 'Skopiowano!';
                  setTimeout(() => { el.textContent = 'kopiuje ID'; }, 1500);
                }
              }
            }}
            className={`h-24 flex flex-col items-center justify-center gap-2 rounded-xl border ${colors.border} ${colors.bg} ${colors.hover} transition-all duration-200 shadow-sm hover:shadow-md group relative`}
            title={btn.label === 'Wyszukiwarka GUNB' && cleanId ? `Otwiera GUNB + kopiuje: ${cleanId}` : btn.label}
          >
            <span className={`${colors.icon} group-hover:scale-110 transition-transform`}>
              {btn.icon}
            </span>
            <span className="text-xs font-semibold text-slate-700">{btn.label}</span>
            {btn.label === 'Wyszukiwarka GUNB' && cleanId && (
              <span className="gunb-copy-hint absolute bottom-1 right-2 text-[10px] text-amber-500 flex items-center gap-0.5">
                <Copy size={10} /> kopiuje ID
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
};

export default Toolbar;
