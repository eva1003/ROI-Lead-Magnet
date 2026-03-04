# Planted ESG Assessment & ROI Tool — CLAUDE.md

## What this app is

An interactive **ESG maturity assessment and ROI calculator** for Planted, a German sustainability reporting SaaS. The tool evaluates a company's ESG setup, identifies sustainability-related risks and stakeholder pressures, recommends relevant Planted modules, and estimates the time saved with Planted vs. manual consulting effort.

**Planted's product** is a SaaS platform focused on structured sustainability reporting: Corporate Carbon Footprint (CCF), CSRD compliance, and ESG-KPI tracking. This tool is the pre-sales/discovery layer.

**Primary users**: Planted sales reps (during prospect discovery calls), sustainability consultants (during onboarding audits), or prospects doing a self-assessment. The output is a personalised scorecard that quantifies ROI.

**Language**: All UI text, domain labels, and validation messages are in **German**. Keep it that way. Internal TypeScript code (variables, functions, types) is in English.

---

## Commands

Always prefix with the nvm path:

```bash
export PATH=~/.nvm/versions/node/v20.20.0/bin:$PATH

npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build → dist/
npm test           # 57 unit tests (Vitest) — must all pass
npm run test:watch # Watch mode
```

---

## Tech Stack

- React 19 + TypeScript ~5.9, Vite 7, Vitest 4
- No external UI libraries — plain CSS with semantic class names
- State: React hooks + localStorage persistence (`planted_esg_assessment_v1`)
- All business logic is in pure TypeScript functions (no React dependencies)

---

## Architecture

```
src/
├── types.ts                  # ALL domain types — edit here first
├── App.tsx                   # 5-step wizard orchestrator + state
├── logic/
│   ├── scoring.ts            # Core: maturity, recommendations, hours, risk score
│   ├── hoursMatrix.ts        # Effort lookup: topic × companyType × employeeRange
│   ├── stakeholderCheck.ts   # Levenshtein fuzzy match + pluggable adapter pattern
│   ├── validation.ts         # Form validation (pure, German error messages)
│   └── storage.ts            # localStorage helpers
├── data/
│   └── mockDatasets.ts       # ~150 mock SBTi & CDP companies for local dev
├── components/
│   ├── survey/               # SectionA–D: 4 survey steps
│   └── scorecard/            # Scorecard.tsx: results display + JSON export
└── tests/
    └── scoring.test.ts       # Unit tests — run after every logic change
```

**Key constraint**: `src/logic/` must stay free of React imports. All functions are pure and tested directly.

---

## Domain: The 11 ESG Topics (TopicKey)

These map directly to Planted product modules and/or regulatory frameworks:

| Key | Full name | Type |
|-----|-----------|------|
| `ccf` | Corporate Carbon Footprint (Scope 1–3) | Planted core module |
| `pcf` | Product Carbon Footprint | Planted module |
| `vsme` | EFRAG VSME ESRS | EU voluntary standard for SMEs not in CSRD scope |
| `csrd` | Corporate Sustainability Reporting Directive | EU mandatory reporting |
| `dnk_gri` | Deutscher Nachhaltigkeitskodex / GRI Standards | Voluntary sustainability reports |
| `sbti` | Science Based Targets initiative | Climate target framework |
| `cdp` | CDP (Carbon Disclosure Project) | Climate/water disclosure platform |
| `ecovadis` | EcoVadis supplier rating | Supply chain ESG rating |
| `stakeholder_questionnaires` | Custom supplier ESG questionnaires | Inbound/outbound |
| `sustainability_strategy` | Internal strategic ESG framework | Foundational |
| `esg_kpis` | Structured ESG performance indicators | Planted module |

CCF is foundational — it is recommended in **all** recommendation paths (A–G).

---

## Domain: Maturity Tiers (Planted proprietary framework)

