#!/usr/bin/env python3
"""
fix_social_v73.py
Copies CSRD_Report_v7.2.docx → CSRD_Report_v7.3.docx
and applies targeted fixes to the "Soziale Informationen" section.

Fixes applied:
  1. S1-1 / Datenpunkt 24: Remove duplicate "trifft zu" sentence
  2. S1-6 / Datenpunkt 50: Replace 6 repeated lowercase intro sentences with one
     proper intro; remove raw-value standalone paragraphs; note about zero tables
  3. S1-9 / Datenpunkt 66: Replace repeated intro sentences with one proper intro
  4. S1-16 / Datenpunkt 97: Remove raw CSV annotation text; replace with clean prose
  5. S4-3 / Datenpunkt 26: Remove the second (duplicate) Vergeltungsmaßnahmen block
  6. General: expand bare "trifft zu/nicht zu" / "Ja" / "Nein" to proper sentences;
     remove bullet-list Spiegelstrich paragraphs (convert to prose where needed)
"""

import shutil
import re
from lxml import etree
from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table

SRC  = "Fröbel 2024/CSRD_Report_v7.2.docx"
DEST = "Fröbel 2024/CSRD_Report_v7.3.docx"

WNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


# ── helpers ────────────────────────────────────────────────────────────────────

def w(tag):
    return f"{{{WNS}}}{tag}"


def para_text(elem) -> str:
    return "".join(
        r.text or ""
        for r in elem.iter(w("t"))
    )


def para_style(elem, doc) -> str:
    p = Paragraph(elem, doc)
    return p.style.name if p.style else ""


def heading_level(elem, doc):
    s = para_style(elem, doc)
    if s in ("Heading 1",):
        return 1
    if s in ("Heading 2",):
        return 2
    if s in ("Heading 3",):
        return 3
    pPr = elem.find(w("pPr"))
    if pPr is not None:
        ol = pPr.find(w("outlineLvl"))
        if ol is not None:
            val = ol.get(w("val"))
            if val is not None:
                lv = int(val)
                if lv == 0: return 1
                if lv == 1: return 2
                if lv == 2: return 3
    return None


def clear_runs_set_text(elem, new_text: str):
    """
    Replace all text in a paragraph element's runs with new_text,
    preserving the first run's rPr (character formatting) and deleting
    extra runs AND any <w:br> elements inside the kept run.
    """
    runs = elem.findall(w("r"))
    if not runs:
        # build a fresh run
        r_new = etree.SubElement(elem, w("r"))
        t = etree.SubElement(r_new, w("t"))
        t.text = new_text
        if new_text.startswith(" ") or new_text.endswith(" "):
            t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        return

    # keep first run, clear everything inside it except rPr, then set new text
    first = runs[0]
    # Remove all children except rPr
    rPr = first.find(w("rPr"))
    for child in list(first):
        first.remove(child)
    if rPr is not None:
        first.append(rPr)

    t_new = etree.SubElement(first, w("t"))
    t_new.text = new_text
    if new_text.startswith(" ") or new_text.endswith(" "):
        t_new.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")

    # remove all other runs from paragraph
    for r in runs[1:]:
        elem.remove(r)

    # also remove any <w:del>, <w:ins>, <w:hyperlink> containing runs
    for tag_name in ("del", "ins", "hyperlink"):
        for child in elem.findall(w(tag_name)):
            elem.remove(child)


def set_para_text(p_elem, text: str):
    """High-level: clear all runs, set single text."""
    clear_runs_set_text(p_elem, text)


def remove_elem(elem):
    parent = elem.getparent()
    if parent is not None:
        parent.remove(elem)


def build_blocks(doc):
    """Return list of dicts for body children: paragraph or table."""
    body = doc.element.body
    blocks = []
    for child in body:
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
        if tag == "p":
            blocks.append({"type": "paragraph", "elem": child})
        elif tag == "tbl":
            blocks.append({"type": "table", "elem": child})
        elif tag == "sdt":
            # structured doc tag – treat inner paragraphs
            for p_elem in child.iter(w("p")):
                blocks.append({"type": "paragraph", "elem": p_elem})
    return blocks


