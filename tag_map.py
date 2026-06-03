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


def recover_excel_sci(s):
    """
    Recover a 6-char hex colour that Excel corrupted into scientific notation.
    e.g. '8.50E+35' → '085e34'  (Excel read the hex 'e' as a float exponent)
    Returns the recovered hex string, or None if not applicable.
    """
    if not re.search(r'[Ee][+\-]?\d+', s):
        return None
    try:
        val = float(s)
    except ValueError:
        return None
    for exp in range(100):           # try 2-digit decimal exponents 00–99
        exp_str = f'{exp:02d}'
        abc_float = val / (10 ** exp)
        abc_int = round(abc_float)
        if 0 <= abc_int <= 999 and abs(abc_float - abc_int) < 1e-6:
            candidate = f'{abc_int:03d}e{exp_str}'
            try:
                if float(candidate) == val:
                    return candidate
            except ValueError:
                pass
    return None


def hex_from_string(s):
    """Normalise any colour string to 6-char lowercase hex, or None."""
    if not s:
        return None
    s = s.strip()
    # Attempt to undo Excel scientific-notation damage before anything else
    recovered = recover_excel_sci(s)
    if recovered:
        return recovered
    s = s.lstrip('#').lower()
    if re.fullmatch(r'[0-9a-f]{6}', s):
        return s
    if re.fullmatch(r'[0-9a-f]{3}', s):        # expand CSS shorthand
        return ''.join(c * 2 for c in s)
    if re.fullmatch(r'[0-9a-f]{5}', s):        # missing leading zero
        return '0' + s
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

def hex_to_rgb(h):
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)

def nearest_color(fill_hex, color_map, tolerance=12):
    """Return the code for the closest CSV colour within tolerance, or None."""
    if fill_hex in color_map:
        return color_map[fill_hex], 0
    r1, g1, b1 = hex_to_rgb(fill_hex)
    best_code, best_dist = None, float('inf')
    for csv_hex, code in color_map.items():
        r2, g2, b2 = hex_to_rgb(csv_hex)
        dist = ((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2) ** 0.5
        if dist < best_dist:
            best_dist, best_code = dist, code
    if best_dist <= tolerance:
        return best_code, best_dist
    return None, best_dist

matched      = []
unmatched    = []
fuzzy_used   = []

for path in root.iter(f'{{{SVG_NS}}}path'):
    color = fill_from_element(path)
    if not color:
        continue
    code, dist = nearest_color(color, color_map)
    if code:
        path.set('id', code)
        path.set(f'{{{INKSCAPE_NS}}}label', code)
        matched.append(code)
        if dist > 0:
            fuzzy_used.append(f'  #{color} → {code} (dist {dist:.1f})')
    else:
        unmatched.append(f'#{color}')

# ── Report ────────────────────────────────────────────────────────────────────
print(f"\nTagged    : {len(matched)} paths")
if fuzzy_used:
    print(f"Fuzzy     : {len(fuzzy_used)} paths matched within tolerance:")
    for f in fuzzy_used[:20]:
        print(f)
    if len(fuzzy_used) > 20:
        print(f"  ... and {len(fuzzy_used)-20} more")
print(f"No match  : {len(set(unmatched))} unique fill colours (not in CSV)")

if unmatched:
    print("\nUnrecognised fill colours — check your CSV or these are background/ocean fills:")
    for c in sorted(set(unmatched)):
        print(f"  {c}")

if matched:
    print(f"\nCountries tagged: {', '.join(sorted(set(matched)))}")

# ── Write output ──────────────────────────────────────────────────────────────
with open(out_path, 'wb') as f:
    tree.write(f, xml_declaration=True, encoding='utf-8', pretty_print=True)
print(f"\nSaved → {out_path}")
