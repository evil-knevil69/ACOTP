#!/usr/bin/env python3
"""
tag_map.py  —  label Inkscape SVG paths with 1972 country codes

Usage:
    python3 tag_map.py world_map.svg 1972_country_codes.csv

Output:
    world_map_labeled.svg  (original is not modified)

Dependencies:
    pip install lxml webcolors
"""
import csv, re, sys
from lxml import etree

SVG_NS      = 'http://www.w3.org/2000/svg'
INKSCAPE_NS = 'http://www.inkscape.org/namespaces/inkscape'


def hex_from_string(s):
    """Normalise any colour string to 6-char lowercase hex, or None."""
    if not s:
        return None
    s = s.strip().lstrip('#').lower()
    if re.fullmatch(r'[0-9a-f]{6}', s):
        return s
    if re.fullmatch(r'[0-9a-f]{3}', s):        # expand CSS shorthand
        return ''.join(c * 2 for c in s)
    try:
        import webcolors
        return webcolors.name_to_hex(s).lstrip('#')
    except Exception:
        return None


def fill_from_element(el):
    """Extract fill hex from an SVG element's style or fill attribute."""
    # style="...fill:#rrggbb..."
    style = el.get('style', '')
    m = re.search(r'fill\s*:\s*#?([0-9a-fA-F]{3,6})', style)
    if m:
        return hex_from_string(m.group(1))
    # fill="#rrggbb"
    fill = el.get('fill', '')
    if fill and fill.lower() not in ('none', 'inherit'):
        return hex_from_string(fill)
    return None


# ── CLI args ──────────────────────────────────────────────────────────────────
if len(sys.argv) < 3:
    print("Usage: python3 tag_map.py <world_map.svg> <1972_country_codes.csv>")
    sys.exit(1)

svg_path = sys.argv[1]
csv_path = sys.argv[2]
out_path = svg_path.replace('.svg', '_labeled.svg')
if out_path == svg_path:
    out_path = svg_path + '_labeled.svg'

# ── Load CSV (auto-converts named colours to hex and saves back) ──────────────
color_map = {}   # hex → code
skipped_csv = []
rows_updated = False

with open(csv_path, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    all_rows = list(reader)

for row in all_rows:
    code     = (row.get('code') or '').strip()
    col_key  = 'colour' if 'colour' in row else 'color'
    raw      = (row.get(col_key) or '').strip()

    # If it looks like a named colour (not a 3/6-char hex), convert it
    if raw and not re.fullmatch(r'#?[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?', raw):
        try:
            import webcolors
            converted = webcolors.name_to_hex(raw).lstrip('#')
            print(f"  {code}: converted '{raw}' → #{converted}")
            row[col_key] = converted
            rows_updated = True
        except Exception:
            pass  # leave as-is; will be reported below

    color = hex_from_string(row.get(col_key, ''))
    if code and color:
        color_map[color] = code
    elif code and raw:
        skipped_csv.append(f"  {code}: could not parse colour '{raw}'")

# Save back if any named colours were converted
if rows_updated:
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)
    print(f"  → CSV updated with hex values")

print(f"Loaded {len(color_map)} colour→code mappings")
if skipped_csv:
    print("CSV entries with unparseable colours:")
    for s in skipped_csv:
        print(s)

# ── Parse & tag SVG ───────────────────────────────────────────────────────────
tree = etree.parse(svg_path)
root = tree.getroot()

matched   = []
unmatched = []

for path in root.iter(f'{{{SVG_NS}}}path'):
    color = fill_from_element(path)
    if not color:
        continue
    if color in color_map:
        code = color_map[color]
        path.set('id', code)
        path.set(f'{{{INKSCAPE_NS}}}label', code)
        matched.append(code)
    else:
        unmatched.append(f'#{color}')

# ── Report ────────────────────────────────────────────────────────────────────
print(f"\nTagged    : {len(matched)} paths")
print(f"No match  : {len(set(unmatched))} unique fill colours (not in CSV)")

if unmatched:
    print("\nUnrecognised fill colours — check your CSV or these are background/ocean fills:")
    for c in sorted(set(unmatched)):
        print(f"  {c}")

if matched:
    print(f"\nCountries tagged: {', '.join(sorted(set(matched)))}")

# ── Write output ──────────────────────────────────────────────────────────────
tree.write(out_path, xml_declaration=True, encoding='unicode', pretty_print=True)
print(f"\nSaved → {out_path}")
