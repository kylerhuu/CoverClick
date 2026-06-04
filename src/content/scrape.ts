import { SCRAPE_MESSAGE_TYPE } from "../lib/messages";
import { serializeScrapedJobForMessage } from "../lib/serializeScrapedJobForMessage";
import { extractJobContext } from "./extract";
import { maybeEnhanceLinkedInFromGuestApi } from "./extract/strategies/linkedinGuestJobPosting";

export type ScrapeMessage = { type: typeof SCRAPE_MESSAGE_TYPE } | { type: "COVERCLICK_PING" };

type MessageListener = Parameters<typeof chrome.runtime.onMessage.addListener>[0];

declare global {
  interface Window {
    /** Holds the last registered listener so we can replace after extension reload / re-inject. */
    __COVERCLICK_SCRAPE_LISTENER__?: MessageListener;
  }
}

const scrapeListener: MessageListener = (message: ScrapeMessage, _sender, sendResponse) => {
  if (message?.type === "COVERCLICK_PING") {
    sendResponse({ ok: true });
    return;
  }
  if (message?.type === SCRAPE_MESSAGE_TYPE) {
    void (async () => {
      try {
        let job = serializeScrapedJobForMessage(extractJobContext());
        job = serializeScrapedJobForMessage(await maybeEnhanceLinkedInFromGuestApi(job));
        sendResponse({ ok: true, job });
      } catch (e) {
        sendResponse({ ok: false, error: e instanceof Error ? e.message : "Scrape failed" });
      }
    })();
    return true;
  }
  return undefined;
};

if (window.__COVERCLICK_SCRAPE_LISTENER__) {
  chrome.runtime.onMessage.removeListener(window.__COVERCLICK_SCRAPE_LISTENER__);
}
window.__COVERCLICK_SCRAPE_LISTENER__ = scrapeListener;
chrome.runtime.onMessage.addListener(scrapeListener);
