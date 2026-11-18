// Local server (dev + `npm start`). On Vercel the API is served by api/index.js instead.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./app.js";
import { seedDemo } from "./seed.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const dist = path.join(here, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Demo account: on by default in development, off in production unless SEED_DEMO=true.
const seed = process.env.SEED_DEMO ? process.env.SEED_DEMO === "true" : process.env.NODE_ENV !== "production";
if (seed) await seedDemo().catch((e) => console.error("Demo seed failed:", e.message));
app.listen(PORT, () => console.log(`BudgetMate API running on http://localhost:${PORT}`));
