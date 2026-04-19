# CoverClick (Chrome MV3)

CoverClick reads the job posting in your active tab, combines it with a saved profile you control, and generates a tailored cover letter via your backend (or a built-in mock mode for local UI testing). Export a polished `.docx` or PDF preview in one click.

This repo includes a **small Node + Express + PostgreSQL (Prisma) + OpenAI** server under `server/` so you can keep **API keys on the server**, store **user profiles in a database**, and optionally **parse resumes into profile fields** with the model.

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

Edit `server/.env` (copy from `server/.env.example` if you do not already have a local file):

- `DATABASE_URL` — **PostgreSQL** connection string (create the DB first, e.g. `createdb coverclick`).
- `OPENAI_API_KEY` — required for AI routes.
- `JWT_SECRET` — long random string for signing sessions.
- `PUBLIC_API_URL`, `GOOGLE_*`, `STRIPE_*` — see `server/.env.example` and the **Auth, billing** section below.
- `PORT` — default `8787`.

For the **extension** to hit the same machine, copy the repo root `.env.example` to **`.env`** and set `VITE_COVERCLICK_API_ORIGIN=http://localhost:8787`, then run `npm run dev` or `npm run build` from the repo root.

Create / migrate the database:

```bash
cd server
# Set DATABASE_URL in .env first, then:
npx prisma migrate deploy
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

This runs **two watchers in parallel**: the main UI bundle and the IIFE `content.js` bundle (both write to `dist/`). Reload the unpacked extension in Chrome when files change.

## Build (extension)

```bash
npm run build
```

One `vite build` produces the popup/options/background bundle, then automatically runs the content-script build so **`dist/content.js`** always exists for `manifest.json`.

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

### Mock mode (default without a baked API URL)

If the extension is built **without** `VITE_COVERCLICK_API_ORIGIN`, **Options → Backend → Mock generation** defaults on so the side panel does not call your API. Mock letters **vary by job URL/title** for local UI testing.

You can also force mock at build time from the extension root:

```bash
cp .env.example .env
# VITE_USE_MOCK=true|false
```

### Real backend (included server)

1. Start Postgres and the server (`server/` — see above).
2. **Production / team builds:** set `VITE_COVERCLICK_API_ORIGIN` in the extension root `.env` (see `.env.example`) so users are not prompted for an API URL.
3. Open CoverClick **Options**, turn off **Mock generation**, and **Register / Log in** (live generation and job-description cleanup require a signed-in session).
4. Optional: **Backend → Advanced** override if you need a different API origin than the baked default.

### Account, cloud profile, and resume import

With mock mode **off** and a configured API origin (baked or advanced override):

1. **Options → Server account** — Register or log in. The extension stores a **JWT** in Chrome local storage (not your OpenAI key).
2. **Profile autosync** — while signed in, your profile is pushed to the server after edits (and loaded from the server when you open Options). You can still use **Pull** / **Push** manually.
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

### Auth, billing, and subscriptions

1. **Google OAuth** — Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `server/.env`. In Google Cloud Console, set the **authorized redirect URI** to `{your API}/api/auth/google/callback` (must match `GOOGLE_REDIRECT_URI` exactly).
2. **Stripe** — Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID` (recurring subscription price). Point Stripe webhooks to `POST /api/stripe/webhook` (raw JSON body). Use `stripe listen --forward-to localhost:8787/api/stripe/webhook` for local testing.
3. **`PUBLIC_API_URL`** — Public base URL of the API (used for Stripe return pages under `/billing/return`).
4. **Extension** — Build with `VITE_COVERCLICK_API_ORIGIN` pointing at this API. Users sign in with **Google** from the side panel (`chrome.identity.launchWebAuthFlow`); unpaid users see a **paywall** until Stripe reports an active subscription.

Other server routes:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | No | Liveness + config flags |
| GET | `/api/auth/google/start` | No | Begin Google OAuth (query `chrome_redirect`) |
| GET | `/api/auth/google/callback` | No | Google redirect target (server) |
| POST | `/api/auth/exchange` | No | Exchange one-time `code` from extension for JWT |
| GET | `/api/me` | Bearer | Account + `hasPaidAccess` + subscription status |
| POST | `/api/billing/checkout-session` | Bearer | Stripe Checkout URL (subscribe) |
| POST | `/api/billing/portal-session` | Bearer | Stripe Customer Portal URL |
| POST | `/api/stripe/webhook` | Stripe signature | Subscription lifecycle updates |
| GET | `/api/me/profile` | Bearer + **paid** | Load stored profile JSON |
| PUT | `/api/me/profile` | Bearer + **paid** | Save profile JSON |
| POST | `/api/me/parse-resume` | Bearer + **paid** | multipart field `file` (PDF/DOCX/TXT) → extracted profile |
| POST | `/api/clean-job-description` | Bearer + **paid** | Normalize noisy job HTML/text (OpenAI) |
| POST | `/api/generate-cover-letter` | Bearer + **paid** | Generate structured/plain letter (OpenAI) |

Prompt intent for the extension payload is built in `src/lib/prompts.ts` via `buildCoverLetterPromptBrief()`. The bundled server adds its own instructions for **grounding in bullets/resume**, **anti-boilerplate**, and **per-request variation**.

## Permissions (why they exist)

- **activeTab**: scrape the currently focused posting when you open the popup.
- **storage**: save profile, generation prefs, cached letter, backend settings, and optional auth token locally.
- **identity**: Google sign-in via `chrome.identity.launchWebAuthFlow`.
- **scripting** + **tabs**: retry injection if messaging to the content script fails on some pages; open Stripe Checkout / portal in a tab.
- **host_permissions (http/https)**: allow `fetch()` to your API from the extension UI when mock mode is off.

Tighten `host_permissions` in `manifest.json` once you know your API origin.

## Project structure

- `src/popup/`: popup UI (React)
- `src/options/`: profile + backend + account/resume panels (React)
- `src/content/scrape.ts`: scraping + `chrome.runtime.onMessage` handler
- `src/background/serviceWorker.ts`: MV3 service worker (minimal for MVP)
- `src/lib/`: types, storage, API client, DOCX/PDF export, prompts, tab scrape helper
- `server/`: Express API, Prisma + PostgreSQL, OpenAI generation + resume parsing

## Typecheck

```bash
npm run typecheck
```

## Deploy (production)

See **[DEPLOY.md](./DEPLOY.md)** for API hosting (Docker, env vars, Postgres migrations), Stripe and Google OAuth in production, and building or publishing the Chrome extension (`VITE_COVERCLICK_API_ORIGIN`, `store:zip`, Web Store checklist).
