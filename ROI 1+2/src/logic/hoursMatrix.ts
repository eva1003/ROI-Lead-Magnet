/**
 * Hours matrix: Deliverable × CompanyType × EmployeeRange → {year1, followYear}
 *
 * Internal estimates based on typical ESG implementation effort.
 * Replace or extend via configuration as needed.
 *
 * CompanyType mapping:
 *   "Produktion"     → "Produzierend"
 *   "Dienstleistung" → "Service"
 *   "Handel"         → "Handel"
 *
 * DeliverableKey mapping (from TopicKey):
 *   ccf                       → "CO2 / Corporate Carbon Footprint (CCF, Scope 1–3)"
 *   pcf                       → "Product Carbon Footprint (PCF)"
 *   vsme                      → "VSME"
 *   ecovadis                  → "EcoVadis Rating (Submission)"
 *   sbti                      → "SBTi Ziele (formulieren & committen)"
 *   csrd                      → "CSRD (ESRS, DMA, Datenpunkte, Draft Report)"
 *   dnk_gri                   → "Nachhaltigkeitsbericht (DNK oder GRI)"
 *   cdp                       → "CDP (Submission)"
 *   stakeholder_questionnaires → "Individuelle Stakeholder-Fragebögen"
 *   sustainability_strategy   → "Interne Nachhaltigkeitsstrategie ..."
 *   esg_kpis                  → "ESG-KPIs (ESG-Strategy Hub, KPI-Set, Datenmodell, Routine)"
 */

import type { TopicKey, CompanyType, EmployeeRange } from "../types";

export interface HoursEntry {
  year1: number;
  followYear: number;
}

export type InternalCompanyType = "Produzierend" | "Service" | "Handel";

export type MatrixSizeRange = "<500" | "500-1000" | "1000+";

export function toMatrixSizeRange(r: EmployeeRange): MatrixSizeRange {
  if (r === "501-1.000") return "500-1000";
  if (r === "1.000-5.000" || r === "5.000-10.000" || r === ">10.000") return "1000+";
  return "<500"; // 1-99, 100-249, 250-500
}

type HoursMatrix = Record<
  TopicKey,
  Record<InternalCompanyType, Record<MatrixSizeRange, HoursEntry>>
>;

