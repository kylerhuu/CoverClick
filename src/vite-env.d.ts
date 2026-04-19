/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  /** Default CoverClick API origin (no trailing slash). Baked at build time. */
  readonly VITE_COVERCLICK_API_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
