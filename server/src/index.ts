import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { Prisma, PrismaClient, type SubscriptionStatus } from "@prisma/client";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import Stripe from "stripe";
import { createHash, randomBytes } from "node:crypto";
import type { GenerationRequest } from "./contract.js";
import { extractTextFromResumeBuffer } from "./textExtract.js";
import { extractProfileFromResumeText } from "./extractProfileWithOpenAI.js";
import { cleanJobDescriptionWithOpenAI } from "./cleanJobDescriptionOpenAI.js";
import { generateCoverLetterWithOpenAI } from "./generateCoverLetterOpenAI.js";
import { hasPaidSubscription, subscriptionStatusFromStripe } from "./access.js";

const prisma = new PrismaClient();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET?.trim() || "";

/**
 * Google redirect URIs must match the Cloud Console entry byte-for-byte. Values copied from
 * some dashboards arrive percent-encoded once (e.g. https%3A%2F%2F...), which breaks the
 * token exchange and can surface as a vague OAuth "policy" / invalid_request error.
 */
function normalizeGoogleOAuthRedirectUri(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.includes("%3A") || t.includes("%3a")) {
    try {
      return decodeURIComponent(t).trim();
    } catch {
      return t;
    }
  }
  return t;
}

/**
 * Final hop after Google → this must be chrome.identity.getRedirectURL() (MV3:
 * https://<extension-id>.chromiumapp.org/... ). Never register this on Google's OAuth client
 * for this architecture — Google only redirects to GOOGLE_REDIRECT_URI (this API's /callback).
 */
function isValidChromeIdentityRedirectUrl(u: URL): boolean {
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (u.hash) return false;
  // Extension IDs use 32 chars from [a-p] (not full hex).
  return /^[a-p]{32}\.chromiumapp\.org$/i.test(u.hostname);
}

function parseValidatedChromeRedirect(raw: string): string {
  const trimmed = raw.trim();
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new Error("Invalid chrome_redirect URL.");
  }
  if (!isValidChromeIdentityRedirectUrl(u)) {
    throw new Error("Invalid chrome_redirect (expected https://<extension-id>.chromiumapp.org/...).");
  }
  return u.toString();
}

/** RFC 7636 PKCE code_verifier (43–128 chars). */
function randomPkceVerifier(): string {
  const v = randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  if (v.length < 43 || v.length > 128) throw new Error("PKCE verifier length out of range.");
  return v;
}

function pkceS256ChallengeFromVerifier(verifier: string): string {
  return createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
const GOOGLE_REDIRECT_URI = normalizeGoogleOAuthRedirectUri(process.env.GOOGLE_REDIRECT_URI?.trim() || "");
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID?.trim() || "";
const PUBLIC_API_URL = process.env.PUBLIC_API_URL?.trim().replace(/\/+$/, "") || "";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const oauth2Client =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI
    ? new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)
    : null;

const allowedExtraOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

/** When true, avoid returning raw exception text to API clients (Stripe/OpenAI messages, paths, etc.). */
const IS_PRODUCTION =
  process.env.NODE_ENV === "production" || Boolean(process.env.RAILWAY_ENVIRONMENT?.trim());

function publicApiError(err: unknown): string {
  return IS_PRODUCTION ? "Something went wrong. Please try again." : err instanceof Error ? err.message : "Something went wrong.";
}

function isMissingProcessedStripeEventTable(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2021") return false;
  const meta = (err.meta ?? {}) as { table?: unknown; modelName?: unknown };
  const table = typeof meta.table === "string" ? meta.table.toLowerCase() : "";
  const model = typeof meta.modelName === "string" ? meta.modelName.toLowerCase() : "";
  return table.includes("processed_stripe_event") || model.includes("processedstripeevent");
}

/**
 * Optional comma-separated Chrome extension IDs.
 * Accepts raw 32-char ids OR full origins (`chrome-extension://…`) — we normalize so pasting from
 * the dashboard does not double-prefix (`chrome-extension://chrome-extension://…`).
 */
