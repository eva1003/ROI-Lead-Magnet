// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_STAKEHOLDERS = 15;
export const ENABLE_REVENUE = false; // Feature-Flag: Umsatzfeld anzeigen

// ─── Domain Types ────────────────────────────────────────────────────────────

export type EmployeeRange = "<500" | "500-1000" | "1000+";
export type CompanyType = "Produktion" | "Dienstleistung" | "Handel";
export type RevenueCurrency = "EUR" | "USD" | "";

export type TopicStatus =
  | "machen_wir_schon"
  | "wollen_wir_machen"
  | "nicht_sicher"
  | "nicht_wichtig"
  | "";

export type TopicKey =
  | "ecovadis"
  | "sbti"
  | "ccf"
  | "pcf"
  | "vsme"
  | "csrd"
  | "dnk_gri"
  | "cdp"
  | "stakeholder_questionnaires"
  | "sustainability_strategy"
  | "esg_kpis";

export type RecommendationKey = TopicKey | "transformations_workshop";

export const TOPIC_LABELS: Record<TopicKey, string> = {
  ecovadis: "EcoVadis",
  sbti: "SBTi",
  ccf: "Corporate Carbon Footprint (CCF, Scope 1–3)",
  pcf: "Product Carbon Footprint (PCF)",
  vsme: "VSME",
  csrd: "CSRD",
  dnk_gri: "Nachhaltigkeitsbericht (DNK oder GRI)",
  cdp: "CDP (Submission)",
  stakeholder_questionnaires: "Individuelle Stakeholder-Fragebögen",
  sustainability_strategy: "Interne Nachhaltigkeitsstrategie",
  esg_kpis: "ESG-KPIs (ESG-Strategy Hub)",
};

export const TOPIC_TOOLTIPS: Record<TopicKey, string> = {
  ccf: "Der Corporate Carbon Footprint erfasst alle Treibhausgasemissionen Ihres Unternehmens (Scope 1–3). Er ist die Grundlage jeder ESG-Strategie.",
  pcf: "Der Product Carbon Footprint berechnet die Emissionen eines einzelnen Produkts über seinen gesamten Lebenszyklus.",
  vsme: "Der EFRAG VSME ESRS ist ein EU-Standard für KMU, die freiwillig Nachhaltigkeitsdaten berichten wollen – ohne CSRD-Pflicht.",
  csrd: "Die Corporate Sustainability Reporting Directive ist die EU-Pflichtberichterstattung für große Unternehmen ab 2025.",
  dnk_gri: "DNK (Deutscher Nachhaltigkeitskodex) und GRI (Global Reporting Initiative) sind freiwillige Rahmenwerke für Nachhaltigkeitsberichte.",
  sbti: "Science Based Targets initiative: Unternehmen verpflichten sich auf wissenschaftlich fundierte Klimaziele (1,5°C-Pfad).",
  cdp: "CDP (Carbon Disclosure Project): Unternehmen legen ihre Klima-, Wasser- und Waldrisiken offen. Großkunden verlangen oft CDP-Responses.",
  ecovadis: "EcoVadis ist eine Nachhaltigkeitsbewertung für Lieferketten. Viele Großkonzerne fordern EcoVadis-Zertifizierungen von Zulieferern.",
  stakeholder_questionnaires: "Eigene Fragebögen, die Sie von Kunden oder Investoren erhalten – oder die Sie selbst an Lieferanten senden.",
  sustainability_strategy: "Eine interne Nachhaltigkeitsstrategie definiert Ziele, Verantwortlichkeiten und Maßnahmen für Ihr ESG-Programm.",
  esg_kpis: "Strukturierte ESG-Kennzahlen (z. B. CO₂-Intensität, Frauenquote, Wasserverbrauch) für Berichterstattung und Steuerung.",
};

export const RECOMMENDATION_LABELS: Record<RecommendationKey, string> = {
  ...TOPIC_LABELS,
  transformations_workshop: "Transformations-Workshop",
};

export const ALL_TOPICS: TopicKey[] = [
  "ecovadis",
  "sbti",
  "ccf",
  "pcf",
  "vsme",
  "csrd",
  "dnk_gri",
  "cdp",
  "stakeholder_questionnaires",
  "sustainability_strategy",
  "esg_kpis",
];

