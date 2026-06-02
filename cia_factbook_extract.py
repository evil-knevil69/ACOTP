#!/usr/bin/env python3
"""
cia_factbook_extract.py  —  OCR the CIA World Factbook PDF pages and produce
a CIA_FACTBOOK JavaScript object keyed by 1972 ISO country code.

Usage:
    python3 cia_factbook_extract.py [--pages-dir /tmp/cia_full] [--out cia_factbook.js]

Pages must already be rendered as p-NNN.png files (use pdftoppm first).

Dependencies:
    tesseract-ocr  (system package)
    pip install Pillow  (optional, for image pre-processing)
"""
import json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────────
PAGES_DIR   = Path(sys.argv[sys.argv.index('--pages-dir') + 1]) if '--pages-dir' in sys.argv else Path('/tmp/cia_full')
OUT_PATH    = Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else Path('/home/user/ACOTP/cia_factbook.js')
CACHE_FILE  = Path('/tmp/cia_ocr_cache.json')
THREADS     = 4

# ── Country name → ISO code mapping ──────────────────────────────────────────
NAME_TO_CODE = {
    # Europe
    'ALBANIA': 'AL', 'ANDORRA': 'AD', 'AUSTRIA': 'AT', 'BELGIUM': 'BE',
    'BULGARIA': 'BG', 'CZECHOSLOVAKIA': 'CS', 'EAST GERMANY': 'DD',
    'GERMANY EAST': 'DD', 'GERMANY, EAST': 'DD', 'DDR': 'DD',
    'WEST GERMANY': 'DE', 'GERMANY WEST': 'DE', 'GERMANY, WEST': 'DE',
    'FEDERAL REPUBLIC OF GERMANY': 'DE', 'DENMARK': 'DK', 'SPAIN': 'ES',
    'FINLAND': 'FI', 'FRANCE': 'FR', 'UNITED KINGDOM': 'GB',
    'GREAT BRITAIN': 'GB', 'GREECE': 'GR', 'HUNGARY': 'HU',
    'IRELAND': 'IE', 'ICELAND': 'IS', 'ITALY': 'IT',
    'LIECHTENSTEIN': 'LI', 'LUXEMBOURG': 'LU', 'MONACO': 'MC',
    'MALTA': 'MT', 'NETHERLANDS': 'NL', 'NORWAY': 'NO', 'POLAND': 'PL',
    'PORTUGAL': 'PT', 'ROMANIA': 'RO', 'SAN MARINO': 'SM',
    'SOVIET UNION': 'SU', 'USSR': 'SU', 'SWEDEN': 'SE',
    'SWITZERLAND': 'CH', 'TURKEY': 'TR', 'VATICAN CITY': 'VA',
    'HOLY SEE': 'VA', 'YUGOSLAVIA': 'YU',
    # North America & Caribbean
    'BAHAMAS': 'BS', 'BARBADOS': 'BB', 'BRITISH HONDURAS': 'BZ',
    'CANADA': 'CA', 'COSTA RICA': 'CR', 'CUBA': 'CU',
    'DOMINICAN REPUBLIC': 'DO', 'EL SALVADOR': 'SV',
    'GREENLAND': 'GL', 'GUADELOUPE': 'GP', 'GUATEMALA': 'GT',
    'HAITI': 'HT', 'HONDURAS': 'HN', 'JAMAICA': 'JM',
    'MARTINIQUE': 'MQ', 'MEXICO': 'MX', 'NICARAGUA': 'NI',
    'PANAMA': 'PA', 'PUERTO RICO': 'PR', 'TRINIDAD AND TOBAGO': 'TT',
    'TRINIDAD & TOBAGO': 'TT', 'UNITED STATES': 'US',
    'GRENADA': 'GD',
    # South America
    'ARGENTINA': 'AR', 'BOLIVIA': 'BO', 'BRAZIL': 'BR', 'CHILE': 'CL',
    'COLOMBIA': 'CO', 'ECUADOR': 'EC', 'FALKLAND ISLANDS': 'FK',
    'FRENCH GUIANA': 'GF', 'GUYANA': 'GY', 'PARAGUAY': 'PY',
    'PERU': 'PE', 'SURINAME': 'SR', 'SURINAM': 'SR',
    'URUGUAY': 'UY', 'VENEZUELA': 'VE',
    # Africa
    'ALGERIA': 'DZ', 'ANGOLA': 'AO', 'DAHOMEY': 'DY', 'BOTSWANA': 'BW',
    'BURUNDI': 'BI', 'CAMEROON': 'CM', 'CAPE VERDE': 'CV',
    'CENTRAL AFRICAN REPUBLIC': 'CF', 'CHAD': 'TD', 'COMORO ISLANDS': 'KM',
    'COMOROS': 'KM', 'CONGO': 'CG', 'CONGO (BRAZZAVILLE)': 'CG',
    'ZAIRE': 'ZR', 'DEMOCRATIC REPUBLIC OF CONGO': 'ZR',
    'EGYPT': 'EG', 'UNITED ARAB REPUBLIC': 'EG',
    'EQUATORIAL GUINEA': 'GQ', 'ETHIOPIA': 'ET', 'GABON': 'GA',
    'GAMBIA': 'GM', 'GHANA': 'GH', 'GUINEA': 'GN',
    'GUINEA-BISSAU': 'GW', 'PORTUGUESE GUINEA': 'GW',
    'UPPER VOLTA': 'HV', 'IVORY COAST': 'CI', "COTE D'IVOIRE": 'CI',
    'KENYA': 'KE', 'LESOTHO': 'LS', 'LIBERIA': 'LR', 'LIBYA': 'LY',
    'MALAGASY REPUBLIC': 'MG', 'MADAGASCAR': 'MG', 'MALAWI': 'MW',
    'MALI': 'ML', 'MAURITANIA': 'MR', 'MAURITIUS': 'MU',
    'MOROCCO': 'MA', 'MOZAMBIQUE': 'MZ',
    'SOUTH WEST AFRICA': 'SWA', 'NAMIBIA': 'SWA',
    'NIGER': 'NE', 'NIGERIA': 'NG', 'REUNION': 'RE', 'RÉUNION': 'RE',
    'RHODESIA': 'RH', 'ZIMBABWE': 'RH', 'RWANDA': 'RW',
    'SAO TOME AND PRINCIPE': 'ST', 'SÃO TOMÉ AND PRÍNCIPE': 'ST',
    'SENEGAL': 'SN', 'SIERRA LEONE': 'SL', 'SOMALIA': 'SO',
    'SOUTH AFRICA': 'ZA', 'SUDAN': 'SD', 'SWAZILAND': 'SZ',
    'TANZANIA': 'TZ', 'TOGO': 'TG', 'TUNISIA': 'TN', 'UGANDA': 'UG',
    'WESTERN SAHARA': 'EH', 'SPANISH SAHARA': 'EH', 'ZAMBIA': 'ZM',
    # Middle East
    'BAHRAIN': 'BH', 'CYPRUS': 'CY', 'IRAN': 'IR', 'IRAQ': 'IQ',
    'ISRAEL': 'IL', 'JORDAN': 'JO', 'KUWAIT': 'KW', 'LEBANON': 'LB',
    'OMAN': 'OM', 'QATAR': 'QA', 'SAUDI ARABIA': 'SA', 'SYRIA': 'SY',
    'UNITED ARAB EMIRATES': 'AE', 'NORTH YEMEN': 'YE',
    'YEMEN': 'YE', 'YEMEN ARAB REPUBLIC': 'YE',
    'SOUTH YEMEN': 'YD', 'PEOPLES DEMOCRATIC REPUBLIC OF YEMEN': 'YD',
    "PEOPLE'S DEMOCRATIC REPUBLIC OF YEMEN": 'YD',
    # South Asia
    'AFGHANISTAN': 'AF', 'BANGLADESH': 'BD', 'BHUTAN': 'BT',
    'INDIA': 'IN', 'MALDIVES': 'MV', 'NEPAL': 'NP', 'PAKISTAN': 'PK',
    'CEYLON': 'CE', 'SRI LANKA': 'CE', 'SIKKIM': 'SK',
    # Southeast Asia
    'BRUNEI': 'BN', 'CAMBODIA': 'KH', 'KHMER REPUBLIC': 'KH',
    'PORTUGUESE TIMOR': 'TP', 'EAST TIMOR': 'TP',
    'INDONESIA': 'ID', 'LAOS': 'LA', 'MALAYSIA': 'MY',
    'BURMA': 'BU', 'MYANMAR': 'BU', 'PHILIPPINES': 'PH',
    'SINGAPORE': 'SG', 'THAILAND': 'TH',
    'NORTH VIETNAM': 'VD', 'DEMOCRATIC REPUBLIC OF VIETNAM': 'VD',
    'SOUTH VIETNAM': 'VN', 'REPUBLIC OF VIETNAM': 'VN',
    'VIETNAM': 'VN',
    # East Asia
    'CHINA': 'CN', "PEOPLE'S REPUBLIC OF CHINA": 'CN',
    'HONG KONG': 'HK', 'JAPAN': 'JP', 'NORTH KOREA': 'KP',
    'SOUTH KOREA': 'KR', 'REPUBLIC OF KOREA': 'KR',
    'MACAU': 'MO', 'MACAO': 'MO', 'MONGOLIA': 'MN', 'TAIWAN': 'TW',
    'REPUBLIC OF CHINA': 'TW',
    # Oceania
    'AUSTRALIA': 'AU', 'FIJI': 'FJ', 'FRENCH POLYNESIA': 'PF',
    'GUAM': 'GU', 'NAURU': 'NR', 'NEW CALEDONIA': 'NC',
    'NEW ZEALAND': 'NZ', 'PAPUA NEW GUINEA': 'PG',
    'WESTERN SAMOA': 'WS', 'TONGA': 'TO', 'NEW HEBRIDES': 'VU',
    'GILBERT AND ELLICE ISLANDS': 'GE', 'SOLOMON ISLANDS': 'SB',
    # Other / territories
    'ANTIGUA': 'AG', 'DOMINICA': 'DM', 'ST. LUCIA': 'LC',
    'SAINT LUCIA': 'LC', 'ST. VINCENT': 'VC', 'SAINT VINCENT': 'VC',
    'ST. KITTS': 'KN', 'NETHERLANDS ANTILLES': 'AN',
    'FAEROE ISLANDS': 'FO', 'FAROE ISLANDS': 'FO',
    'BERMUDA': 'BM', 'WALLIS AND FUTUNA': 'WF',
    'WALLIS & FUTUNA': 'WF',
}

