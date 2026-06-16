# Route Planner — Enhancement & Integration Plan

**Author:** orchestration session, 2026-06-16
**Status:** living plan. Append dated progress entries at the bottom as work ships.
**Owner:** Ruthnie (DeeBuilt / Opsette Tools)

This doc is the source of truth for the Route Planner build-out. It captures
**every** enhancement discussed, grounded in the current free stack, plus the
parent-app (Opsette) bridge + Emit integration using the **canonical
`opsette-bridge`** convention already proven in Contact Capture / Process
Checklist.

---

## 0. Stack reality (why we can do all of this without Google)

| Concern | Current | Key needed? | Env var needed? |
| --- | --- | --- | --- |
| Geocoding (address → coords) | Nominatim (OpenStreetMap) | No | No |
| Autocomplete / type-ahead | Nominatim, debounced 500ms | No | No |
| Routing + optimization | OSRM public demo (`/trip`, `/route`) | No | No |
| Turn-by-turn steps | OSRM (`steps=true`) — **not yet used** | No | No |
| Map tiles | CARTO + Leaflet | No | No |
| Open in phone nav | Google Maps **URL scheme** (no API) | No | No |

**Conclusion:** GitHub Pages can host all of this. The only thing that would
ever require a key + secret-hiding (a proxy) is Google Places-quality instant
autocomplete — explicitly deferred unless the typed-search experience proves
insufficient. The real product path is the **parent-app bridge** (§4), which
feeds known-good addresses and makes free-text geocoding a secondary concern.

### Constraints to respect

- **Nominatim usage policy:** max ~1 req/sec. Already enforced by `throttle()`
  in `geocoding.ts` and the 500ms debounce in `useAddressSuggest`. Do not add
  per-keystroke geocoding.
- **OSRM public demo:** rate-limited, best-effort, no SLA. Fine for a tool;
  if this becomes parent-app-critical, self-host OSRM or move to a keyed router.
- **iframe geolocation:** "Use Current Location" fails in a cross-origin iframe
  unless the **parent** sets `allow="geolocation"` on the `<iframe>`. Document
  this for the parent-app team; it is not a tool-side bug.

---

## 1. ✅ DONE this session

- **Lincoln-NE bug fixed** — proximity bias (`viewbox` around home base) +
  `countrycodes=us` + removed the browser-stripped `User-Agent` header that was
  tripping the iframe. Three-tier fallback (biased → US-only → worldwide) so a
  real address never false-negatives. (`services/geocoding.ts`)
- **Live autocomplete** — `useAddressSuggest` hook + `AddressAutoComplete`
  component, wired into both the map search box and the Settings home-base box.
- **Auto-connect on stop change** — `Index.tsx` redraws a connected line via
  OSRM `/route` whenever stops change and no optimized result is showing, with a
  request-sequence guard. "Optimize" now means *reorder for efficiency*.
- **Shared add-stop seam** — `addStopRecord()` funnels typed / suggested /
  map-click / injected stops through one path.
- **Interim postMessage stub** — a minimal listener in `Index.tsx`.
  ⚠️ **To be REMOVED in Phase 4** and replaced by the canonical `opsette-bridge`.
  Do not build on the stub.

---

## 2. Quick-win features (free stack, no plan blockers)

Ordered by driver-value. Each is independently shippable.

### 2.1 Turn-by-turn directions
- **What:** OSRM already computes steps; we pass `steps=false`. Flip to `true`
  in both `optimizeRoute` and `getRouteForOrderedStops`, parse
  `legs[].steps[].maneuver` + `name` into readable instructions
  ("Turn left onto Colonial Dr").
- **Type changes:** add `steps?: RouteStep[]` to `RouteLeg`;
  `interface RouteStep { instruction: string; distance: number; name: string }`.
- **UI:** expandable per-leg directions in `RouteDetails` (Ant `Collapse`).
- **Cost:** larger OSRM responses; negligible.

### 2.2 One-tap "Open full route in Google Maps" (the field-rep killer feature)
- **What:** a single button building
  `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=A|B|C&travelmode=driving`
  with **all stops in optimized order**. Driver gets the whole turn-by-turn
  route in their phone's native nav, one tap. **No API, just URL-building.**
- **Caveat:** Google Maps URL caps waypoints (~9–10 intermediate). For >10 stops,
  either chunk into multiple links or use lat/lng waypoints. Document the cap.
