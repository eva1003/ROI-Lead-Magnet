# CSV-Eingabeformat

## Übersicht

Die Input-CSV ist die einzige Datenquelle für den Report-Generator. Sie wird manuell in Excel befüllt und als CSV gespeichert. Die Datei liegt unter `Input Data/*.csv`.

## Spalten

| Spalte | Pflicht | Beschreibung |
|---|---|---|
| `orderIndex` | Ja | Laufende Nummer zur Sortierung innerhalb einer DR |
| `disclosure-requirement nr.` | Ja | DR-Kürzel (z.B. `E1-6`, `S1-1`, `BP-1`) |
| `disclosure-requirement name` | Ja | Vollständiger DR-Name (z.B. "Brutto-Treibhausgasemissionen") |
| `datapoint nr.` | Ja | Datenpunkt-Nummer (z.B. `44`, `AR 43c`) |
| `sub-number` | Ja | Sub-Nummer des Datenpunkts (z.B. `44 a`, `16c`) |
| `description` | Ja | Offizielle ESRS-Beschreibung des Datenpunkts |
| `parent description` | Nein | Beschreibung des übergeordneten DR (Kontext) |
| `datapoint title` | Ja | Kurzer Titel des Datenpunkts |
| `sub-title` | Nein | Untergeordneter Titel (wird als Fließtext ausgegeben, nie als Heading) |
| `entered data` | Ja* | Der tatsächliche Berichtswert (Text oder Zahl) |
| `unit` | Nein | Einheit bei Zahlenwerten (z.B. `t CO₂eq`, `%`, `EUR`) |
| `explanation` | Nein | Methodenerläuterung oder Begründung (wird bei leerem `entered data` als Fallback verwendet) |
| `reportability` | Ja | Ob der Datenpunkt berichtspflichtig ist (→ Details unten) |
| `obligation` | Ja | Verpflichtungsgrad (→ Details unten) |
| `dataAvailability` | Nein | Status der Datenverfügbarkeit (`NOT_SPECIFIED`, `AVAILABLE`, `NOT_AVAILABLE`) |
| `status` | Ja | Bearbeitungsstatus (`COMPLETED`, `IN_PROGRESS`, `OPEN`) |
| `reviewResult` | Nein | Ergebnis der fachlichen Prüfung (`Accepted`, `Rejected`, `Open`) |
| `explanationReview` | Nein | Kommentar des Prüfers |
| `hasDocuments` | Nein | `Yes`/`No` – ob Belege hinterlegt sind |
| `editor` | Nein | Name und E-Mail der bearbeitenden Person |
| `reviewer` | Nein | Name und E-Mail der prüfenden Person |

*`entered data` kann leer sein, wenn `explanation` als Fallback dient oder `reportability = NOT_REPORTABLE`.

## reportability-Werte

| Wert | Bedeutung | Generator-Verhalten |
|---|---|---|
| `REPORTABLE` | Datenpunkt ist berichtspflichtig und wird ausgegeben | Ausgabe wenn `entered data` oder `explanation` vorhanden |
| `NOT_REPORTABLE` | Datenpunkt ist nicht anwendbar oder nicht wesentlich | Datenpunkt wird unterdrückt (erscheint im QA-Log) |
| *(leer)* | Noch nicht eingestuft | Wie `REPORTABLE` behandelt |

## obligation-Werte

| Wert | Bedeutung |
|---|---|
| `Mandatory` | Pflichtangabe nach ESRS – muss im Bericht erscheinen |
| `Conditional` | Pflicht nur wenn bestimmte Bedingungen zutreffen (z.B. wenn Thema wesentlich) |
| `Voluntary` | Freiwillige Angabe – kann weggelassen werden |

## DR-Nummerierungskonvention

```
BP-1, BP-2           → ESRS 2: Basis-Präsentationsanforderungen
GOV-1..5             → ESRS 2: Governance
SBM-1..3             → ESRS 2: Strategie & Geschäftsmodell
IRO-1, IRO-2         → ESRS 2: Wesentlichkeit
E1-1..9              → ESRS E1: Klimawandel
E1-GOV-3             → Cross-cut: E1 referenziert GOV-3 aus ESRS 2
S1-1..17             → ESRS S1: Eigene Arbeitskräfte
AR xx                → Additional Requirements (Anhang-Anforderungen zum gleichen DR)
```

## Häufige Datenpunkt-Typen

| Typ | Erkennung | Ausgabe |
|---|---|---|
| NARRATIVE | `entered data` ist Freitext | Direkt als Absatz |
| NUMBER | `entered data` ist Zahl, `unit` befüllt | Satz mit Zahl + Einheit |
| BOOLEAN | `entered data` ist `Ja`/`Nein`/`Yes`/`No` | Aussagesatz |
| TABELLE | Mehrere Datenpunkte desselben DR mit tabellarischer Struktur | Tabelle mit Einleitung |

## Qualitätsanforderungen für die CSV-Befüllung

- `entered data` so vollständig wie möglich – Generator-Erweiterung (REVIEW-Marker) ist ein Notfall, kein Normalfall
- Zahlenwerte: europäisches Format (`1.234,56`) oder ohne Tausendertrenner (`1234.56`) – der Generator normiert beides
- Wenn ein Datenpunkt nicht relevant ist: `reportability = NOT_REPORTABLE` setzen (nicht einfach leer lassen)
- Status `COMPLETED` erst setzen, wenn `reviewResult = Accepted`
- `editor` und `reviewer` immer ausfüllen für Nachvollziehbarkeit (CSRD-Assurance-Anforderung)

## Neue Unternehmen / Neue Berichtsjahre

1. Kopiere die CSV-Vorlage (alle ESRS-Datenpunkte, `entered data` leer)
2. Befülle `entered data` mit unternehmensspezifischen Werten
3. Setze `reportability = NOT_REPORTABLE` für nicht wesentliche Datenpunkte
4. Ändere im Skript: `COMPANY`, `YEAR`, `CSV_PATH`, Farben, Schriften
5. Führe `python3 generate_report.py` aus und prüfe den QA-Log
