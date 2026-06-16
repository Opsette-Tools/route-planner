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

/**
 * Where "near me" is, used to bias geocoding results. Without this, Nominatim
 * ranks a bare query like "123 Maple St" by global prominence — which is why a
 * search from Orlando kept resolving to Lincoln, Nebraska. Pass the home base
 * coords (or the current map center) so common street names resolve locally.
 */
export interface GeoBias {
  /** Point to bias toward — typically the home base or map center. */
  center?: LatLng;
  /** Restrict to country (defaults to US). Pass null to search worldwide. */
  countryCode?: string | null;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

function formatAddress(item: NominatimItem): string {
  if (!item.address) return item.display_name;
  const a = item.address;
  const parts = [
    a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
    a.city || a.town || a.village || a.hamlet,
    a.state,
    a.postcode,
  ].filter(Boolean);
  return parts.length >= 2 ? parts.join(', ') : item.display_name;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    state?: string;
    postcode?: string;
  };
}

/**
 * Build a viewbox (~1.5° box ≈ ~100mi) around the bias center. Combined with a
 * soft (unbounded) preference, Nominatim ranks results inside the box first but
 * still returns far-away matches if nothing local exists — so we never produce a
 * false "not found" just because the box was too tight.
 */
function biasParams(bias?: GeoBias): string {
  const params: string[] = [];
  const country = bias?.countryCode === undefined ? 'us' : bias?.countryCode;
  if (country) params.push(`countrycodes=${country}`);
  if (bias?.center) {
    const { lat, lng } = bias.center;
    const d = 0.75;
    // left,top,right,bottom
    const viewbox = `${lng - d},${lat + d},${lng + d},${lat - d}`;
    params.push(`viewbox=${viewbox}`);
    params.push('bounded=0'); // soft bias, not a hard filter
  }
  return params.join('&');
}

async function rawSearch(query: string, bias: GeoBias | undefined, limit: number): Promise<NominatimItem[]> {
  await throttle();
  const bp = biasParams(bias);
  const url =
    `${NOMINATIM}/search?format=json&addressdetails=1&limit=${limit}` +
    `&q=${encodeURIComponent(query)}` +
    (bp ? `&${bp}` : '');
  // NOTE: do NOT set a User-Agent header — browsers strip it from fetch() as a
  // forbidden header, and setting it can trip CORS preflight. accept-language is
  // allowed and gives us US-English address formatting.
  const res = await fetch(url, { headers: { 'accept-language': 'en-US,en' } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as NominatimItem[]) : [];
}

/**
 * Geocode a free-text address to candidate results, best-first. Returns multiple
 * candidates so callers can disambiguate instead of blindly trusting result[0].
 * Falls back to a country-only (un-viewboxed) search if the biased search is empty,
 * so a real address never reads as "not found" just because it's outside the box.
 */
export async function searchAddresses(query: string, bias?: GeoBias): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];
  try {
    let items = await rawSearch(query, bias, 6);
    if (items.length === 0 && bias?.center) {
      // Retry without the viewbox bias (keep country) — the box may have been too tight.
      items = await rawSearch(query, { countryCode: bias.countryCode }, 6);
    }
    if (items.length === 0) {
      // Last resort: drop the country restriction entirely.
      items = await rawSearch(query, { countryCode: null }, 6);
    }
    return items.map(item => ({
      address: formatAddress(item),
      coords: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
    }));
  } catch {
    return [];
  }
}

/** Single best result, for non-interactive callers (e.g. injected parent records). */
export async function geocodeAddress(query: string, bias?: GeoBias): Promise<GeocodingResult | null> {
  const results = await searchAddresses(query, bias);
  return results[0] ?? null;
}

export async function reverseGeocode(coords: LatLng): Promise<string | null> {
  await throttle();
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?format=json&addressdetails=1&lat=${coords.lat}&lon=${coords.lng}`,
      { headers: { 'accept-language': 'en-US,en' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.address ? formatAddress(data as NominatimItem) : data?.display_name || null;
  } catch {
    return null;
  }
}
