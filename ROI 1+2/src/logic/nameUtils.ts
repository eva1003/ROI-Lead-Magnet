/**
 * Shared name-normalization and fuzzy-matching utilities.
 * Used by both companyIndex and stakeholderCheck.
 */

const LEGAL_FORMS = [
  "gmbh", "ag", "se", "kg", "ohg", "gbr", "ev", "eg", "kgaa", "ug",
  "ltd", "inc", "plc", "llc", "llp", "corp", "co", "bv", "nv", "sa",
  "sas", "srl", "spa", "ab", "as", "oy", "sarl", "sprl", "nv", "cv",
];

const GENERIC_TERMS = [
  "group", "holding", "holdings", "international", "global", "europe",
  "germany", "deutschland", "services", "solutions", "systems", "industries",
  "enterprises", "technologies", "technology", "digital", "management",
  "finance", "financial", "capital", "partners", "associates", "ventures",
];

const LEGAL_FORM_PATTERN = new RegExp(
  `\\b(${LEGAL_FORMS.join("|")})\\.?\\b`,
  "gi"
);

const GENERIC_TERM_PATTERN = new RegExp(
  `\\b(${GENERIC_TERMS.join("|")})\\b`,
  "gi"
);

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(LEGAL_FORM_PATTERN, "")
    .replace(GENERIC_TERM_PATTERN, "")
    .replace(/[^a-z0-9\s&']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function tokenSetRatio(a: string, b: string): number {
  const ta = a.split(/\s+/).filter((t) => t.length >= 2);
  const tb = b.split(/\s+/).filter((t) => t.length >= 2);
  if (!ta.length || !tb.length) return 0;
  const setA = new Set(ta);
  const intersection = tb.filter((t) => setA.has(t)).length;
  return intersection / Math.max(ta.length, tb.length);
}

export function matchConfidence(query: string, candidate: string): number {
  if (query === candidate) return 1.0;
  if (candidate.startsWith(query) || query.startsWith(candidate)) return 0.9;
  const tokenScore = tokenSetRatio(query, candidate);
  const dist = levenshtein(query, candidate);
  const maxLen = Math.max(query.length, candidate.length);
  const charScore = maxLen === 0 ? 1 : Math.max(0, 1 - dist / maxLen);
  return Math.max(charScore, tokenScore);
}
