import { useEffect, useState } from "react";
import {
  COMPANY_EXTRACTION_DEBUG_KEY,
  isCompanyExtractionDebugEnabledSync,
  readCompanyExtractionDebugEnabled,
  storageFlagIsOn,
} from "./companyExtractionDebugClient";

/** Side panel / options: keeps UI in sync with chrome.storage.local debug flag. */
export function useCompanyExtractionDebugEnabled(): boolean {
  const [enabled, setEnabled] = useState(isCompanyExtractionDebugEnabledSync);

  useEffect(() => {
    let cancelled = false;

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(COMPANY_EXTRACTION_DEBUG_KEY, (data) => {
        if (cancelled) return;
        if (storageFlagIsOn(data[COMPANY_EXTRACTION_DEBUG_KEY])) {
          setEnabled(true);
          return;
        }
        void readCompanyExtractionDebugEnabled().then((on) => {
          if (!cancelled) setEnabled(on);
        });
      });
    } else {
      void readCompanyExtractionDebugEnabled().then((on) => {
        if (!cancelled) setEnabled(on);
      });
    }

    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !(COMPANY_EXTRACTION_DEBUG_KEY in changes)) return;
      const next = changes[COMPANY_EXTRACTION_DEBUG_KEY]?.newValue;
      setEnabled(storageFlagIsOn(next));
    };

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(onStorageChanged);
    }

    const onWindowStorage = (e: StorageEvent) => {
      if (e.key === COMPANY_EXTRACTION_DEBUG_KEY) {
        setEnabled(isCompanyExtractionDebugEnabledSync());
      }
    };
    window.addEventListener("storage", onWindowStorage);

    return () => {
      cancelled = true;
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(onStorageChanged);
      }
      window.removeEventListener("storage", onWindowStorage);
    };
  }, []);

  return enabled;
}
