"""
extract_missing_pcc.py
======================
Konsolidiert mehrere Excel-Dateien und extrahiert alle Produkte,
bei denen der PCC-Wert fehlt, negativ oder ungültig ist.

Verwendung:
    python extract_missing_pcc.py file1.xlsx file2.xlsx -o pcc_review_output.xlsx

Heuristik zur Tabellenerkennung: Siehe Abschnitt "find_product_table()" unten.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Optional

import pandas as pd
import openpyxl

# ---------------------------------------------------------------------------
# Konfiguration: Alias-Listen für Spaltennamen
# Erweiterbar: einfach neue Begriffe zur jeweiligen Liste hinzufügen.
# Groß-/Kleinschreibung wird beim Matching ignoriert.
# ---------------------------------------------------------------------------

SUPPLIER_ALIASES = [
    "supplier", "lieferant", "vendor", "hersteller", "brand", "marke",
    "lieferanten", "vendors", "suppliers",
]

PRODUCT_ALIASES = [
    "product", "produkt", "item", "artikel", "description", "bezeichnung",
    "produktname", "product name", "article", "product description",
    "item description", "item being procured",
    "produktbezeichnung", "sku", "model", "modell",
]

QUANTITY_ALIASES = [
    "quantity", "qty", "menge", "anzahl", "amount", "units", "stück",
    "quantity ordered", "order quantity", "bestellmenge",
]

PCC_ALIASES = [
    "pcc",
    # Wichtig: "pc-cc" oder "pccc" sollen NICHT matchen.
    # Das Matching prüft auf exaktes Wort "pcc" (Whitespace-bereinigt, lowercase).
]

# Textwerte, die als "ungültig / kein sinnvoller Wert" gelten
INVALID_TEXT_PATTERNS = [
    r"^\s*$",           # leer oder nur Whitespace
    r"^n/?a$",          # n/a, na
    r"^-+$",            # - oder --
    r"^tbd$",           # tbd
    r"^tbf$",           # tbf
    r"^\?+$",           # ? oder ???
    r"^none$",          # none
    r"^null$",          # null
    r"^unknown$",       # unknown
    r"^unbekannt$",     # unbekannt
    r"^pending$",       # pending
    r"^offen$",         # offen
]

# ---------------------------------------------------------------------------
# Verpackungsgewichte (Gramm pro Einheit) – basierend auf Internetrecherche
# Quellen: Adapa PaperFlow, Fashion for Good, IMH/PlusPrinters Packaging Guides,
#          EcoEnclose GSM Guide, PackagingMania, first-principles calculations.
# Erweiterbar: neue Einträge einfach hinzufügen. Key = lowercase, stripped.
# Wichtig: Das Gewicht gibt das Gewicht der VERPACKUNG pro Produkteinheit an,
# nicht das Produktgewicht selbst. Alle Werte sind Schätzungen auf Basis von
# Branchendurchschnittswerten für typische mittelgroße Konsumgüter.
# ---------------------------------------------------------------------------
PACKAGING_WEIGHT_G: dict = {
    # Schlüssel: lowercase, stripped                 # Gewicht  Quelle / Basis
    "no packaging":                              0,   # 0 g      kein Material
    "polybag":                                   8,   # 8 g      LDPE 50 µm, 25×35 cm; Fashion for Good WP
    "polybag for outercarton":                  40,   # 40 g     größere LDPE-Folie ca. 60×80 cm
    "paper flowpack":                            5,   # 5 g      Adapa PaperFlow 80 gsm + BOPP-Schicht
    "cardboard giftbox":                       120,   # 120 g    FBB/SBS ~400 gsm, Faltschachtel
    "cardboard sleeve":                         30,   # 30 g     SBS ~380 gsm, 4 Seiten ~0,07 m²
    "thick paper sleeve":                       15,   # 15 g     Kraft 300 gsm, ~0,05 m²
    "thick paper sleeve and polybag":           23,   # 23 g     = thick paper sleeve (15) + polybag (8)
    "hangtag":                                   2,   # 2 g      Karton-Etikett ca. 10×7 cm, 350 gsm
    "paper hangtag with plastic connector":      3,   # 3 g      Hangtag (2 g) + Kunststoff-Clip (1 g)
}

# ---------------------------------------------------------------------------
# CO2-Emissionsfaktoren (kg CO2-Äq. pro kg Verpackungsmaterial)
# Quelle: Sheet "Verpackung pro kg" aus pcc_review_output.xlsx,
#         basierend auf ecoinvent-Datenbankeinträgen (LCA-Faktoren).
# Erweiterbar: neue Einträge einfach hinzufügen. Key = lowercase, stripped.
# ---------------------------------------------------------------------------
PACKAGING_CO2_PER_KG: dict = {
    # Schlüssel: lowercase, stripped       # CO2-Faktor   Prozess / Quelle
    "no packaging":                  0.0,  # 0.000000     kein Material
    "polybag":                  3.524014,  # 3.524014     packaging film, LDPE (ecoinvent RoW)
    "polybag for outercarton":  3.524014,  # 3.524014     packaging film, LDPE (ecoinvent RoW)
    "paper flowpack":           1.986548,  # 1.986548     single use paper wrap, virgin fibre (ecoinvent RER)
    "cardboard giftbox":        1.564887,  # 1.564887     white lined chipboard carton (ecoinvent RoW)
    "cardboard sleeve":         1.372218,  # 1.372218     solid bleached/unbleached board carton (ecoinvent RoW)
    "thick paper sleeve":       1.372218,  # 1.372218     solid bleached/unbleached board carton (ecoinvent RoW)
    "thick paper sleeve and polybag": 1.694987,  # 1.694987  gemischt: SBB carton + LDPE film (ecoinvent RoW)
    "hangtag":                  1.372218,  # 1.372218     solid bleached/unbleached board carton (ecoinvent RoW)
    "paper hangtag with plastic connector": 1.387370,  # 1.387370  SBB carton + PP granulate (ecoinvent RoW)
}

# Fallback-Gewicht / CO2-Faktor für unbekannte Verpackungstypen (None = kein Eintrag)
PACKAGING_WEIGHT_UNKNOWN: Optional[float] = None
PACKAGING_CO2_UNKNOWN: Optional[float] = None

# Mindestanzahl Zeilen, damit ein Block als "Produkttabelle" gilt
MIN_TABLE_ROWS = 1

# Wie viele der letzten Zeilen eines Sheets auf Tabellenanker untersucht werden
SCAN_TAIL_ROWS = 200

# ---------------------------------------------------------------------------
# Hilfsfunktionen: Spaltenerkennung
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    """Bereinigt einen Spaltennamen für robustes Matching."""
    return str(text).strip().lower()


def _lookup_from_dict(packaging_val: str, lookup: dict, unknown_fallback: Optional[float]) -> Optional[float]:
    """Generischer Lookup mit exaktem Match und Teilstring-Fallback."""
    key = packaging_val.strip().lower()
    if key in lookup:
        return float(lookup[key])
    best_key = None
    for k in lookup:
        if k and k in key:
            if best_key is None or len(k) > len(best_key):
                best_key = k
    if best_key is not None:
        return float(lookup[best_key])
    return unknown_fallback


def _lookup_packaging_weight(packaging_val: str) -> Optional[float]:
    """Gibt das geschätzte Verpackungsgewicht in Gramm pro Einheit zurück."""
    return _lookup_from_dict(packaging_val, PACKAGING_WEIGHT_G, PACKAGING_WEIGHT_UNKNOWN)


def _lookup_packaging_co2(packaging_val: str) -> Optional[float]:
    """Gibt den CO2-Emissionsfaktor in kg CO2-Äq. pro kg Verpackungsmaterial zurück."""
    return _lookup_from_dict(packaging_val, PACKAGING_CO2_PER_KG, PACKAGING_CO2_UNKNOWN)


def _find_column(columns: list, aliases: list) -> Optional[str]:
    """
    Sucht in der Spaltenliste nach einem Alias-Match.
    Gibt den originalen Spaltennamen zurück oder None.

    Matching-Strategie (absteigend nach Präzision):
    1. Exakter Match nach Entfernung von Whitespace/Bindestrichen
    2. Alias ist Teilstring des Spaltennamens (z.B. "description" in "Item Description")

    Für PCC: Sonderbehandlung über _find_pcc_column(), nicht über diese Funktion.
    """
    best_match = None
    for col in columns:
        normalized = _normalize(col)
        compact = re.sub(r"[\s\-_]+", "", normalized)
        for alias in aliases:
            alias_compact = re.sub(r"[\s\-_]+", "", alias.lower())
            # 1. Exakter Match → sofort zurückgeben (höchste Priorität)
            if compact == alias_compact:
                return col
            # 2. Alias ist Teilstring des Spaltennamens
            if best_match is None and alias_compact in compact:
                best_match = col
    return best_match


def _find_packaging_column(columns: list, table: pd.DataFrame) -> Optional[str]:
    """
    Findet die Verpackungsspalte – typischerweise eine unbenannte Spalte (_col_X)
    direkt vor den benannten Produktspalten, die z.B. "Polybag" oder
    "Cardboard giftbox" enthält.

    Strategie: Unter allen _col_X-Spalten wird diejenige mit den meisten
    nicht-leeren Werten gewählt (= wahrscheinlichste Verpackungsspalte).
    """
    unnamed_cols = [c for c in columns if re.match(r"_col_\d+$", str(c))]
    if not unnamed_cols:
        return None
    best_col = None
    best_count = 0
    for col in unnamed_cols:
        count = int(
            table[col]
            .dropna()
            .apply(lambda x: str(x).strip())
            .ne("")
            .sum()
        )
        if count > best_count:
            best_count = count
            best_col = col
    return best_col if best_count > 0 else None


def _find_pcc_column(columns: list) -> Optional[str]:
    """
    Spezialisierte PCC-Suche: Matched NUR auf exakt "pcc" (nach Bereinigung),
    nicht auf "pc-cc", "pccc", "pcc_value" etc.
    """
    for col in columns:
        normalized = _normalize(col)
        # Exaktes Match nach Entfernung von umgebenden Leerzeichen
        if normalized == "pcc":
            return col
        # Erlaubt auch "PCC" in Klammern oder mit Einheitenangabe wie "PCC (%)"
        # Aber niemals "PC-CC"
        match = re.fullmatch(r"pcc[\s(%].*", normalized)
        if match:
            return col
    return None

# ---------------------------------------------------------------------------
# PCC-Validierung
# ---------------------------------------------------------------------------

def _is_invalid_text(value: str) -> bool:
    """Prüft, ob ein Textwert als ungültig gilt."""
    v = str(value).strip().lower()
    for pattern in INVALID_TEXT_PATTERNS:
        if re.fullmatch(pattern, v, re.IGNORECASE):
            return True
    return False


def _parse_numeric(value) -> Optional[float]:
    """
    Versucht, einen Wert als Zahl zu interpretieren.
    Behandelt Komma als Dezimaltrennzeichen (DE-Format).
    Gibt None zurück, wenn keine Zahl erkennbar ist.
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        import math
        if math.isnan(value):
            return None
        return float(value)
    # String-Behandlung
    text = str(value).strip()
    # Entferne Währungssymbole und Prozentzeichen für die Erkennung
    text_clean = re.sub(r"[€$%°]", "", text).strip()
    # Komma als Dezimaltrennzeichen (1.234,56 → 1234.56)
    if re.search(r"\d\.\d{3},\d", text_clean):
        text_clean = text_clean.replace(".", "").replace(",", ".")
    elif "," in text_clean and "." not in text_clean:
        text_clean = text_clean.replace(",", ".")
    try:
        return float(text_clean)
    except ValueError:
        return None