| Level | Criteria |
|-------|----------|
| **Fortgeschritten** | Doing CCF + PCF + VSME + ESG-KPIs + (CSRD or sustainability_strategy) |
| **Mittel** | Doing CCF + ≥2 of {vsme, pcf, esg_kpis, sustainability_strategy, ecovadis, sbti} |
| **Einsteiger** | Doing or planning CCF (with possible warning if no broader ESG program) |
| **Kein ESG Setup** | No active ESG activity |

This is Planted's own framework, not mapped to an external standard.

---

## Domain: Recommendation Paths (A–G)

The engine in `scoring.ts:computeRecommendations()` follows an explicit decision tree:

- **A** — Stakeholder requirements known & **met** → CCF only
- **B** — Stakeholder requirements known & **not met** → CCF + ESG-KPIs
- **C** — SBTi signals detected (no CDP) → CCF + SBTi *(Scope 3 supply chain pressure)*
- **D** — CDP signals detected (no SBTi) → CCF + VSME + ESG-KPIs + workshop *(structured reporting pressure)*
- **E** — Both SBTi & CDP signals → CCF + VSME + SBTi + ESG-KPIs + workshop
- **F** — Finance requirements known & **met** → CCF only
- **G** — Finance requirements known & **not met** → CCF + VSME

SBTi matches imply Scope 3 supply-chain data pressure (stakeholders demand carbon target evidence). CDP matches imply structured ESG reporting pressure (stakeholders demand disclosure-quality data and a management system). This is why CDP paths include VSME + ESG-KPIs and a strategy workshop.

`transformations_workshop` is a **Planted onboarding workshop** to define sustainability strategy — recommended when CDP signals exist but the company has no strategy yet.

---

## Domain: Hours Model

- **Current hours** = `followYear` hours for topics already implemented − external consulting hours
- **Future hours** = `year1` hours for planned/uncertain topics + new recommended topics
- **Savings with Planted** = 80% of total hours *(conservative sales assumption illustrating ROI potential, not a formally validated benchmark)*
- **Net hours** = 20% remainder (effort remaining with Planted)

CSRD is the most effort-intensive topic (250–600 hrs year1). `stakeholder_questionnaires` is lightest (20–80 hrs).

---

## Domain: Risk Scoring (0–100)

| Driver | Points |
|--------|--------|
| Stakeholder requirements known but not met | +30 |
| Scope unknown in business relationships | +10 |
| Each SBTi match (cap +15) | +5 |
| Each CDP match (cap +15) | +5 |
| Finance requirements known but not met | +20 |
| CCF recommended but not yet doing | +5 |

Thresholds: <30 = Niedrig, <60 = Mittel, ≥60 = Hoch. Top 3 drivers are surfaced in the scorecard.

---

## Stakeholder Check

The fuzzy matcher in `stakeholderCheck.ts` normalises company names (strips legal forms: GmbH, AG, Ltd, etc.), then uses Levenshtein distance with a 0.75 confidence threshold. An **adapter pattern** allows swapping the data source:

- `mockDatasetAdapter` — default, ~150 mock companies (dev/demo)
- `webLookupAdapter` — placeholder for future live API
- `createCustomDatasetAdapter(sbtiList, cdpList)` — for user-uploaded CSV/JSON

---

## Testing

Run `npm test` after every change to `src/logic/`. Tests cover all scoring paths, maturity tiers, recommendation paths A–G, risk scoring, hours matrix, fuzzy matching, and validation. Do not break existing tests; add new tests for new logic.

---

## Key Conventions

- New domain types → `src/types.ts` first, then implement
- New business rules → pure function in `src/logic/scoring.ts` + test in `scoring.test.ts`
- New ESG topic → add to `TopicKey` union, `HOURS_MATRIX`, and update `computeMaturityLevel` / `computeRecommendations` logic
- Error messages stay in German
- Do not add external UI libraries without discussion
- Do not use `console.log` in production code
