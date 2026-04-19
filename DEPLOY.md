# Deploying CoverClick

You ship **two things**: the **API** (`server/`) and the **Chrome extension** (built `dist/`). This guide walks through production setup end to end.

---

## 1. API server (Node + Express + PostgreSQL)

### Requirements

- **PostgreSQL** database (managed is fine: Neon, Supabase, RDS, etc.).
- **Environment variables** (see `server/.env.example`):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for signing sessions |
| `OPENAI_API_KEY` | Required for AI routes |
| `PUBLIC_API_URL` | Public `https://…` base URL of this API (no trailing slash). Used for Stripe return URLs and should match what the extension calls |
| `PORT` | Listen port (default `8787`; many hosts inject their own — use theirs) |
| `GOOGLE_*` | OAuth web client; redirect URI must match exactly |
| `STRIPE_*` | Billing + webhook |
| `TRUST_PROXY` | Set to `1` when running behind a reverse proxy (Fly, Railway, Render, nginx) |

### Database migrations

On each new release, run migrations against the **production** database:

```bash
cd server
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

The included **Docker** image runs `prisma migrate deploy` automatically on container start (after `DATABASE_URL` is set).

### Docker

From the **repository root**:

```bash
docker build -t coverclick-api -f server/Dockerfile server
docker run --env-file server/.env -p 8787:8787 coverclick-api
```

Use your host’s secrets manager or env injection instead of committing `.env`.

### Reverse proxy & HTTPS

- Terminate **TLS** at your provider (managed certificate) or nginx/Caddy.
- Stripe webhooks and Google OAuth require **public HTTPS** URLs.
- Set **`TRUST_PROXY=1`** if the Node process sits behind one proxy hop so rate limiting and logs see real client IPs.

### Health check

`GET https://your-api.example.com/api/health` returns `{ ok, hasOpenAI, hasGoogleOAuth, hasStripe }` for monitoring.

---

## 2. Google OAuth (production)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **OAuth 2.0 Client ID** (type: **Web application**).
2. **Authorized redirect URIs** must include **exactly**:

   `https://YOUR_API_HOST/api/auth/google/callback`

3. Set in production env:

   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=https://YOUR_API_HOST/api/auth/google/callback`

4. If you use **ALLOWED_ORIGINS**, add any non-extension web origins that must call the API with cookies/CORS (usually unnecessary for the extension alone).

---

## 3. Stripe (production)

1. Use **live** keys in production: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.
2. Dashboard → Developers → Webhooks → add endpoint:

   `https://YOUR_API_HOST/api/stripe/webhook`

   - Events: at minimum `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` (your handler already covers these).
3. Webhook signing secret → `STRIPE_WEBHOOK_SECRET`.
4. `PUBLIC_API_URL` must be your public API base (used for Checkout success/cancel URLs).

---

## 4. Chrome extension (production build)

### Bake the API URL

Create **`.env`** in the **repo root** (not `server/`):

```bash
VITE_COVERCLICK_API_ORIGIN=https://YOUR_API_HOST
```

Optional: `VITE_USE_MOCK=false`

### Build and zip

```bash
npm ci
npm run build
npm run store:zip   # produces coverclick-extension.zip from dist/
```

### Tighten permissions (recommended)

In `manifest.json`, replace broad `host_permissions` with your API origin only, for example:

```json
"host_permissions": ["https://YOUR_API_HOST/*"]
```

Add other hosts only if the extension must `fetch()` them.

### Publishing

- **Chrome Web Store**: upload the zip, complete listing (description, screenshots, **privacy policy** URL, single-purpose description).
- **Internal / team**: distribute the zip or unpacked `dist/` via MDM; users load unpacked `dist/` in developer mode or you publish unlisted.

### OAuth extension ID

Google OAuth “Chrome extension” vs “Web” flow: this app uses **web** OAuth + `chrome.identity.launchWebAuthFlow` with a redirect to `https://…chromiumapp.org`. Ensure your Google OAuth client and redirect URIs match what the extension and server expect (see README **Auth, billing** section).

---

## 5. Post-deploy smoke test

