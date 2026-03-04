/**
 * StakeholderCheck module – austauschbare Adapter-Architektur
 *
 * SBTi:  Echte Datenbank mit 14.034 Unternehmen
 * CDP:   Echte Datenbank mit 812 Unternehmen (Datenbank/CDP companies.csv)
 * CSRD:  Echte Datenbank mit 715 Unternehmen (Datenbank/CSRD Unternehmen.csv)
 *
 * Normalisierung und Fuzzy-Matching: nameUtils.ts
 */

import type { StakeholderCheckResult } from "../types";
import { SBTI_COMPANIES } from "../data/sbtiDatabase";
import { CDP_COMPANIES } from "../data/cdpDatabase";
import { CSRD_COMPANIES } from "../data/csrdDatabase";

// Re-export name utilities so existing tests (importing from here) keep working
export {
  normalizeName,
  levenshtein,
  tokenSetRatio,
  matchConfidence,
} from "./nameUtils";

import { normalizeName, matchConfidence } from "./nameUtils";

// ─── Adapter Interface ────────────────────────────────────────────────────────

export interface StakeholderRegistryAdapter {
  checkSBTi(normalizedName: string): Promise<{
    found: boolean;
    confidence: number;
    evidenceUrl?: string;
    matchedName?: string;
  }>;
  checkCDP(normalizedName: string): Promise<{
    found: boolean;
    confidence: number;
    evidenceUrl?: string;
    matchedName?: string;
  }>;
}

// ─── Dataset Matching ─────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.75;

const NORMALIZED_SBTI = SBTI_COMPANIES.map(normalizeName);
const NORMALIZED_CDP = CDP_COMPANIES.map(normalizeName);
const NORMALIZED_CSRD = CSRD_COMPANIES.map(normalizeName);

function findBestMatch(
  query: string,
  normalizedCandidates: string[],
  originalCandidates: string[]
): { found: boolean; confidence: number; matchedOriginal?: string } {
  let bestConf = 0;
  let bestIdx = -1;
  const queryLen = query.length;

  for (let i = 0; i < normalizedCandidates.length; i++) {
    const c = normalizedCandidates[i];
    if (Math.abs(c.length - queryLen) > 12) continue;
    const conf = matchConfidence(query, c);
    if (conf > bestConf) {
      bestConf = conf;
      bestIdx = i;
    }
  }

  const found = bestConf >= CONFIDENCE_THRESHOLD;
  return {
    found,
    confidence: bestConf,
    matchedOriginal:
      found && bestIdx >= 0 ? originalCandidates[bestIdx] : undefined,
  };
}

function checkCSRDDirect(normalizedName: string): {
  found: boolean;
  confidence: number;
  matchedName?: string;
} {
  const result = findBestMatch(normalizedName, NORMALIZED_CSRD, CSRD_COMPANIES);
  return {
    found: result.found,
    confidence: result.confidence,
    matchedName: result.matchedOriginal,
  };
}

// ─── Real Dataset Adapter ─────────────────────────────────────────────────────

export const realDatasetAdapter: StakeholderRegistryAdapter = {
  async checkSBTi(normalizedName) {
    const result = findBestMatch(normalizedName, NORMALIZED_SBTI, SBTI_COMPANIES);
    return {
      found: result.found,
      confidence: result.confidence,
      evidenceUrl: result.found
        ? "https://sciencebasedtargets.org/target-dashboard"
        : undefined,
      matchedName: result.matchedOriginal,
    };
  },
  async checkCDP(normalizedName) {
    const result = findBestMatch(normalizedName, NORMALIZED_CDP, CDP_COMPANIES);
    return {
      found: result.found,
      confidence: result.confidence,
      evidenceUrl: result.found
        ? "https://classic.cdp.net/en/responses"
        : undefined,
      matchedName: result.matchedOriginal,
    };
  },
};

/** Backwards-compat alias (old code used mockDatasetAdapter) */
export const mockDatasetAdapter = realDatasetAdapter;

// ─── Web Lookup Adapter (Placeholder) ─────────────────────────────────────────

export const webLookupAdapter: StakeholderRegistryAdapter = {
  async checkSBTi(_normalizedName) {
    return { found: false, confidence: 0 };
  },
  async checkCDP(_normalizedName) {
    return { found: false, confidence: 0 };
  },
};

// ─── Custom Dataset Adapter ───────────────────────────────────────────────────

export function createCustomDatasetAdapter(
  sbtiList: string[],
  cdpList: string[]
): StakeholderRegistryAdapter {
  const normalizedSBTi = sbtiList.map(normalizeName);
  const normalizedCDP = cdpList.map(normalizeName);
  return {
    async checkSBTi(normalizedName) {
      const result = findBestMatch(normalizedName, normalizedSBTi, sbtiList);
      return {
        found: result.found,
        confidence: result.confidence,
        matchedName: result.matchedOriginal,
      };
    },
    async checkCDP(normalizedName) {
      const result = findBestMatch(normalizedName, normalizedCDP, cdpList);
      return {
        found: result.found,
        confidence: result.confidence,
        matchedName: result.matchedOriginal,
      };
    },
  };
}

// ─── Main Check Function ──────────────────────────────────────────────────────

export async function checkStakeholders(
  names: string[],
  adapter: StakeholderRegistryAdapter = realDatasetAdapter
): Promise<StakeholderCheckResult[]> {
  return Promise.all(
    names.map(async (name): Promise<StakeholderCheckResult> => {
      const normalized = normalizeName(name);
      const [sbtiResult, cdpResult] = await Promise.all([
        adapter.checkSBTi(normalized),
        adapter.checkCDP(normalized),
      ]);
      const csrdResult = checkCSRDDirect(normalized);

      let correctedName: string | undefined;
      if (sbtiResult.found && sbtiResult.matchedName) {
        if (normalizeName(sbtiResult.matchedName) !== normalized)
          correctedName = sbtiResult.matchedName;
      } else if (cdpResult.found && cdpResult.matchedName) {
        if (normalizeName(cdpResult.matchedName) !== normalized)
          correctedName = cdpResult.matchedName;
      } else if (csrdResult.found && csrdResult.matchedName) {
        if (normalizeName(csrdResult.matchedName) !== normalized)
          correctedName = csrdResult.matchedName;
      }

      const inSBTi = sbtiResult.found;
      const inCDP = cdpResult.found;
      const inCSRD = csrdResult.found;
      const confidence = Math.max(
        sbtiResult.confidence,
        cdpResult.confidence,
        csrdResult.confidence
      );

      const flags: string[] = [];
      if (inSBTi) flags.push("SBTi");
      if (inCDP) flags.push("CDP");
      if (inCSRD) flags.push("CSRD");

      const note =
        flags.length > 0
          ? `Stakeholder hat ${flags.join("- und ")}-Verpflichtungen.`
          : "Kein Treffer in SBTi-Datenbank, CDP oder CSRD-Liste.";

      return {
        nameOriginal: name,
        nameNormalized: normalized,
        inSBTi,
        inCDP,
        inCSRD,
        matchConfidence: confidence,
        evidenceUrl: inSBTi
          ? sbtiResult.evidenceUrl
          : inCDP
            ? cdpResult.evidenceUrl
            : undefined,
        note,
        ...(correctedName ? { correctedName } : {}),
      };
    })
  );
}