export const INDUSTRIES = [
  "Landwirtschaft/Forst/Fischerei",
  "Bergbau",
  "Verarbeitendes Gewerbe/Herstellung",
  "Energieversorgung",
  "Wasser/Abwasser/Abfall/Umwelt",
  "Bau",
  "Handel/Reparatur Kfz",
  "Verkehr/Logistik/Lagerei",
  "Gastgewerbe",
  "Information/Kommunikation",
  "Finanzen/Versicherung",
  "Immobilien",
  "Professionelle/wissenschaftliche/technische Dienstleistungen",
  "Administrative/Support-Services",
  "Öffentliche Verwaltung",
  "Bildung",
  "Gesundheit/Soziales",
  "Kunst/Sport/Erholung",
  "Sonstige Dienstleistungen",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

// ─── Stakeholder Entry (Autocomplete-Flow) ────────────────────────────────────

export type MatchState =
  | "selected"
  | "autoMatchedHigh"
  | "needsConfirmation"
  | "noMatch"
  | "pending";

export interface StakeholderEntry {
  id: string; // React key – internal only
  inputValue: string;
  selectedCompanyId: string | null;
  selectedName: string | null;
  matchConfidence: number;
  matchState: MatchState;
  flags: { inSBTi: boolean; inCDP: boolean; inCSRD: boolean };
}

// ─── Survey Input ─────────────────────────────────────────────────────────────

export interface SectionA {
  companyName: string;
  email: string;
  employeeRange: EmployeeRange | "";
  companyType: CompanyType | "";
  industry: Industry | "";
  revenue: string;
  revenueCurrency: RevenueCurrency;
  consentGiven: boolean;
}

export interface TopicEntry {
  status: TopicStatus;
}

export interface SectionB {
  activeInESG: boolean | null;
  topics: Record<TopicKey, TopicStatus>;
  useExternalConsulting: boolean | null;
  consultingHoursPerYear: number | null;
}

export interface SectionC {
  sustainabilityLinkedBusiness: boolean | "nicht_sicher" | null;
  // Ja-Pfad
  linkedBusinessCount: number | null;
  scopeUnknown: boolean;
  avgRevenueSharePct: number | null;
  requirementsMet: boolean | null;
  // Stakeholder-Namen (Nein / nicht_sicher / scopeUnknown)
  stakeholders: StakeholderEntry[];
}

export interface SectionD {
  esgLinkedLoansOrInvestments: boolean | "nicht_sicher" | null;
  // Ja-Pfad
  affectedVolumeEur: number | null;
  interestDeltaPct: number | null;
  penaltiesEur: number | null;
  financeRequirementsMet: boolean | null;
}

export interface SurveyInput {
  sectionA: SectionA;
  sectionB: SectionB;
  sectionC: SectionC;
  sectionD: SectionD;
}

// ─── Stakeholder Check Result (Scoring-Layer) ─────────────────────────────────

export interface StakeholderCheckResult {
  nameOriginal: string;
  nameNormalized: string;
  inSBTi: boolean;
  inCDP: boolean;
  inCSRD: boolean;
  matchConfidence: number;
  evidenceUrl?: string;
  note: string;
  correctedName?: string;
}

// ─── Scoring Output ───────────────────────────────────────────────────────────

export type MaturityLevel =
  | "Fortgeschritten"
  | "Mittel"
  | "Einsteiger"
  | "Kein ESG Setup";

export type RiskLevel = "Niedrig" | "Mittel" | "Hoch";

export interface HoursBreakdown {
  currentInternalHours: number;
  futureInternalHours: number;
  totalFutureIncludingCurrent: number;
  savedHours: number;
  netHoursWithPlanted: number;
}

export interface FeatureEstimate {
  key: RecommendationKey;
  label: string;
  baseHours: number;
  hoursWithPlanted: number;
  savedHours: number;
  savedMoneyEUR: number;
  noEstimateAvailable: boolean;
}

export interface StakeholderExposure {
  stakeholderReqKnown: boolean;
  stakeholderReqMet: boolean | null;
  sbtiMatchesCount: number;
  cdpMatchesCount: number;
  csrdMatchesCount: number;
  matchesTotalCount: number; // stakeholders with ≥1 match (no double-counting)
  totalStakeholdersProvided: number;
  relationshipsToReview: number;
  scopeUnknown: boolean;
  checkResults: StakeholderCheckResult[];
}

export interface RiskScore {
  score: number;
  level: RiskLevel;
  drivers: string[];
}

export interface ScorecardOutput {
  maturityLevel: MaturityLevel;
  maturityWarning?: string;
  alreadyImplemented: TopicKey[];
  recommendedFeatures: RecommendationKey[];
  recommendationReasons: Partial<Record<RecommendationKey, string>>;
  stakeholderExposure: StakeholderExposure;
  hoursBreakdown: HoursBreakdown;
  riskScore: RiskScore;
  featureEstimates: FeatureEstimate[];
}

// ─── Persisted State ──────────────────────────────────────────────────────────

export interface AppState {
  surveyInput: SurveyInput;
  scorecardOutput: ScorecardOutput | null;
  currentStep: number;
  completedAt: string | null;
  // Backend sync
  assessmentId: string | null;
  writeToken: string | null;
}

export interface ExportPayload {
  timestamp: string;
  inputs: SurveyInput;
  outputs: ScorecardOutput;
}
