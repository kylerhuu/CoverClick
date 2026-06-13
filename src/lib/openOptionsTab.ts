const OPTIONS_TAB_KEY = "coverclick_options_tab";

export type OptionsDeepLinkTab = "resumes" | "applications";

export async function requestOptionsTab(tab: OptionsDeepLinkTab): Promise<void> {
  await chrome.storage.local.set({ [OPTIONS_TAB_KEY]: tab });
  await chrome.runtime.openOptionsPage();
}

export function readRequestedOptionsTab(data: Record<string, unknown>): OptionsDeepLinkTab | null {
  const raw = data[OPTIONS_TAB_KEY];
  if (raw === "resumes" || raw === "applications") return raw;
  return null;
}

export async function clearRequestedOptionsTab(): Promise<void> {
  await chrome.storage.local.remove(OPTIONS_TAB_KEY);
}

export { OPTIONS_TAB_KEY };