def find_social_section(blocks, doc):
    """Return (start_idx, end_idx) for Soziale Informationen H1."""
    start_idx = None
    end_idx = None
    for i, blk in enumerate(blocks):
        if blk["type"] != "paragraph":
            continue
        txt = para_text(blk["elem"]).strip()
        lvl = heading_level(blk["elem"], doc)
        if start_idx is None:
            if lvl == 1 and "Soziale" in txt and "Informationen" in txt:
                start_idx = i
        elif lvl == 1:
            end_idx = i
            break
    return start_idx, end_idx


# ── main ───────────────────────────────────────────────────────────────────────

print(f"Loading {SRC} …")
doc = Document(SRC)

blocks = build_blocks(doc)
start_idx, end_idx = find_social_section(blocks, doc)

if start_idx is None:
    raise SystemExit("ERROR: Could not find 'Soziale Informationen' H1")

print(f"Social section: blocks {start_idx}–{end_idx}  ({end_idx - start_idx} blocks)")
section = blocks[start_idx:end_idx]


# ─────────────────────────────────────────────────────────────────────────────
# FIX 1 – S1-1 / DP 24: Remove the duplicate "trifft zu" sentence
# The H3 heading for DP 24 contains "Diskriminierung" and "Inklusion".
# The very next two Normal paragraphs are identical "... trifft zu." – remove one.
# ─────────────────────────────────────────────────────────────────────────────
print("\n[Fix 1] Removing duplicate 'trifft zu' for Datenpunkt 24 …")

dp24_heading_idx = None
for i, blk in enumerate(section):
    if blk["type"] != "paragraph":
        continue
    txt = para_text(blk["elem"]).strip()
    lvl = heading_level(blk["elem"], doc)
    if lvl == 3 and "Diskriminierung" in txt and "Inklusion" in txt:
        dp24_heading_idx = i
        break

if dp24_heading_idx is not None:
    # Look at the next few Normal paragraphs; find consecutive identical ones
    seen_texts = []
    to_remove = []
    for j in range(dp24_heading_idx + 1, min(dp24_heading_idx + 6, len(section))):
        blk = section[j]
        if blk["type"] != "paragraph":
            break
        lvl = heading_level(blk["elem"], doc)
        if lvl is not None:
            break  # hit next heading
        txt = para_text(blk["elem"]).strip()
        if txt in seen_texts:
            to_remove.append(j)
        else:
            seen_texts.append(txt)

    for j in reversed(to_remove):
        elem = section[j]["elem"]
        remove_elem(elem)
        print(f"  Removed duplicate paragraph: '{para_text(elem)[:80]}'")
else:
    print("  WARNING: DP 24 heading not found")


# ─────────────────────────────────────────────────────────────────────────────
# FIX 2 – S1-6 / DP 50: Fix repeated intro sentences + raw-value paragraphs
#
# Pattern in the doc:
#   H3: "50 – Zusammensetzung …"
#   Normal: "Die folgende Tabelle zeigt die Angaben zu zusammensetzung …"   ← bad
#   TABLE
#   empty para
#   Normal: "Die folgende Tabelle zeigt …"   ← bad (repeat × 6)
#   TABLE …
#   (after 6th table:)
#   Normal: "Zusammensetzung … beläuft sich im Berichtszeitraum auf 1.163."  ← raw
#   Normal: "Zusammensetzung … beläuft sich im Berichtszeitraum auf 20,9."   ← raw
#   Normal: "Die Daten wurden aus der Personalmanagement Software ermittelt."  ← keep
#   Normal: "Personenzahl"   ← raw
#   Normal: "Andere Methodik"  ← raw
#   Normal: "keine"  ← raw
#   Normal: "Nein, Konsolidierungskreis …"  ← integrate into prose
#
# Strategy:
#   – Replace the FIRST intro sentence with a proper paragraph.
#   – Delete every subsequent identical intro sentence (before each table).
#   – Delete the raw-value "beläuft sich … auf 1.163." / "20,9." paragraphs
#     and the bare "Personenzahl" / "Andere Methodik" / "keine" ones.
#   – Rewrite the "Nein, Konsolidierungskreis …" into a proper sentence.
#   – Keep "Die Daten wurden aus der Personalmanagement Software ermittelt."
# ─────────────────────────────────────────────────────────────────────────────
print("\n[Fix 2] Fixing S1-6 / Datenpunkt 50 …")

