import type { HomeBase, RouteResult, Stop } from '@/types/route';
import { buildSchedule, formatClock } from './eta';

/**
 * Print a clean driver route sheet — the manifest a rep tapes to the dash:
 * stops in order, labels, addresses, leg distances/times, arrival clock, totals.
 *
 * We render an isolated HTML document into a hidden iframe and print THAT, rather
 * than `window.print()` on the app. This keeps the SPA's chrome (header, map,
 * Ant styles, dark mode) out of the printout and lets us own a tight print
 * stylesheet — what the driver gets is exactly this sheet, nothing else.
 */

interface PrintOptions {
  homeBase: HomeBase;
  stops: Stop[];
  routeResult: RouteResult;
  /** Departure time, minutes-from-midnight, to stamp arrival clocks. */
  departureMins?: number;
  /** Per-stop service time, minutes, folded into the arrival clock. */
  dwellMins?: number;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printRouteSheet({ homeBase, stops, routeResult, departureMins, dwellMins = 0 }: PrintOptions): void {
  const schedule =
    typeof departureMins === 'number'
      ? buildSchedule(routeResult, departureMins, dwellMins)
      : null;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Each row = one stop. Leg i in routeResult is home→stop1, stop1→stop2, …, so
  // the leg that *delivers* you to stop i (0-based) is legs[i].
  const rows = stops.map((stop, i) => {
    const leg = routeResult.legs[i];
    // schedule.entries[0] is home; entries[i+1] is this stop's arrival.
    const arrival = schedule?.entries[i + 1]?.arrival;
    // Address is the source of truth. A label (e.g. customer name) is an optional
    // headline above it — never a placeholder dash when absent.
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td>
          ${stop.label ? `<div class="label">${esc(stop.label)}</div>` : ''}
          <div class="addr${stop.label ? '' : ' addr-primary'}">${esc(stop.address)}</div>
          ${stop.timeWindow ? `<div class="window">Window: ${esc(stop.timeWindow)}</div>` : ''}
        </td>
        <td class="leg">${leg ? `${leg.distance} mi<br>${leg.duration} min` : '—'}</td>
        <td class="eta">${arrival != null ? esc(formatClock(arrival)) : '—'}</td>
        <td class="check"></td>
      </tr>`;
  }).join('');

  const returnRow = `
    <tr class="return">
      <td class="num">⌂</td>
      <td>
        <div class="label">Return to Home Base</div>
        <div class="addr">${esc(homeBase.address)}</div>
      </td>
      <td class="leg">${
        routeResult.legs.length > stops.length
          ? `${routeResult.legs[routeResult.legs.length - 1].distance} mi<br>${routeResult.legs[routeResult.legs.length - 1].duration} min`
          : '—'
      }</td>
      <td class="eta">${schedule ? esc(formatClock(schedule.returnHome)) : '—'}</td>
      <td class="check"></td>
    </tr>`;

  const departureLine =
    schedule != null
      ? `<span class="meta-item"><strong>Depart:</strong> ${esc(formatClock(schedule.entries[0].departure))}</span>
         <span class="meta-item"><strong>Return:</strong> ${esc(formatClock(schedule.returnHome))}</span>`
      : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Route Sheet — ${esc(today)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a1a; margin: 0; padding: 24px;
  }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .home { font-size: 13px; color: #444; margin: 0 0 12px; }
  .home strong { color: #b45309; }
  .meta {
    display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: #333;
    padding: 8px 0; margin-bottom: 12px; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd;
  }
  .meta-item strong { color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
    color: #666; border-bottom: 2px solid #333; padding: 6px 8px;
  }
  td { padding: 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  .num {
    font-weight: 700; text-align: center; width: 32px; font-size: 13px; color: #2563EB;
  }
  tr.return .num { color: #b45309; }
  .label { font-weight: 600; font-size: 13px; }
  .addr { color: #555; margin-top: 1px; }
  .addr.addr-primary { color: #1a1a1a; font-weight: 600; font-size: 13px; margin-top: 0; }
  .window { color: #2563EB; margin-top: 2px; font-size: 11px; }
  .leg { width: 70px; color: #444; white-space: nowrap; }
  .eta { width: 78px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .check { width: 28px; }
  .check::before {
    content: ""; display: block; width: 16px; height: 16px;
    border: 1.5px solid #999; border-radius: 3px; margin: 0 auto;
  }
  tfoot td { border-top: 2px solid #333; border-bottom: none; font-weight: 700; padding-top: 10px; }
  .footer-note { margin-top: 18px; font-size: 10px; color: #999; }
  @media print {
    body { padding: 0; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <h1>Route Sheet</h1>
  <p class="home"><strong>Home Base:</strong> ${esc(homeBase.address)} &nbsp;·&nbsp; ${esc(today)}</p>
  <div class="meta">
    <span class="meta-item"><strong>${stops.length}</strong> stops</span>
    <span class="meta-item"><strong>${routeResult.totalDistance}</strong> mi total</span>
    <span class="meta-item"><strong>${routeResult.totalDuration}</strong> min driving</span>
    ${departureLine}
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Stop</th>
        <th>Leg</th>
        <th>${schedule ? 'Arrive' : 'ETA'}</th>
        <th>✓</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${returnRow}
    </tbody>
    <tfoot>
      <tr>
        <td></td>
        <td>Total</td>
        <td class="leg">${routeResult.totalDistance} mi<br>${routeResult.totalDuration} min</td>
        <td></td>
        <td></td>
      </tr>
    </tfoot>
  </table>
  <p class="footer-note">Generated by Route Planner · Opsette Tools</p>
</body>
</html>`;

  // Render into a hidden iframe and print it. Removing the iframe after print
  // keeps the DOM clean; the small timeout lets the iframe lay out before print.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    // Defer removal so the print dialog has finished reading the document.
    setTimeout(() => iframe.remove(), 1000);
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) { cleanup(); return; }
    win.focus();
    win.print();
    win.onafterprint = cleanup;
    // Fallback cleanup if onafterprint never fires (some browsers).
    setTimeout(cleanup, 60000);
  };
}
