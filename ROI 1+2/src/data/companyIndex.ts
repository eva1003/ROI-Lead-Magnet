/**
 * Unified company index for autocomplete and matching.
 *
 * Sources (merged and deduplicated by normalizedName):
 *   SBTi  – 14,034 companies (sbtiDatabase.ts)
 *   CDP   – 812 companies    (cdpDatabase.ts)
 *   CSRD  – 715 companies    (csrdDatabase.ts)
 *
 * Run `node scripts/generate-databases.mjs` to regenerate source databases.
 */

import { SBTI_COMPANIES } from "./sbtiDatabase";
import { CDP_COMPANIES } from "./cdpDatabase";
import { CSRD_COMPANIES } from "./csrdDatabase";
import { normalizeName, levenshtein } from "../logic/nameUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompanyRecord {
  id: string;
  name: string;
  normalizedName: string;
  sources: { sbti: boolean; cdp: boolean; csrd: boolean };
}

// ─── Index Build ──────────────────────────────────────────────────────────────

function buildIndex(): CompanyRecord[] {
  const map = new Map<string, CompanyRecord>();

  const add = (
    name: string,
    source: "sbti" | "cdp" | "csrd",
    idx: number
  ) => {
    const norm = normalizeName(name);
    if (!norm || norm.length < 2) return;
    const existing = map.get(norm);
    if (existing) {
      existing.sources[source] = true;
    } else {
      map.set(norm, {
        id: `${source}-${idx}`,
        name,
        normalizedName: norm,
        sources: { sbti: false, cdp: false, csrd: false, [source]: true },
      });
    }
  };

  SBTI_COMPANIES.forEach((n, i) => add(n, "sbti", i));
  CDP_COMPANIES.forEach((n, i) => add(n, "cdp", i));
  CSRD_COMPANIES.forEach((n, i) => add(n, "csrd", i));

  return Array.from(map.values()).sort((a, b) =>
    a.normalizedName.localeCompare(b.normalizedName)
  );
}

const INDEX: CompanyRecord[] = buildIndex();

export function getIndexSize(): number {
  return INDEX.length;
}

// ─── Suggestion Algorithm ─────────────────────────────────────────────────────

/**
 * Returns up to `limit` CompanyRecord suggestions for the given query.
 * Priority: 1) prefix match, 2) token-contains, 3) fuzzy (Levenshtein).
 */
export function getCompanySuggestions(
  query: string,
  limit = 8
): CompanyRecord[] {
  if (!query || query.trim().length < 2) return [];

  const q = normalizeName(query);
  if (!q || q.length < 2) return [];

  const seen = new Set<string>();
  const results: Array<{ record: CompanyRecord; score: number }> = [];

  for (const record of INDEX) {
    if (seen.has(record.id)) continue;
    const n = record.normalizedName;

    let score = 0;

    // 1. Exact match
    if (n === q) {
      score = 4;
    }
    // 2. Prefix match on full name
    else if (n.startsWith(q)) {
      score = 3;
    }
    // 3. Token-level prefix match (any word in name starts with query)
    else if (
      n.includes(q) ||
      n.split(" ").some((t) => t.startsWith(q) && t.length >= q.length)
    ) {
      score = 2;
    }
    // 4. Fuzzy fallback (only for queries >= 4 chars to avoid noise)
    else if (q.length >= 4) {
      const tokens = n.split(" ");
      let best = 0;
      for (const token of tokens) {
        if (Math.abs(token.length - q.length) > 4) continue;
        const dist = levenshtein(q, token);
        const maxLen = Math.max(q.length, token.length);
        const s = 1 - dist / maxLen;
        if (s > best) best = s;
      }
      if (best >= 0.65) score = best; // 0.65–<2 → fuzzy tier
    }

    if (score > 0) {
      results.push({ record, score });
      seen.add(record.id);
    }
  }

  // Sort: highest score first, then alphabetically within same score
  results.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : a.record.normalizedName.localeCompare(b.record.normalizedName)
  );

  return results.slice(0, limit).map((r) => r.record);
}

/**
 * Finds the best matching CompanyRecord for a given name string,
 * returns null if no match above threshold.
 */
export function findBestCompanyMatch(
  name: string,
  threshold = 0.75
): { record: CompanyRecord; confidence: number } | null {
  const q = normalizeName(name);
  if (!q) return null;

  let best: CompanyRecord | null = null;
  let bestScore = 0;

  for (const record of INDEX) {
    const n = record.normalizedName;
    if (Math.abs(n.length - q.length) > 15) continue;

    let score: number;
    if (n === q) {
      score = 1.0;
    } else if (n.startsWith(q) || q.startsWith(n)) {
      score = 0.9;
    } else {
      const dist = levenshtein(q, n);
      const maxLen = Math.max(q.length, n.length);
      score = Math.max(0, 1 - dist / maxLen);
    }

    if (score > bestScore) {
      bestScore = score;
      best = record;
      if (score === 1.0) break;
    }
  }

  if (best && bestScore >= threshold) {
    return { record: best, confidence: bestScore };
  }
  return null;
}
