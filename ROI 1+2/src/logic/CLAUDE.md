# src/logic/ — Business Logic Layer

All files here are **pure TypeScript functions with no React dependencies**. They are fully unit-tested. Do not import React or any UI framework here.

---

## scoring.ts — Core Calculation Engine

Entry point: `computeScorecard(input: SurveyInput): ScorecardOutput`

This orchestrates five sub-computations in order:

```
computeMaturityLevel(input)
computeStakeholderExposure(input, checkResults)
computeRecommendations(input, exposure)
computeHours(input, recommendations)
computeRiskScore(input, exposure)
```

### Maturity Level (`computeMaturityLevel`)

Planted's **proprietary** 4-tier maturity ladder. Not mapped to any external standard (GRI, ESRS, etc.).

```
Fortgeschritten  = CCF + PCF + VSME + ESG-KPIs + (CSRD or sustainability_strategy)
Mittel           = CCF + ≥2 of {vsme, pcf, esg_kpis, sustainability_strategy, ecovadis, sbti}
Einsteiger       = CCF doing or planned (warns if no broader ESG programme)
Kein ESG Setup   = nothing active
```

**Design intent**: CCF (Corporate Carbon Footprint) is the non-negotiable foundation. It is the minimum entry point into structured ESG management and the core of Planted's platform. A company doing CCF but nothing else is still "Einsteiger" — they've started but haven't built a management system around it.

### Stakeholder Exposure (`computeStakeholderExposure`)

Determines what the company knows about its sustainability obligations toward supply-chain partners:

- **requirements known** = SectionC has enough data filled in (linked count, revenue %, requirements met flag)
- **SBTi matches** = number of named stakeholders found in SBTi registry
- **CDP matches** = number of named stakeholders found in CDP registry
- **relationships to review** = total named stakeholders checked

### Recommendations (`computeRecommendations`)

Explicit decision tree — **do not merge paths or add fuzzy logic**. Each path has a specific sustainability rationale:

#### Path A — Requirements known & MET
→ Recommend: `[ccf]`

Rationale: The company already knows what its stakeholders need and is meeting those requirements. The only gap is measurement infrastructure. CCF alone is sufficient to maintain compliance.

#### Path B — Requirements known & NOT MET
→ Recommend: `[ccf, esg_kpis]`

Rationale: The company knows it is failing to meet stakeholder requirements. It needs both the measurement tool (CCF) and a structured KPI tracking system (ESG-KPIs) to demonstrate improvement over time.

#### Path C — SBTi signals detected (no CDP)
→ Recommend: `[ccf, sbti]`

Rationale: At least one key stakeholder has an approved Science Based Target. SBTi-committed companies demand **Scope 3 supply chain data** from their suppliers — i.e., they need their suppliers to measure and reduce emissions too. CCF provides the Scope 1–3 measurement; the SBTi module provides the framework to set aligned targets and report them to the stakeholder.

#### Path D — CDP signals detected (no SBTi)
→ Recommend: `[ccf, vsme, esg_kpis]` + `transformations_workshop` if no sustainability_strategy

Rationale: CDP-disclosing companies impose **structured reporting pressure** on their supply chain. CDP questionnaires ask about governance, strategy, risk management, and metrics — not just raw emissions. The supplier therefore needs: CCF (emissions data), VSME ESRS (a structured management system and reporting format), and ESG-KPIs (tracked metrics). If the company has no sustainability strategy yet, the `transformations_workshop` — a Planted onboarding workshop — is added to establish strategic direction before implementation.

#### Path E — Both SBTi & CDP signals
→ Recommend: `[ccf, vsme, sbti, esg_kpis]` + `transformations_workshop` if no strategy

Rationale: Combined Scope 3 supply-chain pressure (SBTi) and structured reporting pressure (CDP). Full suite required.

#### Path F — Finance requirements known & MET
→ Recommend: `[ccf]`

Rationale: ESG-linked loan covenants are being met. The company needs CCF to maintain ongoing measurement and covenant compliance, but no additional modules.

#### Path G — Finance requirements known & NOT MET
→ Recommend: `[ccf, vsme]`

Rationale: The company is at risk of ESG-linked loan penalties. It needs CCF for measurement and VSME ESRS as a management system framework to get covenant compliance back on track.

**Deduplication**: Paths are evaluated and then deduplicated. A company may trigger multiple paths; the final recommendation list is the union of all triggered paths, with reasons recorded for each module.

### Hours Computation (`computeHours`)

Maps the company's current and planned ESG activity to time effort, then shows the Planted ROI.

