/** chrome.storage.local keys — single source of truth for listeners and persistence. */
export const STORAGE_KEYS = {
  profile: "coverclick_profile",
  settings: "coverclick_settings",
  generationPrefs: "coverclick_generation_prefs",
  letterCache: "coverclick_last_letter",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
