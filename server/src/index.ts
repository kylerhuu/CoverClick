import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import type { GenerationRequest, UserProfile } from "./contract.js";
import { extractTextFromResumeBuffer } from "./textExtract.js";
import { extractProfileFromResumeText } from "./extractProfileWithOpenAI.js";
import { generateCoverLetterWithOpenAI } from "./generateCoverLetterOpenAI.js";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1.5mb" }));

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET?.trim() || "";

function jwtSecretOr503(res: express.Response): string | null {
  if (!JWT_SECRET) {
    res.status(503).json({ error: "Server is missing JWT_SECRET. Copy server/.env.example to server/.env and set it." });
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasOpenAI: Boolean(process.env.OPENAI_API_KEY?.trim()) });
});

app.post("/api/register", async (req, res) => {
  try {
    const secret = jwtSecretOr503(res);
    if (!secret) return;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Valid email required." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "An account with that email already exists." });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });
    const token = jwt.sign({ sub: user.id }, secret, { expiresIn: "60d" });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Register failed";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const secret = jwtSecretOr503(res);
    if (!secret) return;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const token = jwt.sign({ sub: user.id }, secret, { expiresIn: "60d" });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login failed";
    res.status(500).json({ error: msg });
  }
});

app.get("/api/me/profile", authMiddleware, async (req, res) => {
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

app.put("/api/me/profile", authMiddleware, async (req, res) => {
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

app.post("/api/me/parse-resume", authMiddleware, upload.single("file"), async (req, res) => {
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

app.post("/api/generate-cover-letter", async (req, res) => {
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
    console.warn("[warn] JWT_SECRET is unset — register/login and /api/me/* will return 503 until you set it.");
  }
});
