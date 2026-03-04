/**
 * Assessment API routes
 *
 * POST  /api/assessments/start           – create new draft, returns id + writeToken
 * PATCH /api/assessments/:id             – autosave payload (Bearer writeToken)
 * POST  /api/assessments/:id/submit      – finalize with outputs
 */

import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { pool } from "../db";

export const assessmentsRouter = Router();

// ─── POST /start ──────────────────────────────────────────────────────────────

assessmentsRouter.post("/start", async (_req: Request, res: Response) => {
  if (!pool) {
    // No DB configured – return a transient in-memory token
    return res.json({ assessmentId: randomUUID(), writeToken: randomUUID() });
  }
  try {
    const writeToken = randomUUID();
    const result = await pool.query(
      `INSERT INTO assessments (write_token) VALUES ($1) RETURNING id`,
      [writeToken]
    );
    const assessmentId: string = result.rows[0].id;
    return res.json({ assessmentId, writeToken });
  } catch (err) {
    console.error("[assessments/start]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /:id ───────────────────────────────────────────────────────────────

assessmentsRouter.patch("/:id", async (req: Request, res: Response) => {
  if (!pool) return res.status(204).send();

  const { id } = req.params;
  const authHeader = req.headers["authorization"] ?? "";
  const writeToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!writeToken) {
    return res.status(401).json({ error: "Missing write token" });
  }

  const {
    payload,
    progressPct,
    validationErrors,
    companyName,
  }: {
    payload?: unknown;
    progressPct?: number;
    validationErrors?: unknown;
    companyName?: string;
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE assessments
         SET updated_at            = NOW(),
             payload_json          = COALESCE($1::jsonb, payload_json),
             progress_pct          = COALESCE($2, progress_pct),
             validation_errors_json= COALESCE($3::jsonb, validation_errors_json),
             company_name          = COALESCE($4, company_name)
       WHERE id = $5 AND write_token = $6
       RETURNING id`,
      [
        payload ? JSON.stringify(payload) : null,
        progressPct ?? null,
        validationErrors ? JSON.stringify(validationErrors) : null,
        companyName ?? null,
        id,
        writeToken,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Not found or invalid token" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("[assessments/patch]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /:id/submit ─────────────────────────────────────────────────────────

assessmentsRouter.post("/:id/submit", async (req: Request, res: Response) => {
  if (!pool) return res.status(204).send();

  const { id } = req.params;
  const authHeader = req.headers["authorization"] ?? "";
  const writeToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!writeToken) {
    return res.status(401).json({ error: "Missing write token" });
  }

  const { outputs, payload }: { outputs?: unknown; payload?: unknown } = req.body;

  try {
    const result = await pool.query(
      `UPDATE assessments
         SET updated_at    = NOW(),
             status        = 'submitted',
             outputs_json  = COALESCE($1::jsonb, outputs_json),
             payload_json  = COALESCE($2::jsonb, payload_json),
             progress_pct  = 100
       WHERE id = $3 AND write_token = $4
       RETURNING id`,
      [
        outputs ? JSON.stringify(outputs) : null,
        payload ? JSON.stringify(payload) : null,
        id,
        writeToken,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Not found or invalid token" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("[assessments/submit]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
