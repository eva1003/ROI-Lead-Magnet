/**
 * Pure business-logic functions for the ESG Assessment Scorecard.
 * No UI dependencies – all functions are fully testable.
 */

import type {
  SurveyInput,
  TopicKey,
  TopicStatus,
  RecommendationKey,
  MaturityLevel,
  RiskLevel,
  HoursBreakdown,
  StakeholderExposure,
  RiskScore,
  ScorecardOutput,
  StakeholderCheckResult,
  StakeholderEntry,
  FeatureEstimate,
  CompanyType,
  EmployeeRange,
} from "../types";
import { ALL_TOPICS, RECOMMENDATION_LABELS } from "../types";
import { lookupHours } from "./hoursMatrix";

// ─── Feature Estimate Constants ───────────────────────────────────────────────

export const PLANTED_TIME_REDUCTION_RATE = 0.8;
export const COST_PER_SAVED_HOUR_EUR = 95;

/**
 * Maps each RecommendationKey to a TopicKey for hours-matrix lookup.
 * transformations_workshop uses sustainability_strategy hours as proxy.
 */
const RECOMMENDATION_TO_TOPIC: Partial<Record<RecommendationKey, TopicKey>> = {
  ccf: "ccf",
  pcf: "pcf",
  vsme: "vsme",
  ecovadis: "ecovadis",
  sbti: "sbti",
  csrd: "csrd",
  dnk_gri: "dnk_gri",
  cdp: "cdp",
  stakeholder_questionnaires: "stakeholder_questionnaires",
  sustainability_strategy: "sustainability_strategy",
  esg_kpis: "esg_kpis",
  transformations_workshop: "sustainability_strategy",
};

// ─── Topic Status Helpers ─────────────────────────────────────────────────────

export function topicIs(
  topics: Partial<Record<TopicKey, TopicStatus>>,
  key: TopicKey,
  ...statuses: TopicStatus[]
): boolean {
  return statuses.includes(topics[key] ?? "");
}

export function getTopicsWithStatus(
  topics: Partial<Record<TopicKey, TopicStatus>>,
  ...statuses: TopicStatus[]
): TopicKey[] {
  return ALL_TOPICS.filter((k) => statuses.includes(topics[k] ?? ""));
}

// ─── Maturity Level ───────────────────────────────────────────────────────────

export function computeMaturityLevel(
  topics: Partial<Record<TopicKey, TopicStatus>>,
  activeInESG: boolean | null
): { level: MaturityLevel; warning?: string } {
  const doing = (key: TopicKey) => topicIs(topics, key, "machen_wir_schon");
  const doingOrPlanning = (key: TopicKey) =>
    topicIs(topics, key, "machen_wir_schon", "wollen_wir_machen");

  // Fortgeschritten
  if (
    doing("ccf") &&
    doing("pcf") &&
    doing("vsme") &&
    doing("esg_kpis") &&
    (doing("csrd") || doing("sustainability_strategy"))
  ) {
    return { level: "Fortgeschritten" };
  }

  // Mittel
  const advancedTopics: TopicKey[] = [
    "vsme",
    "pcf",
    "esg_kpis",
    "sustainability_strategy",
    "ecovadis",
    "sbti",
  ];
  const advancedCount = advancedTopics.filter((k) =>
    doingOrPlanning(k)
  ).length;
  if (doing("ccf") && advancedCount >= 2) {
    return { level: "Mittel" };
  }

  // Einsteiger
  if (doingOrPlanning("ccf")) {
    return { level: "Einsteiger" };
  }

  // Kein ESG Setup / minimales Setup
  if (!activeInESG) {
    return {
      level: "Einsteiger",
      warning: "ESG Setup minimal – kein aktives ESG-Programm erfasst.",
    };
  }
  return {
    level: "Einsteiger",
    warning: "CCF ist weder aktiv noch geplant – Basisaktivitäten fehlen.",
  };
}

// ─── Stakeholder Exposure ─────────────────────────────────────────────────────

