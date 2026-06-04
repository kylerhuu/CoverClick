import { useEffect, useState } from "react";
import {
  COMPANY_EXTRACTION_DEBUG_KEY,
  isCompanyExtractionDebugEnabledSync,
  readCompanyExtractionDebugEnabled,
} from "./companyExtractionDebugClient";

/** Side panel / options: keeps UI in sync with chrome.storage + localStorage flag. */
export function useCompanyExtractionDebugEnabled(): boolean {
  const [enabled, setEnabled] = useState(isCompanyExtractionDebugEnabledSync);

  useEffect(() => {
    let cancelled = false;
    void readCompanyExtractionDebugEnabled().then((on) => {
      if (!cancelled) setEnabled(on);
    });

    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !(COMPANY_EXTRACTION_DEBUG_KEY in changes)) return;
      const next = changes[COMPANY_EXTRACTION_DEBUG_KEY]?.newValue;
      setEnabled(next === "1");
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