DP50_INTRO_BAD_LOWER = "zusammensetzung der belegschaft, fluktuation und berichtsmethodologien"
DP50_PROPER_INTRO = (
    "Die nachfolgenden Tabellen geben einen Überblick über die Zusammensetzung der "
    "Belegschaft von FRÖBEL e.V. im Berichtsjahr 2024. Ausgewiesen werden Angaben "
    "nach Geschlecht, Beschäftigungsart sowie geografischer Verteilung. Die Daten "
    "wurden der Personalmanagement-Software entnommen. Die Angaben beziehen sich "
    "auf die Personenzahl; der Konsolidierungskreis der Nachhaltigkeitsberichterstattung "
    "weicht geringfügig vom handelsrechtlichen Konsolidierungskreis ab."
)

dp50_heading_idx = None
for i, blk in enumerate(section):
    if blk["type"] != "paragraph":
        continue
    txt = para_text(blk["elem"]).strip()
    lvl = heading_level(blk["elem"], doc)
    if lvl == 3 and "50" in txt and "Zusammensetzung" in txt and "Belegschaft" in txt:
        dp50_heading_idx = i
        break

if dp50_heading_idx is not None:
    first_intro_replaced = False
    to_remove_elems = []

    # Scan ahead until we hit the next H2/H3
    j = dp50_heading_idx + 1
    while j < len(section):
        blk = section[j]
        lvl_j = heading_level(blk["elem"], doc) if blk["type"] == "paragraph" else None
        if lvl_j is not None and lvl_j <= 3:
            break
        if blk["type"] == "paragraph":
            txt = para_text(blk["elem"]).strip()
            txt_lower = txt.lower()

            # Bad intro sentence pattern
            if DP50_INTRO_BAD_LOWER in txt_lower:
                if not first_intro_replaced:
                    set_para_text(blk["elem"], DP50_PROPER_INTRO)
                    first_intro_replaced = True
                    print(f"  Replaced first intro at block {j}")
                else:
                    to_remove_elems.append(blk["elem"])

            # Raw number sentences: "beläuft sich im Berichtszeitraum auf 1.163" etc.
            elif "beläuft sich im berichtszeitraum auf" in txt_lower and any(
                    c.isdigit() for c in txt):
                to_remove_elems.append(blk["elem"])

            # Bare raw value paragraphs
            elif txt in ("Personenzahl", "Andere Methodik", "keine"):
                to_remove_elems.append(blk["elem"])

            # "Die Daten wurden aus der Personalmanagement Software ermittelt." – keep as is
            elif "die daten wurden aus der personalmanagement" in txt_lower:
                # Keep but it's now integrated in the new intro – remove it
                to_remove_elems.append(blk["elem"])

            # "Nein, Konsolidierungskreis …" – now part of new intro – remove
            elif txt_lower.startswith("nein, konsolidierungskreis"):
                to_remove_elems.append(blk["elem"])

        j += 1

    for elem in to_remove_elems:
        remove_elem(elem)
        print(f"  Removed: '{para_text(elem)[:80]}'")

    if not first_intro_replaced:
        print("  WARNING: could not replace intro for DP50")
else:
    print("  WARNING: DP50 heading not found")


# ─────────────────────────────────────────────────────────────────────────────
# FIX 3 – S1-9 / DP 66: Same repeated intro sentence pattern
# Replace first occurrence with a proper intro, delete remaining ones.
# ─────────────────────────────────────────────────────────────────────────────
print("\n[Fix 3] Fixing S1-9 / Datenpunkt 66 …")

