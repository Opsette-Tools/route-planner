

# Route Planner — Implementation Plan

## Overview
A mobile-first route planning app for service professionals. Users enter stop addresses, the app plots them on a map, optimizes the driving order, and shows total mileage/time. All data stays in localStorage. Built with Ant Design, Leaflet, and free OpenStreetMap services.

## Phase 1: Project Setup & Theme
- Install dependencies: `antd`, `@ant-design/icons`, `leaflet`, `react-leaflet`, `@dnd-kit/core`, `@dnd-kit/sortable`, `vite-plugin-pwa`
- Remove shadcn/ui usage from App.tsx (Toaster, Sonner, TooltipProvider)
- Wrap app in Ant Design `ConfigProvider` with custom theme (primary #2563EB, bgBase #F8FAFC, borderRadius 12)
- Switch from `BrowserRouter` to `HashRouter` for GitHub Pages compatibility
- Configure PWA manifest (theme_color #2563EB, standalone display) with iframe/preview guards per Lovable guidelines

## Phase 2: Core Layout & State
- Create responsive layout: map top / controls bottom on mobile; side-by-side (Col 10 + Col 14) on desktop
- Build localStorage hooks for home base, stops, and saved routes
- Define TypeScript types for Stop, Route, SavedRoute, HomeBase

## Phase 3: Home Base Setup
- Settings Drawer (triggered by SettingOutlined in header) with:
  - Input.Search for address geocoding via Nominatim
  - "Use Current Location" button with AimOutlined (browser geolocation API)
  - Persists to localStorage
- On first use with no home base: show Card with Alert prompting setup

## Phase 4: Map Integration
- Leaflet map with CartoDB Positron tiles (OSM fallback), rounded corners, integrated shadow
- Custom divIcon pins: amber HomeOutlined for home base, blue numbered circles for stops
- Address Input.Search overlaid on map top edge with blur backdrop
- Fit-bounds button (FullscreenOutlined), zoom/pan controls
- Pin popups showing stop name/address and route position

## Phase 5: Adding & Managing Stops
- Geocode addresses via Nominatim (1 req/sec rate limit enforced)
- Stop list as Ant Design List with List.Item.Meta (address, editable client name, optional time window Tag)
- Drag-to-reorder via @dnd-kit with HolderOutlined grip
- Delete stops with DeleteOutlined icon button
- 2–15 stop limit with Alert warning at 15
- Pin drop bounce animation on add

## Phase 6: Route Optimization
- "Optimize Route" primary button with ThunderboltOutlined
- Calls OSRM trip service (traveling salesman) with home base as start/end
- Reorders stop list to match optimized sequence
- Draws route polyline (blue, 4px, 0.8 opacity) using OSRM road geometry
- Progressive polyline draw animation
- Loading state via Button loading prop
- Badge.dot indicator when 3+ unoptimized stops exist

## Phase 7: Route Details Panel
- Card below map with:
  - Steps component (vertical, small) showing leg-by-leg breakdown ("Stop 1 → Stop 2", "4.2 mi, ~8 min")
  - Legs >30 min get status="warning"
  - Two Statistic components: Total Distance (mi) and Total Drive Time (min) with tabular-nums
  - Alert for time window conflicts

## Phase 8: Route Actions
- **Save**: SaveOutlined button → Modal.confirm with name input → localStorage (max 20)
- **Share**: ShareAltOutlined → copies plain-text summary to clipboard → message.success toast
- **Clear**: ClearOutlined with Popconfirm → removes all stops and resets map
- Mobile: Optimize as FloatButton (bottom-right); desktop: normal Button in controls

## Phase 9: Saved Routes
- Route history Drawer (bottom on mobile, right on desktop) via HistoryOutlined in header
- List of saved routes: name, date, stop count Tags, total miles Statistic
- Tap to reload stops and route onto map
- "Reuse" button (CopyOutlined) to duplicate as today's starting point
- Delete with Popconfirm per entry, "Clear All" at bottom
- Empty state with Ant Design Empty component

## Phase 10: Demo Data & Empty States
- "Try Demo" dashed button with ExperimentOutlined loads 4 sample stops (well-known landmarks)
- Empty map state: Typography.Text secondary "Add your first stop to start planning your route"
- No pre-filled data on fresh load

## Key Technical Details
- All UI components are Ant Design (no shadcn, no Lucide icons)
- Tailwind used only for layout utilities (flex, grid, spacing, responsive)
- Nominatim geocoding with 1 req/sec throttle
- OSRM demo server for routing and optimization
- All data persisted in localStorage
- HashRouter for GitHub Pages compatibility