def classify_pcc(raw_value) -> tuple:
    """
    Klassifiziert einen PCC-Rohwert.

    Returns:
        (pcc_numeric, review_reason)
        review_reason ist "" wenn der Wert OK ist,
        sonst "missing", "negative" oder "invalid".
    """
    import math

    # Pandas-NaN / Python None / leere Zelle
    if raw_value is None or (isinstance(raw_value, float) and math.isnan(raw_value)):
        return None, "missing"

    # Versuche numerische Interpretation
    numeric = _parse_numeric(raw_value)

    if numeric is not None:
        if numeric < 0:
            return numeric, "negative"
        return numeric, ""  # gültiger Wert

    # Textwert
    text = str(raw_value).strip()
    if not text or _is_invalid_text(text):
        return None, "invalid"

    # Text, der sich nicht als Zahl parsen ließ und nicht als ungültig gilt
    return None, "invalid"

# ---------------------------------------------------------------------------
# Tabellenerkennung (Heuristik)
# ---------------------------------------------------------------------------

def find_product_table(df_raw: pd.DataFrame) -> Optional[pd.DataFrame]:
    """
    Heuristik zur Erkennung der Produkttabelle am Ende eines Sheets.

    Strategie:
    1. Durchsuche die letzten SCAN_TAIL_ROWS Zeilen nach einer Zeile,
       die mindestens eine PCC-Spalte und eine Produkt- oder Lieferant-Spalte
       als Header enthält (Header-Scan).
    2. Wenn ein solcher Header gefunden wird, wird alles ab dieser Zeile
       als Tabelle interpretiert.
    3. Vollständig leere Zeilen werden ignoriert.

    Annahmen & Schwachstellen:
    - Die Tabelle muss einen erkennbaren Header haben (Spaltennamen als Text).
    - Wenn mehrere mögliche Header existieren, wird der letzte gefunden.
    - Merged Cells können die Erkennung stören (openpyxl merged cells werden
      von pandas beim Einlesen oft als NaN dargestellt).
    - Wenn der PCC-Header z.B. in einer zusammengeführten Zelle steht,
      wird die Tabelle möglicherweise nicht erkannt.
    """
    if df_raw.empty:
        return None

    nrows = len(df_raw)
    scan_start = max(0, nrows - SCAN_TAIL_ROWS)
    tail = df_raw.iloc[scan_start:]

    best_header_idx = None

    for idx, row in tail.iterrows():
        # Konvertiere alle Zellwerte der Zeile in bereinigte Strings
        row_values = [_normalize(str(v)) for v in row.values if pd.notna(v) and str(v).strip()]

        has_pcc = any(re.fullmatch(r"pcc[\s(%]?.*", v) and not re.search(r"pc[-_\s]cc", v)
                      for v in row_values)
        has_product = any(
            any(alias in v for alias in [_normalize(a) for a in PRODUCT_ALIASES])
            for v in row_values
        )
        has_supplier = any(
            any(alias in v for alias in [_normalize(a) for a in SUPPLIER_ALIASES])
            for v in row_values
        )

        if has_pcc and (has_product or has_supplier):
            best_header_idx = idx

    if best_header_idx is None:
        return None

    # Schneide den DataFrame ab diesem Header-Index auf
    sub = df_raw.loc[best_header_idx:].copy()

    # Setze die erste Zeile als Header
    new_header = sub.iloc[0].tolist()
    sub = sub.iloc[1:].copy()
    sub.columns = [str(h).strip() if pd.notna(h) else f"_col_{i}"
                   for i, h in enumerate(new_header)]

    # Entferne vollständig leere Zeilen
    sub = sub.dropna(how="all")
    sub = sub[sub.apply(lambda r: r.astype(str).str.strip().ne("").any(), axis=1)]

    if len(sub) < MIN_TABLE_ROWS:
        return None

    return sub