export function computeStakeholderExposure(
  input: SurveyInput,
  checkResults: StakeholderCheckResult[]
): StakeholderExposure {
  const { sectionC } = input;

  const stakeholderReqKnown =
    sectionC.sustainabilityLinkedBusiness === true &&
    sectionC.linkedBusinessCount !== null &&
    sectionC.linkedBusinessCount > 0 &&
    sectionC.requirementsMet !== null &&
    !sectionC.scopeUnknown;

  const stakeholderReqMet = stakeholderReqKnown
    ? sectionC.requirementsMet
    : null;

  const sbtiMatchesCount = checkResults.filter((r) => r.inSBTi).length;
  const cdpMatchesCount = checkResults.filter((r) => r.inCDP).length;
  const csrdMatchesCount = checkResults.filter((r) => r.inCSRD).length;
  const matchesTotalCount = checkResults.filter(
    (r) => r.inSBTi || r.inCDP || r.inCSRD
  ).length;
  const totalStakeholdersProvided = checkResults.length;

  let relationshipsToReview: number;
  if (
    sectionC.sustainabilityLinkedBusiness === true &&
    sectionC.linkedBusinessCount !== null &&
    sectionC.linkedBusinessCount > 0
  ) {
    relationshipsToReview = sectionC.linkedBusinessCount;
  } else {
    const hitCount = checkResults.filter(
      (r) => r.inSBTi || r.inCDP || r.inCSRD
    ).length;
    relationshipsToReview = Math.max(1, hitCount);
  }

  return {
    stakeholderReqKnown,
    stakeholderReqMet,
    sbtiMatchesCount,
    cdpMatchesCount,
    csrdMatchesCount,
    matchesTotalCount,
    totalStakeholdersProvided,
    relationshipsToReview,
    scopeUnknown: sectionC.scopeUnknown,
    checkResults,
  };
}

// ─── Feature Recommendations ──────────────────────────────────────────────────

export interface RecommendationWithReason {
  feature: RecommendationKey;
  reason: string;
}