DP66_INTRO_BAD_LOWER = "belegschaftsdemografie: geschlechter- und altersverteilung"
DP66_PROPER_INTRO = (
    "Die nachfolgenden Tabellen stellen die demografische Zusammensetzung der "
    "Belegschaft von FRÖBEL e.V. dar. Ausgewiesen werden die Verteilung nach "
    "Geschlecht (Anzahl und Anteil an der obersten Führungsebene) sowie die "
    "Altersstruktur der Gesamtbelegschaft nach drei Altersgruppen."
)

dp66_heading_idx = None
for i, blk in enumerate(section):
    if blk["type"] != "paragraph":
        continue
    txt = para_text(blk["elem"]).strip()
    lvl = heading_level(blk["elem"], doc)
    if lvl == 3 and "66" in txt and ("Diversität" in txt or "Belegschaftsdemografie" in txt
                                     or "Geschlechter" in txt or "Altersverteilung" in txt):
        dp66_heading_idx = i
        break

if dp66_heading_idx is not None:
    first_intro_replaced = False
    to_remove_elems = []

    j = dp66_heading_idx + 1
    while j < len(section):
        blk = section[j]
        lvl_j = heading_level(blk["elem"], doc) if blk["type"] == "paragraph" else None
        if lvl_j is not None and lvl_j <= 3:
            break
        if blk["type"] == "paragraph":
            txt = para_text(blk["elem"]).strip()
            txt_lower = txt.lower()
            if DP66_INTRO_BAD_LOWER in txt_lower:
                if not first_intro_replaced:
                    set_para_text(blk["elem"], DP66_PROPER_INTRO)
                    first_intro_replaced = True
                    print(f"  Replaced first intro at block {j}")
                else:
                    to_remove_elems.append(blk["elem"])
        j += 1

    for elem in to_remove_elems:
        remove_elem(elem)
        print(f"  Removed: '{para_text(elem)[:80]}'")

    if not first_intro_replaced:
        print("  WARNING: could not replace intro for DP66")
else:
    print("  WARNING: DP66 heading not found")


# ─────────────────────────────────────────────────────────────────────────────
# FIX 4 – S1-16 / DP 97: Remove CSV annotations, replace with clean prose
#
# The section contains these paragraphs to clean:
#   - "70,4, 1,1, 75,02, 5,4"  (raw numbers)
#   - Long paragraph starting "Der berichtete Wert für … beträgt 100. 97a - 1.: AT IST-Zahlen …"
#   - "Ohne Auszubildende, geringfügig Beschäftigte …" (methodical note with context)
#   - Second copy of the same annotation "Methodisch ist anzumerken: 97a - 1.: …"
#
# Replace the whole block with clean prose about the actual data.
# ─────────────────────────────────────────────────────────────────────────────
print("\n[Fix 4] Fixing S1-16 / Datenpunkt 97 …")

DP97_PROSE = (
    "Im Berichtsjahr 2024 weist FRÖBEL e.V. Vergütungskennzahlen differenziert nach "
    "den zwei maßgeblichen Vergütungsgruppen aus: außertarifliche Mitarbeitende (AT) "
    "sowie Mitarbeitende im Haustarifvertrag Fröbel (HTV).\n\n"
    "Für die Lohngleichheit (Datenpunkt 97a) ergibt sich auf Basis der Ist-Werte: "
    "Der Anteil des mittleren Fraueneinkommens am mittleren Männereinkommen beträgt "
    "bei AT-Beschäftigten 70,4 % und bei HTV-Beschäftigten 75,02 %. Auf Vollzeit "
    "hochgerechnet liegen die entsprechenden Werte bei 1,1 % (AT) bzw. 5,4 % (HTV). "
    "Ein Wert von 100 % würde vollständige Lohngleichheit bedeuten; Werte unter 100 % "
    "zeigen an, dass das durchschnittliche Fraueneinkommen unter dem der Männer liegt.\n\n"
    "Das Verhältnis der höchsten zur niedrigsten Gesamtvergütung im Unternehmen "
    "(Datenpunkt 97b) beträgt 535 % im Verhältnis zwischen AT- und HTV-Vergütungen "
    "zusammen. Hochgerechnet auf Vollzeitäquivalente beläuft sich der Wert auf 470 %.\n\n"
    "Methodisch ist anzumerken, dass Auszubildende, geringfügig Beschäftigte sowie "
    "Mini-Jobber bei der Medianberechnung nicht berücksichtigt werden. "
    "Einbezogen werden nur Personen, die im gesamten Berichtsjahr beschäftigt waren."
)

