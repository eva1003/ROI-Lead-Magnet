/**
 * Planted ESG Assessment – Express Backend
 *
 * Endpoints:
 *   POST   /api/assessments/start           → {assessmentId, writeToken}
 *   PATCH  /api/assessments/:id             → 204 (autosave)
 *   POST   /api/assessments/:id/submit      → 204 (finalize)
 *   GET    /api/admin/assessments           → list (Basic Auth)
 *   GET    /api/admin/assessments/export.xlsx → XLSX download (Basic Auth)
 *   GET    /api/admin/assessments/:id       → detail JSON (Basic Auth)
 *
 * Environment:
 *   DATABASE_URL   – PostgreSQL connection string (optional; runs without DB)
 *   ADMIN_USER     – Basic Auth username (default: admin)
 *   ADMIN_PASSWORD – Basic Auth password (default: planted2025)
 *   PORT           – HTTP port (default: 3001)
 */

import express from "express";
import cors from "cors";
import { assessmentsRouter } from "./routes/assessments";
import { adminRouter } from "./routes/admin";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Assessment routes
app.use("/api/assessments", assessmentsRouter);

// Admin routes
app.use("/api/admin", adminRouter);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`[server] Planted ESG Assessment API listening on :${PORT}`);
  if (!process.env.DATABASE_URL) {
    console.log("[server] Running in local mode – no database. Set DATABASE_URL to persist data.");
  }
});

export default app;