export const HOURS_MATRIX: HoursMatrix = {
  ccf: {
    Produzierend: {
      "<500": { year1: 100, followYear: 50 },
      "500-1000": { year1: 160, followYear: 80 },
      "1000+": { year1: 240, followYear: 120 },
    },
    Service: {
      "<500": { year1: 60, followYear: 30 },
      "500-1000": { year1: 100, followYear: 50 },
      "1000+": { year1: 160, followYear: 80 },
    },
    Handel: {
      "<500": { year1: 80, followYear: 40 },
      "500-1000": { year1: 130, followYear: 65 },
      "1000+": { year1: 200, followYear: 100 },
    },
  },
  pcf: {
    Produzierend: {
      "<500": { year1: 80, followYear: 40 },
      "500-1000": { year1: 130, followYear: 65 },
      "1000+": { year1: 200, followYear: 100 },
    },
    Service: {
      "<500": { year1: 40, followYear: 20 },
      "500-1000": { year1: 70, followYear: 35 },
      "1000+": { year1: 110, followYear: 55 },
    },
    Handel: {
      "<500": { year1: 60, followYear: 30 },
      "500-1000": { year1: 100, followYear: 50 },
      "1000+": { year1: 160, followYear: 80 },
    },
  },
  vsme: {
    Produzierend: {
      "<500": { year1: 60, followYear: 30 },
      "500-1000": { year1: 100, followYear: 50 },
      "1000+": { year1: 160, followYear: 80 },
    },
    Service: {
      "<500": { year1: 40, followYear: 20 },
      "500-1000": { year1: 70, followYear: 35 },
      "1000+": { year1: 110, followYear: 55 },
    },
    Handel: {
      "<500": { year1: 50, followYear: 25 },
      "500-1000": { year1: 80, followYear: 40 },
      "1000+": { year1: 130, followYear: 65 },
    },
  },
  ecovadis: {
    Produzierend: {
      "<500": { year1: 40, followYear: 20 },
      "500-1000": { year1: 60, followYear: 30 },
      "1000+": { year1: 90, followYear: 45 },
    },
    Service: {
      "<500": { year1: 30, followYear: 15 },
      "500-1000": { year1: 50, followYear: 25 },
      "1000+": { year1: 75, followYear: 38 },
    },
    Handel: {
      "<500": { year1: 35, followYear: 18 },
      "500-1000": { year1: 55, followYear: 28 },
      "1000+": { year1: 80, followYear: 40 },
    },
  },
  sbti: {
    Produzierend: {
      "<500": { year1: 80, followYear: 30 },
      "500-1000": { year1: 130, followYear: 50 },
      "1000+": { year1: 200, followYear: 80 },
    },
    Service: {
      "<500": { year1: 60, followYear: 25 },
      "500-1000": { year1: 100, followYear: 40 },
      "1000+": { year1: 160, followYear: 60 },
    },
    Handel: {
      "<500": { year1: 70, followYear: 28 },
      "500-1000": { year1: 115, followYear: 45 },
      "1000+": { year1: 180, followYear: 70 },
    },
  },
  csrd: {
    Produzierend: {
      "<500": { year1: 250, followYear: 120 },
      "500-1000": { year1: 400, followYear: 200 },
      "1000+": { year1: 600, followYear: 300 },
    },
    Service: {
      "<500": { year1: 160, followYear: 80 },
      "500-1000": { year1: 280, followYear: 140 },
      "1000+": { year1: 450, followYear: 225 },
    },
    Handel: {
      "<500": { year1: 200, followYear: 100 },
      "500-1000": { year1: 340, followYear: 170 },
      "1000+": { year1: 520, followYear: 260 },
    },
  },
  dnk_gri: {
    Produzierend: {
      "<500": { year1: 90, followYear: 45 },
      "500-1000": { year1: 150, followYear: 75 },
      "1000+": { year1: 230, followYear: 115 },
    },
    Service: {
      "<500": { year1: 60, followYear: 30 },
      "500-1000": { year1: 100, followYear: 50 },
      "1000+": { year1: 160, followYear: 80 },
    },
    Handel: {
      "<500": { year1: 75, followYear: 38 },
      "500-1000": { year1: 125, followYear: 63 },
      "1000+": { year1: 195, followYear: 98 },
    },
  },
  cdp: {
    Produzierend: {
      "<500": { year1: 50, followYear: 25 },
      "500-1000": { year1: 80, followYear: 40 },
      "1000+": { year1: 120, followYear: 60 },
    },
    Service: {
      "<500": { year1: 35, followYear: 18 },
      "500-1000": { year1: 60, followYear: 30 },
      "1000+": { year1: 90, followYear: 45 },
    },
    Handel: {
      "<500": { year1: 40, followYear: 20 },
      "500-1000": { year1: 70, followYear: 35 },
      "1000+": { year1: 105, followYear: 53 },
    },
  },
  stakeholder_questionnaires: {
    Produzierend: {
      "<500": { year1: 30, followYear: 20 },
      "500-1000": { year1: 50, followYear: 35 },
      "1000+": { year1: 80, followYear: 55 },
    },
    Service: {
      "<500": { year1: 20, followYear: 15 },
      "500-1000": { year1: 35, followYear: 25 },
      "1000+": { year1: 55, followYear: 40 },
    },
    Handel: {
      "<500": { year1: 25, followYear: 18 },
      "500-1000": { year1: 42, followYear: 30 },
      "1000+": { year1: 65, followYear: 48 },
    },
  },
  sustainability_strategy: {
    Produzierend: {
      "<500": { year1: 100, followYear: 30 },
      "500-1000": { year1: 160, followYear: 50 },
      "1000+": { year1: 240, followYear: 80 },
    },
    Service: {
      "<500": { year1: 80, followYear: 25 },
      "500-1000": { year1: 130, followYear: 40 },
      "1000+": { year1: 200, followYear: 60 },
    },
    Handel: {
      "<500": { year1: 90, followYear: 28 },
      "500-1000": { year1: 145, followYear: 45 },
      "1000+": { year1: 220, followYear: 70 },
    },
  },
  esg_kpis: {
    Produzierend: {
      "<500": { year1: 60, followYear: 30 },
      "500-1000": { year1: 100, followYear: 50 },
      "1000+": { year1: 160, followYear: 80 },
    },
    Service: {
      "<500": { year1: 40, followYear: 20 },
      "500-1000": { year1: 70, followYear: 35 },
      "1000+": { year1: 110, followYear: 55 },
    },
    Handel: {
      "<500": { year1: 50, followYear: 25 },
      "500-1000": { year1: 85, followYear: 43 },
      "1000+": { year1: 130, followYear: 65 },
    },
  },
};

export function mapCompanyType(type: CompanyType): InternalCompanyType {
  const map: Record<CompanyType, InternalCompanyType> = {
    Produktion: "Produzierend",
    Dienstleistung: "Service",
    Handel: "Handel",
  };
  return map[type];
}

export function lookupHours(
  topic: TopicKey,
  companyType: CompanyType,
  employeeRange: EmployeeRange
): HoursEntry {
  const internalType = mapCompanyType(companyType);
  const sizeRange = toMatrixSizeRange(employeeRange);
  return HOURS_MATRIX[topic][internalType][sizeRange];
}
