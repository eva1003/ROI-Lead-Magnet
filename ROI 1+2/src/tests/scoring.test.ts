/**
 * Unit tests for pure business-logic functions.
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";
import type { SurveyInput, TopicKey, TopicStatus } from "../types";
import { ALL_TOPICS } from "../types";
import {
  computeMaturityLevel,
  computeRecommendations,
  computeHours,
  computeRiskScore,
  computeScorecard,
  computeFeatureEstimates,
  PLANTED_TIME_REDUCTION_RATE,
  COST_PER_SAVED_HOUR_EUR,
  topicIs,
  getTopicsWithStatus,
} from "../logic/scoring";
import { computeStakeholderExposure } from "../logic/scoring";
import type { StakeholderCheckResult } from "../types";
import {
  normalizeName,
  levenshtein,
  matchConfidence,
} from "../logic/stakeholderCheck";
import {
  validateSectionA,
  validateSectionB,
  validateSectionD,
  hasErrors,
} from "../logic/validation";
import { lookupHours } from "../logic/hoursMatrix";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTopics(
  overrides: Partial<Record<TopicKey, TopicStatus>> = {}
): Record<TopicKey, TopicStatus> {
  const base = Object.fromEntries(ALL_TOPICS.map((k) => [k, ""])) as Record<
    TopicKey,
    TopicStatus
  >;
  return { ...base, ...overrides };
}

function noCheckResult(name: string): StakeholderCheckResult {
  return {
    nameOriginal: name,
    nameNormalized: name,
    inSBTi: false,
    inCDP: false,
    inCSRD: false,
    matchConfidence: 0,
    note: "",
  };
}

function hitResult(
  name: string,
  inSBTi: boolean,
  inCDP: boolean,
  inCSRD = false
): StakeholderCheckResult {
  return {
    nameOriginal: name,
    nameNormalized: name,
    inSBTi,
    inCDP,
    inCSRD,
    matchConfidence: 1.0,
    note: "",
  };
}

const baseInput: SurveyInput = {
  sectionA: {
    companyName: "Test GmbH",
    email: "test@test.de",
    employeeRange: "1-99",
    companyType: "Produktion",
    industry: "Baugewerbe",
    revenue: "",
    revenueCurrency: "",
    consentGiven: true,
  },
  sectionB: {
    activeInESG: true,
    topics: makeTopics(),
    useExternalConsulting: false,
    consultingHoursPerYear: null,
  },
  sectionC: {
    sustainabilityLinkedBusiness: false,
    linkedBusinessCount: null,
    scopeUnknown: false,
    avgRevenueSharePct: null,
    requirementsMet: null,
    stakeholders: [],
  },
  sectionD: {
    esgLinkedLoansOrInvestments: false,
    affectedVolumeEur: null,
    interestDeltaPct: null,
    penaltiesEur: null,
    financeRequirementsMet: null,
  },
};

// ─── normalizeName ────────────────────────────────────────────────────────────

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Siemens AG  ")).toBe("siemens");
  });
  it("removes legal forms: GmbH, AG, SE, Ltd, Inc", () => {
    expect(normalizeName("Muster GmbH")).toBe("muster");
    expect(normalizeName("Apple Inc")).toBe("apple");
    expect(normalizeName("BASF SE")).toBe("basf");
    expect(normalizeName("Vodafone Ltd")).toBe("vodafone");
  });
  it("handles multiple legal forms and special chars", () => {
    expect(normalizeName("BMW AG & Co. KG")).toContain("bmw");
  });
});

// ─── levenshtein ──────────────────────────────────────────────────────────────

describe("levenshtein", () => {
  it("returns 0 for equal strings", () => {
    expect(levenshtein("apple", "apple")).toBe(0);
  });
  it("returns correct edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
});

// ─── matchConfidence ──────────────────────────────────────────────────────────

describe("matchConfidence", () => {
  it("returns 1.0 for identical strings", () => {
    expect(matchConfidence("siemens", "siemens")).toBe(1.0);
  });
  it("returns 0.9 for substring match", () => {
    expect(matchConfidence("siemens", "siemens energy")).toBe(0.9);
  });
  it("returns lower confidence for dissimilar strings", () => {
    const conf = matchConfidence("apple", "microsoft");
    expect(conf).toBeLessThan(0.5);
  });
});

// ─── topicIs / getTopicsWithStatus ───────────────────────────────────────────

describe("topicIs", () => {
  it("returns true when status matches", () => {
    const topics = makeTopics({ ccf: "machen_wir_schon" });
    expect(topicIs(topics, "ccf", "machen_wir_schon")).toBe(true);
  });
  it("returns false when status does not match", () => {
    const topics = makeTopics({ ccf: "wollen_wir_machen" });
    expect(topicIs(topics, "ccf", "machen_wir_schon")).toBe(false);
  });
});

describe("getTopicsWithStatus", () => {
  it("returns topics matching given statuses", () => {
    const topics = makeTopics({
      ccf: "machen_wir_schon",
      vsme: "machen_wir_schon",
      sbti: "wollen_wir_machen",
    });
    expect(getTopicsWithStatus(topics, "machen_wir_schon")).toEqual(
      expect.arrayContaining(["ccf", "vsme"])
    );
    expect(getTopicsWithStatus(topics, "machen_wir_schon")).not.toContain(
      "sbti"
    );
  });
});

// ─── computeMaturityLevel ────────────────────────────────────────────────────

describe("computeMaturityLevel", () => {
  it("returns Fortgeschritten when all conditions met", () => {
    const topics = makeTopics({
      ccf: "machen_wir_schon",
      pcf: "machen_wir_schon",
      vsme: "machen_wir_schon",
      esg_kpis: "machen_wir_schon",
      csrd: "machen_wir_schon",
    });
    expect(computeMaturityLevel(topics, true).level).toBe("Fortgeschritten");
  });

  it("returns Fortgeschritten with sustainability_strategy instead of csrd", () => {
    const topics = makeTopics({
      ccf: "machen_wir_schon",
      pcf: "machen_wir_schon",
      vsme: "machen_wir_schon",
      esg_kpis: "machen_wir_schon",
      sustainability_strategy: "machen_wir_schon",
    });
    expect(computeMaturityLevel(topics, true).level).toBe("Fortgeschritten");
  });

  it("returns Mittel when ccf done and 2 advanced topics", () => {
    const topics = makeTopics({
      ccf: "machen_wir_schon",
      vsme: "machen_wir_schon",
      esg_kpis: "wollen_wir_machen",
    });
    expect(computeMaturityLevel(topics, true).level).toBe("Mittel");
  });

  it("returns Einsteiger when only ccf planned", () => {
    const topics = makeTopics({ ccf: "wollen_wir_machen" });
    expect(computeMaturityLevel(topics, true).level).toBe("Einsteiger");
  });

  it("returns Einsteiger with warning when no ESG active", () => {
    const result = computeMaturityLevel(makeTopics(), false);
    expect(result.level).toBe("Einsteiger");
    expect(result.warning).toBeTruthy();
  });

  it("Mittel requires at least 2 advanced topics - exactly 1 is not enough", () => {
    const topics = makeTopics({
      ccf: "machen_wir_schon",
      vsme: "machen_wir_schon", // only 1 advanced topic alongside CCF
    });
    // ccf + 1 advanced topic → Einsteiger, not Mittel (need 2 advanced)
    expect(computeMaturityLevel(topics, true).level).toBe("Einsteiger");
  });

  it("Mittel when ccf done and 2 or more advanced topics", () => {
    const topics = makeTopics({
      ccf: "machen_wir_schon",
      vsme: "machen_wir_schon",
      esg_kpis: "wollen_wir_machen",
    });
    expect(computeMaturityLevel(topics, true).level).toBe("Mittel");
  });
});

// ─── computeStakeholderExposure ───────────────────────────────────────────────

describe("computeStakeholderExposure", () => {
  it("stakeholderReqKnown = true when Ja, count set, req answered, not scopeUnknown", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 3,
        scopeUnknown: false,
        requirementsMet: true,
      },
    };
    const exp = computeStakeholderExposure(input, []);
    expect(exp.stakeholderReqKnown).toBe(true);
    expect(exp.stakeholderReqMet).toBe(true);
    expect(exp.relationshipsToReview).toBe(3);
  });

  it("stakeholderReqKnown = false when scopeUnknown", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 3,
        scopeUnknown: true,
        requirementsMet: false,
      },
    };
    const exp = computeStakeholderExposure(input, []);
    expect(exp.stakeholderReqKnown).toBe(false);
  });

  it("counts SBTi and CDP matches from checkResults", () => {
    const results = [
      hitResult("A", true, false),
      hitResult("B", false, true),
      hitResult("C", true, true),
    ];
    const exp = computeStakeholderExposure(baseInput, results);
    expect(exp.sbtiMatchesCount).toBe(2);
    expect(exp.cdpMatchesCount).toBe(2);
    expect(exp.totalStakeholdersProvided).toBe(3);
  });

  it("relationshipsToReview = max(1, hit count) when no count set", () => {
    const results = [hitResult("A", true, false), noCheckResult("B")];
    const exp = computeStakeholderExposure(baseInput, results);
    expect(exp.relationshipsToReview).toBe(1); // 1 SBTi hit
  });
});

// ─── computeRecommendations ───────────────────────────────────────────────────

describe("computeRecommendations", () => {
  it("Path A: req known and MET → only recommends CCF if not done", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 2,
        scopeUnknown: false,
        requirementsMet: true,
      },
    };
    const exposure = computeStakeholderExposure(input, []);
    const recs = computeRecommendations(input, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("ccf");
    expect(keys).not.toContain("vsme");
  });

  it("Path A: req known and MET → no CCF rec if already doing CCF", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionB: {
        ...baseInput.sectionB,
        topics: makeTopics({ ccf: "machen_wir_schon" }),
      },
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 2,
        scopeUnknown: false,
        requirementsMet: true,
      },
    };
    const exposure = computeStakeholderExposure(input, []);
    const recs = computeRecommendations(input, exposure);
    expect(recs.map((r) => r.feature)).not.toContain("ccf");
  });

  it("Path B: req known and NOT MET → CCF + esg_kpis", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 2,
        scopeUnknown: false,
        requirementsMet: false,
      },
    };
    const exposure = computeStakeholderExposure(input, []);
    const recs = computeRecommendations(input, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("ccf");
    expect(keys).toContain("esg_kpis");
  });

  it("Path C: SBTi match only → ccf + sbti", () => {
    const results = [hitResult("A", true, false)];
    const exposure = computeStakeholderExposure(baseInput, results);
    const recs = computeRecommendations(baseInput, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("ccf");
    expect(keys).toContain("sbti");
    expect(keys).not.toContain("vsme");
  });

  it("Path D: CDP match only → ccf + vsme + esg_kpis", () => {
    const results = [hitResult("A", false, true)];
    const exposure = computeStakeholderExposure(baseInput, results);
    const recs = computeRecommendations(baseInput, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("ccf");
    expect(keys).toContain("vsme");
    expect(keys).toContain("esg_kpis");
  });

  it("Path D: adds transformations_workshop if sustainability_strategy not planned", () => {
    const results = [hitResult("A", false, true)];
    const exposure = computeStakeholderExposure(baseInput, results);
    const recs = computeRecommendations(baseInput, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("transformations_workshop");
  });

  it("Path D: no transformations_workshop if sustainability_strategy is machen_wir_schon", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionB: {
        ...baseInput.sectionB,
        topics: makeTopics({ sustainability_strategy: "machen_wir_schon" }),
      },
    };
    const results = [hitResult("A", false, true)];
    const exposure = computeStakeholderExposure(input, results);
    const recs = computeRecommendations(input, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).not.toContain("transformations_workshop");
  });

  it("Path E: CSRD only (no SBTi, no CDP) → ccf + vsme + esg_kpis", () => {
    const results = [hitResult("A", false, false, true)];
    const exposure = computeStakeholderExposure(baseInput, results);
    const recs = computeRecommendations(baseInput, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("ccf");
    expect(keys).toContain("vsme");
    expect(keys).toContain("esg_kpis");
    expect(keys).not.toContain("sbti");
  });

  it("Path F: SBTi + CDP (≥2 sources) → ccf + vsme + sbti + esg_kpis", () => {
    const results = [hitResult("A", true, true)];
    const exposure = computeStakeholderExposure(baseInput, results);
    const recs = computeRecommendations(baseInput, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("ccf");
    expect(keys).toContain("vsme");
    expect(keys).toContain("sbti");
    expect(keys).toContain("esg_kpis");
  });

  it("Path F: SBTi + CSRD (≥2 sources) → ccf + vsme + sbti + esg_kpis", () => {
    const results = [hitResult("A", true, false, true)];
    const exposure = computeStakeholderExposure(baseInput, results);
    const recs = computeRecommendations(baseInput, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("ccf");
    expect(keys).toContain("sbti");
    expect(keys).toContain("esg_kpis");
  });

  it("Path G: finance req known and MET → ccf only", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionD: {
        esgLinkedLoansOrInvestments: true,
        affectedVolumeEur: 1000000,
        interestDeltaPct: null,
        penaltiesEur: null,
        financeRequirementsMet: true,
      },
    };
    const exposure = computeStakeholderExposure(input, []);
    const recs = computeRecommendations(input, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("ccf");
    expect(keys).not.toContain("vsme");
  });

  it("Path H: finance req known and NOT met → ccf + vsme", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionD: {
        esgLinkedLoansOrInvestments: true,
        affectedVolumeEur: 1000000,
        interestDeltaPct: null,
        penaltiesEur: null,
        financeRequirementsMet: false,
      },
    };
    const exposure = computeStakeholderExposure(input, []);
    const recs = computeRecommendations(input, exposure);
    const keys = recs.map((r) => r.feature);
    expect(keys).toContain("ccf");
    expect(keys).toContain("vsme");
  });

  it("no duplicate recommendations", () => {
    const results = [hitResult("A", true, true)];
    const input: SurveyInput = {
      ...baseInput,
      sectionD: {
        esgLinkedLoansOrInvestments: true,
        affectedVolumeEur: 500000,
        interestDeltaPct: 0.5,
        penaltiesEur: null,
        financeRequirementsMet: false,
      },
    };
    const exposure = computeStakeholderExposure(input, results);
    const recs = computeRecommendations(input, exposure);
    const keys = recs.map((r) => r.feature);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

// ─── computeHours ─────────────────────────────────────────────────────────────

describe("computeHours", () => {
  it("returns zeros when no topics set and no company info", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionA: { ...baseInput.sectionA, companyType: "", employeeRange: "" },
    };
    const h = computeHours(input, []);
    expect(h.currentInternalHours).toBe(0);
    expect(h.futureInternalHours).toBe(0);
  });

  it("currentInternalHours = followYear sum for machen_wir_schon topics", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionB: {
        ...baseInput.sectionB,
        topics: makeTopics({ ccf: "machen_wir_schon" }),
      },
    };
    const ccfFollowYear = lookupHours("ccf", "Produktion", "1-99").followYear;
    const h = computeHours(input, []);
    expect(h.currentInternalHours).toBe(ccfFollowYear);
  });

  it("futureInternalHours includes wollen_wir_machen topics", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionB: {
        ...baseInput.sectionB,
        topics: makeTopics({ vsme: "wollen_wir_machen" }),
      },
    };
    const vsmeYear1 = lookupHours("vsme", "Produktion", "1-99").year1;
    const h = computeHours(input, []);
    expect(h.futureInternalHours).toBe(vsmeYear1);
  });

  it("futureInternalHours includes recommended features not yet in machen_wir_schon", () => {
    const input: SurveyInput = { ...baseInput };
    const sbtiYear1 = lookupHours("sbti", "Produktion", "1-99").year1;
    const h = computeHours(input, ["sbti"]);
    expect(h.futureInternalHours).toBe(sbtiYear1);
  });

  it("deduplicates: topic in wollen_wir_machen AND recommended → counted once", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionB: {
        ...baseInput.sectionB,
        topics: makeTopics({ sbti: "wollen_wir_machen" }),
      },
    };
    const sbtiYear1 = lookupHours("sbti", "Produktion", "1-99").year1;
    const h = computeHours(input, ["sbti"]);
    expect(h.futureInternalHours).toBe(sbtiYear1);
  });

  it("savedHours = round(0.8 * total)", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionB: {
        ...baseInput.sectionB,
        topics: makeTopics({ ccf: "machen_wir_schon" }),
      },
    };
    const h = computeHours(input, []);
    expect(h.savedHours).toBe(Math.round(0.8 * h.totalFutureIncludingCurrent));
  });

  it("netHoursWithPlanted = total - saved", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionB: {
        ...baseInput.sectionB,
        topics: makeTopics({ ccf: "machen_wir_schon", vsme: "wollen_wir_machen" }),
      },
    };
    const h = computeHours(input, []);
    expect(h.netHoursWithPlanted).toBe(
      h.totalFutureIncludingCurrent - h.savedHours
    );
  });
});

// ─── computeRiskScore ────────────────────────────────────────────────────────

describe("computeRiskScore", () => {
  it("Niedrig when no risk signals", () => {
    const exposure = computeStakeholderExposure(baseInput, []);
    const recs = computeRecommendations(baseInput, exposure);
    const risk = computeRiskScore(baseInput, exposure, recs.map((r) => r.feature));
    expect(risk.level).toBe("Niedrig");
    expect(risk.score).toBeLessThan(30);
  });

  it("+30 when req known and NOT met", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 3,
        scopeUnknown: false,
        requirementsMet: false,
      },
    };
    const exposure = computeStakeholderExposure(input, []);
    const risk = computeRiskScore(input, exposure, []);
    expect(risk.score).toBeGreaterThanOrEqual(30);
  });

  it("+20 when finance req known and NOT met", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionD: {
        esgLinkedLoansOrInvestments: true,
        affectedVolumeEur: 1000000,
        interestDeltaPct: null,
        penaltiesEur: null,
        financeRequirementsMet: false,
      },
    };
    const exposure = computeStakeholderExposure(input, []);
    const risk = computeRiskScore(input, exposure, []);
    expect(risk.score).toBeGreaterThanOrEqual(20);
  });

  it("score capped at 100", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 5,
        scopeUnknown: false,
        requirementsMet: false,
      },
      sectionD: {
        esgLinkedLoansOrInvestments: true,
        affectedVolumeEur: 5000000,
        interestDeltaPct: 2,
        penaltiesEur: 100000,
        financeRequirementsMet: false,
      },
    };
    const results = [
      hitResult("A", true, true),
      hitResult("B", true, true),
      hitResult("C", true, true),
    ];
    const exposure = computeStakeholderExposure(input, results);
    const risk = computeRiskScore(input, exposure, ["ccf"]);
    expect(risk.score).toBeLessThanOrEqual(100);
  });

  it("Hoch when score >= 60", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 3,
        scopeUnknown: false,
        requirementsMet: false,
      },
      sectionD: {
        esgLinkedLoansOrInvestments: true,
        affectedVolumeEur: 2000000,
        interestDeltaPct: null,
        penaltiesEur: null,
        financeRequirementsMet: false,
      },
    };
    const results = [hitResult("A", true, true), hitResult("B", true, false)];
    const exposure = computeStakeholderExposure(input, results);
    const risk = computeRiskScore(input, exposure, ["ccf"]);
    expect(risk.level).toBe("Hoch");
  });

  it("generates max 3 driver bullet points", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 3,
        scopeUnknown: false,
        requirementsMet: false,
      },
      sectionD: {
        esgLinkedLoansOrInvestments: true,
        affectedVolumeEur: 1000000,
        interestDeltaPct: null,
        penaltiesEur: null,
        financeRequirementsMet: false,
      },
    };
    const results = [hitResult("A", true, true)];
    const exposure = computeStakeholderExposure(input, results);
    const risk = computeRiskScore(input, exposure, ["ccf"]);
    expect(risk.drivers.length).toBeLessThanOrEqual(3);
  });

  it("matchesTotalCount × 5 each, cap 30", () => {
    // 6 distinct stakeholders with ≥1 match → 6 × 5 = 30 (at cap)
    const results = [
      hitResult("A", true, false),
      hitResult("B", false, true),
      hitResult("C", true, true),
      hitResult("D", true, false),
      hitResult("E", false, true),
      hitResult("F", false, false, true),
    ];
    const exposure = computeStakeholderExposure(baseInput, results);
    expect(exposure.matchesTotalCount).toBe(6);
    const risk = computeRiskScore(baseInput, exposure, []);
    // 6 × 5 = 30 (matches, capped) + 5 (stakeholders provided with sustainabilityLinkedBusiness=false) = 35
    expect(risk.score).toBe(35);
  });

  it("matchesTotalCount cap stops at 30 even with 10 stakeholders", () => {
    const results = Array.from({ length: 10 }, (_, i) =>
      hitResult(`S${i}`, true, true)
    );
    const exposure = computeStakeholderExposure(baseInput, results);
    const risk = computeRiskScore(baseInput, exposure, []);
    // Cap at 30 means max contribution from matches is 30
    expect(risk.score).toBeLessThanOrEqual(30 + 5); // possible +5 for CCF rec
  });

  it("CSRD matches count toward matchesTotalCount", () => {
    const results = [
      hitResult("A", false, false, true), // only CSRD
      hitResult("B", false, false, true),
    ];
    const exposure = computeStakeholderExposure(baseInput, results);
    expect(exposure.matchesTotalCount).toBe(2);
    expect(exposure.csrdMatchesCount).toBe(2);
  });
});

// ─── computeScorecard (integration) ──────────────────────────────────────────

describe("computeScorecard (integration)", () => {
  it("produces a valid scorecard with all required fields", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionB: {
        ...baseInput.sectionB,
        topics: makeTopics({
          ccf: "machen_wir_schon",
          vsme: "wollen_wir_machen",
        }),
      },
      sectionC: {
        ...baseInput.sectionC,
        sustainabilityLinkedBusiness: true,
        linkedBusinessCount: 2,
        scopeUnknown: false,
        requirementsMet: false,
      },
    };
    const result = computeScorecard(input, []);
    expect(result.maturityLevel).toBeTruthy();
    expect(Array.isArray(result.alreadyImplemented)).toBe(true);
    expect(Array.isArray(result.recommendedFeatures)).toBe(true);
    expect(result.hoursBreakdown).toBeDefined();
    expect(result.riskScore).toBeDefined();
    expect(result.stakeholderExposure).toBeDefined();
  });

  it("alreadyImplemented contains all machen_wir_schon topics", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionB: {
        ...baseInput.sectionB,
        topics: makeTopics({
          ccf: "machen_wir_schon",
          ecovadis: "machen_wir_schon",
        }),
      },
    };
    const result = computeScorecard(input, []);
    expect(result.alreadyImplemented).toContain("ccf");
    expect(result.alreadyImplemented).toContain("ecovadis");
  });
});

// ─── lookupHours ─────────────────────────────────────────────────────────────

describe("lookupHours", () => {
  it("returns correct hours for Produktion < 500", () => {
    const h = lookupHours("ccf", "Produktion", "1-99");
    expect(h.year1).toBeGreaterThan(0);
    expect(h.followYear).toBeGreaterThan(0);
    expect(h.year1).toBeGreaterThan(h.followYear);
  });
  it("larger companies have more hours", () => {
    const small = lookupHours("csrd", "Produktion", "1-99");
    const large = lookupHours("csrd", "Produktion", ">10.000");
    expect(large.year1).toBeGreaterThan(small.year1);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("validateSectionA", () => {
  it("passes with valid data", () => {
    const errors = validateSectionA({
      companyName: "Test GmbH",
      email: "test@test.de",
      employeeRange: "1-99",
      companyType: "Produktion",
      industry: "Baugewerbe",
      revenue: "",
      revenueCurrency: "",
      consentGiven: true,
    });
    expect(hasErrors(errors)).toBe(false);
  });

  it("fails when companyName too short", () => {
    const errors = validateSectionA({
      companyName: "A",
      email: "test@test.de",
      employeeRange: "1-99",
      companyType: "Produktion",
      industry: "Baugewerbe",
      revenue: "",
      revenueCurrency: "",
      consentGiven: true,
    });
    expect(errors.companyName).toBeTruthy();
  });

  it("fails when email is invalid", () => {
    const errors = validateSectionA({
      companyName: "Test GmbH",
      email: "keineemail",
      employeeRange: "1-99",
      companyType: "Produktion",
      industry: "Baugewerbe",
      revenue: "",
      revenueCurrency: "",
      consentGiven: true,
    });
    expect(errors.email).toBeTruthy();
  });

  it("fails when required dropdowns empty", () => {
    const errors = validateSectionA({
      companyName: "Test GmbH",
      email: "test@test.de",
      employeeRange: "",
      companyType: "",
      industry: "",
      revenue: "",
      revenueCurrency: "",
      consentGiven: true,
    });
    expect(errors.employeeRange).toBeTruthy();
    expect(errors.companyType).toBeTruthy();
    expect(errors.industry).toBeTruthy();
  });
});

describe("validateSectionB", () => {
  it("fails when activeInESG is null", () => {
    const errors = validateSectionB({
      activeInESG: null,
      topics: makeTopics(),
      useExternalConsulting: null,
      consultingHoursPerYear: null,
    });
    expect(errors.activeInESG).toBeTruthy();
  });
});

// ─── computeFeatureEstimates ──────────────────────────────────────────────────

describe("computeFeatureEstimates", () => {
  it("returns one estimate per recommended feature", () => {
    const estimates = computeFeatureEstimates(["ccf", "vsme"], "Produktion", "1-99");
    expect(estimates).toHaveLength(2);
    expect(estimates[0].key).toBe("ccf");
    expect(estimates[1].key).toBe("vsme");
  });

  it("baseHours matches year1 from hoursMatrix", () => {
    const estimates = computeFeatureEstimates(["ccf"], "Produktion", "1-99");
    const expected = lookupHours("ccf", "Produktion", "1-99").year1;
    expect(estimates[0].baseHours).toBe(expected);
  });

  it("hoursWithPlanted = round(baseHours * (1 - PLANTED_TIME_REDUCTION_RATE))", () => {
    const estimates = computeFeatureEstimates(["sbti"], "Dienstleistung", "501-1.000");
    const e = estimates[0];
    expect(e.hoursWithPlanted).toBe(Math.round(e.baseHours * (1 - PLANTED_TIME_REDUCTION_RATE)));
  });

  it("savedHours = round(baseHours * PLANTED_TIME_REDUCTION_RATE)", () => {
    const estimates = computeFeatureEstimates(["vsme"], "Handel", ">10.000");
    const e = estimates[0];
    expect(e.savedHours).toBe(Math.round(e.baseHours * PLANTED_TIME_REDUCTION_RATE));
  });

  it("savedMoneyEUR = savedHours * COST_PER_SAVED_HOUR_EUR", () => {
    const estimates = computeFeatureEstimates(["esg_kpis"], "Produktion", "501-1.000");
    const e = estimates[0];
    expect(e.savedMoneyEUR).toBe(e.savedHours * COST_PER_SAVED_HOUR_EUR);
  });

  it("transformations_workshop uses sustainability_strategy hours", () => {
    const workshopEstimates = computeFeatureEstimates(["transformations_workshop"], "Produktion", "1-99");
    const strategyEstimates = computeFeatureEstimates(["sustainability_strategy"], "Produktion", "1-99");
    expect(workshopEstimates[0].baseHours).toBe(strategyEstimates[0].baseHours);
    expect(workshopEstimates[0].noEstimateAvailable).toBe(false);
  });

  it("noEstimateAvailable is false for all known TopicKeys", () => {
    const allTopicKeys = [
      "ccf", "pcf", "vsme", "ecovadis", "sbti", "csrd",
      "dnk_gri", "cdp", "stakeholder_questionnaires",
      "sustainability_strategy", "esg_kpis",
    ] as const;
    const estimates = computeFeatureEstimates([...allTopicKeys], "Produktion", "1-99");
    estimates.forEach((e) => {
      expect(e.noEstimateAvailable).toBe(false);
    });
  });

  it("returns empty array for empty recommendedFeatures", () => {
    const estimates = computeFeatureEstimates([], "Produktion", "1-99");
    expect(estimates).toHaveLength(0);
  });

  it("label matches RECOMMENDATION_LABELS for each key", () => {
    const estimates = computeFeatureEstimates(["ccf", "transformations_workshop"], "Produktion", "1-99");
    expect(estimates[0].label).toBe("Corporate Carbon Footprint (CCF, Scope 1–3)");
    expect(estimates[1].label).toBe("Transformations-Workshop");
  });
});

// ─── computeScorecard: featureEstimates included ──────────────────────────────

describe("computeScorecard featureEstimates", () => {
  it("includes featureEstimates in output", () => {
    const result = computeScorecard(baseInput, [hitResult("A", true, false)]);
    expect(Array.isArray(result.featureEstimates)).toBe(true);
  });

  it("featureEstimates length matches recommendedFeatures length", () => {
    const result = computeScorecard(baseInput, [hitResult("A", true, false)]);
    expect(result.featureEstimates).toHaveLength(result.recommendedFeatures.length);
  });

  it("featureEstimates is empty when companyType missing", () => {
    const input: SurveyInput = {
      ...baseInput,
      sectionA: { ...baseInput.sectionA, companyType: "", employeeRange: "" },
    };
    const result = computeScorecard(input, []);
    expect(result.featureEstimates).toHaveLength(0);
  });
});

describe("validateSectionD", () => {
  it("fails when linked loans and volume not set", () => {
    const errors = validateSectionD({
      esgLinkedLoansOrInvestments: true,
      affectedVolumeEur: null,
      interestDeltaPct: null,
      penaltiesEur: null,
      financeRequirementsMet: null,
    });
    expect(errors.affectedVolumeEur).toBeTruthy();
    expect(errors.financeRequirementsMet).toBeTruthy();
  });
});
