
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Button } from 'antd';
import { FullscreenOutlined, LoadingOutlined } from '@ant-design/icons';
import type { HomeBase, Stop } from '@/types/route';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createHomeIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:#F59E0B;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      <svg viewBox="64 64 896 896" width="16" height="16" fill="#fff"><path d="M946.5 505L560.1 118.8l-25.9-25.9a31.5 31.5 0 00-44.4 0L77.5 505a63.9 63.9 0 00-18.8 46c.4 35.2 29.7 63.3 64.9 63.3h42.5V940h691.8V614.3h43.4c17.1 0 33.2-6.7 45.3-18.8a63.6 63.6 0 0018.7-45.3c0-17-6.7-33.1-18.8-45.2z"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createStopIcon(num: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:#2563EB;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function RecenterMap({ homeBase }: { homeBase: HomeBase | null }) {
  const map = useMap();

  useEffect(() => {
    if (homeBase) {
      map.flyTo([homeBase.coords.lat, homeBase.coords.lng], 12, { duration: 1 });
    }
  }, [homeBase?.coords.lat, homeBase?.coords.lng, map]);

  return null;
}

function FitBoundsControl({ homeBase, stops }: { homeBase: HomeBase | null; stops: Stop[] }) {
  const map = useMap();

  const fitBounds = () => {
    const points: L.LatLngExpression[] = [];
    if (homeBase) points.push([homeBase.coords.lat, homeBase.coords.lng]);
    stops.forEach(s => points.push([s.coords.lat, s.coords.lng]));
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  };

  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
      <Button size="small" icon={<FullscreenOutlined />} onClick={fitBounds} style={{ background: '#fff' }} />
    </div>
  );
}

interface Props {
  homeBase: HomeBase | null;
  stops: Stop[];
  routeGeometry: [number, number][][] | null;
  onAddressSearch: (value: string) => void;
  searchLoading: boolean;
}

export default function RouteMap({ homeBase, stops, routeGeometry, onAddressSearch, searchLoading }: Props) {
  const center: [number, number] = homeBase
    ? [homeBase.coords.lat, homeBase.coords.lng]
    : [39.8283, -98.5795]; // US center

  return (
    <div className="relative" style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      {/* Search overlay */}
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 52, zIndex: 1000,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Search address to add stop..."
          disabled={searchLoading}
          style={{
            flex: 1, padding: '8px 12px', border: 'none', outline: 'none',
            background: 'transparent', fontSize: 14, borderRadius: 8,
            opacity: searchLoading ? 0.6 : 1,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAddressSearch((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
        />
        {searchLoading && <LoadingOutlined style={{ marginRight: 10, color: '#2563EB' }} />}
      </div>

      <MapContainer
        center={center}
        zoom={homeBase ? 12 : 4}
        style={{ height: '50vh', minHeight: 300 }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBoundsControl homeBase={homeBase} stops={stops} />
        <RecenterMap homeBase={homeBase} />

        {homeBase && (
          <Marker position={[homeBase.coords.lat, homeBase.coords.lng]} icon={createHomeIcon()}>
            <Popup><b>Home Base</b><br />{homeBase.address}</Popup>
          </Marker>
        )}

        {stops.map((stop, i) => (
          <Marker key={stop.id} position={[stop.coords.lat, stop.coords.lng]} icon={createStopIcon(i + 1)}>
            <Popup>
              <b>Stop {i + 1}</b><br />
              {stop.label && <>{stop.label}<br /></>}
              {stop.address}
            </Popup>
          </Marker>
        ))}

        {routeGeometry?.map((line, i) => (
          <Polyline key={i} positions={line} color="#2563EB" weight={4} opacity={0.8} />
        ))}
      </MapContainer>
    </div>
  );
}
