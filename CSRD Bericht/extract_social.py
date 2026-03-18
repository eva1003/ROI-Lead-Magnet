#!/usr/bin/env python3
"""Extract the 'Soziale Informationen' section from CSRD_Report_v7.2.docx
and print all paragraphs/tables with their style information."""

from docx import Document
from docx.oxml.ns import qn

SOURCE = 'Fröbel 2024/CSRD_Report_v7.2.docx'

doc = Document(SOURCE)

# ── Build a unified block list: paragraphs and tables in document order ────────
# python-docx doc.paragraphs skips tables; we need to iterate the body XML directly.

body = doc.element.body
blocks = []  # list of dicts

for child in body:
    tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag

    if tag == 'p':
        # It's a paragraph
        # Find the matching Paragraph object
        from docx.text.paragraph import Paragraph
        para = Paragraph(child, doc)
        style_name = para.style.name if para.style else 'Unknown'
        text = para.text
        blocks.append({'type': 'paragraph', 'style': style_name, 'text': text, 'element': child})

    elif tag == 'tbl':
        # It's a table
        from docx.table import Table
        tbl = Table(child, doc)
        rows = []
        for row in tbl.rows:
            cells = [cell.text.strip() for cell in row.cells]
            rows.append(cells)
        blocks.append({'type': 'table', 'rows': rows, 'element': child})

    elif tag == 'sdt':
        # Structured document tag (content control) – look inside for paragraphs
        for p_elem in child.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            from docx.text.paragraph import Paragraph
            para = Paragraph(p_elem, doc)
            style_name = para.style.name if para.style else 'Unknown'
            text = para.text
            blocks.append({'type': 'paragraph', 'style': style_name, 'text': text, 'element': p_elem})

# ── Identify heading levels ────────────────────────────────────────────────────

def heading_level(block):
    """Return 1, 2, 3 if block is a heading, else None."""
    if block['type'] != 'paragraph':
        return None
    s = block['style']
    if s == 'Heading 1' or s == 'berschrift 1' or '1' in s and 'head' in s.lower():
        return 1
    if s == 'Heading 2' or s == 'berschrift 2' or '2' in s and 'head' in s.lower():
        return 2
    if s == 'Heading 3' or s == 'berschrift 3' or '3' in s and 'head' in s.lower():
        return 3
    # Also check outline level in paragraph XML
    pPr = block['element'].find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
    if pPr is not None:
        outlineLvl = pPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}outlineLvl')
        if outlineLvl is not None:
            val = outlineLvl.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')
            if val is not None:
                lvl = int(val)
                if lvl == 0:
                    return 1
                elif lvl == 1:
                    return 2
                elif lvl == 2:
                    return 3
    return None


# ── Find start and end of Soziale Informationen section ───────────────────────

start_idx = None
end_idx = None

for i, block in enumerate(blocks):
    if block['type'] != 'paragraph':
        continue
    text = block['text'].strip()
    lvl = heading_level(block)

    # Find H1 "Soziale Informationen"
    if start_idx is None:
        if lvl == 1 and 'Soziale' in text and 'Informationen' in text:
            start_idx = i
            print(f"[DEBUG] Found 'Soziale Informationen' at block index {i}: style='{block['style']}', text='{text}'")

    # Find next H1 after start (Governance)
    elif lvl == 1:
        end_idx = i
        print(f"[DEBUG] Found next H1 at block index {i}: style='{block['style']}', text='{text}'")
        break

if start_idx is None:
    # Fallback: look by text only, ignoring heading detection
    print("[DEBUG] H1 heading not found by style/outline. Searching by text fragment...")
    for i, block in enumerate(blocks):
        if block['type'] == 'paragraph' and 'Soziale' in block['text'] and 'Information' in block['text']:
            print(f"  block {i}: style='{block['style']}', text='{block['text'][:80]}'")
    # Show all heading-like paragraphs
    print("\n[DEBUG] All paragraphs with heading-style or short uppercase text:")
    for i, block in enumerate(blocks):
        if block['type'] == 'paragraph':
            s = block['style']
            t = block['text'].strip()
            if 'head' in s.lower() or 'berschrift' in s.lower() or 'heading' in s.lower() or 'title' in s.lower():
                print(f"  [{i}] style='{s}' | {t[:100]}")

if start_idx is None:
    print("\nERROR: Could not locate 'Soziale Informationen' H1. Listing ALL unique styles found:")
    styles_seen = {}
    for b in blocks:
        if b['type'] == 'paragraph':
            s = b['style']
            if s not in styles_seen:
                styles_seen[s] = b['text'][:60]
    for s, ex in sorted(styles_seen.items()):
        print(f"  style='{s}' | example: '{ex}'")
    raise SystemExit(1)

section_blocks = blocks[start_idx:end_idx]
print(f"\n[INFO] Section spans blocks {start_idx}–{end_idx if end_idx else 'EOF'}, total blocks: {len(section_blocks)}\n")

# ── Print section content ──────────────────────────────────────────────────────

SEPARATOR = '─' * 80

def format_style_label(block):
    s = block['style']
    lvl = heading_level(block)
    if lvl == 1:
        return f'[H1]'
    elif lvl == 2:
        return f'[H2]'
    elif lvl == 3:
        return f'[H3]'
    elif 'bold' in s.lower() or s.lower() in ('strong', 'subheading'):
        return f'[BOLD / {s}]'
    else:
        return f'[{s}]'

print(SEPARATOR)
for i, block in enumerate(section_blocks):
    if block['type'] == 'paragraph':
        label = format_style_label(block)
        text = block['text']
        if not text.strip():
            print(f'{label} <empty paragraph>')
        else:
            print(f'{label} {text}')
    elif block['type'] == 'table':
        print(f'[TABLE] {len(block["rows"])} rows × {len(block["rows"][0]) if block["rows"] else 0} cols')
        for row_idx, row in enumerate(block['rows']):
            cells_str = ' | '.join(f'"{c[:60]}"' for c in row)
            print(f'  Row {row_idx+1}: {cells_str}')
    print(SEPARATOR)

print(f'\n[SUMMARY] Total blocks in Soziale Informationen: {len(section_blocks)}')
print(f'  Paragraphs: {sum(1 for b in section_blocks if b["type"] == "paragraph")}')
print(f'  Tables:     {sum(1 for b in section_blocks if b["type"] == "table")}')
h1 = sum(1 for b in section_blocks if b["type"]=="paragraph" and heading_level(b)==1)
h2 = sum(1 for b in section_blocks if b["type"]=="paragraph" and heading_level(b)==2)
h3 = sum(1 for b in section_blocks if b["type"]=="paragraph" and heading_level(b)==3)
print(f'  H1: {h1}, H2: {h2}, H3: {h3}')
