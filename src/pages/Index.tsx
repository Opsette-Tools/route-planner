import { useState, useCallback } from 'react';
import { Typography, Alert, FloatButton, Row, Col, message } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import AppHeader from '@/components/AppHeader';
import SettingsDrawer from '@/components/SettingsDrawer';
import HistoryDrawer from '@/components/HistoryDrawer';
import RouteMap from '@/components/RouteMap';
import StopList from '@/components/StopList';
import RouteActions from '@/components/RouteActions';
import RouteDetails from '@/components/RouteDetails';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useIsMobile } from '@/hooks/use-mobile';
import { geocodeAddress } from '@/services/geocoding';
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
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][][] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const isMobile = useIsMobile();

  const handleAddStop = useCallback(async (query: string) => {
    if (!query.trim()) return;
    if (stops.length >= 15) { message.warning('Maximum 15 stops'); return; }
    setSearchLoading(true);
    const result = await geocodeAddress(query);
    setSearchLoading(false);
    if (result) {
      setStops(prev => [...prev, {
        id: crypto.randomUUID(),
        address: result.address,
        coords: result.coords,
      }]);
      setIsOptimized(false);
      setRouteResult(null);
      setRouteGeometry(null);
    } else {
      message.error('Address not found');
    }
  }, [stops.length]);

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
      message.success('Route optimized!');
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
          onUpdateLabel={(id, label) => setStops(s => s.map(x => x.id === id ? { ...x, label } : x))}
          onUpdateTimeWindow={(id, tw) => setStops(s => s.map(x => x.id === id ? { ...x, timeWindow: tw } : x))}
        />
      )}

      <RouteActions
        stops={stops}
        routeResult={routeResult}
        homeBase={homeBase}
        optimizing={optimizing}
        isOptimized={isOptimized}
        onOptimize={handleOptimize}
        onClear={handleClear}
        onSave={handleSave}
        onTryDemo={handleTryDemo}
      />

      <RouteDetails routeResult={routeResult} stopCount={stops.length} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <AppHeader onOpenSettings={() => setSettingsOpen(true)} onOpenHistory={() => setHistoryOpen(true)} />

      {isMobile ? (
        <>
          <RouteMap
            homeBase={homeBase}
            stops={stops}
            routeGeometry={routeGeometry}
            onAddressSearch={handleAddStop}
            searchLoading={searchLoading}
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
              searchLoading={searchLoading}
            />
          </Col>
        </Row>
      )}

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} homeBase={homeBase} onSetHomeBase={setHomeBase} />
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        savedRoutes={savedRoutes}
        onLoad={handleLoadRoute}
        onReuse={handleReuseRoute}
        onDelete={(id) => setSavedRoutes(prev => prev.filter(r => r.id !== id))}
        onClearAll={() => setSavedRoutes([])}
      />
    </div>
  );
}