- **Where:** replace/augment the per-stop pin link in `StopList` + a prominent
  button in `RouteActions`.

### 2.3 Per-stop time windows (already half-wired)
- **What:** `Stop.timeWindow` exists and `Index` passes `onUpdateTimeWindow`, but
  `StopList` never renders an editor. Add an inline time-window editor (Ant
  `TimePicker.RangePicker` or a simple text tag editor) per stop.
- **Stretch:** feed windows into a naive feasibility check against ETAs (§2.6).

### 2.4 Draggable map markers + via-points
- **What:** Leaflet markers `draggable` → on `dragend`, reverse-geocode and
  update the stop's coords. Optionally drag the route polyline to insert a via.
- **Cost:** reverse-geocode per drag (throttled).

### 2.5 Printable / PDF route sheet
- **What:** a clean, print-CSS manifest (stops in order, addresses, labels, leg
  distances/times, totals) — the sheet a driver tapes to the dash. We already
  have CSV export; add an HTML print view (`window.print()` with a print
  stylesheet) and/or jsPDF.
- **Reuse:** Process Checklist already emits PDFs via the bridge `file` channel —
  mirror that approach for a "Emit route sheet as file" later (§4).

### 2.6 ETA / departure clock
- **What:** from leg durations we already have: "Leave by 8:00 → back by 11:40."
  Add a departure-time input; compute cumulative arrival per stop; show in
  `RouteDetails` and the print sheet. Pure client math, no API.

### 2.7 Auto-reoptimize toggle (optional)
- **What:** a Settings switch: when on, re-run full optimization on every stop
  change (not just redraw). Off by default (costs an OSRM round-trip per edit).

---

## 3. Layout restructure (structural — its own build unit)

**Problem (confirmed by Ruthnie):** the workflow is scattered — home base is
buried in a hidden drawer, stops are added on the map (right), the plan is read
on the left. Three disconnected places for one job.

**Proposed shape — a single left "workflow rail" that reads top-to-bottom as the
actual job:**

```
┌────────────────────────────┬───────────────────────────┐
│ ① HOME BASE (inline)       │                           │
│    [autocomplete] [📍 GPS]  │                           │
│    ✓ 123 Main St, Orlando   │        MAP CANVAS         │
├────────────────────────────┤   (pure reflection of      │
│ ② ADD STOP                 │    state; markers + line;  │
│    [autocomplete search]    │    click-to-add; draggable │
│    or click the map →       │    markers)                │
├────────────────────────────┤                           │
│ ③ STOPS (drag to reorder)  │                           │
│    1. ... 2. ... 3. ...     │                           │
├────────────────────────────┤                           │
│ ④ OPTIMIZE + RESULTS       │                           │
│    [⚡ Optimize] totals      │                           │
│    turn-by-turn (collapse)  │                           │
│    [Open in Maps] [Print]   │                           │
└────────────────────────────┴───────────────────────────┘
```

- Home base becomes **step ①**, not a hidden setting. The Settings drawer keeps
  only true settings (units, auto-reoptimize, theme).
