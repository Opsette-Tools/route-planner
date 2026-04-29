export type OpsetteShareConfig = {
  appName: string;
  tagline: string;
  url: string;
  logoSrc?: string;
};

export const opsetteShareConfig: OpsetteShareConfig = {
  appName: "Route Planner",
  tagline: "Plan multi-stop routes and trips.",
  url: "https://tools.opsette.io/route-planner/",
  logoSrc: "opsette-logo.png",
};