# Sections we extract; regex matches the header label
SECTION_RE = re.compile(
    r'^(LAND|WATER|PEOPLE|GOVERNMENT|ECONOMY|COMMUNICATIONS|DEFENSE\s+FORCES)\s*:',
    re.IGNORECASE
)

# A country header is an ALL-CAPS line (2+ words or 1 long word), not a section label
COUNTRY_HDR_RE = re.compile(r'^([A-Z][A-Z ,\-\(\)\.\']+)$')


# ── OCR helpers ───────────────────────────────────────────────────────────────
def ocr_page(png_path: Path) -> str:
    """Run tesseract on a page image, return the text."""
    result = subprocess.run(
        ['tesseract', str(png_path), 'stdout', '--psm', '6', '-l', 'eng'],
        capture_output=True, text=True, timeout=60
    )
    return result.stdout


def load_or_build_cache() -> dict:
    """Load cached OCR text, or build it fresh from rendered pages."""
    if CACHE_FILE.exists():
        print(f"Loading OCR cache from {CACHE_FILE} …")
        with open(CACHE_FILE) as f:
            return json.load(f)

    pages = sorted(PAGES_DIR.glob('p-*.png'))
    if not pages:
        sys.exit(f"No PNG pages found in {PAGES_DIR}. Run pdftoppm first.")

    print(f"OCR-ing {len(pages)} pages with {THREADS} threads…")
    cache = {}
    done = 0

    with ThreadPoolExecutor(max_workers=THREADS) as pool:
        futures = {pool.submit(ocr_page, p): p for p in pages}
        for fut in as_completed(futures):
            p = futures[fut]
            key = p.stem   # e.g. "p-001"
            try:
                cache[key] = fut.result()
            except Exception as e:
                print(f"  WARN: OCR failed for {p.name}: {e}")
                cache[key] = ''
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(pages)} pages done…")

    print(f"OCR complete. Saving cache…")
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f)
    return cache