- The map search box stays (it's nice) but is no longer the *only* way to add a
  stop — the rail's step ② is the primary entry.
- Mobile: the same four steps stack vertically below a shorter map.

**House rules:** Ant Design components, no raw Tailwind primitives, componentize
(no monolith `Index.tsx` — extract `HomeBaseStep`, `AddStopStep`,
`OptimizeStep`). Respect dark-mode token pattern if this tool adopts it.

**This is a "redesign = structural" change** — build the rail primitives first,
then migrate. Do not font/spacing-tweak the current layout and call it done.

---

## 4. Parent-app bridge + Emit (the real product)

**Goal:** Route Planner pulls addresses from the Opsette parent app
(appointments / clients / leads) and can **Emit** a planned route back into the
Opsette review inbox — same pattern as Contact Capture.

### 4.1 Use the canonical bridge — do NOT reinvent it
Contact Capture / Process Checklist share a proven bridge at
`contact-capture/src/components/opsette-bridge/` (`bridge.ts`, `index.ts`,
`INTEGRATION.md`). It provides:
- A **handshake** (`connectBridge<T>()` posts `ready`, waits for parent `init`,
  resolves a `Bridge<T>` when embedded or `null` standalone after 1s).
- **Trusted origins** (`https://opsette.io` + localhost dev ports), request-id
  acking so parallel requests don't cross-resolve.
- **Two channels:** shared storage (`save`/`delete`/`savePresets`) and **`emit`**
  (v2) — `emit(entity, payload)` stages a `pending` review-inbox item a human
  approves before it becomes a native `client` / `activity` / `file`.

**Action:**
1. **Copy** `opsette-bridge/` verbatim into
   `route-planner/src/components/opsette-bridge/` (workspace convention — same as
   `opsette-share` / `opsette-header`).
2. **Delete** the interim `postMessage` stub in `Index.tsx` (§1) — it is a
   parallel, inferior invention. One bridge only.

### 4.2 Inbound: parent → Route Planner (pull addresses)
On `connectBridge()` success, read `init.items` to hydrate. Define the tool's
stored shape `T` (a saved route: home base + stops). For **injecting stops from
appointments**, the parent sends records; resolve each:
- record has `lat`/`lng` → plot directly via `addStopRecord` (no geocode).
- record has only `address` → geocode US-biased, then plot.

> Confirm with the parent-app (opsette-v2) team the exact inbound message for
> "here are N appointment addresses." If the existing `init.items` storage
> channel is the intended vehicle, model a saved-route `T`. If a *push* of live
> appointments is wanted, propose a small protocol addition (e.g.
> `type: 'inject_stops'`) consistent with the envelope. **Do not freelance a new
> envelope** — extend the canonical one and get it reviewed.

### 4.3 Outbound: Route Planner → parent (Emit)
This Emit is **distinct from Contact Capture's** (which emits a `client`). Route
Planner's natural emits:
- **`file`** — the route sheet PDF (§2.5) via `emit('file', { kind: 'file', ...
  bytes_base64 })`, deferring destination to the inbox. Mirrors Process
  Checklist's PDF emit exactly.
- **`activity`** — a planned route logged against a client/appointment
  (`emit('activity', { kind: 'data', data: { ...route summary, stop list,
  total_distance, total_duration } })`). **Confirm the `activity` data contract**
  with opsette-v2 `src/types/iframe-apps.ts` before shaping `data`.

Gate all Emit UI behind `bridge.isEmbeddedInOpsette` — standalone (GitHub Pages
direct) shows none of it and falls back to localStorage, exactly like today.

### 4.4 Open questions for the parent-app session
- What entity/contract should a planned route Emit as — `activity`, or a new
  entity? (Drives the `data` shape.)
- Is stop-injection a pull (`init.items`) or a push (new message type)?
- Confirm the parent sets `allow="geolocation"` on the iframe so GPS works.
- Confirm trusted origin / dev port matches `TRUSTED_ORIGINS`.

---

## 5. Suggested sequencing

1. **Quick wins** §2.1, §2.2, §2.3 (turn-by-turn, combined Maps link, time
   windows) — highest driver value, no structural risk. *(this orchestration)*
2. **Quick wins** §2.4–§2.7 (drag, print/PDF, ETA, auto-reoptimize).
3. **Layout restructure** §3 — own build unit; primitives first.
4. **Bridge + Emit** §4 — new session; copy canonical bridge, delete stub,
   confirm contracts with opsette-v2, then build inbound + outbound.

---

## Progress log

- **2026-06-16** — Plan created. Phase 1 partial shipped: geocoding fix,
  autocomplete, auto-connect, shared add-stop seam (see §1). Confirmed the
  canonical `opsette-bridge` exists in Contact Capture and that the Route Planner
  interim stub must be replaced by it (§4.1).
- **2026-06-16** — Quick wins §2.1–§2.3 shipped (typecheck clean, pending
  in-app verify):
  - **Turn-by-turn (§2.1):** `steps=true` on both OSRM endpoints; `parseSteps` +
    `describeManeuver` in `routing.ts`; `RouteStep` type; expandable per-leg
    directions (Ant `Collapse`) in `RouteDetails.tsx`.
  - **Combined Google Maps link (§2.2):** `lib/mapsLink.ts`
    (`buildGoogleMapsRoute`, 9-waypoint cap + truncation warning); "Open in Maps"
    button in `RouteActions.tsx`.
  - **Time-window editor (§2.3):** inline editable time window per stop in
    `StopList.tsx` (the previously dead-wired `onUpdateTimeWindow`).
  - **Remaining quick wins:** §2.4 draggable markers, §2.5 print/PDF sheet, §2.6
    ETA/departure clock, §2.7 auto-reoptimize toggle. Then §3 layout, §4 bridge.
