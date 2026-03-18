# ESRS-Formatierungsregeln

## Dokumentstruktur

### Heading-Hierarchie (absolut verbindlich)

```
H1  Pillar-Überschrift (4 Pillars)
  H2  Disclosure Requirement (DR)
    H3  Datenpunkt (Sub-Nummer + Titel)
```

- **Niemals H4 verwenden** – weder im Code noch im generierten Dokument
- Sub-Titel und Sub-Nummern werden als normaler Fließtext formatiert, nie als Überschrift
- H2-Text: DR-Nummer + DR-Name, z.B. `E1-6 – Brutto-Treibhausgasemissionen`
- H3-Text: Sub-Nummer + Datenpunkt-Titel, z.B. `AR 43c – Biomasse-Angaben`

### H1-Pillars (Reihenfolge fix)

1. Allgemeine Informationen (ESRS 2)
2. Umweltinformationen
3. Soziale Informationen
4. Governance-Informationen

## Datenpunkt-Ausgaberegeln nach Typ

### NARRATIVE (Freitext)

- Mindeststatus: `entered_data` nicht leer und nicht `NOT_REPORTABLE`
- `yes`/`ja` → `"{Titel} trifft zu."` – 1 Satz, **kein Review-Marker**
- `teilweise`/`partly` → `"{Titel} trifft teilweise zu."` – 1 Satz, **kein Review-Marker**
- Sonstiger kurzer Eingabewert → vollständiger Satz, kein Marker (Marker erst ab >60 Wörtern oder >2 Sätzen → `[[REVIEW: expanded-into-paragraph]]`)
- Wenn `entered_data` leer, aber `explanation` vorhanden → Explanation als Inhalt ausgeben → Marker `[[REVIEW: explanation-driven]]`
- Wenn beides leer oder `NOT_REPORTABLE` → Datenpunkt unterdrücken (nicht ausgeben)

### NUMBER (Zahlenwert)

- Wert wird immer in einen vollständigen deutschen Satz umgewandelt: `"Der berichtete Wert für {titel} beträgt 1.234,56 t CO₂eq."`
- **Kein Review-Marker** für NUMBER-Umwandlung (`expanded-from-single-value` entfernt)
- ≤5 NUMBER-Sub-Rows: gebündelte Fließtextformulierung mit Semikolon statt Tabelle
- >5 NUMBER-Sub-Rows: Tabelle mit Einleitungssatz + bündelndem Summary-Satz danach
- Europäisches Zahlenformat: `.` als Tausendertrenner, `,` als Dezimaltrennzeichen
- Einheit (unit-Spalte) immer anhängen

### Vorfalls-Datenpunkte ("Keine Vorfälle"-Regel)

Datenpunkte, die Vorfälle, Verstöße oder Bußgelder beschreiben:
- `No` oder `0` → trotzdem ausgeben als: `"Im Berichtszeitraum wurden keine [Vorfälle/Verstöße] verzeichnet."`
- Marker `[[REVIEW: keine-vorfaelle-check]]` setzen
- Nicht unterdrücken, da das Fehlen von Vorfällen berichtspflichtige Information ist

### TABELLE / IRO-2

- Jeder Tabelle muss ein einleitender Satz vorangestellt werden
- IRO-2-Tabelle (Wesentlichkeitstabelle) wird **genau einmal** im Kapitel ESRS 2 / IRO-2 ausgegeben
- Tabellenheader: Fröbel-Grün (`#1C462D`) als Hintergrund, weiße Schrift
- Zeilenalternierung: Ungerade Zeilen leicht grün (`#EBF3EE`)

## Cross-cut Disclosure Requirements

Cross-cut DRs sind Disclosure Requirements aus ESRS 2, die themenspezifisch referenziert werden (z.B. E1-GOV-3 = GOV-3 im Kontext Klimawandel).

**Regel**: Cross-cut DRs werden **immer ausgegeben**, auch wenn die CSV keine Datenpunkte dafür enthält. Das Format ist:

```
H2: E1 - GOV-3 (ESRS 2)
```

(Kein eigener Inhalt – die Überschrift signalisiert den thematischen Verweis.)

### Pflicht-Cross-cuts (immer zu emittieren)