# ---------------------------------------------------------------------------
# Sheet-Verarbeitung
# ---------------------------------------------------------------------------

def process_sheet(
    df_raw: pd.DataFrame,
    source_file: str,
    source_sheet: str,
) -> tuple:
    """
    Verarbeitet ein einzelnes Sheet.

    Returns:
        (review_rows, valid_rows, status, reason)
        review_rows: Produkte mit fehlendem / negativem / ungültigem PCC
        valid_rows:  Produkte mit gültigem positivem PCC
        status: "ok", "no_table", "no_pcc_column", "error"
        reason: Erklärungstext für das processing_log
    """
    try:
        table = find_product_table(df_raw)
    except Exception as e:
        return [], [], "error", f"Fehler bei Tabellenerkennung: {e}"

    if table is None:
        return [], [], "no_table", "Keine Produkttabelle mit PCC-Spalte erkannt"

    cols = table.columns.tolist()

    pcc_col = _find_pcc_column(cols)
    if pcc_col is None:
        return [], [], "no_pcc_column", "PCC-Spalte nicht gefunden"

    supplier_col = _find_column(cols, SUPPLIER_ALIASES)
    product_col = _find_column(cols, PRODUCT_ALIASES)
    packaging_col = _find_packaging_column(cols, table)
    quantity_col = _find_column(cols, QUANTITY_ALIASES)

    review_rows = []
    valid_rows = []

    for _, row in table.iterrows():
        raw_pcc = row.get(pcc_col)
        supplier_val = str(row[supplier_col]).strip() if supplier_col and pd.notna(row.get(supplier_col)) else ""
        product_val = str(row[product_col]).strip() if product_col and pd.notna(row.get(product_col)) else ""
        packaging_val = str(row[packaging_col]).strip() if packaging_col and pd.notna(row.get(packaging_col)) else ""
        quantity_val = str(row[quantity_col]).strip() if quantity_col and pd.notna(row.get(quantity_col)) else ""

        # Zeile ignorieren, wenn weder Supplier noch Produkt vorhanden
        if not supplier_val and not product_val:
            continue

        pcc_numeric, review_reason = classify_pcc(raw_pcc)
        pcc_raw_str = "" if raw_pcc is None or (isinstance(raw_pcc, float) and pd.isna(raw_pcc)) else str(raw_pcc).strip()

        # Verpackungsgewicht und CO2 berechnen
        pkg_weight_g  = _lookup_packaging_weight(packaging_val) if packaging_val else None
        pkg_co2_per_kg = _lookup_packaging_co2(packaging_val)   if packaging_val else None
        qty_numeric   = _parse_numeric(quantity_val)             if quantity_val  else None

        if pkg_weight_g is not None and qty_numeric is not None:
            pkg_total_kg = round(pkg_weight_g * qty_numeric / 1000, 6)
        else:
            pkg_total_kg = None

        if pkg_total_kg is not None and pkg_co2_per_kg is not None:
            pkg_co2_total = round(pkg_total_kg * pkg_co2_per_kg, 6)
        else:
            pkg_co2_total = None

        base = {
            "source_file": source_file,
            "source_sheet": source_sheet,
            "packaging": packaging_val,
            "packaging_weight_per_unit_g": pkg_weight_g,
            "supplier": supplier_val,
            "product": product_val,
            "quantity": quantity_val,
            "packaging_material_total_kg": pkg_total_kg,
            "co2_per_kg_packaging": pkg_co2_per_kg,
            "packaging_co2_total_kg_co2eq": pkg_co2_total,
            "pcc_raw": pcc_raw_str,
            "pcc_numeric": pcc_numeric,
        }

        if review_reason:  # nicht leer → problematisch
            review_rows.append({**base, "review_reason": review_reason})
        else:
            # Gültiger positiver PCC-Wert
            valid_rows.append(base)

    reason = (
        f"Tabelle erkannt, {len(table)} Zeilen, "
        f"{len(review_rows)} Review / {len(valid_rows)} OK"
    )
    return review_rows, valid_rows, "ok", reason

