/// <reference types="vite/client" />

declare module "virtual:coverclick-build" {
  /** ISO time baked at the start of the last `vite build` / watch rebuild. */
  export const EXTENSION_BUILD_ID: string;
}

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  /** Default CoverClick API origin (no trailing slash). Baked at build time. */
  readonly VITE_COVERCLICK_API_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
