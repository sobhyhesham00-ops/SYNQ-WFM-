// Live driver map using MapLibre GL + free OpenStreetMap raster tiles.
// No Google Maps billing. Markers update in place as WS location events arrive.
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Driver } from './api';

interface Pin { driverId: string; lat: number; lng: number }

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export function LiveMap({
  drivers,
  livePins,
}: {
  drivers: Driver[];
  livePins: Record<string, Pin>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: ref.current,
      style: OSM_STYLE,
      center: [31.2357, 30.0444], // Cairo
      zoom: 12,
    });
    return () => mapRef.current?.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Merge seed positions with live WS pins (live wins).
    const positions: Record<string, { lat: number; lng: number; name: string; status: string }> = {};
    for (const d of drivers) {
      if (d.currentLat != null && d.currentLng != null) {
        positions[d.id] = { lat: d.currentLat, lng: d.currentLng, name: d.name, status: d.status };
      }
    }
    for (const [id, p] of Object.entries(livePins)) {
      const d = drivers.find((x) => x.id === id);
      positions[id] = { lat: p.lat, lng: p.lng, name: d?.name ?? id, status: d?.status ?? 'Delivering' };
    }

    for (const [id, p] of Object.entries(positions)) {
      const color = p.status === 'Delivering' ? '#e63946' : p.status === 'Idle' ? '#2a9d8f' : '#999';
      if (markers.current[id]) {
        markers.current[id].setLngLat([p.lng, p.lat]);
      } else {
        markers.current[id] = new maplibregl.Marker({ color })
          .setLngLat([p.lng, p.lat])
          .setPopup(new maplibregl.Popup().setText(p.name))
          .addTo(map);
      }
    }
  }, [drivers, livePins]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
