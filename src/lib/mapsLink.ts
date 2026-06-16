import type { HomeBase, Stop } from '@/types/route';

/**
 * Build a single Google Maps directions URL covering the whole route in order:
 * home → stops (in their current/optimized order) → home. Opens the driver's
 * native nav with full turn-by-turn — no API, no key, just the public URL scheme.
 *
 * Google Maps URLs cap intermediate waypoints (~9). Beyond that the link still
 * works but Maps may drop the overflow, so callers should warn when truncated.
 */
export const GMAPS_WAYPOINT_CAP = 9;

export interface MapsLink {
  url: string;
  truncated: boolean;
}

function coord(c: { lat: number; lng: number }): string {
  return `${c.lat},${c.lng}`;
}

export function buildGoogleMapsRoute(homeBase: HomeBase, stops: Stop[]): MapsLink {
  // Round trip: origin and destination are both home base; stops are waypoints.
  const waypointStops = stops.slice();
  const truncated = waypointStops.length > GMAPS_WAYPOINT_CAP;
  const used = truncated ? waypointStops.slice(0, GMAPS_WAYPOINT_CAP) : waypointStops;

  const params = new URLSearchParams({
    api: '1',
    origin: coord(homeBase.coords),
    destination: coord(homeBase.coords),
    travelmode: 'driving',
  });
  if (used.length) {
    // URLSearchParams encodes the pipe; Google accepts the encoded form.
    params.set('waypoints', used.map(s => coord(s.coords)).join('|'));
  }

  return {
    url: `https://www.google.com/maps/dir/?${params.toString()}`,
    truncated,
  };
}
