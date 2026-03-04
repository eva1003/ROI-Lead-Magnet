# Planted ESG Assessment Tool

Interaktive Kundenumfrage als Single Page App – bewertet ESG-Maturity, Stakeholder-Risiko, empfiehlt Planted-Features und berechnet Zeitaufwand und Zeitersparnis.

## Schnellstart

```bash
# Voraussetzung: Node.js >= 18 (via nvm: nvm use 20)
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5173
npm run build      # Produktions-Build nach dist/
npm test           # Unit Tests (Vitest, 57 Tests)
npm run test:watch # Tests im Watch-Modus
```

## Projektstruktur

```
src/
├── types.ts                         # Alle TypeScript-Typen und Konstanten
├── logic/
│   ├── scoring.ts                   # Pure functions: Maturity, Empfehlungen, Stunden, Risiko
│   ├── hoursMatrix.ts               # Stunden-Lookup (Typ × Größe × Deliverable)
│   ├── stakeholderCheck.ts          # Stakeholder-Prüfmodul, austauschbare Adapter
│   ├── validation.ts                # Formular-Validierung (pure functions)
│   └── storage.ts                   # localStorage-Persistenz
├── data/
│   └── mockDatasets.ts              # Mock-Firmenlisten SBTi & CDP
├── components/
│   ├── survey/
│   │   ├── SectionA.tsx             # Allgemeine Angaben
│   │   ├── SectionB.tsx             # ESG-Einführungen + Themen-Matrix
│   │   ├── SectionC.tsx             # Lieferant*innen-Check + Stakeholder-Check
│   │   └── SectionD.tsx             # Finance-Check
│   └── scorecard/
│       └── Scorecard.tsx            # Ergebnis-Scorecard + JSON-Export
└── tests/
    └── scoring.test.ts              # 57 Unit Tests
```

## Features

- **5-Schritte-Wizard** mit Fortschrittsanzeige und localStorage-Persistenz
- **ESG-Maturity**: Einsteiger / Mittel / Fortgeschritten (deterministisch)
- **Stakeholder-Risiko**: Score 0–100, Risikotreiber, Banding Niedrig/Mittel/Hoch
- **Feature-Empfehlungen**: Entscheidungsbaum Pfade A–G, dedupliziert, mit Begründung
- **Stundenkalkulation**: Ist, Soll, Gesamt, 80% Ersparnis mit Planted
- **Stakeholder-Check**: Levenshtein-Fuzzy-Matching, austauschbare Adapter
- **JSON-Export**: Inputs + Outputs + Timestamp

## Eigene Firmenlisten einbinden

Im Abschnitt "Lieferant*innen-Check" können Dateien hochgeladen werden:

- **CSV**: eine Firma pro Zeile
- **JSON**: `["Firma A", "Firma B"]` oder `{"companies": [...]}`

### Öffentliche Datenquellen (Nutzungsbedingungen prüfen)

| Quelle | URL |
|--------|-----|
| SBTi Target Dashboard | https://sciencebasedtargets.org/target-dashboard |
| CDP Public Responses | https://classic.cdp.net/en/responses |

> Kein Scraping aus Login-Portalen. Nur öffentliche Open-Data-Quellen. robots.txt respektieren.

## Adapter einbinden

```ts
import { createCustomDatasetAdapter, checkStakeholders } from "./logic/stakeholderCheck";
const adapter = createCustomDatasetAdapter(sbtiList, cdpList);
const results = await checkStakeholders(names, adapter);
```
