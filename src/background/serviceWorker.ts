export {};

async function ensureSidePanelOpensWithAction(): Promise<void> {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch {
    // Older Chromium / missing API — ignore.
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureSidePanelOpensWithAction();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureSidePanelOpensWithAction();
});
