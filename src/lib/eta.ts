import type { RouteResult } from '@/types/route';

/**
 * Cumulative arrival/departure schedule for a route, computed purely from leg
 * durations we already have from OSRM — no API call. Given a departure time
 * (minutes-from-midnight) and the optimized legs, walk the route and stamp an
 * arrival time at each waypoint.
 *
 * The leg list is home → stop 1 → stop 2 → … → home, so:
 *   - legs[0].duration gets you to stop 1
 *   - legs[i].duration gets you to stop i+1
 *   - the final leg returns home
 *
 * We optionally add a per-stop dwell (service time) so the clock reflects time
 * spent at each stop, not just driving.
 */

export interface ScheduleEntry {
  /** Waypoint label (stop label/address, or "Home Base"). */
  label: string;
  /** Arrival time in minutes-from-midnight. */
  arrival: number;
  /** Departure time in minutes-from-midnight (arrival + dwell). */
  departure: number;
  /** True for the start and the final return-home waypoint. */
  isHome: boolean;
}

export interface Schedule {
  /** One entry per waypoint, in route order (starts and ends at home). */
  entries: ScheduleEntry[];
  /** Arrival back home, minutes-from-midnight. */
  returnHome: number;
}

/** "8:00 AM" from minutes-from-midnight; wraps past-midnight times to a "+1d" tag. */
export function formatClock(minutes: number): string {
  const dayMin = ((minutes % 1440) + 1440) % 1440;
  let h = Math.floor(dayMin / 60);
  const m = Math.round(dayMin % 60);
  const ampm = h < 12 ? 'AM' : 'PM';
  h = h % 12;
  if (h === 0) h = 12;
  const nextDay = minutes >= 1440 ? ' (+1d)' : '';
  return `${h}:${String(m).padStart(2, '0')} ${ampm}${nextDay}`;
}

/** Parse a 24h "HH:mm" string into minutes-from-midnight; null if malformed. */
export function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Build the arrival/departure schedule.
 * @param result      the route (legs in order)
 * @param departure   start time, minutes-from-midnight
 * @param dwellMinutes service time spent at each intermediate stop (default 0)
 */
export function buildSchedule(
  result: RouteResult,
  departure: number,
  dwellMinutes = 0
): Schedule {
  const legs = result.legs;
  const entries: ScheduleEntry[] = [];

  // Start at home — you leave home at `departure`, no arrival/dwell there.
  let clock = departure;
  entries.push({ label: legs[0]?.from ?? 'Home Base', arrival: departure, departure, isHome: true });

  for (let i = 0; i < legs.length; i++) {
    clock += legs[i].duration; // drive this leg
    const isLast = i === legs.length - 1; // final leg returns home
    const arrival = clock;
    const dwell = isLast ? 0 : dwellMinutes;
    clock += dwell;
    entries.push({
      label: legs[i].to,
      arrival,
      departure: clock,
      isHome: isLast,
    });
  }

  return { entries, returnHome: clock };
}