function parseChromeExtensionOriginSegment(raw: string): string | null {
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  s = s.toLowerCase();
  if (!s) return null;
  if (s.startsWith("chrome-extension://")) {
    s = s.slice("chrome-extension://".length);
  }
  const slash = s.indexOf("/");
  if (slash >= 0) s = s.slice(0, slash);
  s = s.trim();
  // Chrome extension IDs are 32 chars (a–z, 0–9); unpacked uses a–p alphabet.
  if (!/^[a-z0-9]{32}$/.test(s)) {
    console.warn(
      `[cors] Ignoring CHROME_EXTENSION_IDS entry (expected 32-char id, got length ${s.length}): ${s.slice(0, 8)}…`,
    );
    return null;
  }
  return `chrome-extension://${s}`;
}

/** Non-empty if the operator set CHROME_EXTENSION_IDS in the environment (used for startup logs). */
const CHROME_EXTENSION_IDS_ENV = process.env.CHROME_EXTENSION_IDS?.trim() ?? "";

const allowedChromeExtensionOriginSet: Set<string> | null = (() => {
  const raw = CHROME_EXTENSION_IDS_ENV;
  if (!raw) return null;
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const o = parseChromeExtensionOriginSegment(part);
    if (o) set.add(o);
  }
  if (!set.size) {
    console.error(
      "[cors] CHROME_EXTENSION_IDS is set but no valid 32-character extension ids were parsed. Use ids only (e.g. abcdef…) or full chrome-extension:// URLs — see DEPLOY.md.",
    );
    return null;
  }
  return set;
})();

const app = express();

/** Behind Fly.io / Railway / Render / nginx, set TRUST_PROXY=1 so rate limits and logs see the real client IP. */
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

/** Stripe webhook must receive raw body for signature verification. */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      res.status(503).send("Stripe not configured");
      return;
    }
    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string") {
      res.status(400).send("Missing signature");
      return;
    }
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, STRIPE_WEBHOOK_SECRET);
    } catch (e) {
      res.status(400).send(IS_PRODUCTION ? "Invalid webhook signature." : e instanceof Error ? e.message : "Invalid signature");
      return;
    }

    try {
      const already = await prisma.processedStripeEvent.findUnique({ where: { eventId: event.id } });
      if (already) {
        res.json({ received: true });
        return;
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode !== "subscription" || !session.subscription) break;
          // Do not activate on abandoned/failed first payment; other statuses depend on Stripe product mode.
          if (session.payment_status === "unpaid") break;
          const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
          if (!customerId) break;
          const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
          if (!user) break;
          const sub = (await stripe.subscriptions.retrieve(session.subscription as string)) as unknown as {
            id: string;
            status: string;
            current_period_end?: number;
          };
          const periodEndSec = typeof sub.current_period_end === "number" ? sub.current_period_end : null;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: sub.id,
              subscriptionStatus: subscriptionStatusFromStripe(sub.status),
              subscriptionPeriodEnd: periodEndSec != null ? new Date(periodEndSec * 1000) : null,
            },
          });
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const subSnap = sub as unknown as { id: string; status: string; current_period_end?: number; customer: string | { id?: string } };
          const customerId = typeof subSnap.customer === "string" ? subSnap.customer : subSnap.customer?.id;
          if (!customerId) break;
          const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
          if (!user) break;
          const status =
            event.type === "customer.subscription.deleted"
              ? ("CANCELED" as SubscriptionStatus)
              : subscriptionStatusFromStripe(subSnap.status);
          const pe = typeof subSnap.current_period_end === "number" ? subSnap.current_period_end : null;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: subSnap.id,
              subscriptionStatus: status,
              subscriptionPeriodEnd: pe != null ? new Date(pe * 1000) : null,
            },
          });
          break;
        }
        default:
          break;
      }

      try {
        await prisma.processedStripeEvent.create({ data: { eventId: event.id } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          res.json({ received: true });
          return;
        }
        throw e;
      }
    } catch (e) {
      if (isMissingProcessedStripeEventTable(e)) {
        console.error(
          "[stripe webhook] Missing table processed_stripe_event (Prisma P2021). Run `prisma migrate deploy` against production before starting the API.",
          e,
        );
      } else {
        console.error("[stripe webhook]", e);
      }
      res.status(500).json({ error: "Webhook handler failed" });
      return;
    }
    res.json({ received: true });
  },
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origin.startsWith("chrome-extension://")) {
        if (allowedChromeExtensionOriginSet?.size) {
          const normalized = origin.toLowerCase();
          const ok = allowedChromeExtensionOriginSet.has(normalized);
          if (!ok) {
            console.warn("[cors] Blocked chrome-extension Origin (not in CHROME_EXTENSION_IDS):", origin);
          }
          callback(null, ok);
          return;
        }
        callback(null, true);
        return;
      }
      if (allowedExtraOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1.5mb" }));

const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Math.max(5, Number(process.env.RATE_LIMIT_AUTH_PER_IP || 40)),
  standardHeaders: true,
  legacyHeaders: false,
});

const authedAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Math.max(3, Number(process.env.RATE_LIMIT_AI_PER_MIN || 30)),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = (req as express.Request & { auth?: Authed }).auth;
    return auth?.userId || req.ip || "unknown";
  },
});

function jwtSecretOr503(res: express.Response): string | null {
  if (!JWT_SECRET) {
    res.status(503).json({ error: "Server is missing JWT_SECRET." });
    return null;
  }
  return JWT_SECRET;
}

type Authed = { userId: string };

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const secret = JWT_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Server is missing JWT_SECRET." });
    return;
  }
  const hdr = req.headers.authorization;
  const token = hdr?.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing Authorization Bearer token." });
    return;
  }
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (!sub) {
      res.status(401).json({ error: "Invalid token." });
      return;
    }
    (req as express.Request & { auth?: Authed }).auth = { userId: sub };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

async function requirePaidMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = (req as express.Request & { auth: Authed }).auth.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !hasPaidSubscription(user.subscriptionStatus)) {
    res.status(403).json({ error: "Active subscription required.", code: "SUBSCRIPTION_REQUIRED" });
    return;
  }
  next();
}

/** Public probe — keep payload minimal (no integration fingerprints). */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

/** After Google OAuth, Stripe redirects here — user closes tab and returns to the extension. */
app.get("/billing/return", (req, res) => {
  const ok = req.query.success === "1";
  res
    .status(200)
    .type("html")
    .send(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>CoverClick</title></head><body style="font-family:system-ui;padding:2rem;max-width:36rem">
      <h1>${ok ? "You're all set" : "Checkout canceled"}</h1>
      <p>${ok ? "You can close this tab and return to the CoverClick extension. If your subscription doesn’t unlock immediately, wait a few seconds and click <strong>Refresh</strong> in the extension." : "No charges were made. You can close this tab."}</p>
    </body></html>`,
    );
});

/**
 * Chrome extension OAuth entrypoint (used with chrome.identity.launchWebAuthFlow).
 *
 * Flow:
 * 1) Extension opens this URL with ?chrome_redirect=<chrome.identity.getRedirectURL()>.
 * 2) We validate chrome_redirect (must be https://<id>.chromiumapp.org — never sent to Google).
 * 3) We stash chrome_redirect + a PKCE verifier inside a short-lived signed JWT (`state`).
 * 4) We redirect the user to Google with redirect_uri = GOOGLE_REDIRECT_URI only (backend /callback).
 */
app.get("/api/auth/google/start", authIpLimiter, (req, res) => {
  const secret = jwtSecretOr503(res);
  if (!secret) return;
  if (!oauth2Client || !GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    res.status(503).send("Google OAuth is not configured (GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI).");
    return;
  }
  const chromeRedirectRaw = typeof req.query.chrome_redirect === "string" ? req.query.chrome_redirect.trim() : "";
  let chromeRedirect: string;
  try {
    chromeRedirect = parseValidatedChromeRedirect(chromeRedirectRaw);
  } catch {
    res
      .status(400)
      .send("Invalid chrome_redirect (must be https://<extension-id>.chromiumapp.org/... from chrome.identity.getRedirectURL).");
    return;
  }
  const codeVerifier = randomPkceVerifier();
  const codeChallenge = pkceS256ChallengeFromVerifier(codeVerifier);
  const state = jwt.sign(
    { typ: "g", cr: chromeRedirect, pv: codeVerifier },
    secret,
    { expiresIn: "10m", jwtid: randomBytes(16).toString("hex") },
  );
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
    redirect_uri: GOOGLE_REDIRECT_URI,
    code_challenge_method: CodeChallengeMethod.S256,
    code_challenge: codeChallenge,
  });
  res.redirect(302, url);
});

/**
 * Google redirects here only (authorized redirect URI in Cloud Console = GOOGLE_REDIRECT_URI).
 * We verify `state`, exchange the auth `code` at Google (with PKCE verifier + same redirect_uri),
 * mint a CoverClick user, then redirect the browser to the extension chromiumapp.org URL with
 * ?cc_exchange=<one-time server code> for the extension to POST /api/auth/exchange.
 */
app.get("/api/auth/google/callback", authIpLimiter, async (req, res) => {
  const err = typeof req.query.error === "string" ? req.query.error : "";
  const secret = jwtSecretOr503(res);
  if (!secret) return;
  let chromeRedirect = "";
  let codeVerifier: string | undefined;
  try {
    const stateRaw = typeof req.query.state === "string" ? req.query.state : "";
    const payload = jwt.verify(stateRaw, secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    if (payload.typ !== "g" || typeof payload.cr !== "string" || typeof payload.pv !== "string") throw new Error("bad state");
    chromeRedirect = parseValidatedChromeRedirect(payload.cr);
    codeVerifier = payload.pv;
  } catch {
    res.status(400).send("Invalid OAuth state.");
    return;
  }
  if (err) {
    const sep = chromeRedirect.includes("?") ? "&" : "?";
    res.redirect(302, `${chromeRedirect}${sep}cc_error=${encodeURIComponent(err)}`);
    return;
  }
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code || !oauth2Client) {
    res.status(400).send("Missing code.");
    return;
  }
  try {
    const { tokens } = await oauth2Client.getToken({
      code,
      codeVerifier,
      redirect_uri: GOOGLE_REDIRECT_URI,
    });
    let sub: string | undefined;
    let email: string | undefined;
    if (tokens.id_token) {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });
      const p = ticket.getPayload();
      sub = p?.sub;
      email = p?.email ?? undefined;
    }
    if (!sub || !email) {
      const at = tokens.access_token;
      if (!at) throw new Error("No user info from Google");
      const ui = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${at}` },
      });
      const j = (await ui.json()) as { sub?: string; email?: string };
      sub = j.sub;
      email = j.email;
    }
    if (!sub || !email) throw new Error("Missing Google sub/email");

    const normalizedEmail = email.trim().toLowerCase();

    let user = await prisma.user.findUnique({ where: { googleSub: sub } });
    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleSub: sub },
        });
      } else {
        user = await prisma.user.create({
          data: { email: normalizedEmail, googleSub: sub },
        });
      }
    }

    if (stripe && !user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: normalizedEmail,
        metadata: { userId: user.id },
      });
      user = await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const exchangeCode = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.authExchange.create({
      data: { code: exchangeCode, userId: user.id, expiresAt },
    });

    const sep = chromeRedirect.includes("?") ? "&" : "?";
    res.redirect(302, `${chromeRedirect}${sep}cc_exchange=${encodeURIComponent(exchangeCode)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    const sep = chromeRedirect.includes("?") ? "&" : "?";
    res.redirect(302, `${chromeRedirect}${sep}cc_error=${encodeURIComponent(msg)}`);
  }
});

app.post("/api/auth/exchange", authIpLimiter, async (req, res) => {
  const secret = jwtSecretOr503(res);
  if (!secret) return;
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!code) {
    res.status(400).json({ error: "code required" });
    return;
  }
  await prisma.authExchange.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const row = await prisma.authExchange.findUnique({ where: { code } });
  if (!row || row.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired code." });
    return;
  }
  await prisma.authExchange.delete({ where: { code } });
  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) {
    res.status(400).json({ error: "User missing." });
    return;
  }
  const token = jwt.sign({ sub: user.id }, secret, { expiresIn: "60d" });
  res.json({
    token,
    user: { id: user.id, email: user.email },
    hasPaidAccess: hasPaidSubscription(user.subscriptionStatus),
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPeriodEnd: user.subscriptionPeriodEnd?.toISOString() ?? null,
  });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { auth: Authed }).auth.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      hasPaidAccess: hasPaidSubscription(user.subscriptionStatus),
      subscriptionPeriodEnd: user.subscriptionPeriodEnd?.toISOString() ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: publicApiError(e) });
  }
});

/**
 * Pull subscription state from Stripe for this user’s customer and mirror it into the DB.
 * Use after checkout when webhooks are delayed or misconfigured (e.g. live vs test webhook secret).
 */
app.post("/api/billing/sync-subscription", authMiddleware, async (req, res) => {
  try {
    if (!stripe) {
      res.status(503).json({ error: "Stripe is not configured." });
      return;
    }
    const userId = (req as express.Request & { auth: Authed }).auth.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No Stripe customer linked to this account." });
      return;
    }

    const list = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 20,
    });
    const { data } = list;

    const pick =
      data.find((s) => s.status === "active") ??
      data.find((s) => s.status === "trialing") ??
      data.find((s) => s.status === "past_due") ??
      data[0] ??
      null;

    if (pick) {
      const snap = pick as unknown as { current_period_end?: number; status: string };
      const pe = typeof snap.current_period_end === "number" ? snap.current_period_end : null;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeSubscriptionId: pick.id,
          subscriptionStatus: subscriptionStatusFromStripe(snap.status),
          subscriptionPeriodEnd: pe != null ? new Date(pe * 1000) : null,
        },
      });
    } else if (data.length === 0) {
      // Leave DB unchanged — webhook may still be in flight, or customer has no sub yet.
      console.info("[sync-subscription] no subscription objects for customer", user.stripeCustomerId);
    }

    const updated = await prisma.user.findUnique({ where: { id: userId } });
    if (!updated) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json({
      id: updated.id,
      email: updated.email,
      subscriptionStatus: updated.subscriptionStatus,
      hasPaidAccess: hasPaidSubscription(updated.subscriptionStatus),
      subscriptionPeriodEnd: updated.subscriptionPeriodEnd?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[sync-subscription]", e);
    res.status(500).json({ error: publicApiError(e) });
  }
});

app.post("/api/billing/checkout-session", authMiddleware, async (req, res) => {
  try {
    if (!stripe || !STRIPE_PRICE_ID) {
      res.status(503).json({ error: "Stripe billing is not configured." });
      return;
    }
    const userId = (req as express.Request & { auth: Authed }).auth.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      res.status(400).json({
        error:
          "No Stripe customer is linked to this account. If billing was turned on after you signed in, sign out and sign in again. Otherwise contact support.",
      });
      return;
    }
    const base = PUBLIC_API_URL || `http://localhost:${PORT}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: user.stripeCustomerId,
      client_reference_id: user.id,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${base}/billing/return?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/billing/return?success=0`,
      allow_promotion_codes: true,
    });
    if (!session.url) {
      res.status(500).json({ error: publicApiError(new Error("No checkout URL.")) });
      return;
    }
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: publicApiError(e) });
  }
});

app.post("/api/billing/portal-session", authMiddleware, async (req, res) => {
  try {
    if (!stripe) {
      res.status(503).json({ error: "Stripe is not configured." });
      return;
    }
    const userId = (req as express.Request & { auth: Authed }).auth.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      res.status(400).json({
        error:
          "No Stripe customer is linked to this account. If billing was turned on after you signed in, sign out and sign in again so the server can create your customer. Otherwise contact support.",
      });
      return;
    }
    const base = PUBLIC_API_URL || `http://localhost:${PORT}`;
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${base}/billing/return?success=1`,
    });
    if (!portal.url) {
      res.status(500).json({ error: "Stripe did not return a portal URL." });
      return;
    }
    res.json({ url: portal.url });
  } catch (e) {
    console.error("[billing portal-session]", e);
    const msg = e instanceof Error ? e.message : "";
    const lower = msg.toLowerCase();
    if (
      lower.includes("customer portal") ||
      lower.includes("billing portal") ||
      lower.includes("default configuration") ||
      lower.includes("no configuration provided")
    ) {
      res.status(503).json({
        error:
          "Stripe Customer portal is not active. In Stripe Dashboard: Settings → Billing → Customer portal → turn it on and save, then try again.",
      });
      return;
    }
    res.status(500).json({ error: publicApiError(e) });
  }
});

app.get("/api/me/profile", authMiddleware, requirePaidMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { auth: Authed }).auth.userId;
    const row = await prisma.storedProfile.findUnique({ where: { userId } });
    if (!row) {
      res.json({ profile: null });
      return;
    }
    res.json({ profile: row.data });
  } catch (e) {
    res.status(500).json({ error: publicApiError(e) });
  }
});

app.put("/api/me/profile", authMiddleware, requirePaidMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { auth: Authed }).auth.userId;
    const profile = req.body?.profile ?? req.body;
    if (!profile || typeof profile !== "object") {
      res.status(400).json({ error: "Expected JSON body with profile fields." });
      return;
    }
    await prisma.storedProfile.upsert({
      where: { userId },
      create: { userId, data: profile as object },
      update: { data: profile as object },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: publicApiError(e) });
  }
});

app.post("/api/me/parse-resume", authMiddleware, requirePaidMiddleware, authedAiLimiter, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ error: "Missing file field \"file\" (PDF, DOCX, or TXT)." });
      return;
    }
    const { text } = await extractTextFromResumeBuffer(file.buffer, file.originalname);
    if (!text.trim()) {
      res.status(400).json({ error: "Could not read text from that file." });
      return;
    }
    const profile = await extractProfileFromResumeText(text);
    if (!profile.resumeText.trim()) profile.resumeText = text;
    res.json({ profile, warnings: ["Review all fields before applying — extraction can be wrong on unusual resumes."] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Parse failed";
    const code = msg.includes("OPENAI_API_KEY") ? 503 : 400;
    res.status(code).json({ error: code === 503 || !IS_PRODUCTION ? msg : publicApiError(e) });
  }
});

function isGenerationRequest(body: unknown): body is GenerationRequest {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.profile === "object" && b.profile !== null && typeof b.job === "object" && b.job !== null;
}

app.post("/api/clean-job-description", authMiddleware, requirePaidMiddleware, authedAiLimiter, async (req, res) => {
  try {
    const rawText = typeof req.body?.rawText === "string" ? req.body.rawText : "";
    if (!rawText.trim()) {
      res.status(400).json({ error: "rawText required." });
      return;
    }
    const description = await cleanJobDescriptionWithOpenAI(rawText);
    if (!description.trim()) {
      res.status(422).json({ error: "Model returned empty text." });
      return;
    }
    res.json({ description });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Clean failed";
    const status = msg.includes("OPENAI_API_KEY") ? 503 : 500;
    res.status(status).json({ error: status === 503 || !IS_PRODUCTION ? msg : publicApiError(e) });
  }
});

app.post("/api/generate-cover-letter", authMiddleware, requirePaidMiddleware, authedAiLimiter, async (req, res) => {
  try {
    if (!isGenerationRequest(req.body)) {
      res.status(400).json({ error: "Invalid body: expected profile, job, tone, emphasis, length, responseShape." });
      return;
    }
    const variationSeed = `${req.body.job.pageUrl}|${randomBytes(8).toString("hex")}`;
    const out = await generateCoverLetterWithOpenAI(req.body, { variationSeed });
    res.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    const status = msg.includes("OPENAI_API_KEY") ? 503 : 500;
    res.status(status).json({ error: status === 503 || !IS_PRODUCTION ? msg : publicApiError(e) });
  }
});

app.listen(PORT, "0.0.0.0",() => {
  console.log(`CoverClick API listening on port ${PORT}`);
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.warn("[warn] OPENAI_API_KEY is unset — generation and resume parse will fail.");
  }
  if (!JWT_SECRET) {
    console.warn("[warn] JWT_SECRET is unset.");
  }
  if (!oauth2Client) {
    console.warn("[warn] Google OAuth not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.");
  } else {
    try {
      const u = new URL(GOOGLE_REDIRECT_URI);
      if (!u.pathname.endsWith("/api/auth/google/callback")) {
        console.warn(
          `[warn] GOOGLE_REDIRECT_URI should end with /api/auth/google/callback (currently ${u.pathname}). Must match Google Cloud Console exactly.`,
        );
      }
      if (u.protocol === "http:" && !/^localhost$|^127\.0\.0\.1$/i.test(u.hostname)) {
        console.warn("[warn] GOOGLE_REDIRECT_URI uses http on a non-loopback host — Google requires https for public deployments.");
      }
    } catch {
      console.warn("[warn] GOOGLE_REDIRECT_URI is not a valid absolute URL.");
    }
  }
  if (!stripe || !STRIPE_PRICE_ID) {
    console.warn("[warn] Stripe checkout not fully configured — set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.");
  }
  if (IS_PRODUCTION) {
    if (allowedChromeExtensionOriginSet?.size) {
      console.info(`[cors] CHROME_EXTENSION_IDS: ${allowedChromeExtensionOriginSet.size} extension origin(s) allowed.`);
    } else if (!CHROME_EXTENSION_IDS_ENV) {
      console.warn(
        "[warn] CHROME_EXTENSION_IDS is unset — CORS allows any chrome-extension:// origin. Set CHROME_EXTENSION_IDS to your published extension id for tighter production access.",
      );
    }
  }
});