dp97_heading_idx = None
for i, blk in enumerate(section):
    if blk["type"] != "paragraph":
        continue
    txt = para_text(blk["elem"]).strip()
    lvl = heading_level(blk["elem"], doc)
    if lvl == 3 and "97" in txt and "Vergütung" in txt:
        dp97_heading_idx = i
        break

if dp97_heading_idx is not None:
    # Collect all Normal paragraphs in this DP until next heading
    dp97_paras = []
    j = dp97_heading_idx + 1
    while j < len(section):
        blk = section[j]
        lvl_j = heading_level(blk["elem"], doc) if blk["type"] == "paragraph" else None
        if lvl_j is not None and lvl_j <= 3:
            break
        if blk["type"] == "paragraph":
            dp97_paras.append((j, blk["elem"]))
        j += 1

    # Set the text of the first paragraph to our clean prose
    # and remove all subsequent ones
    if dp97_paras:
        first_idx, first_elem = dp97_paras[0]
        set_para_text(first_elem, DP97_PROSE)
        print(f"  Set clean prose for DP97 at block {first_idx}")
        for _, elem in dp97_paras[1:]:
            txt_removed = para_text(elem)[:80]
            remove_elem(elem)
            print(f"  Removed: '{txt_removed}'")
    else:
        print("  WARNING: No Normal paragraphs found under DP97 heading")
else:
    print("  WARNING: DP97 heading not found")


# ─────────────────────────────────────────────────────────────────────────────
# FIX 5 – S4-3 / DP 26: Remove the second (duplicate) Vergeltungsmaßnahmen block
#
# Under H3 "26 – Strategien zum Schutz vor Vergeltungsmaßnahmen" there are
# two large Normal paragraphs that are nearly identical:
#   Para A: starts "Strategien zum Schutz vor Vergeltungsmaßnahmen trifft zu. ..."
#   Para B: starts "Zur Einordnung ist hinzuzufügen: Strategien zum Schutz ..."
# Para B is a duplicate. Remove it (and its bullet-list follow-up if duplicated).
# Also remove bullet-list paragraphs (lines starting with "- ") from Para A
# and integrate them as prose in the paragraph.
# ─────────────────────────────────────────────────────────────────────────────
print("\n[Fix 5] Removing duplicate Vergeltungsmaßnahmen block (S4-3 / DP 26) …")

dp26_heading_idx = None
for i, blk in enumerate(section):
    if blk["type"] != "paragraph":
        continue
    txt = para_text(blk["elem"]).strip()
    lvl = heading_level(blk["elem"], doc)
    if lvl == 3 and "Vergeltungsmaßnahmen" in txt and "26" in txt:
        dp26_heading_idx = i
        break

DP26_REWRITTEN_PROSE = (
    "Strategien zum Schutz vor Vergeltungsmaßnahmen sind bei FRÖBEL e.V. verbindlich "
    "in den internen Melde-, Beschwerde- und Kinderschutzstrukturen verankert. Ziel ist "
    "es, sicherzustellen, dass Kinder, Familien sowie deren rechtmäßige Vertreter keine "
    "Nachteile, Sanktionen oder Benachteiligungen erfahren, wenn sie Anliegen, Beschwerden "
    "oder Hinweise äußern. "
    "Der Schutz vor Vergeltungsmaßnahmen wird durch klar geregelte Vertraulichkeits- und "
    "Datenschutzstandards im Umgang mit Hinweisen gewährleistet. Darüber hinaus besteht "
    "die Möglichkeit zur vertraulichen und – sofern vorgesehen – anonymen Meldung. "
    "Es gilt die verbindliche Vorgabe, dass eingebrachte Hinweise nicht zu Lasten der "
    "meldenden Person verwendet werden dürfen; definierte Rollen, Zuständigkeiten und "
    "Dokumentationspflichten rahmen die Bearbeitung von Anliegen verbindlich ein. "
    "Einrichtungsleitungen sowie zentrale Fach- und Steuerungseinheiten sind verpflichtet, "
    "Hinweise sachlich, neutral und ohne Vorverurteilung zu prüfen und den Schutz der "
    "meldenden Person aktiv sicherzustellen. Bei sensiblen oder konfliktbehafteten "
    "Sachverhalten greifen zusätzlich die Verfahren des Ereignis- und Krisenmanagements, "
    "die strukturierte Eskalationswege und Transparenz der Entscheidungsprozesse "
    "sicherstellen. Diese organisatorischen, prozessualen und technischen Schutzmechanismen "
    "schaffen einen verlässlichen Rahmen, in dem Hinweise ohne Angst vor negativen "
    "Konsequenzen eingebracht werden können."
)

