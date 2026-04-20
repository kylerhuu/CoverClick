import { SCRAPE_MESSAGE_TYPE } from "./messages";
import type { JobContext } from "./types";

type ScrapeResponse =
  | { ok: true; job: JobContext }
  | { ok: false; error?: string }
  | undefined;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNoReceiverError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("Receiving end does not exist") ||
    msg.includes("Could not establish connection") ||
    msg.includes("The message port closed before a response was received")
  );
}

function scrapeInjectFailureMessage(tabUrl: string | undefined, chromeMsg: string): string {
  const u = tabUrl ?? "";
  if (/^chrome:\/\//i.test(u) || /^about:/i.test(u) || /^edge:\/\//i.test(u) || /^devtools:/i.test(u)) {
    return "This page can’t be scraped — internal browser pages don’t allow reading job text here.";
  }
  if (/chromewebstore\.google\.com/i.test(u)) {
    return "The Chrome Web Store can’t be scripted. Open the employer’s job page in a normal tab and try again.";
  }
  if (/\.pdf(\?|$)/i.test(u) || u.startsWith("chrome-extension://")) {
    return "This tab doesn’t support the reader (PDF viewer or extension page). Open the job as a normal web page.";
  }
  const trimmed = chromeMsg.trim();
  if (trimmed) {
    return `Couldn’t attach the reader to this tab (${trimmed}). Try refreshing the page, then Re-scan.`;
  }
  return "Couldn’t attach the reader to this tab. Try refreshing the page, then Re-scan.";
}

export async function requestJobContextFromActiveTab(): Promise<JobContext> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab.");
  const tabId = tab.id;

  async function send(): Promise<JobContext> {
    const res = (await chrome.tabs.sendMessage(tabId, {
      type: SCRAPE_MESSAGE_TYPE,
    })) as ScrapeResponse;
    if (res?.ok && res.job) return res.job;
    throw new Error(res && "error" in res ? String(res.error) : "Could not read this page.");
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await send();
    } catch (e) {
      if (!isNoReceiverError(e)) throw e instanceof Error ? e : new Error(String(e));
      await sleep(100 + attempt * 80);
    }
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ["content.js"],
    });
  } catch (e) {
    const chromeMsg = e instanceof Error ? e.message : String(e);
    throw new Error(scrapeInjectFailureMessage(tab.url, chromeMsg));
  }

  await sleep(50);

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await send();
    } catch (e) {
      if (!isNoReceiverError(e)) throw e instanceof Error ? e : new Error(String(e));
      await sleep(80 + attempt * 60);
    }
  }

  throw new Error(
    "Could not reach the page script. Reload the job tab (especially after updating the extension), then open CoverClick again.",
  );
}
