#!/usr/bin/env python3
"""
cia_fix_artefacts.py — strip OCR/PDF artefacts from CIA HTML factfiles.

Two fixes:
  1. Map-label bleed: remove all-caps country-name runs from field values
     (context map OCR'd into Coastline and other fields)
  2. "Page Denied" marker: truncate at STAT Page Denied / In Document Denied
"""
import re
from pathlib import Path

CIA_DIR = Path(__file__).parent / 'CIA'

# ── Fix 1: Page Denied ────────────────────────────────────────────────────────
# e.g. "...runway ft. STAT Page Denied Next 1 Page(s) In Document Denied"
PAGE_DENIED_RE = re.compile(
    r'\s*STAT\s+Page\s+Denied.*|'
    r'\s*Next\s+\d+\s+Page\(s\)\s+In\s+Document\s+Denied.*',
    re.IGNORECASE | re.DOTALL
)

# ── Fix 2: Map-label bleed ────────────────────────────────────────────────────
# The all-caps country-name runs always start after real data ends.
# Strategy: inside a <dd>…</dd>, strip any run of 3+ consecutive tokens that
# are all-caps (2+ chars), possibly with OCR noise (partial words, stray
# punctuation).  We anchor to the first such run and delete from there to end.
#
# Pattern: at least 3 tokens of 2+ uppercase letters, separated by spaces,
# possibly with short junk tokens (digits, single chars, dots) interspersed.
CAPS_RUN_RE = re.compile(
    r'\s+'                              # leading whitespace
    r'(?:[A-Z]{2,}[\s\.,]*){3,}'       # 3+ all-caps tokens
    r'[A-Z\s\.,\-]*$',                 # rest of string (more caps / junk)
)

def clean_value(text: str) -> str:
    # Fix 1 first
    text = PAGE_DENIED_RE.sub('', text)
    # Fix 2: strip caps run from the end
    text = CAPS_RUN_RE.sub('', text)
    return text.strip()


def fix_file(path: Path) -> tuple[int, int]:
    """Return (page_denied_fixes, map_label_fixes)."""
    raw = path.read_text(encoding='utf-8')
    pd_count = ml_count = 0

    def replace_dd(m):
        nonlocal pd_count, ml_count
        inner = m.group(1)
        fixed = inner

        if PAGE_DENIED_RE.search(fixed):
            fixed = PAGE_DENIED_RE.sub('', fixed).strip()
            pd_count += 1

        if CAPS_RUN_RE.search(fixed):
            fixed = CAPS_RUN_RE.sub('', fixed).strip()
            ml_count += 1

        if fixed != inner:
            return f'<dd>{fixed}</dd>'
        return m.group(0)

    # Match <dd>…</dd> (non-greedy, handles multi-line values via DOTALL)
    patched = re.sub(r'<dd>(.*?)</dd>', replace_dd, raw, flags=re.DOTALL)

    if patched != raw:
        path.write_text(patched, encoding='utf-8')

    return pd_count, ml_count


def main():
    total_pd = total_ml = files_changed = 0

    for path in sorted(CIA_DIR.glob('*.html')):
        if path.stem == 'Dummy':
            continue
        pd, ml = fix_file(path)
        if pd or ml:
            files_changed += 1
            total_pd += pd
            total_ml += ml
            print(f"  {path.stem:<40} page-denied:{pd}  map-labels:{ml}")

    print(f"\nDone — {files_changed} files updated")
    print(f"  Page-denied markers removed : {total_pd}")
    print(f"  Map-label runs stripped     : {total_ml}")


if __name__ == '__main__':
    main()