if dp26_heading_idx is not None:
    dp26_paras = []
    j = dp26_heading_idx + 1
    while j < len(section):
        blk = section[j]
        lvl_j = heading_level(blk["elem"], doc) if blk["type"] == "paragraph" else None
        if lvl_j is not None and lvl_j <= 3:
            break
        if blk["type"] == "paragraph":
            dp26_paras.append((j, blk["elem"]))
        j += 1

    # Find the duplicate block starting with "Zur Einordnung ist hinzuzufügen"
    # Everything from that paragraph onward is a duplicate – remove it.
    duplicate_start = None
    for idx, (blk_idx, elem) in enumerate(dp26_paras):
        txt = para_text(elem).strip()
        if txt.startswith("Zur Einordnung ist hinzuzufügen"):
            duplicate_start = idx
            break

    if duplicate_start is not None:
        for _, elem in dp26_paras[duplicate_start:]:
            txt_short = para_text(elem)[:80]
            remove_elem(elem)
            print(f"  Removed duplicate: '{txt_short}'")
    else:
        print("  WARNING: Could not find 'Zur Einordnung' duplicate start")

    # Find the paragraph containing "trifft zu." + bullet list and rewrite it directly.
    # Re-scan after removals.
    dp26_paras_remaining = []
    j = dp26_heading_idx + 1
    while j < len(section):
        blk = section[j]
        lvl_j = heading_level(blk["elem"], doc) if blk["type"] == "paragraph" else None
        if lvl_j is not None and lvl_j <= 3:
            break
        if blk["type"] == "paragraph":
            dp26_paras_remaining.append((j, blk["elem"]))
        j += 1

    for (blk_idx, elem) in dp26_paras_remaining:
        txt = para_text(elem).strip()
        if "trifft zu" in txt and "Vergeltungsmaßnahmen" in txt:
            # This is the combined "trifft zu + bullets" paragraph.
            # Use direct XML rewrite: remove all children of the single <w:r>
            # and replace with our clean prose.
            set_para_text(elem, DP26_REWRITTEN_PROSE)
            print(f"  Rewrote DP26 'trifft zu + bullets' paragraph")
            break
else:
    print("  WARNING: DP26 heading not found")


# ─────────────────────────────────────────────────────────────────────────────
# FIX 6 – General cleanup throughout Soziale Informationen
#
# Rebuild section blocks list since we've mutated the document.
# Walk all remaining Normal paragraphs in the section and:
#   a) "trifft zu." only → expand to proper sentence
#   b) "trifft nicht zu." only → expand to proper sentence
#   c) "Ja" only → expand
#   d) "Nein" only → expand
#   e) Paragraphs that start or contain "trifft zu." where title is the prefix:
#      e.g. "Maßnahmen … trifft zu." → keep only if there is real content after
#      If the next para has real content, the "trifft zu." para is redundant fluff
#      – but we only remove it if the next non-empty para starts with a proper sentence.
# ─────────────────────────────────────────────────────────────────────────────
print("\n[Fix 6] General text-quality cleanup …")

