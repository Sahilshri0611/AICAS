/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Modules without bundled type declarations
declare module "leaflet.heat";
declare module "leaflet.markercluster";
