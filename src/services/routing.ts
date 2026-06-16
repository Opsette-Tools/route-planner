import type { LatLng, RouteLeg, RouteResult, RouteStep, Stop } from '@/types/route';

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

/** Turn OSRM's maneuver object into a human-readable instruction. */
function describeManeuver(maneuver: { type?: string; modifier?: string }, road: string): string {
  const type = maneuver.type || '';
  const mod = maneuver.modifier || '';
  const onRoad = road ? ` onto ${road}` : '';
  switch (type) {
    case 'depart': return road ? `Head out on ${road}` : 'Head out';
    case 'arrive': return 'Arrive at destination';
    case 'turn': return `Turn ${mod}${onRoad}`;
    case 'merge': return `Merge ${mod}${onRoad}`.replace(' onto', ' onto').trim();
    case 'on ramp': return `Take the ramp${mod ? ` ${mod}` : ''}${onRoad}`;
    case 'off ramp': return `Take the exit${mod ? ` ${mod}` : ''}${onRoad}`;
    case 'fork': return `Keep ${mod}${onRoad}`;
    case 'roundabout':
    case 'rotary': return `Enter the roundabout${onRoad}`;
    case 'continue': return mod ? `Continue ${mod}${onRoad}` : `Continue${onRoad}`;
    case 'new name': return road ? `Continue onto ${road}` : 'Continue';
    case 'end of road': return `Turn ${mod}${onRoad}`;
    default: return mod ? `${type} ${mod}${onRoad}`.trim() : (road ? `Continue onto ${road}` : 'Continue');
  }
}

/** Parse OSRM leg.steps[] (only present when steps=true) into RouteStep[]. */
function parseSteps(legSteps: unknown): RouteStep[] | undefined {
  if (!Array.isArray(legSteps)) return undefined;
  const steps: RouteStep[] = [];
  for (const s of legSteps) {
    const road = typeof s?.name === 'string' ? s.name : '';
    const instruction = describeManeuver(s?.maneuver ?? {}, road);
    // Skip the trailing zero-distance "arrive" noise between waypoints.
    if (s?.maneuver?.type === 'arrive' && (s?.distance ?? 0) === 0 && steps.length) continue;
    steps.push({ instruction, name: road, distance: metersToMiles(s?.distance ?? 0) });
  }
  return steps.length ? steps : undefined;
}

export async function optimizeRoute(
  homeBase: LatLng,
  stops: Stop[]
): Promise<RouteResult | null> {
  // Build coordinates: home + stops + home (roundtrip)
  const coords = [homeBase, ...stops.map(s => s.coords)].map(coordsToString).join(';');

  try {
    const res = await fetch(
      `${OSRM_BASE}/trip/v1/driving/${coords}?source=first&destination=last&roundtrip=true&geometries=geojson&overview=full&steps=true`
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
      const fallback = await getRouteForOrderedStops(homeBase, stops);
      if (fallback) fallback.optimized = false;
      return fallback;
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
        steps: parseSteps(trip.legs[i].steps),
      });
    }

    return {
      legs,
      totalDistance: metersToMiles(trip.distance),
      totalDuration: secondsToMinutes(trip.duration),
      geometry: [trip.geometry.coordinates.map((c: number[]) => [c[1], c[0]])],
      orderedStopIds,
      optimized: true,
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
      `${OSRM_BASE}/route/v1/driving/${coordStr}?geometries=geojson&overview=full&steps=true`
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
      steps: parseSteps(leg.steps),
    }));

    return {
      legs,
      totalDistance: metersToMiles(route.distance),
      totalDuration: secondsToMinutes(route.duration),
      geometry: [route.geometry.coordinates.map((c: number[]) => [c[1], c[0]])],
      orderedStopIds: stops.map(s => s.id),
      optimized: false,
    };
  } catch {
    return null;
  }
}
