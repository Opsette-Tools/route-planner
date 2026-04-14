import type { LatLng, RouteLeg, RouteResult, Stop } from '@/types/route';

const OSRM_BASE = 'https://router.project-osrm.org';

function coordsToString(c: LatLng): string {
  return `${c.lng},${c.lat}`;
}

function metersToMiles(m: number): number {
  return Math.round((m / 1609.344) * 10) / 10;
}

function secondsToMinutes(s: number): number {
  return Math.round(s / 60);
}

export async function optimizeRoute(
  homeBase: LatLng,
  stops: Stop[]
): Promise<RouteResult | null> {
  // Build coordinates: home + stops + home (roundtrip)
  const coords = [homeBase, ...stops.map(s => s.coords)].map(coordsToString).join(';');

  try {
    const res = await fetch(
      `${OSRM_BASE}/trip/v1/driving/${coords}?source=first&destination=last&roundtrip=true&geometries=geojson&overview=full&steps=false`
    );
    const data = await res.json();

    if (data.code !== 'Ok' || !data.trips?.length) return null;

    const trip = data.trips[0];
    const waypoints = data.waypoints;

    // Map waypoint indices back to stops (skip first = home base)
    const waypointOrder = waypoints
      .slice(1) // skip home
      .map((wp: any) => wp.waypoint_index - 1) // 0-indexed into stops array
      .filter((i: number) => i >= 0 && i < stops.length);

    // If OSRM returns waypoint_index that doesn't map cleanly, use trips_index
    const orderedStopIds = waypointOrder.map((i: number) => stops[i]?.id).filter(Boolean);

    // If we couldn't map properly, fall back to using the trip legs order
    if (orderedStopIds.length !== stops.length) {
      // Fallback: just return stops in original order
      return await getRouteForOrderedStops(homeBase, stops);
    }

    const legs: RouteLeg[] = [];
    const allNames = ['Home Base', ...orderedStopIds.map(id => {
      const s = stops.find(st => st.id === id);
      return s?.label || s?.address?.split(',')[0] || 'Stop';
    }), 'Home Base'];

    for (let i = 0; i < trip.legs.length; i++) {
      legs.push({
        from: allNames[i],
        to: allNames[i + 1],
        distance: metersToMiles(trip.legs[i].distance),
        duration: secondsToMinutes(trip.legs[i].duration),
      });
    }

    return {
      legs,
      totalDistance: metersToMiles(trip.distance),
      totalDuration: secondsToMinutes(trip.duration),
      geometry: [trip.geometry.coordinates.map((c: number[]) => [c[1], c[0]])],
      orderedStopIds,
    };
  } catch {
    return null;
  }
}

export async function getRouteForOrderedStops(
  homeBase: LatLng,
  stops: Stop[]
): Promise<RouteResult | null> {
  const allCoords = [homeBase, ...stops.map(s => s.coords), homeBase];
  const coordStr = allCoords.map(coordsToString).join(';');

  try {
    const res = await fetch(
      `${OSRM_BASE}/route/v1/driving/${coordStr}?geometries=geojson&overview=full&steps=false`
    );
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const route = data.routes[0];
    const allNames = ['Home Base', ...stops.map(s => s.label || s.address.split(',')[0] || 'Stop'), 'Home Base'];
    const legs: RouteLeg[] = route.legs.map((leg: any, i: number) => ({
      from: allNames[i],
      to: allNames[i + 1],
      distance: metersToMiles(leg.distance),
      duration: secondsToMinutes(leg.duration),
    }));

    return {
      legs,
      totalDistance: metersToMiles(route.distance),
      totalDuration: secondsToMinutes(route.duration),
      geometry: [route.geometry.coordinates.map((c: number[]) => [c[1], c[0]])],
      orderedStopIds: stops.map(s => s.id),
    };
  } catch {
    return null;
  }
}