1. `curl -s https://YOUR_API_HOST/api/health | jq`
2. Install the built extension with **`VITE_COVERCLICK_API_ORIGIN`** pointing at production.
3. Side panel: **Google sign-in** → **Subscribe** (test card in Stripe test mode if still on test keys) → confirm **paid** features (generate, profile sync, resume import).
4. Stripe Dashboard → Webhooks → confirm **200** deliveries.

---

## 6. Ongoing operations

- **DB backups** on your provider schedule.
- **Rotate** `JWT_SECRET` only with a plan (invalidates all sessions).
- **Extension updates**: bump `manifest.json` `version`, rebuild, resubmit zip to the store.

For a minimal **Docker Compose** stack (API + Postgres) on a single VM, you can add `docker-compose.yml` later; the `server/Dockerfile` is enough for most PaaS deploy buttons.

---

## Railway (API on [railway.app](https://railway.app))

### 1. Create the project

1. **New project** → **Deploy from GitHub** → select this repo.
2. Open the **API service** → **Settings** → set **Root Directory** to `server`  
   (so Railway only builds the Node app, not the Chrome extension at the repo root).
3. If Railway does not pick up config automatically: **Settings** → **Config as code** → path **`server/railway.toml`**.

### 2. Add Postgres

1. In the project canvas → **New** → **Database** → **PostgreSQL**.
2. On the **Postgres** service → **Variables** → copy **`DATABASE_URL`** (or use **Reference** to inject it into the API service).
3. On the **API** service → **Variables** → add **`DATABASE_URL`** referencing the Postgres plugin (Railway’s “Variable Reference” UI).

### 3. API environment variables

In the **API** service → **Variables**, set (see `server/.env.example` for descriptions):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | From Postgres reference |
| `JWT_SECRET` | Long random secret |
| `OPENAI_API_KEY` | Required |
| `PUBLIC_API_URL` | Your public API URL, e.g. `https://your-service.up.railway.app` (no trailing slash). **Update when you attach a custom domain.** |
| `PORT` | **Do not set manually** — Railway sets `PORT`; the app already uses `process.env.PORT`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Redirect must be `https://<your-api-host>/api/auth/google/callback` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | Live or test keys |
| `TRUST_PROXY` | Set to `1` (Railway terminates TLS in front of your container) |

Generate the public URL: **API service** → **Settings** → **Networking** → **Generate domain** (e.g. `*.up.railway.app`). Use that host in `PUBLIC_API_URL`, Google redirect URI, Stripe webhook URL, and extension `VITE_COVERCLICK_API_ORIGIN`.

### 4. Build & start

- **If Railway builds with Docker** (it will if `server/Dockerfile` is present): the image runs `npm run build`, then **`npm run start:deploy`** (`prisma migrate deploy` + `node dist/index.js`).
- **If Railway uses Railpack** instead: ensure **Start Command** is `npm run start:deploy` (migrations + server).

`server/railway.toml` configures **healthcheck** `GET /api/health` and restart policy.

### 5. Stripe webhook (production)

Stripe Dashboard → Webhooks → endpoint:

`https://<your-railway-public-host>/api/stripe/webhook`

Use the signing secret Railway doesn’t need to expose publicly beyond your env.

### 6. Extension

Build the extension with:

`VITE_COVERCLICK_API_ORIGIN=https://<same-public-host-as-PUBLIC_API_URL>`

Then tighten `manifest.json` **`host_permissions`** to that origin (see main DEPLOY section above).

### 7. CLI (optional)

```bash
npm i -g @railway/cli
railway login
railway link   # in repo, select project
railway up     # deploy from local (optional)
```

---

### Railway checklist

- [ ] Service **root directory** = `server`
- [ ] Postgres attached, **`DATABASE_URL`** on API service
- [ ] **`PUBLIC_API_URL`** matches generated / custom domain
- [ ] **`GOOGLE_REDIRECT_URI`** = `https://<host>/api/auth/google/callback`
- [ ] **`TRUST_PROXY=1`**
- [ ] Stripe webhook URL and **`STRIPE_WEBHOOK_SECRET`**
- [ ] **`/api/health`** returns 200 after deploy
- [ ] Extension built with matching **`VITE_COVERCLICK_API_ORIGIN`**