# ── Parser ────────────────────────────────────────────────────────────────────
def clean_line(line: str) -> str:
    return line.strip()


def is_country_header(line: str) -> str | None:
    """Return the normalised country name if line looks like a country header."""
    line = line.strip()
    # Must be mostly uppercase, at least 3 chars, no digits
    if len(line) < 3 or re.search(r'\d', line):
        return None
    if not COUNTRY_HDR_RE.match(line):
        return None
    upper = line.upper().strip(' .,')
    # Skip known section headers
    if SECTION_RE.match(upper + ':'):
        return None
    # Skip very short words that are likely OCR noise
    if len(upper) < 4:
        return None
    return upper


def name_to_code(name: str) -> str | None:
    """Map a factbook country name to an ISO code."""
    name = name.upper().strip()
    if name in NAME_TO_CODE:
        return NAME_TO_CODE[name]
    # Try partial match for noise (e.g., leading/trailing punctuation)
    for key, code in NAME_TO_CODE.items():
        if name == key or name.startswith(key) or key.startswith(name):
            if abs(len(name) - len(key)) <= 3:
                return code
    return None


def parse_entries(cache: dict) -> dict:
    """
    Parse all page OCR text into a dict of { iso_code: { section: text } }.

    Strategy:
    - Concatenate all page text into a single stream of (page_num, line_num, text) tuples
    - Detect country headers (all-caps lines matching NAME_TO_CODE)
    - Detect section starts (LAND:, WATER:, etc.)
    - Accumulate text under the current section until next section or next country
    """
    # Build ordered list of lines with page provenance
    page_keys = sorted(cache.keys())  # p-001, p-002, …
    all_lines = []
    for pk in page_keys:
        for ln, line in enumerate(cache[pk].splitlines()):
            all_lines.append((pk, ln, line.rstrip()))

    factbook = {}   # code → { section → [lines] }
    current_code    = None
    current_section = None
    pending_name    = None   # country name seen, waiting for LAND: to confirm

    SECTIONS = ['LAND', 'WATER', 'PEOPLE', 'GOVERNMENT',
                'ECONOMY', 'COMMUNICATIONS', 'DEFENSE FORCES']

    def flush_pending():
        nonlocal pending_name, current_code, current_section
        if pending_name:
            code = name_to_code(pending_name)
            if code:
                if code not in factbook:
                    factbook[code] = {s: [] for s in SECTIONS}
                current_code = code
            else:
                current_code = None
            current_section = None
        pending_name = None

    i = 0
    while i < len(all_lines):
        _, _, line = all_lines[i]
        stripped = line.strip()
        upper    = stripped.upper()

        # Check for section header
        sec_match = re.match(
            r'^(LAND|WATER|PEOPLE|GOVERNMENT|ECONOMY|COMMUNICATIONS|DEFENSE\s+FORCES)\s*:',
            upper
        )
        if sec_match:
            flush_pending()
            sec_name = sec_match.group(1).replace('  ', ' ')
            # Normalise "DEFENSE FORCES" variants
            if 'DEFENSE' in sec_name:
                sec_name = 'DEFENSE FORCES'
            current_section = sec_name
            # Append the rest of the line after the colon
            rest = stripped[sec_match.end():].strip()
            if current_code and current_section:
                if rest:
                    factbook[current_code][current_section].append(rest)
            i += 1
            continue

        # Check for country header candidate
        cname = is_country_header(stripped)
        if cname and name_to_code(cname):
            # Could be a real country header — set as pending; confirm when LAND: seen
            pending_name = cname
            current_section = None
            i += 1
            continue

        # Accumulate content
        if current_code and current_section and stripped:
            # Skip page numbers, headers, footers (short numeric lines)
            if not re.fullmatch(r'[\d\s\-]+', stripped):
                factbook[current_code][current_section].append(stripped)

        i += 1

    return factbook


def sections_to_text(sections: dict) -> dict:
    """Join line lists into strings, drop empty sections."""
    return {
        sec: ' '.join(lines).strip()
        for sec, lines in sections.items()
        if lines
    }


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    cache = load_or_build_cache()

    print("Parsing factbook entries…")
    raw = parse_entries(cache)

    factbook = {code: sections_to_text(secs) for code, secs in raw.items()}
    # Drop codes with no content at all
    factbook = {code: secs for code, secs in factbook.items() if secs}

    print(f"Extracted {len(factbook)} country entries")

    # Sort by code for stable output
    ordered = dict(sorted(factbook.items()))

    # Write JavaScript
    js_lines = ['var CIA_FACTBOOK = ']
    js_lines.append(json.dumps(ordered, indent=2, ensure_ascii=False))
    js_lines.append(';')

    OUT_PATH.write_text('\n'.join(js_lines), encoding='utf-8')
    print(f"Saved → {OUT_PATH}")

    # Summary
    codes_with_all = [c for c, s in factbook.items() if len(s) >= 5]
    print(f"Entries with 5+ sections: {len(codes_with_all)}")
    print(f"Codes found: {', '.join(sorted(ordered.keys()))}")


if __name__ == '__main__':
    main()
