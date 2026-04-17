import { SCRAPE_MESSAGE_TYPE } from "../lib/messages";
import { extractJobContext } from "./extract";

export type ScrapeMessage = { type: typeof SCRAPE_MESSAGE_TYPE } | { type: "COVERCLICK_PING" };

declare global {
  interface Window {
    __COVERCLICK_SCRAPE_READY?: boolean;
  }
}

if (!window.__COVERCLICK_SCRAPE_READY) {
  window.__COVERCLICK_SCRAPE_READY = true;

  chrome.runtime.onMessage.addListener((message: ScrapeMessage, _sender, sendResponse) => {
    if (message?.type === "COVERCLICK_PING") {
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === SCRAPE_MESSAGE_TYPE) {
      try {
        sendResponse({ ok: true, job: extractJobContext() });
      } catch (e) {
        sendResponse({ ok: false, error: e instanceof Error ? e.message : "Scrape failed" });
      }
    }
  });
}
