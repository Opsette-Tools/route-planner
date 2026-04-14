export interface LatLng {
  lat: number;
  lng: number;
}

export interface HomeBase {
  address: string;
  coords: LatLng;
}

export interface Stop {
  id: string;
  address: string;
  coords: LatLng;
  label?: string;
  timeWindow?: string;
}

export interface RouteLeg {
  from: string;
  to: string;
  distance: number; // miles
  duration: number; // minutes
}

export interface RouteResult {
  legs: RouteLeg[];
  totalDistance: number;
  totalDuration: number;
  geometry: [number, number][][]; // array of leg geometries
  orderedStopIds: string[];
  optimized: boolean;
}

export interface SavedRoute {
  id: string;
  name: string;
  date: string;
  stops: Stop[];
  homeBase: HomeBase;
  totalDistance: number;
  totalDuration: number;
}
