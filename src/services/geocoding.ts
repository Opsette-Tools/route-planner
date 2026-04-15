import type { LatLng } from '@/types/route';

let lastRequestTime = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise(r => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
}

export interface GeocodingResult {
  address: string;
  coords: LatLng;
}

export async function geocodeAddress(query: string): Promise<GeocodingResult | null> {
  await throttle();
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      { headers: { 'User-Agent': 'RoutePlannerApp/1.0' } }
    );
    const data = await res.json();
    if (data.length === 0) return null;
    const best = data[0];
    let address = best.display_name;
    if (best.address) {
      const a = best.address;
      const parts = [
        a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
        a.city || a.town || a.village,
        a.state,
        a.postcode,
      ].filter(Boolean);
      if (parts.length >= 2) {
        address = parts.join(', ');
      }
    }
    return {
      address,
      coords: { lat: parseFloat(best.lat), lng: parseFloat(best.lon) },
    };
  } catch {
    return null;
  }
}

export async function reverseGeocode(coords: LatLng): Promise<string | null> {
  await throttle();
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`,
      { headers: { 'User-Agent': 'RoutePlannerApp/1.0' } }
    );
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}