```
current_hours = sum of followYear[topic][companyType][employeeRange]
                for all topics with status "machen_wir_schon"
                minus external consulting hours (already paid for)

future_hours  = sum of year1[topic][companyType][employeeRange]
                for topics with status "wollen_wir_machen" or "nicht_sicher"
                plus recommended topics not already being done (deduped)

savings       = 0.8 × (current_hours + future_hours)
                ← conservative sales assumption, not a validated benchmark

net_hours     = 0.2 × (current_hours + future_hours)
                ← estimated remaining effort with Planted
```

`year1` hours are higher than `followYear` (initial setup cost). CSRD is most complex (250–600 hrs year1). Stakeholder questionnaires are simplest (20–80 hrs).

### Risk Score (`computeRiskScore`)

Returns a 0–100 score (clamped), a Niedrig/Mittel/Hoch band, and the top 3 driver reasons.

| Condition | Points | Sustainability rationale |
|-----------|--------|--------------------------|
| Stakeholder requirements known but NOT met | +30 | Highest urgency — active compliance failure with named partners |
| Finance requirements known but NOT met | +20 | ESG-linked loan covenant breach risk — financial consequences |
| Scope unknown (SectionC) | +10 | Cannot manage what you cannot measure — unknown obligations |
| CCF recommended but not yet doing | +5 | Missing the foundation; all other ESG work is unreliable without it |
| Each SBTi stakeholder match (cap +15) | +5 | Each SBTi partner increases Scope 3 reporting pressure |
| Each CDP stakeholder match (cap +15) | +5 | Each CDP partner increases structured disclosure pressure |

Thresholds: <30 = Niedrig, <60 = Mittel, ≥60 = Hoch.

---

## hoursMatrix.ts — Effort Lookup Table

`HOURS_MATRIX[topic][companyType][employeeRange] → { year1, followYear }`

3 company types: `Produzierend` | `Service` | `Handel`
3 size bands: `<500` | `500-1000` | `1000+`
11 topics: all TopicKey values

**CompanyType mapping** (from SurveyInput to matrix key):
- `"Produktion"` → `"Produzierend"`
- `"Dienstleistung"` → `"Service"`
- `"Handel"` → `"Handel"`

When adding a new ESG topic, add a complete 3×3 entry to this matrix. Hours are estimates based on typical ESG consulting engagement sizes; they scale with company complexity (size) and operational profile (type).

---

## stakeholderCheck.ts — Fuzzy Company Name Matching

### Why fuzzy matching

Real-world company names in stakeholder lists have inconsistencies: "Siemens AG", "SIEMENS", "Siemens & Co." all refer to the same entity. The matcher normalises and uses Levenshtein edit distance to handle these variations robustly.

### Normalisation pipeline

```
Input → trim → lowercase
     → remove legal suffixes (gmbh, ag, se, ltd, inc, plc, srl, bv, ...)
     → remove punctuation and special chars
     → collapse whitespace
```

### Matching rules

- Exact match after normalisation → confidence 1.0
- Normalised name is substring of registry entry (or vice versa) → confidence 0.9
- Otherwise → `1 - (levenshtein / maxLength)`, threshold 0.75 to count as "found"

### Adapter pattern

The `StakeholderRegistryAdapter` interface allows swapping the underlying data source:

```ts
interface StakeholderRegistryAdapter {
  checkSBTi(normalizedName: string): Promise<{ found: boolean, confidence: number, evidenceUrl?: string }>
  checkCDP(normalizedName: string): Promise<{ found: boolean, confidence: number, evidenceUrl?: string }>
}
```

**`mockDatasetAdapter`** — uses `src/data/mockDatasets.ts` (~150 companies). Used in dev and testing. Never use in production without replacing.

**`webLookupAdapter`** — placeholder. Not implemented. Logs a warning.

**`createCustomDatasetAdapter(sbtiList, cdpList)`** — factory for user-uploaded lists (CSV/JSON from SectionC file upload). Applies same normalisation + fuzzy logic to the custom lists.

### Public data sources

| Registry | URL | Notes |
|----------|-----|-------|
| SBTi Target Dashboard | https://sciencebasedtargets.org/target-dashboard | Open data, respects robots.txt |
| CDP Public Responses | https://classic.cdp.net/en/responses | Open data, respects robots.txt |

Do not scrape login-protected portals. Only public open-data sources.

---

## validation.ts — Form Validation

Pure functions, no side effects. All error messages are in German.

Each `validateSectionX(input)` returns `FieldErrors` (a `Record<string, string>`). An empty object means valid.

`hasErrors(errors: FieldErrors): boolean` — convenience helper.

When adding a new field, add validation in the corresponding `validateSectionX` and add a test case in `scoring.test.ts`.

---

## storage.ts — localStorage Persistence

Key: `"planted_esg_assessment_v1"`
Schema: full `AppState` (surveyInput + scorecardOutput + checkResults + currentStep + completedAt)

Persisted on every state change. Graceful fallback if quota exceeded or JSON is corrupted. Call `clearState()` on user-initiated restart.