export function computeRecommendations(
  input: SurveyInput,
  stakeholderExposure: StakeholderExposure
): RecommendationWithReason[] {
  const topics = input.sectionB.topics;
  const { sectionD } = input;

  const {
    stakeholderReqKnown,
    stakeholderReqMet,
    sbtiMatchesCount,
    cdpMatchesCount,
    csrdMatchesCount,
  } = stakeholderExposure;

  const alreadyDoing = (key: TopicKey) =>
    topicIs(topics, key, "machen_wir_schon");

  const result: RecommendationWithReason[] = [];
  const addIfNotDoing = (key: RecommendationKey, reason: string) => {
    if (key !== "transformations_workshop" && alreadyDoing(key as TopicKey))
      return;
    if (result.find((r) => r.feature === key)) return;
    result.push({ feature: key, reason });
  };

  const workshopCondition =
    !topicIs(topics, "sustainability_strategy", "machen_wir_schon") &&
    !topicIs(topics, "sustainability_strategy", "wollen_wir_machen");

  // ── A) Requirements known and MET ─────────────────────────────────────────
  if (stakeholderReqKnown && stakeholderReqMet === true) {
    addIfNotDoing(
      "ccf",
      "CCF ist die Grundlage jeder ESG-Compliance und stärkt Ihre Position."
    );
  }

  // ── B) Requirements known and NOT MET ────────────────────────────────────
  else if (stakeholderReqKnown && stakeholderReqMet === false) {
    addIfNotDoing(
      "ccf",
      "CCF ist unverzichtbar, um Stakeholder-Anforderungen zu erfüllen."
    );
    addIfNotDoing(
      "esg_kpis",
      "Ein strukturiertes KPI-System hilft, Anforderungen systematisch nachzuweisen."
    );
  }

  // ── C/D/E/F: Requirements not known – signals from stakeholder check ──────
  else if (!stakeholderReqKnown) {
    const hasSBTi = sbtiMatchesCount > 0;
    const hasCDP = cdpMatchesCount > 0;
    const hasCSRD = csrdMatchesCount > 0;
    const sourceCount =
      (hasSBTi ? 1 : 0) + (hasCDP ? 1 : 0) + (hasCSRD ? 1 : 0);

    if (sourceCount >= 2) {
      // F) Multiple sources (≥2 of SBTi/CDP/CSRD)
      addIfNotDoing(
        "ccf",
        "Stakeholder aus mehreren Registern (SBTi/CDP/CSRD) fordern Emissionstransparenz."
      );
      addIfNotDoing(
        "vsme",
        "VSME schließt die Berichtslücke gegenüber anspruchsvollen Stakeholdern aus mehreren Quellen."
      );
      addIfNotDoing(
        "sbti",
        "SBTi-kompatible Ziele stärken Ihre Position in der Lieferkette."
      );
      addIfNotDoing(
        "esg_kpis",
        "Strukturierte KPIs sind notwendig für die kombinierten Anforderungen aus SBTi, CDP und CSRD."
      );
      if (workshopCondition) {
        addIfNotDoing(
          "transformations_workshop",
          "Ein Transformations-Workshop schafft das strategische Fundament für Ihre ESG-Journey."
        );
      }
    } else if (hasSBTi && !hasCDP && !hasCSRD) {
      // C) SBTi only
      addIfNotDoing(
        "ccf",
        "Ihre Stakeholder verfolgen SBTi-Ziele – ein CCF ist Voraussetzung."
      );
      addIfNotDoing(
        "sbti",
        "SBTi-Stakeholder erwarten oft kompatible Klimaziele in der Lieferkette."
      );
    } else if (!hasSBTi && hasCDP && !hasCSRD) {
      // D) CDP only
      addIfNotDoing(
        "ccf",
        "CDP-berichtende Stakeholder fordern Transparenz über Emissionen."
      );
      addIfNotDoing(
        "vsme",
        "VSME ermöglicht standardisierte Nachhaltigkeitsdaten für CDP-Anfragen."
      );
      addIfNotDoing(
        "esg_kpis",
        "KPI-Strukturen sind notwendig, um CDP-Anforderungen der Lieferkette zu bedienen."
      );
      if (workshopCondition) {
        addIfNotDoing(
          "transformations_workshop",
          "Ein Transformations-Workshop schafft das strategische Fundament für Ihre ESG-Journey."
        );
      }
    } else if (!hasSBTi && !hasCDP && hasCSRD) {
      // E) CSRD only
      addIfNotDoing(
        "ccf",
        "CSRD-berichtende Stakeholder fordern Emissionstransparenz in der Lieferkette."
      );
      addIfNotDoing(
        "vsme",
        "VSME ermöglicht strukturierte Nachhaltigkeitsdaten für CSRD-Lieferkettenpflichten."
      );
      addIfNotDoing(
        "esg_kpis",
        "Strukturierte ESG-KPIs sind notwendig für die Compliance-Anforderungen von CSRD-Stakeholdern."
      );
      if (workshopCondition) {
        addIfNotDoing(
          "transformations_workshop",
          "Ein Transformations-Workshop schafft das strategische Fundament für Ihre ESG-Journey."
        );
      }
    }
  }

  // ── G) Finance requirements known and MET ─────────────────────────────────
  if (
    sectionD.esgLinkedLoansOrInvestments === true &&
    sectionD.financeRequirementsMet === true
  ) {
    addIfNotDoing(
      "ccf",
      "CCF sichert die laufende ESG-Compliance gegenüber Finanzierungsgebern."
    );
  }

  // ── H) Finance requirements known and NOT MET ─────────────────────────────
  if (
    sectionD.esgLinkedLoansOrInvestments === true &&
    sectionD.financeRequirementsMet === false
  ) {
    addIfNotDoing(
      "ccf",
      "CCF ist Mindestanforderung für ESG-gebundene Finanzierungen."
    );
    addIfNotDoing(
      "vsme",
      "VSME-Berichterstattung zeigt Kapitalgebern strukturierte ESG-Governance."
    );
  }

  return result;
}

// ─── Hours Calculation ────────────────────────────────────────────────────────

