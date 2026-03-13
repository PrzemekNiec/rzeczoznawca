import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2 } from 'lucide-react';

interface MinimapProps {
  parcelId: string | null;
  className?: string;
}

/** Invalidates map size after mount / visibility change */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Delay to let CSS transitions finish
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/** Queries ULDK API for parcel geometry (WGS84) and flies to it */
function ParcelLayer({ parcelId }: { parcelId: string | null }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!parcelId) return;

    setLoading(true);
    const url = `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${parcelId}&result=geom_wkt&srid=4326`;

    fetch(url)
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n');
        if (lines.length < 2 || lines[0].trim() !== '0') {
          console.warn('ULDK: parcel not found or error, response:', text.substring(0, 200));
          return;
        }

        // Strip SRID prefix if present (e.g. "SRID=4326;POLYGON(...)")
        const raw = lines.slice(1).join('').trim();
        const wkt = raw.replace(/^SRID=\d+;/, '');
        if (!wkt.startsWith('POLYGON') && !wkt.startsWith('MULTIPOLYGON')) {
          console.warn('ULDK: unexpected WKT format:', raw.substring(0, 100));
          return;
        }

        const geojson = wktToGeoJSON(wkt);
        if (!geojson) return;

        const layer = L.geoJSON(geojson, {
          style: {
            color: '#3b82f6',
            weight: 3,
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
          },
        });

        layer.addTo(map);
        layerRef.current = layer;

        // Ensure map knows its size before flying
        map.invalidateSize();

        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 18, duration: 1.2 });
        }
      })
      .catch(err => console.warn('ULDK parcel fetch failed:', err))
      .finally(() => setLoading(false));
  }, [parcelId, map]);

  if (loading) {
    return (
      <div className="leaflet-top leaflet-left" style={{ pointerEvents: 'none' }}>
        <div className="bg-white/90 shadow-md rounded-lg p-2 m-2 flex items-center gap-2 text-sm text-slate-600" style={{ zIndex: 1000 }}>
          <Loader2 size={14} className="animate-spin" /> Szukam działki...
        </div>
      </div>
    );
  }

  return null;
}

/** Minimal WKT POLYGON/MULTIPOLYGON → GeoJSON converter (lon/lat from srid=4326) */
function wktToGeoJSON(wkt: string): GeoJSON.Geometry | null {
  try {
    if (wkt.startsWith('MULTIPOLYGON')) {
      const inner = wkt.replace('MULTIPOLYGON(((', '').replace(/\)\)\)$/, '');
      const polygons = inner.split(')),((').map(ring => {
        return [ring.split(',').map(pair => {
          const [lon, lat] = pair.trim().split(/\s+/).map(Number);
          return [lon, lat] as [number, number];
        })];
      });
      return { type: 'MultiPolygon', coordinates: polygons };
    }

    if (wkt.startsWith('POLYGON')) {
      const inner = wkt.replace('POLYGON((', '').replace(/\)\)$/, '');
      const rings = inner.split('),(').map(ring => {
        return ring.split(',').map(pair => {
          const [lon, lat] = pair.trim().split(/\s+/).map(Number);
          return [lon, lat] as [number, number];
        });
      });
      return { type: 'Polygon', coordinates: rings };
    }
  } catch (e) {
    console.warn('WKT parse error:', e);
  }
  return null;
}

/** Center on parcel button */
function CenterButton({ parcelId }: { parcelId: string | null }) {
  const map = useMap();

  if (!parcelId) return null;

  const handleCenter = () => {
    map.eachLayer(layer => {
      if (layer instanceof L.GeoJSON) {
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 18, duration: 0.8 });
        }
      }
    });
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto' }}>
      <button
        onClick={handleCenter}
        className="bg-white shadow-md border border-slate-200 rounded-lg p-2 m-2 hover:bg-blue-50 transition-colors cursor-pointer"
        title="Centruj na działce"
        style={{ zIndex: 1000 }}
      >
        <Crosshair size={18} className="text-blue-600" />
      </button>
    </div>
  );
}

const Minimap: React.FC<MinimapProps> = ({ parcelId, className = '' }) => {
  const defaultCenter: [number, number] = [52.0, 19.5];
  const defaultZoom = 6;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200/50 shadow-sm ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        <MapResizer />
        <ParcelLayer parcelId={parcelId} />
        <CenterButton parcelId={parcelId} />
      </MapContainer>
    </div>
  );
};

export default Minimap;