# Rebuild section blocks after the mutations above
blocks_fresh = build_blocks(doc)
start_fresh, end_fresh = find_social_section(blocks_fresh, doc)
section_fresh = blocks_fresh[start_fresh:end_fresh]

TRIFFT_ZU_SUFFIXES = [
    " trifft zu.",
    " trifft teilweise zu.",
]

expansions_done = 0

# We need to decide which "trifft zu" paragraphs to remove vs. expand.
# Rule: if a Normal paragraph consists ONLY of "[Title] trifft zu." and the
# NEXT Normal paragraph is non-empty substantive prose, the "trifft zu" is redundant
# → remove it.
# If it's standalone with no real content following (next is empty or a heading), expand.

i = 0
while i < len(section_fresh):
    blk = section_fresh[i]
    if blk["type"] != "paragraph":
        i += 1
        continue
    lvl = heading_level(blk["elem"], doc)
    if lvl is not None:
        i += 1
        continue
    txt = para_text(blk["elem"]).strip()

    # Check if paragraph ends with " trifft zu." and is basically "[Title] trifft zu."
    is_trifft_zu = any(
        txt.endswith(sfx) for sfx in TRIFFT_ZU_SUFFIXES
    )

    if is_trifft_zu:
        # Check if the text is ONLY a title + "trifft zu" (not mixed with real content)
        # i.e., the text before the suffix is the DR/DP title (re-echoed)
        suffix_used = next(sfx for sfx in TRIFFT_ZU_SUFFIXES if txt.endswith(sfx))
        title_part = txt[: -len(suffix_used)].strip()
        is_pure_trifft_zu = len(title_part) < 100  # title should be short

        if is_pure_trifft_zu:
            # Look ahead for next non-empty Normal paragraph
            next_substantive = None
            for k in range(i + 1, min(i + 8, len(section_fresh))):
                nblk = section_fresh[k]
                if nblk["type"] != "paragraph":
                    continue
                nlvl = heading_level(nblk["elem"], doc)
                if nlvl is not None:
                    break
                ntxt = para_text(nblk["elem"]).strip()
                if ntxt:
                    next_substantive = ntxt
                    break

            if next_substantive and len(next_substantive) > 60:
                # Real content follows → remove the bare "trifft zu" line
                remove_elem(blk["elem"])
                expansions_done += 1
                # Don't advance i since we removed current element
                # Rebuild section_fresh is expensive; just continue
                section_fresh.pop(i)
                continue
            else:
                # No real content follows → keep but expand to proper sentence
                if suffix_used == " trifft zu.":
                    new_text = "Dies trifft auf FRÖBEL e.V. zu."
                else:
                    new_text = "Dies trifft auf FRÖBEL e.V. teilweise zu."
                set_para_text(blk["elem"], new_text)
                expansions_done += 1

    # "Ja" only
    elif txt == "Ja":
        set_para_text(blk["elem"], "Dies trifft auf FRÖBEL e.V. zu.")
        expansions_done += 1

    # "Nein" only
    elif txt == "Nein":
        set_para_text(blk["elem"], "Dies trifft auf FRÖBEL e.V. nicht zu.")
        expansions_done += 1

    # "Direkt" – orphaned fragment, remove it
    elif txt == "Direkt":
        remove_elem(blk["elem"])
        section_fresh.pop(i)
        expansions_done += 1
        continue

    # "trifft nicht zu." only
    elif txt in ("trifft nicht zu.", "Trifft nicht zu."):
        set_para_text(blk["elem"], "Dies trifft auf FRÖBEL e.V. nicht zu.")
        expansions_done += 1

    # "trifft zu." only (bare)
    elif txt in ("trifft zu.", "Trifft zu."):
        set_para_text(blk["elem"], "Dies trifft auf FRÖBEL e.V. zu.")
        expansions_done += 1

    i += 1

print(f"  General cleanup: {expansions_done} paragraphs adjusted")


# ─────────────────────────────────────────────────────────────────────────────
# Save output
# ─────────────────────────────────────────────────────────────────────────────
print(f"\nSaving {DEST} …")
doc.save(DEST)
print("Done.")