export function computeHours(
  input: SurveyInput,
  recommendedFeatures: RecommendationKey[]
): HoursBreakdown {
  const { sectionA, sectionB } = input;

  if (!sectionA.companyType || !sectionA.employeeRange) {
    return {
      currentInternalHours: 0,
      futureInternalHours: 0,
      totalFutureIncludingCurrent: 0,
      savedHours: 0,
      netHoursWithPlanted: 0,
    };
  }

  const companyType = sectionA.companyType;
  const employeeRange = sectionA.employeeRange;
  const topics = sectionB.topics;

  // Current internal hours: followYear for "machen_wir_schon"
  const currentTopics = getTopicsWithStatus(topics, "machen_wir_schon");
  const sumFollowYear = currentTopics.reduce((sum, key) => {
    return sum + lookupHours(key, companyType, employeeRange).followYear;
  }, 0);

  // Subtract external consulting hours (MVP: only from Ist)
  const consultingHours =
    sectionB.useExternalConsulting === true &&
    sectionB.consultingHoursPerYear !== null
      ? sectionB.consultingHoursPerYear
      : 0;

  const currentInternalHours = Math.max(0, sumFollowYear - consultingHours);

  // Future internal hours: year1 for "wollen_wir_machen" | "nicht_sicher" + recommended
  const plannedTopics = new Set<TopicKey>(
    getTopicsWithStatus(topics, "wollen_wir_machen", "nicht_sicher")
  );

  for (const rec of recommendedFeatures) {
    if (rec === "transformations_workshop") continue;
    const key = rec as TopicKey;
    if (!topicIs(topics, key, "machen_wir_schon")) {
      plannedTopics.add(key);
    }
  }

  const futureInternalHours = Array.from(plannedTopics).reduce((sum, key) => {
    return sum + lookupHours(key, companyType, employeeRange).year1;
  }, 0);

  const totalFutureIncludingCurrent = currentInternalHours + futureInternalHours;
  const savedHours = Math.round(0.8 * totalFutureIncludingCurrent);
  const netHoursWithPlanted = totalFutureIncludingCurrent - savedHours;

  return {
    currentInternalHours: Math.round(currentInternalHours),
    futureInternalHours: Math.round(futureInternalHours),
    totalFutureIncludingCurrent: Math.round(totalFutureIncludingCurrent),
    savedHours,
    netHoursWithPlanted: Math.round(netHoursWithPlanted),
  };
}

// ─── Risk Score ───────────────────────────────────────────────────────────────

export function computeRiskScore(
  input: SurveyInput,
  stakeholderExposure: StakeholderExposure,
  recommendedFeatures: RecommendationKey[]
): RiskScore {
  const { sectionB, sectionC, sectionD } = input;
  const { stakeholderReqKnown, stakeholderReqMet, matchesTotalCount } =
    stakeholderExposure;

  let score = 0;
  const drivers: string[] = [];

  // +30 stakeholder req known and NOT met
  if (stakeholderReqKnown && stakeholderReqMet === false) {
    score += 30;
    drivers.push(
      "Bekannte Stakeholder-Anforderungen werden aktuell nicht erfüllt."
    );
  }

  // +10 scope unknown
  if (sectionC.sustainabilityLinkedBusiness === true && sectionC.scopeUnknown) {
    score += 10;
    drivers.push(
      "Umfang der ESG-gekoppelten Geschäftsbeziehungen ist nicht vollständig bekannt."
    );
  } else if (
    sectionC.sustainabilityLinkedBusiness === false &&
    stakeholderExposure.totalStakeholdersProvided > 0
  ) {
    score += 5;
  }

  // +5 per stakeholder with ANY match (SBTi/CDP/CSRD), cap 30
  if (matchesTotalCount > 0) {
    const matchPoints = Math.min(30, matchesTotalCount * 5);
    score += matchPoints;
    drivers.push(
      `${matchesTotalCount} Stakeholder mit ESG-Verpflichtungen (SBTi/CDP/CSRD) identifiziert.`
    );
  }

  // +20 finance req known and not met
  if (
    sectionD.esgLinkedLoansOrInvestments === true &&
    sectionD.financeRequirementsMet === false
  ) {
    score += 20;
    drivers.push(
      "ESG-gebundene Finanzierungsanforderungen werden aktuell nicht erfüllt."
    );
  } else if (
    sectionD.esgLinkedLoansOrInvestments === true &&
    sectionD.financeRequirementsMet !== false
  ) {
    score += 5;
  }

  // +5 if CCF not doing but recommended
  const topics = sectionB.topics;
  if (
    !topicIs(topics, "ccf", "machen_wir_schon") &&
    recommendedFeatures.includes("ccf")
  ) {
    score += 5;
    drivers.push("CCF ist empfohlen, aber noch nicht implementiert.");
  }

  score = Math.min(100, Math.max(0, score));

  let level: RiskLevel;
  if (score < 30) level = "Niedrig";
  else if (score < 60) level = "Mittel";
  else level = "Hoch";

  return { score, level, drivers: drivers.slice(0, 3) };
}

