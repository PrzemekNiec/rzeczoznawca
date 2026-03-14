import React from 'react';
import { Map, Globe, FileStack, PersonStanding } from 'lucide-react';
import { cleanParcelId, NATIONAL_LINKS, slugify, GMINA_NAMES } from '../config/links';

interface ToolbarProps {
  parcelId: string | null;
  gminaName?: string;
  centroid?: { lat: number; lng: number } | null;
}

const Toolbar: React.FC<ToolbarProps> = ({ parcelId, gminaName, centroid }) => {
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
    },
    {
      label: 'Geoportal Krajowy',
      icon: <Globe size={22} />,
      color: 'emerald',
      href: cleanId ? NATIONAL_LINKS.geoportal(parcelId!) : null,
    },
    {
      label: 'Plany Ogólne',
      icon: <FileStack size={22} />,
      color: 'orange',
      href: cleanId && teryt6 ? NATIONAL_LINKS.planyOgolne(teryt6, gminaSlug, parcelId!) : null,
    },
    {
      label: 'Street View',
      icon: <PersonStanding size={22} />,
      color: 'sky',
      href: centroid ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${centroid.lat},${centroid.lng}` : null,
    },
  ];

  const colorMap: Record<string, { bg: string; hover: string; icon: string; border: string }> = {
    blue: {
      bg: 'bg-blue-500/15',
      hover: 'hover:bg-blue-500/25 hover:border-blue-400/40 hover:shadow-blue-500/20',
      icon: 'text-blue-300',
      border: 'border-blue-400/25',
    },
    emerald: {
      bg: 'bg-emerald-500/15',
      hover: 'hover:bg-emerald-500/25 hover:border-emerald-400/40 hover:shadow-emerald-500/20',
      icon: 'text-emerald-300',
      border: 'border-emerald-400/25',
    },
    orange: {
      bg: 'bg-orange-500/15',
      hover: 'hover:bg-orange-500/25 hover:border-orange-400/40 hover:shadow-orange-500/20',
      icon: 'text-orange-300',
      border: 'border-orange-400/25',
    },
    sky: {
      bg: 'bg-sky-500/15',
      hover: 'hover:bg-sky-500/25 hover:border-sky-400/40 hover:shadow-sky-500/20',
      icon: 'text-sky-300',
      border: 'border-sky-400/25',
    },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
      {buttons.map((btn) => {
        const colors = colorMap[btn.color];
        const isActive = !!btn.href;

        if (!isActive) {
          return (
            <div
              key={btn.label}
              className="h-16 md:h-24 flex flex-col items-center justify-center gap-1 md:gap-2 rounded-xl border border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed"
              title="Wprowadź działkę w panelu bocznym"
            >
              <span className="text-slate-500">{btn.icon}</span>
              <span className="text-xs font-semibold text-slate-500">{btn.label}</span>
            </div>
          );
        }

        return (
          <a
            key={btn.label}
            href={btn.href || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`h-16 md:h-24 flex flex-col items-center justify-center gap-1 md:gap-2 rounded-xl border ${colors.border} ${colors.bg} ${colors.hover} backdrop-blur-xl transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 group`}
            title={btn.label}
          >
            <span className={`${colors.icon} group-hover:scale-110 transition-transform`}>
              {btn.icon}
            </span>
            <span className="text-xs font-semibold text-white/80">{btn.label}</span>
          </a>
        );
      })}
    </div>
  );
};

export default Toolbar;
