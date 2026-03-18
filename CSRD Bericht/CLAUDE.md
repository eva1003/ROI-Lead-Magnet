# CSRD Report Generator

## Projektziel

Automatisiertes Python-Tool zur Generierung von **ESRS-konformen CSRD-Nachhaltigkeitserklärungen** als DOCX-Dokument. Eingabe: CSV mit ausgefüllten Datenpunkten. Ausgabe: druckfertige Nachhaltigkeitserklärung + QA-Log.

Das Tool ist **mandantenübergreifend wiederverwendbar** – Branding (Farben, Schriften, Unternehmensname) ist parametrisierbar. Der aktuelle Referenzmandant ist **FRÖBEL e.V.** (Berichtsjahr 2024), der freiwillig nach ESRS berichtet.

## Projektstruktur

```
CSRD Bericht/
├── generate_report.py        # Hauptskript – CSV → DOCX
├── CSRD_Report.docx          # Ausgabe (generiert)
├── QA_log.md                 # Qualitätsprüfungslog (generiert)
├── Input Data/
│   └── *.csv                 # Datenpunkte (manuell befüllt)
├── Beispiele/                # Referenzberichte (Maersk, Ørsted, Novo Nordisk)
├── Gliederung/               # Beispiel-Templates und Vorgaben
├── Design/                   # Corporate-Design-Dokumente
├── Fröbel 2024/              # Fröbel-spezifische Dokumente
│   └── *.docx / *.pdf        # Vorberichte, Corporate Wording
└── .claude/rules/            # Detaillierte Arbeitsregeln für dieses Repo
```

## Skript ausführen

```bash
python3 generate_report.py
```

Gibt `CSRD_Report.docx` und `QA_log.md` aus. Keine Argumente nötig; Pfade sind im Skript als Konstanten definiert (`CSV_PATH`, `OUT_DOCX`, `OUT_QA`).

## Regulatorischer Rahmen (CSRD / ESRS)

Die EU-Richtlinie **CSRD** (Corporate Sustainability Reporting Directive, 2022/2464) verpflichtet berichtspflichtige Unternehmen, eine **Nachhaltigkeitserklärung** nach den **ESRS** (European Sustainability Reporting Standards) zu erstellen.

### ESRS-Struktur

| Ebene | Kürzel | Inhalt |
|---|---|---|
| Übergreifend | ESRS 2 | Allgemeine Angaben (immer verpflichtend) |
| Umwelt | E1–E5 | Klimawandel, Umweltverschmutzung, Wasser, Biodiversität, Ressourcen |
| Soziales | S1–S4 | Eigene Arbeitskräfte, Lieferkette, Gemeinschaften, Verbraucher |
| Governance | G1 | Unternehmensführung und Geschäftsethik |

### Wesentlichkeit (DMA – Doppelte Wesentlichkeitsanalyse)

Die DMA bestimmt, welche **Themenstandards** (E1–E5, S1–S4, G1) im Bericht erscheinen. ESRS 2 ist immer verpflichtend. Nur wesentliche Themen erhalten eigene Kapitel – **nicht wesentliche Themen werden begründet ausgelassen**, aber nicht verschwiegen.

### Disclosure Requirements (DRs) und Datenpunkte

- Jeder Themenstandard enthält mehrere **Disclosure Requirements (DRs)** (z.B. E1-6: THG-Emissionen)
- Jedes DR enthält mehrere **Datenpunkte** mit eigener Sub-Nummer (z.B. E1-6 / AR 43c)
- **Cross-cut DRs**: Einige DRs aus ESRS 2 werden themenspezifisch referenziert (z.B. E1-GOV-3). Diese sind **immer auszugeben**, auch wenn keine Daten vorliegen

## Dokument-Hierarchie (ESRS-Spec)

```
H1  →  Pillar (Allgemeine Informationen, Umwelt, Soziales, Governance)
H2  →  Disclosure Requirement (DR)
H3  →  Datenpunkt (Sub-Nummer)
```

**KRITISCH: Niemals Heading 4 verwenden.** Sub-Titel und Sub-Nummern erscheinen als Fließtext, nicht als Überschrift.

## Review-Marker

Der Generator setzt folgende Marker für manuelle Nachkontrolle:

| Marker | Bedeutung |
|---|---|
| `[[REVIEW: expanded-from-single-word]]` | Einzelwort-Eingabe zu kurzem Satz (selten) |
| `[[REVIEW: expanded-into-paragraph]]` | Minimale Eingabe zu Absatz >60 Wörter ausgebaut |
| `[[REVIEW: explanation-driven]]` | Erläuterungsfeld wurde als Hauptinhalt verwendet |
| `[[REVIEW: keine-vorfaelle-check]]` | Vorfallsfelder mit No/0 ausgegeben – bitte prüfen |

**Nicht mehr verwendet**: `[[REVIEW: expanded-from-single-value]]` – NUMBER-Sätze erhalten seit Spec v3 keinen Marker mehr.

## Zahlendarstellung

Europäisches Format: Punkt als Tausender-Trennzeichen, Komma als Dezimalzeichen.
Beispiel: `1.234.567,89` – **nie** amerikanisches Format `1,234,567.89`.

## Mehrere Mandanten / Unternehmen

Beim Anpassen für ein neues Unternehmen sind folgende Konstanten im Skript zu ändern:
- `COMPANY` – Unternehmensname
- `YEAR` – Berichtsjahr
- `C_H1`, `C_H2`, `C_H3` – Farben im Corporate Design
- `FONT_HEAD`, `FONT` – Schriftarten
- `CSV_PATH` – Pfad zur Input-CSV

Die ESRS-Logik (DR-Reihenfolge, Cross-cut-Regeln, Review-Marker) bleibt mandantenübergreifend konstant.

## Weitere Arbeitsregeln

- [ESRS-Formatierungsregeln](.claude/rules/esrs-rules.md) – detaillierte Ausgaberegeln je Datenpunkt-Typ
- [CSV-Spaltenformat](.claude/rules/csv-format.md) – Bedeutung aller CSV-Spalten
