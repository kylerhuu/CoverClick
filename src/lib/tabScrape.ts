import { SCRAPE_MESSAGE_TYPE } from "./messages";
import type { JobContext } from "./types";

type ScrapeResponse =
  | { ok: true; job: JobContext }
  | { ok: false; error?: string }
  | undefined;

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

  try {
    return await send();
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        files: ["content.js"],
      });
    } catch {
      throw new Error(
        "This page cannot be scraped. Try a normal http(s) job posting page (not chrome:// or the Chrome Web Store).",
      );
    }
    return await send();
  }
}
