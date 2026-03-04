/**
 * Admin routes (Basic Auth protected)
 *
 * GET  /api/admin/assessments             – list all assessments
 * GET  /api/admin/assessments/export.xlsx – XLSX export
 * GET  /api/admin/assessments/:id         – detail JSON
 */

import { Router, Request, Response } from "express";
import * as XLSX from "xlsx";
import { pool } from "../db";
import { adminAuth } from "../middleware/auth";

export const adminRouter = Router();
adminRouter.use(adminAuth);

// ─── GET /assessments ─────────────────────────────────────────────────────────

adminRouter.get("/assessments", async (_req: Request, res: Response) => {
  if (!pool) {
    return res.json({ assessments: [], note: "No database configured." });
  }
  try {
    const result = await pool.query(
      `SELECT id, company_name, status, created_at, updated_at, progress_pct
         FROM assessments
        ORDER BY created_at DESC
        LIMIT 500`
    );
    return res.json({ assessments: result.rows });
  } catch (err) {
    console.error("[admin/assessments]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /assessments/export.xlsx ─────────────────────────────────────────────

adminRouter.get(
  "/assessments/export.xlsx",
  async (req: Request, res: Response) => {
    if (!pool) {
      return res.status(503).json({ error: "No database configured." });
    }

    const { status, from, to } = req.query as {
      status?: string;
      from?: string;
      to?: string;
    };

    try {
      const params: unknown[] = [];
      const clauses: string[] = [];

      if (status) {
        params.push(status);
        clauses.push(`status = $${params.length}`);
      }
      if (from) {
        params.push(from);
        clauses.push(`created_at >= $${params.length}`);
      }
      if (to) {
        params.push(to);
        clauses.push(`created_at <= $${params.length}`);
      }

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const query = `
        SELECT id, company_name, status, created_at, updated_at,
               progress_pct, payload_json, outputs_json
          FROM assessments
         ${where}
         ORDER BY created_at DESC
      `;

      const result = await pool.query(query, params);

      // Build wide-format rows
      const rows = result.rows.map((row) => {
        const p = row.payload_json ?? {};
        const o = row.outputs_json ?? {};
        const sA = p.surveyInput?.sectionA ?? {};
        const sB = p.surveyInput?.sectionB ?? {};
        const sC = p.surveyInput?.sectionC ?? {};
        const sD = p.surveyInput?.sectionD ?? {};
        const stakeholders: unknown[] = sC.stakeholders ?? [];
        const recs: string[] = o.recommendedFeatures ?? [];

        // Build stakeholder slots (up to 15)
        const shSlots: Record<string, unknown> = {};
        for (let i = 0; i < 15; i++) {
          const sh = stakeholders[i] as Record<string, unknown> | undefined;
          const prefix = `Stakeholder_${i + 1}`;
          shSlots[`${prefix}_Input`] = sh?.inputValue ?? "";
          shSlots[`${prefix}_Selected`] = sh?.selectedName ?? "";
          shSlots[`${prefix}_State`] = sh?.matchState ?? "";
          shSlots[`${prefix}_SBTi`] = sh?.flags
            ? (sh.flags as Record<string, boolean>).inSBTi
              ? "Ja"
              : "Nein"
            : "";
          shSlots[`${prefix}_CDP`] = sh?.flags
            ? (sh.flags as Record<string, boolean>).inCDP
              ? "Ja"
              : "Nein"
            : "";
          shSlots[`${prefix}_CSRD`] = sh?.flags
            ? (sh.flags as Record<string, boolean>).inCSRD
              ? "Ja"
              : "Nein"
            : "";
        }

        // Build recommendation slots (up to 10)
        const recSlots: Record<string, string> = {};
        for (let i = 0; i < 10; i++) {
          recSlots[`Empfehlung_${i + 1}`] = recs[i] ?? "";
        }

        return {
          // Meta
          ID: row.id,
          Status: row.status,
          Erstellt: row.created_at,
          Aktualisiert: row.updated_at,
          Fortschritt_Pct: row.progress_pct,
          // Company profile
          Unternehmensname: sA.companyName ?? "",
          Email: sA.email ?? "",
          Mitarbeitende: sA.employeeRange ?? "",
          Unternehmenstyp: sA.companyType ?? "",
          Branche: sA.industry ?? "",
          // ESG
          ESG_aktiv: sB.activeInESG != null ? (sB.activeInESG ? "Ja" : "Nein") : "",
          Externe_Beratung: sB.useExternalConsulting != null ? (sB.useExternalConsulting ? "Ja" : "Nein") : "",
          Beratungsstunden_Jahr: sB.consultingHoursPerYear ?? "",
          // Topics (11 topics as columns)
          ...Object.fromEntries(
            (
              [
                "ccf","pcf","vsme","csrd","dnk_gri","sbti","cdp",
                "ecovadis","stakeholder_questionnaires","sustainability_strategy","esg_kpis",
              ] as const
            ).map((k) => [`Topic_${k}`, sB.topics?.[k] ?? ""])
          ),
          // Supplier Check
          ESG_Geschaeftsbeziehungen:
            sC.sustainabilityLinkedBusiness != null
              ? String(sC.sustainabilityLinkedBusiness)
              : "",
          Anzahl_Beziehungen: sC.linkedBusinessCount ?? "",
          Scope_Unbekannt: sC.scopeUnknown ? "Ja" : "Nein",
          Avg_Umsatzanteil_Pct: sC.avgRevenueSharePct ?? "",
          Anforderungen_erfuellt:
            sC.requirementsMet != null
              ? sC.requirementsMet
                ? "Ja"
                : "Nein"
              : "",
          // Stakeholder slots
          ...shSlots,
          // Finance
          ESG_Finanzierung:
            sD.esgLinkedLoansOrInvestments != null
              ? String(sD.esgLinkedLoansOrInvestments)
              : "",
          Finanzvolumen_EUR: sD.affectedVolumeEur ?? "",
          Zinspunkte_Delta: sD.interestDeltaPct ?? "",
          Strafzahlung_EUR: sD.penaltiesEur ?? "",
          Finance_Anforderungen_erfuellt:
            sD.financeRequirementsMet != null
              ? sD.financeRequirementsMet
                ? "Ja"
                : "Nein"
              : "",
          // Outputs
          Maturity_Level: o.maturityLevel ?? "",
          Risk_Level: o.riskScore?.level ?? "",
          Risk_Score: o.riskScore?.score ?? "",
          // Recommendations
          ...recSlots,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Freeze first row
      ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2" };
      // AutoFilter on first row
      if (rows.length > 0) {
        const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
        ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: range.s, e: { r: range.s.r, c: range.e.c } }) };
      }

      XLSX.utils.book_append_sheet(wb, ws, "Assessments");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const filename = `planted-assessments-${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      return res.send(buf);
    } catch (err) {
      console.error("[admin/export]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /assessments/:id ─────────────────────────────────────────────────────

adminRouter.get("/assessments/:id", async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: "No database configured." });
  }
  try {
    const result = await pool.query(
      `SELECT id, company_name, status, created_at, updated_at,
              progress_pct, payload_json, outputs_json, validation_errors_json
         FROM assessments
        WHERE id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("[admin/assessment/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
