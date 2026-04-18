# CoverClick (Chrome MV3)

CoverClick reads the job posting in your active tab, combines it with a saved profile you control, and generates a tailored cover letter via your backend (or a built-in mock mode for local UI testing). Export a polished `.docx` or PDF preview in one click.

This repo includes a **small Node + Express + SQLite + OpenAI** server under `server/` so you can keep **API keys on the server**, store **user profiles in a database**, and optionally **parse resumes into profile fields** with the model.

## Install (extension)

```bash
npm install
```

## Install (API server)

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env`:

- `OPENAI_API_KEY` — required for live generation and resume parsing.
- `JWT_SECRET` — long random string; required for register/login and `/api/me/*`.
- `DATABASE_URL` — default `file:./dev.db` (SQLite) is fine for local use.
- `PORT` — default `8787`.

Create the database:

```bash
cd server
DATABASE_URL="file:./dev.db" npx prisma migrate deploy
```

Run the API:

```bash
cd server
npm run dev
```

From the repo root you can also run:

```bash
npm run server:dev
```

Default local URL: `http://localhost:8787`.

## Develop (extension)

```bash
npm run dev
```

This runs `vite build --watch` and writes to `dist/`. Reload the unpacked extension in Chrome when files change.

## Build (extension)

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

On a fresh install, **Options → Backend → Use mock generation** is enabled. The popup will not call your server. Mock letters now **vary by job URL/title** so local UI testing is less repetitive.

You can also force mock behavior at build time with `.env` in the extension root:

```bash
cp .env.example .env
# set VITE_USE_MOCK=true|false
```

### Real backend (included server)

1. Start the server (`server/` — see above).
2. Open CoverClick **Options**.
3. Set **API base URL** to your server origin (no trailing slash), e.g. `http://localhost:8787`.
4. Turn off **Mock generation**.

### Account, cloud profile, and resume import

With mock mode **off** and a valid API base URL:

1. **Options → Server account** — Register or log in. The extension stores a **JWT** in Chrome local storage (not your OpenAI key).
2. **Push profile to server** / **Pull profile from server** — syncs the same `UserProfile` JSON the extension uses into SQLite (`StoredProfile`).
3. **Resume → profile (AI)** — upload **PDF, DOCX, or TXT**. The server extracts plain text, calls OpenAI, and returns suggested fields. Use **Merge** (keeps existing values when the model leaves a field blank) or **Replace**. **Always review** — parsing can be wrong on unusual layouts.

**Security:** do not put OpenAI keys in the extension. Only the server reads `OPENAI_API_KEY`.

### API: `POST /api/generate-cover-letter`

Request JSON (extension sends `promptBrief` automatically; you can ignore or log it server-side):

```json
{
  "profile": { "fullName": "…", "skills": [], "experienceBullets": [], "resumeText": "…", "…": "…" },
  "job": {
    "jobTitle": "…",
    "companyName": "…",
    "pageUrl": "https://…",
    "descriptionText": "…",
    "scrapedAt": 1710000000000
  },
  "tone": "professional",
  "emphasis": "general",
  "length": "medium",
  "responseShape": "structured",
  "promptBrief": "string"
}
```

Successful response (structured — preferred by the extension):

```json
{
  "format": "structured",
  "letter": {
    "senderBlock": "…",
    "dateLine": "…",
    "recipientBlock": "…",
    "greeting": "…",
    "bodyParagraphs": ["…", "…", "…"],
    "closing": "…",
    "signature": "…"
  }
}
```

Plain format is also supported:

```json
{
  "format": "plain",
  "coverLetter": "Full letter text…"
}
```

Legacy:

```json
{
  "coverLetter": "Full letter text…"
}
```

Other server routes:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | No | Liveness + whether `OPENAI_API_KEY` is set |
| POST | `/api/register` | No | Create user (needs `JWT_SECRET` on server) |
| POST | `/api/login` | No | Returns JWT |
| GET | `/api/me/profile` | Bearer | Load stored profile JSON |
| PUT | `/api/me/profile` | Bearer | Save profile JSON |
| POST | `/api/me/parse-resume` | Bearer | multipart field `file` (PDF/DOCX/TXT) → extracted profile |

Prompt intent for the extension payload is built in `src/lib/prompts.ts` via `buildCoverLetterPromptBrief()`. The bundled server adds its own instructions for **grounding in bullets/resume**, **anti-boilerplate**, and **per-request variation**.

## Permissions (why they exist)

- **activeTab**: scrape the currently focused posting when you open the popup.
- **storage**: save profile, generation prefs, cached letter, backend settings, and optional auth token locally.
- **scripting** + **tabs**: retry injection if messaging to the content script fails on some pages.
- **host_permissions (http/https)**: allow `fetch()` to your API from the extension UI when mock mode is off.

Tighten `host_permissions` in `manifest.json` once you know your API origin.

## Project structure

- `src/popup/`: popup UI (React)
- `src/options/`: profile + backend + account/resume panels (React)
- `src/content/scrape.ts`: scraping + `chrome.runtime.onMessage` handler
- `src/background/serviceWorker.ts`: MV3 service worker (minimal for MVP)
- `src/lib/`: types, storage, API client, DOCX/PDF export, prompts, tab scrape helper
- `server/`: Express API, Prisma + SQLite, OpenAI generation + resume parsing

## Typecheck

```bash
npm run typecheck
```
