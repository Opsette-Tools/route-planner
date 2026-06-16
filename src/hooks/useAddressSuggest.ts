import { useEffect, useRef, useState } from 'react';
import { searchAddresses, type GeoBias, type GeocodingResult } from '@/services/geocoding';

export interface AddressSuggestion {
  value: string; // the address text (also used as the option key)
  result: GeocodingResult;
}

/**
 * Debounced address type-ahead against Nominatim. Nominatim's usage policy caps
 * us at ~1 req/sec, so we debounce hard (default 500ms) and only query for
 * inputs of reasonable length. This won't feel as instant as Google Places —
 * that's the documented trade-off of staying key-free on GitHub Pages — but it
 * gives live predictions instead of "type, hit enter, hope."
 */
export function useAddressSuggest(query: string, bias?: GeoBias, delay = 500) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  // Bump on every keystroke so a slow in-flight request can't overwrite newer results.
  const seq = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 4) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const mySeq = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const results = await searchAddresses(trimmed, bias);
      if (mySeq !== seq.current) return; // a newer keystroke superseded us
      setSuggestions(
        results.map(r => ({ value: r.address, result: r }))
      );
      setLoading(false);
    }, delay);

    return () => clearTimeout(timer);
    // bias is intentionally read fresh each run; callers pass a stable-ish object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, delay, bias?.center?.lat, bias?.center?.lng, bias?.countryCode]);

  return { suggestions, loading };
}