| DR-Key | Anzeige-Text | Pillar |
|---|---|---|
| E1-GOV-3 | E1 - GOV-3 (ESRS 2) | Umwelt |
| E1-SBM-3 | E1 - SBM-3 (ESRS 2) | Umwelt |
| E1-IRO-1 | E1 - IRO-1 (ESRS 2) | Umwelt |
| S1-SBM-2 | S1 - SBM-2 (ESRS 2) | Soziales |
| S1-SBM-3 | S1 - SBM-3 (ESRS 2) | Soziales |
| G1-GOV-1 | G1 - GOV-1 (ESRS 2) | Governance |
| G1-IRO-1 | G1 - IRO-1 (ESRS 2) | Governance |
*(weitere in `generate_report.py → MANDATORY_CROSSCUTS`)*

## DR-Reihenfolge innerhalb der Pillars

Reihenfolge ist durch `DR_ORDER` im Skript festgelegt und entspricht der ESRS-Spezifikation:

```
ESRS 2:  BP-1, BP-2, GOV-1..5, SBM-1..3, IRO-1, IRO-2
E1:      E1-GOV-3, E1-SBM-3, E1-IRO-1, E1-1..9
E2:      E2-IRO-1, E2-1..6
...
S1:      S1-SBM-2, S1-SBM-3, S1-IRO-1, S1-1..17
...
G1:      G1-GOV-1, G1-GOV-3, G1-IRO-1, G1-SBM-3, G1-1..5
```

## Wesentlichkeit und Nicht-Wesentlichkeit

- **Wesentliche Themen**: Vollständiges Kapitel mit allen DRs des Themenstandards
- **Nicht wesentliche Themen**: **Kein Kapitel** im Bericht. Die Nichtwesentlichkeit muss im Rahmen der DMA dokumentiert sein, erscheint aber nicht als eigener Abschnitt im Bericht
- **ESRS 2 (Allgemein)**: Immer vollständig auszugeben, unabhängig von der DMA

## Qualitätssicherung (QA-Log)

Der QA-Log (`QA_log.md`) dokumentiert:
1. Unterdrückte Datenpunkte (leer / NOT_REPORTABLE) – müssen begründet sein
2. Datenpunkte mit Keine-Vorfälle-Ausgabe
3. `[[REVIEW: expanded-from-single-word]]` – (selten) Einzelwort zu kurzem Satz
4. `[[REVIEW: expanded-into-paragraph]]` – Minimale Eingabe zu Absatz >60 Wörter
5. `[[REVIEW: explanation-driven]]` – Erläuterungsfeld als Hauptinhalt verwendet
6. Gesamtstatistik: Zeilen gesamt, DRs ausgegeben, Datenpunkte ausgegeben

**Hinweis**: `[[REVIEW: expanded-from-single-value]]` wird nicht mehr gesetzt (seit Spec v3).

**Nach jeder Generierung**: QA-Log prüfen und `[[REVIEW:...]]`-Marker im DOCX abarbeiten, bevor der Bericht finalisiert wird.

## Sprachliche Anforderungen

- Berichtssprache: **Deutsch** (formell, sachlich)
- Unternehmensname: immer korrekt (z.B. "FRÖBEL e.V.", nicht "Fröbel")
- Keine Abkürzungen ohne vorherige Ausschreibung beim ersten Vorkommen
- THG-Emissionen: immer in Tonnen CO₂-Äquivalent (t CO₂eq)
- Scope 1/2/3 nach GHG Protocol – deutsch: "Scope 1", nicht "Bereich 1"

## Berichtsstil und Textfluss (Spec v3)

- **Kein Formularmuster**: Kein wiederholtes „Für den Berichtszeitraum wird … ausgewiesen." pro Sub-Item
- **Variierte Einleitungen**: Kennzahlen durch kurzen Orientierungssatz einleiten, dann gebündelt nennen
- **Erläuterungen integrieren**: Inhalte aus `explanation` werden als normaler Fließtextabsatz ausgegeben – nie als „Anmerkung:"-Block
- **Mehrere Zahlen**: ≤5 Werte → Satz mit Semikolon/Komma-Bündelung; >5 Werte → Tabelle + Summary-Satz
- **Kein Q&A-Format**: sub-title/sub-number nie sichtbar; keine Frage-Antwort-Blöcke

### Zwischenüberschriften (add_subheading)

- Für Datenpunkte mit langen oder heterogenen Inhalten (Faustregel: >150 Wörter oder ≥3 Teilthemen)
- Realisierung: `add_subheading(doc, "Titel")` → fetter Body-Text-Absatz (kein H4)
- Beispieltitel: „Ansatz und Richtlinien", „Maßnahmen und Umsetzung", „Kennzahlen und Ergebnisse", „Abgrenzung und Methodik"
