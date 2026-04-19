import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { PrismaClient, type SubscriptionStatus } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import Stripe from "stripe";
import { randomBytes } from "node:crypto";
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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI?.trim() || "";
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

const app = express();

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
      const msg = e instanceof Error ? e.message : "Invalid signature";
      res.status(400).send(msg);
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode !== "subscription" || !session.subscription) break;
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
    } catch (e) {
      console.error("[stripe webhook]", e);
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
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
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

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY?.trim()),
    hasGoogleOAuth: Boolean(oauth2Client),
    hasStripe: Boolean(stripe && STRIPE_PRICE_ID),
  });
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

app.get("/api/auth/google/start", authIpLimiter, (req, res) => {
  const secret = jwtSecretOr503(res);
  if (!secret) return;
  if (!oauth2Client || !GOOGLE_CLIENT_ID) {
    res.status(503).send("Google OAuth is not configured (GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI).");
    return;
  }
  const chromeRedirect = typeof req.query.chrome_redirect === "string" ? req.query.chrome_redirect.trim() : "";
  if (!chromeRedirect.startsWith("https://") || !chromeRedirect.includes(".chromiumapp.org")) {
    res.status(400).send("Invalid chrome_redirect (must be https://…chromiumapp.org… from chrome.identity.getRedirectURL).");
    return;
  }
  const state = jwt.sign({ typ: "g", cr: chromeRedirect }, secret, { expiresIn: "10m" });
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    state,
  });
  res.redirect(302, url);
});

app.get("/api/auth/google/callback", authIpLimiter, async (req, res) => {
  const err = typeof req.query.error === "string" ? req.query.error : "";
  const secret = jwtSecretOr503(res);
  if (!secret) return;
  let chromeRedirect = "";
  try {
    const stateRaw = typeof req.query.state === "string" ? req.query.state : "";
    const payload = jwt.verify(stateRaw, secret) as jwt.JwtPayload;
    if (payload.typ !== "g" || typeof payload.cr !== "string") throw new Error("bad state");
    chromeRedirect = payload.cr;
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
    const { tokens } = await oauth2Client.getToken(code);
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
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed." });
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
      res.status(400).json({ error: "Missing Stripe customer." });
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
      res.status(500).json({ error: "No checkout URL." });
      return;
    }
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Checkout failed" });
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
      res.status(400).json({ error: "No Stripe customer on file." });
      return;
    }
    const base = PUBLIC_API_URL || `http://localhost:${PORT}`;
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${base}/billing/return?success=1`,
    });
    res.json({ url: portal.url });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Portal failed" });
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
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to load profile." });
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
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to save profile." });
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
    res.status(code).json({ error: msg });
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
    res.status(status).json({ error: msg });
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
    res.status(status).json({ error: msg });
  }
});

app.listen(PORT, () => {
  console.log(`CoverClick API listening on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.warn("[warn] OPENAI_API_KEY is unset — generation and resume parse will fail.");
  }
  if (!JWT_SECRET) {
    console.warn("[warn] JWT_SECRET is unset.");
  }
  if (!oauth2Client) {
    console.warn("[warn] Google OAuth not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.");
  }
  if (!stripe || !STRIPE_PRICE_ID) {
    console.warn("[warn] Stripe checkout not fully configured — set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.");
  }
});
