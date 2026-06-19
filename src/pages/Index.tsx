import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Typography, Alert, FloatButton, Row, Col, message, Space, Button } from 'antd';
import { ThunderboltOutlined, SettingOutlined, HistoryOutlined } from '@ant-design/icons';
import { OpsetteHeader } from '@/components/opsette-header';
import SettingsDrawer from '@/components/SettingsDrawer';
import HistoryDrawer from '@/components/HistoryDrawer';
import RouteMap from '@/components/RouteMap';
import StopList from '@/components/StopList';
import RouteActions from '@/components/RouteActions';
import RouteDetails from '@/components/RouteDetails';
import EditStopModal, { type StopEdits } from '@/components/EditStopModal';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { geocodeAddress, reverseGeocode, type GeoBias, type GeocodingResult } from '@/services/geocoding';
import { optimizeRoute, getRouteForOrderedStops } from '@/services/routing';
import type { HomeBase, Stop, SavedRoute, RouteResult } from '@/types/route';

const DEMO_STOPS: Omit<Stop, 'id'>[] = [
  { address: 'Empire State Building, New York, NY', coords: { lat: 40.7484, lng: -73.9857 }, label: 'Johnson' },
  { address: 'Central Park, New York, NY', coords: { lat: 40.7829, lng: -73.9654 }, label: 'Garcia' },
  { address: 'Times Square, New York, NY', coords: { lat: 40.7580, lng: -73.9855 }, label: 'Smith' },
  { address: 'Brooklyn Bridge, New York, NY', coords: { lat: 40.7061, lng: -73.9969 }, label: 'Williams' },
];

