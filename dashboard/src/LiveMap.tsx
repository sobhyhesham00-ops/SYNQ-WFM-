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
  layers: [
    // Solid ground so the map still reads while tiles load (or if blocked).
    { id: 'bg', type: 'background', paint: { 'background-color': '#e7ebf6' } },
    { id: 'osm', type: 'raster', source: 'osm' },
  ],
};

export function LiveMap({
  drivers,
  livePins,
  route,
}: {
  drivers: Driver[];
  livePins: Record<string, Pin>;
  route?: { lat: number; lng: number }[] | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});
  const playhead = useRef<maplibregl.Marker | null>(null);
  const rafRef = useRef<number | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: OSM_STYLE,
      center: [31.2357, 30.0444], // Cairo
      zoom: 12,
    });
    map.on('load', () => { loaded.current = true; });
    mapRef.current = map;
    // Null the ref on cleanup so StrictMode's remount re-creates the map
    // instead of bailing out on a stale (already-removed) reference.
    return () => { map.remove(); mapRef.current = null; loaded.current = false; };
  }, []);

  // Draw + animate the route-replay polyline whenever `route` changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = () => {
      const coords = (route ?? []).map((p) => [p.lng, p.lat] as [number, number]);
      const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
      const data = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } };

      if (!coords.length) {
        if (src) src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
        playhead.current?.remove(); playhead.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        return;
      }
      if (src) src.setData(data);
      else {
        map.addSource('route', { type: 'geojson', data });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route',
          paint: { 'line-color': '#7c5cff', 'line-width': 5, 'line-opacity': 0.9 },
          layout: { 'line-cap': 'round', 'line-join': 'round' } });
      }
      // fit to the route
      const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(b, { padding: 60, duration: 600 });

      // animate a playhead marker along the path
      if (!playhead.current) {
        const el = document.createElement('div');
        el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#7c5cff;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)';
        playhead.current = new maplibregl.Marker({ element: el });
      }
      playhead.current.setLngLat(coords[0]).addTo(map);
      let i = 0;
      const step = () => {
        i += 1;
        if (i >= coords.length) return;
        playhead.current!.setLngLat(coords[i]);
        rafRef.current = requestAnimationFrame(() => setTimeout(step, 120) as unknown as number);
      };
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      step();
    };
    if (loaded.current) draw(); else map.once('load', draw);
  }, [route]);

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
