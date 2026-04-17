# CoverClick (Chrome MV3)

CoverClick reads the job posting in your active tab, combines it with a saved profile you control, and generates a tailored cover letter via your backend (or a built-in mock mode for local UI testing). Export a polished `.docx` in one click.

## Install

```bash
npm install
```

## Develop

```bash
npm run dev
```

This runs `vite build --watch` and writes to `dist/`. Reload the unpacked extension in Chrome when files change.

## Build

```bash
npm run build
```

Output is written to `dist/` as a loadable unpacked extension:

- `manifest.json`
- `popup.html` + hashed assets
- `options.html` + hashed assets
- `background.js` (service worker)
- `content.js` (content script)

## Load in Chrome

1. Run `npm run build` (or `npm run dev`).
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `dist/` folder (not the repo root).

## Configure mock vs real backend

### Mock mode (default)

On a fresh install, **Options → Backend → Use mock generation** is enabled. The popup will not call your server.

You can also force mock behavior at build time with `.env`:

```bash
cp .env.example .env
# set VITE_USE_MOCK=true|false
```

### Real backend

1. Open CoverClick **Options**.
2. Set **API base URL** to your server origin (no trailing slash), e.g. `https://api.yourdomain.com`.
3. Turn off **Use mock generation**.
4. Implement:

`POST {apiBaseUrl}/api/generate-cover-letter`

Request JSON:

```json
{
  "profile": { "...": "..." },
  "job": { "...": "..." },
  "tone": "professional",
  "emphasis": "general",
  "length": "medium",
  "promptBrief": "string"
}
```

Response JSON:

```json
{
  "coverLetter": "Final letter text only."
}
```

**Security:** do not put API keys in the extension. Your server should hold secrets and call the LLM.

Prompt intent is documented in `src/lib/prompts.ts` via `buildCoverLetterPromptBrief()`.

## Permissions (why they exist)

- **activeTab**: scrape the currently focused posting when you open the popup.
- **storage**: save profile, generation prefs, cached letter, and backend settings locally.
- **scripting** + **tabs**: retry injection if messaging to the content script fails on some pages.
- **host_permissions (http/https)**: allow `fetch()` to your API from the extension UI when mock mode is off.

Tighten `host_permissions` in `manifest.json` once you know your API origin.

## Project structure

- `src/popup/`: popup UI (React)
- `src/options/`: profile + backend settings UI (React)
- `src/content/scrape.ts`: scraping + `chrome.runtime.onMessage` handler
- `src/background/serviceWorker.ts`: MV3 service worker (minimal for MVP)
- `src/lib/`: types, storage, API client, DOCX export, prompts, tab scraping helper

## Typecheck

```bash
npm run typecheck
```
