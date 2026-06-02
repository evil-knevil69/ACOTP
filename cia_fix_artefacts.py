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
# Walk tokens from the right; strip any trailing run of 3+ consecutive
# ALL-CAPS words (2+ alpha chars).  Pure Python — no regex, no backtracking.

def _is_caps_word(w):
    """True if w (after stripping punctuation) is 2+ uppercase alpha chars."""
    core = w.strip('.,;:()-/')
    return len(core) >= 2 and core.isalpha() and core.isupper()

def _strip_trailing_caps_run(text, min_run=3):
    words = text.split()
    run_start = len(words)
    for i in range(len(words) - 1, -1, -1):
        if _is_caps_word(words[i]):
            run_start = i
        else:
            break
    if len(words) - run_start >= min_run:
        return ' '.join(words[:run_start]).rstrip('.,;: ')
    return text

def clean_value(text: str) -> str:
    text = PAGE_DENIED_RE.sub('', text)
    text = _strip_trailing_caps_run(text)
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

        stripped = _strip_trailing_caps_run(fixed)
        if stripped != fixed:
            fixed = stripped.strip()
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