export default function Index() {
  const [homeBase, setHomeBase] = useLocalStorage<HomeBase | null>('rp_homeBase', null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [savedRoutes, setSavedRoutes] = useLocalStorage<SavedRoute[]>('rp_savedRoutes', []);
  const [autoReoptimize, setAutoReoptimize] = useLocalStorage<boolean>('rp_autoReoptimize', false);
  // Departure clock shared by RouteDetails (per-leg arrival display) and the
  // printed route sheet (RouteActions). Single source of truth so the sheet
  // matches exactly what's on screen. Minutes-from-midnight; default 8:00 AM.
  const [departureMins, setDepartureMins] = useState(8 * 60);
  const [dwellMins, setDwellMins] = useState(0);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][][] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const isMobile = useIsMobile();

  // Bias every address search toward the home base so common street names resolve
  // locally (the "Orlando search kept returning Lincoln, NE" fix). Falls back to
  // US-only when no home base is set yet.
  const searchBias: GeoBias | undefined = useMemo(
    () => (homeBase ? { center: homeBase.coords } : undefined),
    [homeBase]
  );

  // Single seam for adding a stop from an already-resolved coordinate + address.
  // Used by: picking an autocomplete suggestion, map clicks, and injected parent
  // records — so none of those paths re-run a guess-y geocode.
  const addStopRecord = useCallback((record: { address: string; coords: { lat: number; lng: number }; label?: string }) => {
    let added = false;
    setStops(prev => {
      if (prev.length >= 15) return prev;
      added = true;
      return [...prev, {
        id: crypto.randomUUID(),
        address: record.address,
        coords: record.coords,
        label: record.label,
      }];
    });
    if (!added) { message.warning('Maximum 15 stops'); return; }
    setIsOptimized(false);
    setRouteResult(null);
    setRouteGeometry(null);
  }, []);

  const handleAddStopResult = useCallback((result: GeocodingResult) => {
    addStopRecord(result);
  }, [addStopRecord]);

  const handleAddStop = useCallback(async (query: string) => {
    if (!query.trim()) return;
    if (stops.length >= 15) { message.warning('Maximum 15 stops'); return; }
    setSearchLoading(true);
    const result = await geocodeAddress(query, searchBias);
    setSearchLoading(false);
    if (result) {
      addStopRecord(result);
    } else {
      message.error('Address not found. Try a different format (e.g., "123 Main St, City, State").');
    }
  }, [stops.length, searchBias, addStopRecord]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (stops.length >= 15) { message.warning('Maximum 15 stops'); return; }
    setSearchLoading(true);
    const address = await reverseGeocode({ lat, lng });
    setSearchLoading(false);
    if (address) {
      addStopRecord({ address, coords: { lat, lng } });
      message.success('Stop added from map');
    } else {
      message.error('Could not determine address for this location');
    }
  }, [stops.length, addStopRecord]);

  // Dragging a stop pin moves it. Update coords immediately so the pin stays put
  // and the connected line redraws (the auto-connect effect keys off stop ids, so
  // we nudge it via a fresh address after the reverse-geocode resolves). Editing a
  // stop invalidates an optimized result — fall back to "needs re-optimize".
  const handleStopDragEnd = useCallback(async (id: string, lat: number, lng: number) => {
    const coords = { lat, lng };
    // Optimistic: snap coords + a placeholder address, drop optimized state.
    setStops(prev => prev.map(s => s.id === id ? { ...s, coords, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` } : s));
    setIsOptimized(false);
    setRouteResult(null);
    setRouteGeometry(null);
    // Resolve a real address in the background; ignore if the stop was since removed.
    const address = await reverseGeocode(coords);
    if (address) {
      setStops(prev => prev.map(s => s.id === id ? { ...s, address } : s));
    }
  }, []);

  // Save edits from the Edit Stop modal (label, time window, and/or a re-searched
  // location). If the coordinates moved, the optimized order is no longer valid, so
  // we drop the result and let the auto-connect effect redraw — same as a drag.
  const handleEditStop = useCallback((id: string, edits: StopEdits) => {
    setStops(prev => prev.map(s => {
      if (s.id !== id) return s;
      const moved = s.coords.lat !== edits.coords.lat || s.coords.lng !== edits.coords.lng;
      if (moved) {
        setIsOptimized(false);
        setRouteResult(null);
        setRouteGeometry(null);
      }
      return { ...s, address: edits.address, coords: edits.coords, label: edits.label, timeWindow: edits.timeWindow };
    }));
  }, []);

  const handleOptimize = useCallback(async () => {
    if (!homeBase || stops.length < 2) return;
    setOptimizing(true);
    const result = await optimizeRoute(homeBase.coords, stops);
    setOptimizing(false);
    if (result) {
      // Reorder stops
      const ordered = result.orderedStopIds
        .map(id => stops.find(s => s.id === id))
        .filter(Boolean) as Stop[];
      setStops(ordered);
      setRouteResult(result);
      setRouteGeometry(result.geometry);
      setIsOptimized(true);
      if (result.optimized) {
        message.success('Route optimized!');
      } else {
        message.warning('Route could not be optimized, showing original order.');
      }
    } else {
      message.error('Optimization failed. Try fewer stops.');
    }
  }, [homeBase, stops]);

  const handleClear = () => {
    setStops([]);
    setRouteResult(null);
    setRouteGeometry(null);
    setIsOptimized(false);
  };

  const handleSave = (name: string) => {
    if (!homeBase || !routeResult) return;
    const saved: SavedRoute = {
      id: crypto.randomUUID(),
      name,
      date: new Date().toLocaleDateString(),
      stops: [...stops],
      homeBase,
      totalDistance: routeResult.totalDistance,
      totalDuration: routeResult.totalDuration,
    };
    setSavedRoutes(prev => [saved, ...prev].slice(0, 20));
    message.success('Route saved!');
  };

  const handleLoadRoute = async (route: SavedRoute) => {
    setStops(route.stops);
    setHomeBase(route.homeBase);
    setHistoryOpen(false);
    // Recalculate route
    const result = await getRouteForOrderedStops(route.homeBase.coords, route.stops);
    if (result) {
      setRouteResult(result);
      setRouteGeometry(result.geometry);
      setIsOptimized(true);
    }
  };

  const handleReuseRoute = (route: SavedRoute) => {
    setStops(route.stops.map(s => ({ ...s, id: crypto.randomUUID() })));
    setHomeBase(route.homeBase);
    setRouteResult(null);
    setRouteGeometry(null);
    setIsOptimized(false);
    setHistoryOpen(false);
    message.success('Route loaded — ready to optimize!');
  };

  const handleTryDemo = () => {
    setStops(DEMO_STOPS.map(s => ({ ...s, id: crypto.randomUUID() })));
    if (!homeBase) {
      setHomeBase({
        address: 'Grand Central Terminal, New York, NY',
        coords: { lat: 40.7527, lng: -73.9772 },
      });
    }
  };

  // ── Auto-connect: keep the map line in sync with the stop list ────────────
  // Adding/removing/reordering a stop used to leave the old line on the map until
  // you pressed Optimize again — the "it doesn't connect" confusion. Now, whenever
  // the stops change and we're not already showing an optimized result, we redraw
  // a plain connected line (home → stops in current order → home) via OSRM's
  // /route endpoint. Optimize then becomes "reorder for efficiency," not "make the
  // line appear." A request-sequence guard prevents a slow response from drawing a
  // stale line over a newer edit.
  const drawSeq = useRef(0);
  useEffect(() => {
    if (!homeBase || stops.length < 1 || isOptimized) return;
    const mySeq = ++drawSeq.current;
    (async () => {
      // Auto-reoptimize: when the toggle is on and there are ≥2 stops, every edit
      // re-runs the full optimizer (reorders for efficiency) instead of just
      // redrawing the current-order line. Costs an extra OSRM round-trip per edit,
      // which is why it's opt-in. With <2 stops there's nothing to reorder, so we
      // fall through to the plain connected-line redraw.
      if (autoReoptimize && stops.length >= 2) {
        const result = await optimizeRoute(homeBase.coords, stops);
        if (mySeq !== drawSeq.current) return; // superseded by a newer edit
        if (result) {
          const ordered = result.orderedStopIds
            .map(id => stops.find(s => s.id === id))
            .filter(Boolean) as Stop[];
          setStops(ordered);
          setRouteResult(result);
          setRouteGeometry(result.geometry);
          setIsOptimized(true);
        }
        return;
      }
      const result = await getRouteForOrderedStops(homeBase.coords, stops);
      if (mySeq !== drawSeq.current) return; // superseded by a newer edit
      if (result) {
        setRouteGeometry(result.geometry);
        setRouteResult(result);
      }
    })();
    // depend on the identity of the stop sequence + each stop's coords (so a dragged
    // pin redraws the line) + home base + the auto-reoptimize toggle, not object refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeBase?.coords.lat, homeBase?.coords.lng, stops.map(s => `${s.id}:${s.coords.lat},${s.coords.lng}`).join(','), isOptimized, autoReoptimize]);

  // ── Parent-app bridge (future appointments/clients integration) ───────────
  // The tool runs in an iframe with no bridge today. This listener is the seam:
  // a parent window can postMessage records and we'll plot them without the
  // free-text geocode guesswork. Records with coords are plotted directly;
  // records with only an address are geocoded (US-biased) before plotting.
  //
  // Message shape (parent → iframe):
  //   { source: 'opsette', type: 'route-planner/add-stops',
  //     stops: [{ address, lat?, lng?, label? }, ...] }
  //   { source: 'opsette', type: 'route-planner/set-home-base',
  //     homeBase: { address, lat?, lng? } }
  //
  // TODO(parent-app): lock the accepted origin to the real parent domain once
  // the bridge is built, instead of accepting any origin.
  useEffect(() => {
    async function resolve(rec: { address?: string; lat?: number; lng?: number; label?: string }) {
      if (typeof rec.lat === 'number' && typeof rec.lng === 'number') {
        return { address: rec.address || `${rec.lat.toFixed(5)}, ${rec.lng.toFixed(5)}`, coords: { lat: rec.lat, lng: rec.lng }, label: rec.label };
      }
      if (rec.address) {
        const g = await geocodeAddress(rec.address, { countryCode: 'us' });
        if (g) return { address: g.address, coords: g.coords, label: rec.label };
      }
      return null;
    }

    async function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || data.source !== 'opsette' || typeof data.type !== 'string') return;

      if (data.type === 'route-planner/add-stops' && Array.isArray(data.stops)) {
        for (const rec of data.stops) {
          const resolved = await resolve(rec);
          if (resolved) addStopRecord(resolved);
        }
        message.success('Stops added from app');
      } else if (data.type === 'route-planner/set-home-base' && data.homeBase) {
        const resolved = await resolve(data.homeBase);
        if (resolved) {
          setHomeBase({ address: resolved.address, coords: resolved.coords });
          message.success('Home base set from app');
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [addStopRecord, setHomeBase]);

  const controls = (
    <div className="p-3">
      {!homeBase && (
        <Alert
          type="info"
          message="Set your home base first"
          description="Open Settings to set your starting location."
          showIcon
          className="mb-3"
        />
      )}

      {stops.length === 0 ? (
        <Typography.Text type="secondary">Add your first stop to start planning your route</Typography.Text>
      ) : (
        <StopList
          stops={stops}
          onReorder={(newStops) => { setStops(newStops); setIsOptimized(false); setRouteResult(null); setRouteGeometry(null); }}
          onDelete={(id) => { setStops(s => s.filter(x => x.id !== id)); setIsOptimized(false); setRouteResult(null); setRouteGeometry(null); }}
          onEdit={setEditingStop}
        />
      )}

      <RouteActions
        stops={stops}
        routeResult={routeResult}
        homeBase={homeBase}
        optimizing={optimizing}
        isOptimized={isOptimized}
        departureMins={departureMins}
        dwellMins={dwellMins}
        onOptimize={handleOptimize}
        onClear={handleClear}
        onSave={handleSave}
        onTryDemo={handleTryDemo}
      />

      <RouteDetails
        routeResult={routeResult}
        stopCount={stops.length}
        departureMins={departureMins}
        onDepartureChange={setDepartureMins}
        dwellMins={dwellMins}
        onDwellChange={setDwellMins}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <OpsetteHeader
        rightExtra={
          <>
            <Button type="text" shape="circle" icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)} aria-label="History" />
            <Button type="text" shape="circle" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} aria-label="Settings" />
            <ThemeToggleButton />
          </>
        }
      />

      {isMobile ? (
        <>
          <RouteMap
            homeBase={homeBase}
            stops={stops}
            routeGeometry={routeGeometry}
            onAddressSearch={handleAddStop}
            onAddStopResult={handleAddStopResult}
            onMapClick={handleMapClick}
            onStopDragEnd={handleStopDragEnd}
            searchLoading={searchLoading}
            bias={searchBias}
          />
          {controls}
          {stops.length >= 2 && homeBase && (
            <FloatButton
              type="primary"
              icon={<ThunderboltOutlined />}
              tooltip="Optimize Route"
              onClick={handleOptimize}
              style={{ bottom: 24, right: 24 }}
            />
          )}
        </>
      ) : (
        <Row>
          <Col span={10}>{controls}</Col>
          <Col span={14} className="p-3">
            <RouteMap
              homeBase={homeBase}
              stops={stops}
              routeGeometry={routeGeometry}
              onAddressSearch={handleAddStop}
              onAddStopResult={handleAddStopResult}
              onMapClick={handleMapClick}
              onStopDragEnd={handleStopDragEnd}
              searchLoading={searchLoading}
              bias={searchBias}
            />
          </Col>
        </Row>
      )}

      <EditStopModal
        stop={editingStop}
        open={editingStop !== null}
        onClose={() => setEditingStop(null)}
        onSave={handleEditStop}
        bias={searchBias}
      />

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        homeBase={homeBase}
        onSetHomeBase={setHomeBase}
        autoReoptimize={autoReoptimize}
        onSetAutoReoptimize={setAutoReoptimize}
      />
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        savedRoutes={savedRoutes}
        onLoad={handleLoadRoute}
        onReuse={handleReuseRoute}
        onDelete={(id) => setSavedRoutes(prev => prev.filter(r => r.id !== id))}
        onClearAll={() => setSavedRoutes([])}
      />

      <footer style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px solid #f0f0f0', marginTop: 16 }}>
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Link to="/about" style={{ fontSize: 12, color: '#8c8c8c' }}>About</Link>
          <Link to="/privacy" style={{ fontSize: 12, color: '#8c8c8c' }}>Privacy Policy</Link>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            By{' '}
            <a href="https://opsette.io" target="_blank" rel="noopener noreferrer" style={{ color: '#8c8c8c', textDecoration: 'underline' }}>
              Opsette
            </a>
          </span>
        </Space>
      </footer>
    </div>
  );
}
