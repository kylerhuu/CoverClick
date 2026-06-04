import { useEffect, useState } from "react";
import {
  COMPANY_EXTRACTION_DEBUG_KEY,
  isCompanyExtractionDebugFlagValue,
} from "./companyExtractionDebugClient";

/**
 * Side panel: true only when chrome.storage.local coverclick:debugCompanyExtraction === "1".
 * Defaults to false so normal users never see debug UI.
 */
export function useCompanyExtractionDebugEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;

    const readFlag = () => {
      chrome.storage.local.get(COMPANY_EXTRACTION_DEBUG_KEY, (data) => {
        setEnabled(isCompanyExtractionDebugFlagValue(data[COMPANY_EXTRACTION_DEBUG_KEY]));
      });
    };

    readFlag();

    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !(COMPANY_EXTRACTION_DEBUG_KEY in changes)) return;
      setEnabled(isCompanyExtractionDebugFlagValue(changes[COMPANY_EXTRACTION_DEBUG_KEY]?.newValue));
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
  }, []);

  return enabled;
}
