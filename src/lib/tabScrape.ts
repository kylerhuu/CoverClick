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
  } catch {
    throw new Error(
      "This page cannot be scraped (restricted URL). Use a normal https job page, or refresh the tab and try again.",
    );
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