// ─── StakeholderEntry → CheckResults Adapter ─────────────────────────────────

/**
 * Converts StakeholderEntry[] (autocomplete flow) to StakeholderCheckResult[]
 * for use in scoring functions.
 */
export function entriesToCheckResults(
  entries: StakeholderEntry[]
): StakeholderCheckResult[] {
  return entries
    .filter(
      (e) =>
        e.matchState !== "pending" ||
        e.inputValue.trim().length > 0
    )
    .map((e): StakeholderCheckResult => {
      const flagList = [
        e.flags.inSBTi && "SBTi",
        e.flags.inCDP && "CDP",
        e.flags.inCSRD && "CSRD",
      ].filter(Boolean) as string[];

      return {
        nameOriginal: e.inputValue,
        nameNormalized: e.inputValue.toLowerCase().trim(),
        inSBTi: e.flags.inSBTi,
        inCDP: e.flags.inCDP,
        inCSRD: e.flags.inCSRD,
        matchConfidence: e.matchConfidence,
        note:
          e.matchState === "noMatch"
            ? "Kein Treffer in SBTi-, CDP- oder CSRD-Liste."
            : flagList.length > 0
              ? `Stakeholder hat ${flagList.join("- und ")}-Verpflichtungen.`
              : "Kein Treffer gefunden.",
        ...(e.selectedName && e.selectedName !== e.inputValue
          ? { correctedName: e.selectedName }
          : {}),
      };
    });
}

// ─── Feature Estimates ────────────────────────────────────────────────────────

export function computeFeatureEstimates(
  recommendedFeatures: RecommendationKey[],
  companyType: CompanyType,
  employeeRange: EmployeeRange
): FeatureEstimate[] {
  return recommendedFeatures.map((key) => {
    const topicKey = RECOMMENDATION_TO_TOPIC[key];
    if (!topicKey) {
      return {
        key,
        label: RECOMMENDATION_LABELS[key],
        baseHours: 0,
        hoursWithPlanted: 0,
        savedHours: 0,
        savedMoneyEUR: 0,
        noEstimateAvailable: true,
      };
    }

    const { year1: baseHours } = lookupHours(topicKey, companyType, employeeRange);
    const savedHours = Math.round(baseHours * PLANTED_TIME_REDUCTION_RATE);
    const hoursWithPlanted = Math.round(baseHours * (1 - PLANTED_TIME_REDUCTION_RATE));
    const savedMoneyEUR = savedHours * COST_PER_SAVED_HOUR_EUR;

    return {
      key,
      label: RECOMMENDATION_LABELS[key],
      baseHours,
      hoursWithPlanted,
      savedHours,
      savedMoneyEUR,
      noEstimateAvailable: false,
    };
  });
}

// ─── Main Scorecard Computation ───────────────────────────────────────────────

export function computeScorecard(
  input: SurveyInput,
  checkResults: StakeholderCheckResult[]
): ScorecardOutput {
  const topics = input.sectionB.topics;
  const activeInESG = input.sectionB.activeInESG;

  const { level: maturityLevel, warning: maturityWarning } =
    computeMaturityLevel(topics, activeInESG);

  const alreadyImplemented = getTopicsWithStatus(topics, "machen_wir_schon");

  const stakeholderExposure = computeStakeholderExposure(input, checkResults);

  const recommendationsWithReasons = computeRecommendations(
    input,
    stakeholderExposure
  );

  const recommendedFeatures = recommendationsWithReasons.map((r) => r.feature);

  const recommendationReasons = Object.fromEntries(
    recommendationsWithReasons.map((r) => [r.feature, r.reason])
  ) as Partial<Record<RecommendationKey, string>>;

  const hoursBreakdown = computeHours(input, recommendedFeatures);

  const riskScore = computeRiskScore(
    input,
    stakeholderExposure,
    recommendedFeatures
  );

  const featureEstimates =
    input.sectionA.companyType && input.sectionA.employeeRange
      ? computeFeatureEstimates(
          recommendedFeatures,
          input.sectionA.companyType,
          input.sectionA.employeeRange
        )
      : [];

  return {
    maturityLevel,
    maturityWarning,
    alreadyImplemented,
    recommendedFeatures,
    recommendationReasons,
    stakeholderExposure,
    hoursBreakdown,
    riskScore,
    featureEstimates,
  };
}