# ---------------------------------------------------------------------------
# Hauptfunktion
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Extrahiert Produkte mit fehlendem, negativem oder ungültigem PCC "
            "aus mehreren Excel-Dateien."
        )
    )
    parser.add_argument(
        "input_files",
        nargs="+",
        metavar="FILE",
        help="Mindestens zwei Excel-Eingabedateien (.xlsx)",
    )
    parser.add_argument(
        "-o", "--output",
        default="pcc_review_output.xlsx",
        metavar="OUTPUT",
        help="Pfad zur Ausgabedatei (Standard: pcc_review_output.xlsx)",
    )
    args = parser.parse_args()

    input_paths = [Path(f) for f in args.input_files]

    # Validierung der Eingabedateien
    for p in input_paths:
        if not p.exists():
            print(f"[FEHLER] Datei nicht gefunden: {p}", file=sys.stderr)
            sys.exit(1)
        if p.suffix.lower() not in (".xlsx", ".xls", ".xlsm"):
            print(f"[WARNUNG] Unbekannte Dateiendung: {p} – wird trotzdem versucht.")

    all_review_rows: list = []
    all_valid_rows: list = []
    processing_log: list = []

    for input_path in input_paths:
        file_label = input_path.name
        print(f"\n[INFO] Verarbeite Datei: {file_label}")

        try:
            xl = pd.ExcelFile(input_path, engine="openpyxl")
        except Exception as e:
            processing_log.append({
                "file": file_label,
                "sheet": "—",
                "status": "error",
                "reason": f"Datei konnte nicht geöffnet werden: {e}",
            })
            print(f"  [FEHLER] Datei konnte nicht geöffnet werden: {e}")
            continue

        for sheet_name in xl.sheet_names:
            print(f"  [INFO] Sheet: {sheet_name}")
            try:
                df_raw = xl.parse(
                    sheet_name,
                    header=None,          # kein automatischer Header
                    dtype=str,            # alles als String einlesen → robuster
                    na_values=[],         # NaN nicht automatisch ersetzen
                    keep_default_na=False,
                )
                # Dennoch echte NaN für leere Zellen erzeugen
                df_raw = df_raw.replace({"": None, "nan": None, "NaN": None})

            except Exception as e:
                processing_log.append({
                    "file": file_label,
                    "sheet": sheet_name,
                    "status": "error",
                    "reason": f"Sheet konnte nicht gelesen werden: {e}",
                })
                print(f"    [FEHLER] {e}")
                continue

            review_rows, valid_rows, status, reason = process_sheet(df_raw, file_label, sheet_name)
            all_review_rows.extend(review_rows)
            all_valid_rows.extend(valid_rows)

            processing_log.append({
                "file": file_label,
                "sheet": sheet_name,
                "status": status,
                "reason": reason,
            })
            print(f"    [{status.upper()}] {reason}")

    # -----------------------------------------------------------------------
    # Ergebnisse aufbereiten
    # -----------------------------------------------------------------------

    _SORT_COLS = ["source_file", "source_sheet", "packaging", "supplier", "product"]

    if all_review_rows:
        df_review = pd.DataFrame(all_review_rows)
        df_review = df_review.drop_duplicates()
        df_review = df_review.sort_values(by=_SORT_COLS, ignore_index=True)
    else:
        df_review = pd.DataFrame(columns=[
            "source_file", "source_sheet", "packaging", "packaging_weight_per_unit_g",
            "supplier", "product", "quantity", "packaging_material_total_kg",
            "co2_per_kg_packaging", "packaging_co2_total_kg_co2eq",
            "pcc_raw", "pcc_numeric", "review_reason",
        ])

    if all_valid_rows:
        df_valid = pd.DataFrame(all_valid_rows)
        df_valid = df_valid.drop_duplicates()
        df_valid = df_valid.sort_values(by=_SORT_COLS, ignore_index=True)
    else:
        df_valid = pd.DataFrame(columns=[
            "source_file", "source_sheet", "packaging", "packaging_weight_per_unit_g",
            "supplier", "product", "quantity", "packaging_material_total_kg",
            "co2_per_kg_packaging", "packaging_co2_total_kg_co2eq",
            "pcc_raw", "pcc_numeric",
        ])

    # Summary berechnen
    n_missing = int((df_review["review_reason"] == "missing").sum())
    n_negative = int((df_review["review_reason"] == "negative").sum())
    n_invalid = int((df_review["review_reason"] == "invalid").sum())
    n_total = len(df_review)
    n_valid = len(df_valid)

    # Verpackungsmaterial und CO2 gesamt (beide Sheets zusammen)
    df_all = pd.concat([df_review, df_valid], ignore_index=True)
    pkg_total_all   = df_all["packaging_material_total_kg"].sum()       if "packaging_material_total_kg"       in df_all.columns else 0
    pkg_co2_total   = df_all["packaging_co2_total_kg_co2eq"].sum()      if "packaging_co2_total_kg_co2eq"      in df_all.columns else 0
    pkg_unknown_wt  = int(df_all["packaging_weight_per_unit_g"].isna().sum())
    pkg_unknown_co2 = int(df_all["co2_per_kg_packaging"].isna().sum())

    df_summary = pd.DataFrame([
        {"Kennzahl": "Anzahl Input-Dateien",                                     "Wert": len(input_paths)},
        {"Kennzahl": "Produkte mit gültigem PCC (OK)",                           "Wert": n_valid},
        {"Kennzahl": "Produkte mit PCC-Review-Bedarf",                           "Wert": n_total},
        {"Kennzahl": "  davon: missing (kein Wert)",                             "Wert": n_missing},
        {"Kennzahl": "  davon: negative (< 0)",                                  "Wert": n_negative},
        {"Kennzahl": "  davon: invalid (ungültiger Text)",                        "Wert": n_invalid},
        {"Kennzahl": "Verpackungsmaterial gesamt (kg, geschätzt)",               "Wert": round(pkg_total_all, 2)},
        {"Kennzahl": "Verpackungs-CO2 gesamt (kg CO2-Äq., geschätzt)",          "Wert": round(pkg_co2_total, 2)},
        {"Kennzahl": "  CO2-Quelle: ecoinvent-Faktoren (LCA)",                   "Wert": "Branchendurchschnitte RoW/RER"},
        {"Kennzahl": "  Gewichts-Quelle: Internetrecherche",                     "Wert": "Branchendurchschnitte, ±50%"},
        {"Kennzahl": "Zeilen ohne Gewichtsschätzung (unbekannt)",                "Wert": pkg_unknown_wt},
        {"Kennzahl": "Zeilen ohne CO2-Faktor (unbekannt)",                       "Wert": pkg_unknown_co2},
    ])

    # Referenztabelle: Verpackungstypen mit Gewichts- und CO2-Annahmen
    ref_rows = []
    all_types = sorted(set(list(PACKAGING_WEIGHT_G.keys()) + list(PACKAGING_CO2_PER_KG.keys())))
    for pkg_type in all_types:
        ref_rows.append({
            "Verpackungsmaterial":              pkg_type.title(),
            "Gewicht pro Einheit (g)":          PACKAGING_WEIGHT_G.get(pkg_type),
            "Gewicht-Quelle":                   "Internetrecherche / Branchendurchschnitt",
            "CO2-Faktor (kg CO2-Äq./kg Mat.)":  PACKAGING_CO2_PER_KG.get(pkg_type),
            "CO2-Quelle":                       "ecoinvent LCA-Datenbank (RoW/RER)" if PACKAGING_CO2_PER_KG.get(pkg_type) else "",
        })
    df_ref = pd.DataFrame(ref_rows)

    df_log = pd.DataFrame(processing_log)

    # -----------------------------------------------------------------------
    # Excel-Ausgabe
    # -----------------------------------------------------------------------

    output_path = Path(args.output)
    print(f"\n[INFO] Schreibe Ausgabe: {output_path}")

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        df_review.to_excel(writer, sheet_name="pcc_review_required", index=False)
        df_valid.to_excel(writer, sheet_name="pcc_complete", index=False)
        df_summary.to_excel(writer, sheet_name="summary", index=False)
        df_ref.to_excel(writer, sheet_name="packaging_assumptions", index=False)
        df_log.to_excel(writer, sheet_name="processing_log", index=False)

        # Spaltenbreiten automatisch anpassen
        for sheet_name, df in [
            ("pcc_review_required", df_review),
            ("pcc_complete", df_valid),
            ("summary", df_summary),
            ("packaging_assumptions", df_ref),
            ("processing_log", df_log),
        ]:
            ws = writer.sheets[sheet_name]
            for col_cells in ws.columns:
                max_len = max(
                    (len(str(cell.value)) for cell in col_cells if cell.value is not None),
                    default=10,
                )
                ws.column_dimensions[col_cells[0].column_letter].width = min(max_len + 4, 60)

    # -----------------------------------------------------------------------
    # Konsolenzusammenfassung
    # -----------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("ERGEBNIS")
    print("=" * 60)
    print(f"  Produkte mit gültigem PCC:      {n_valid}")
    print(f"  Produkte mit PCC-Review-Bedarf: {n_total}")
    print(f"    - Fehlend (missing):  {n_missing}")
    print(f"    - Negativ (negative): {n_negative}")
    print(f"    - Ungültig (invalid): {n_invalid}")
    print(f"  Ausgabedatei: {output_path.resolve()}")
    print("=" * 60)

    if n_total == 0:
        print("\n[HINWEIS] Keine Review-Zeilen gefunden.")
        print("  Mögliche Ursachen:")
        print("  - Alle PCC-Werte sind gültig (kein Handlungsbedarf).")
        print("  - Die Heuristik hat die Produkttabelle nicht erkannt.")
        print("    → Prüfe 'processing_log' in der Ausgabedatei für Details.")


if __name__ == "__main__":
    main()
