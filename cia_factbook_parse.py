#!/usr/bin/env python3
"""
cia_factbook_parse.py  —  Parse CIA World Factbook from pdftotext output.

Extracts factbook sections (LAND, WATER, PEOPLE, GOVERNMENT, ECONOMY,
COMMUNICATIONS, DEFENSE FORCES) for each country and writes cia_factbook.js.

Usage:
    pdftotext /path/to/ciaEDITED.pdf - | python3 cia_factbook_parse.py

Or if you want to save the raw text first:
    pdftotext /path/to/ciaEDITED.pdf /tmp/cia_raw.txt
    python3 cia_factbook_parse.py /tmp/cia_raw.txt
"""
import json, re, sys
from pathlib import Path

OUT_PATH = Path('/home/user/ACOTP/cia_factbook.js')

# ── Country name → ISO code ───────────────────────────────────────────────────
NAME_TO_CODE = {
    'ALBANIA': 'AL', 'ANDORRA': 'AD', 'AUSTRIA': 'AT', 'BELGIUM': 'BE',
    'BULGARIA': 'BG', 'CZECHOSLOVAKIA': 'CS', 'EAST GERMANY': 'DD',
    'GERMANY, EAST': 'DD', 'FEDERAL REPUBLIC OF GERMANY': 'DE',
    'WEST GERMANY': 'DE', 'GERMANY, WEST': 'DE', 'DENMARK': 'DK',
    'SPAIN': 'ES', 'FINLAND': 'FI', 'FRANCE': 'FR',
    'UNITED KINGDOM': 'GB', 'GREAT BRITAIN': 'GB', 'GREECE': 'GR',
    'HUNGARY': 'HU', 'IRELAND': 'IE', 'ICELAND': 'IS', 'ITALY': 'IT',
    'LIECHTENSTEIN': 'LI', 'LUXEMBOURG': 'LU', 'MONACO': 'MC',
    'MALTA': 'MT', 'NETHERLANDS': 'NL', 'NORWAY': 'NO', 'POLAND': 'PL',
    'PORTUGAL': 'PT', 'ROMANIA': 'RO', 'SAN MARINO': 'SM',
    'SOVIET UNION': 'SU', 'U.S.S.R.': 'SU', 'USSR': 'SU', 'SWEDEN': 'SE',
    'SWITZERLAND': 'CH', 'TURKEY': 'TR', 'VATICAN CITY': 'VA',
    'HOLY SEE': 'VA', 'YUGOSLAVIA': 'YU',
    'BAHAMAS': 'BS', 'BARBADOS': 'BB', 'BRITISH HONDURAS': 'BZ',
    'CANADA': 'CA', 'COSTA RICA': 'CR', 'CUBA': 'CU',
    'DOMINICAN REPUBLIC': 'DO', 'EL SALVADOR': 'SV', 'GREENLAND': 'GL',
    'GUADELOUPE': 'GP', 'GUATEMALA': 'GT', 'HAITI': 'HT',
    'HONDURAS': 'HN', 'JAMAICA': 'JM', 'MARTINIQUE': 'MQ',
    'MEXICO': 'MX', 'NICARAGUA': 'NI', 'PANAMA': 'PA',
    'PUERTO RICO': 'PR', 'TRINIDAD AND TOBAGO': 'TT',
    'TRINIDAD & TOBAGO': 'TT', 'UNITED STATES': 'US', 'GRENADA': 'GD',
    'ARGENTINA': 'AR', 'BOLIVIA': 'BO', 'BRAZIL': 'BR', 'CHILE': 'CL',
    'COLOMBIA': 'CO', 'ECUADOR': 'EC', 'FALKLAND ISLANDS': 'FK',
    'FRENCH GUIANA': 'GF', 'GUYANA': 'GY', 'PARAGUAY': 'PY',
    'PERU': 'PE', 'SURINAM': 'SR', 'SURINAME': 'SR',
    'URUGUAY': 'UY', 'VENEZUELA': 'VE',
    'ALGERIA': 'DZ', 'ANGOLA': 'AO', 'DAHOMEY': 'DY', 'BOTSWANA': 'BW',
    'BURUNDI': 'BI', 'CAMEROON': 'CM', 'CAPE VERDE': 'CV',
    'CENTRAL AFRICAN REPUBLIC': 'CF', 'CHAD': 'TD',
    'COMORO ISLANDS': 'KM', 'COMOROS': 'KM',
    'CONGO': 'CG', 'CONGO (BRAZZAVILLE)': 'CG',
    'ZAIRE': 'ZR', 'EGYPT': 'EG', 'UNITED ARAB REPUBLIC': 'EG',
    'EQUATORIAL GUINEA': 'GQ', 'ETHIOPIA': 'ET', 'GABON': 'GA',
    'GAMBIA': 'GM', 'GHANA': 'GH', 'GUINEA': 'GN',
    'GUINEA-BISSAU': 'GW', 'PORTUGUESE GUINEA': 'GW',
    'UPPER VOLTA': 'HV', 'IVORY COAST': 'CI',
    'KENYA': 'KE', 'LESOTHO': 'LS', 'LIBERIA': 'LR', 'LIBYA': 'LY',
    'MALAGASY REPUBLIC': 'MG', 'MALAWI': 'MW', 'MALI': 'ML',
    'MAURITANIA': 'MR', 'MAURITIUS': 'MU', 'MOROCCO': 'MA',
    'MOZAMBIQUE': 'MZ', 'SOUTH WEST AFRICA': 'SWA', 'NAMIBIA': 'SWA',
    'NIGER': 'NE', 'NIGERIA': 'NG', 'REUNION': 'RE', 'RÉUNION': 'RE',
    'RHODESIA': 'RH', 'RWANDA': 'RW',
    'SAO TOME AND PRINCIPE': 'ST', 'ST. THOMAS AND PRINCE': 'ST',
    'SENEGAL': 'SN', 'SEYCHELLES': 'SC', 'SIERRA LEONE': 'SL',
    'SOMALIA': 'SO', 'SOUTH AFRICA': 'ZA', 'SOUTH-WEST AFRICA': 'SWA',
    'SUDAN': 'SD', 'SWAZILAND': 'SZ', 'TANZANIA': 'TZ', 'TOGO': 'TG',
    'TUNISIA': 'TN', 'UGANDA': 'UG', 'WESTERN SAHARA': 'EH',
    'SPANISH SAHARA': 'EH', 'ZAMBIA': 'ZM',
    'BAHRAIN': 'BH', 'CYPRUS': 'CY', 'IRAN': 'IR', 'IRAQ': 'IQ',
    'ISRAEL': 'IL', 'JORDAN': 'JO', 'KUWAIT': 'KW', 'LEBANON': 'LB',
    'OMAN': 'OM', 'QATAR': 'QA', 'SAUDI ARABIA': 'SA', 'SYRIA': 'SY',
    'UNITED ARAB EMIRATES': 'AE', 'NORTH YEMEN': 'YE', 'YEMEN': 'YE',
    'YEMEN ARAB REPUBLIC': 'YE', 'SOUTH YEMEN': 'YD',
    'AFGHANISTAN': 'AF', 'BANGLADESH': 'BD', 'BHUTAN': 'BT',
    'INDIA': 'IN', 'MALDIVES': 'MV', 'NEPAL': 'NP', 'PAKISTAN': 'PK',
    'CEYLON': 'CE', 'SRI LANKA': 'CE', 'SIKKIM': 'SK',
    'BRUNEI': 'BN', 'CAMBODIA': 'KH', 'KHMER REPUBLIC': 'KH',
    'PORTUGUESE TIMOR': 'TP', 'EAST TIMOR': 'TP',
    'INDONESIA': 'ID', 'LAOS': 'LA', 'MALAYSIA': 'MY', 'BURMA': 'BU',
    'MYANMAR': 'BU', 'PHILIPPINES': 'PH', 'SINGAPORE': 'SG',
    'THAILAND': 'TH', 'NORTH VIETNAM': 'VD', 'VIETNAM, NORTH': 'VD',
    'SOUTH VIETNAM': 'VN', 'VIETNAM, SOUTH': 'VN',
    'CHINA': 'CN', "PEOPLE'S REPUBLIC OF CHINA": 'CN',
    'HONG KONG': 'HK', 'JAPAN': 'JP', 'NORTH KOREA': 'KP',
    'SOUTH KOREA': 'KR', 'MACAU': 'MO', 'MACAO': 'MO',
    'MONGOLIA': 'MN', 'TAIWAN': 'TW', 'REPUBLIC OF CHINA': 'TW',
    'AUSTRALIA': 'AU', 'FIJI': 'FJ', 'FRENCH POLYNESIA': 'PF',
    'GUAM': 'GU', 'NAURU': 'NR', 'NEW CALEDONIA': 'NC',
    'NEW ZEALAND': 'NZ', 'PAPUA NEW GUINEA': 'PG', 'WESTERN SAMOA': 'WS',
    'TONGA': 'TO', 'NEW HEBRIDES': 'VU', 'WALLIS AND FUTUNA': 'WF',
    # Minor entries that appear in the text layer
    'ST. CHRISTOPHER-NEVIS-ANGUILLA': 'KN', 'ST. LUCIA': 'LC',
    'ST. VINCENT': 'VC',
    # Factbook uses parenthetical qualifiers for divided countries
    'YEMEN (ADEN)': 'YD', 'YEMEN (SANA)': 'YE',
    'GERMANY (EAST)': 'DD', 'GERMANY (WEST)': 'DE',
    'KOREA (NORTH)': 'KP', 'KOREA (SOUTH)': 'KR',
    'VIETNAM (NORTH)': 'VD', 'VIETNAM (SOUTH)': 'VN',
    'CHINA (MAINLAND)': 'CN', 'CHINA (TAIWAN)': 'TW',
}

# Geographic region labels that appear as page headers — never valid country entries
REGION_LABELS = {
    'AUSTRALIA', 'NORTH AMERICA', 'SOUTH AMERICA', 'CENTRAL AMERICA',
    'MIDDLE EAST', 'SOUTH ASIA', 'SOUTHEAST ASIA', 'EAST ASIA',
    'AFRICA', 'EUROPE', 'OCEANIA', 'CARIBBEAN', 'PACIFIC',
    'WESTERN EUROPE', 'EASTERN EUROPE',
}

# ── Section headers we care about ─────────────────────────────────────────────
SECTION_NAMES = ['LAND', 'WATER', 'PEOPLE', 'GOVERNMENT', 'ECONOMY',
                 'COMMUNICATIONS', 'DEFENSE FORCES']

SECTION_RE = re.compile(
    r'^(LAND|WATER|PEOPLE|GOVERNMENT|ECONOMY|COMMUNICATIONS|DEFENSE\s+FORCES)\s*:',
    re.IGNORECASE
)

# Junk lines to skip (page numbers, headers, footers, classification)
JUNK_RE = re.compile(
    r'^(Approved For Release|CIA-RDP|^\d+$|^\s*$)',
    re.IGNORECASE
)


def normalize_country_name(raw: str) -> str | None:
    """Map raw text country name to ISO code, or None."""
    name = raw.strip().upper()
    # Direct lookup
    if name in NAME_TO_CODE:
        return NAME_TO_CODE[name]
    # Try removing trailing punctuation
    name2 = re.sub(r'[,\.\(\)]+$', '', name).strip()
    if name2 in NAME_TO_CODE:
        return NAME_TO_CODE[name2]
    return None


def is_country_header(line: str) -> str | None:
    """Return ISO code if this line is an all-caps country name, else None."""
    stripped = line.strip()
    # Must be all uppercase (allowing spaces, hyphens, dots, apostrophes, commas, parens)
    if not stripped:
        return None
    if not re.fullmatch(r"[A-Z][A-Z '\-\.,\(\)&/]+", stripped):
        return None
    # Must be at least 4 chars
    if len(stripped) < 4:
        return None
    # Must not contain digits
    if re.search(r'\d', stripped):
        return None
    # Must not match a section header
    if SECTION_RE.match(stripped + ':'):
        return None
    # Reject known geographic region labels
    if stripped.upper() in REGION_LABELS:
        return None
    return normalize_country_name(stripped)


def parse_factbook_text(text: str) -> dict:
    """Parse pdftotext output into {iso_code: {section: text_block}}."""
    lines = text.splitlines()

    # Deduplicate: the text layer appears twice. Take first half if we detect repeat.
    # Simple heuristic: find if line ~6000 contains "PORTUGUESE TIMOR" again
    dedup_boundary = None
    for i, line in enumerate(lines):
        if i > 500 and line.strip() == 'PORTUGUESE TIMOR':
            dedup_boundary = i
            break
    if dedup_boundary:
        lines = lines[:dedup_boundary]

    factbook = {}   # code → {section: [lines]}
    current_code    = None
    current_section = None

    def flush():
        pass  # Already building incrementally

    pending_code    = None   # country name seen but not yet confirmed by a section
    current_code    = None
    current_section = None

    for line in lines:
        stripped = line.strip()

        # Skip junk
        if JUNK_RE.match(stripped):
            continue

        # Check for section header
        sec_match = SECTION_RE.match(stripped)
        if sec_match:
            sec = sec_match.group(1).upper().strip()
            if 'DEFENSE' in sec:
                sec = 'DEFENSE FORCES'
            # Confirm any pending country name now that we see content
            if pending_code:
                current_code = pending_code
                current_section = None
                if current_code not in factbook:
                    factbook[current_code] = {}
                pending_code = None
            current_section = sec
            # Text after the colon on the same line
            rest = stripped[sec_match.end():].strip()
            if current_code and current_section:
                if current_section not in factbook[current_code]:
                    factbook[current_code][current_section] = []
                if rest:
                    factbook[current_code][current_section].append(rest)
            continue

        # Check for country header
        code = is_country_header(stripped)
        if code:
            if pending_code and pending_code != code:
                # Two country names in a row with no section between them.
                # Keep the FIRST one — it's the entry subject; the second is a
                # neighboring-country label on the context map (e.g., SURINAM then BRAZIL).
                # Exception: if we haven't accumulated any section for current_code yet,
                # replace pending with the new name (fresh page).
                if current_code and factbook.get(current_code):
                    # We're mid-entry — new name is likely a map label; ignore it
                    pass
                else:
                    # No current entry, or current entry is empty: second name wins
                    pending_code = code
            else:
                pending_code = code
            current_section = None
            continue

        # Accumulate content lines (only add if we have a confirmed country + section)
        if current_code and current_section and stripped:
            # Skip page numbers and very short noise lines
            if re.fullmatch(r'[\d\s\-]+', stripped):
                continue
            if current_section not in factbook[current_code]:
                factbook[current_code][current_section] = []
            factbook[current_code][current_section].append(stripped)

    # Post-processing: fix known misattributed entries caused by map context labels
    # Key: wrong code assigned → (correct code, action)
    # 'merge': merge wrong-code sections into correct code, then delete wrong
    # 'rename': rename wrong code to correct code
    # 'drop': discard the wrong-code entry entirely
    REMAP = {
        'IT': ('SM', 'rename'),  # ITALY header precedes San Marino content
        'CO': ('TT', 'merge'),   # COLOMBIA map label in TT/SR area; content is Trinidad's
        'PE': ('SR', 'merge'),   # PERU map label; content is Surinam's WATER+ sections
    }

    for wrong_code, (correct_code, action) in REMAP.items():
        if wrong_code not in factbook:
            continue
        if action == 'drop':
            del factbook[wrong_code]
        elif action == 'rename':
            factbook[correct_code] = factbook.pop(wrong_code)
        elif action == 'merge':
            # Add sections from wrong_code into correct_code (don't overwrite existing)
            if correct_code not in factbook:
                factbook[correct_code] = {}
            for sec, lines in factbook[wrong_code].items():
                if sec not in factbook[correct_code]:
                    factbook[correct_code][sec] = lines
            del factbook[wrong_code]

    # Join lists to strings
    result = {}
    for code, sections in factbook.items():
        joined = {sec: ' '.join(lines).strip() for sec, lines in sections.items() if lines}
        if joined:
            result[code] = joined

    return result


def main():
    # Read input
    if len(sys.argv) > 1:
        text = Path(sys.argv[1]).read_text(encoding='utf-8', errors='replace')
    else:
        text = sys.stdin.read()

    print(f"Parsing {len(text):,} chars of factbook text…")
    factbook = parse_factbook_text(text)

    print(f"Extracted {len(factbook)} country entries")
    for code in sorted(factbook.keys()):
        secs = list(factbook[code].keys())
        print(f"  {code}: {', '.join(secs)}")

    # Write JS
    ordered = dict(sorted(factbook.items()))
    js = 'var CIA_FACTBOOK = \n' + json.dumps(ordered, indent=2, ensure_ascii=False) + ';\n'
    OUT_PATH.write_text(js, encoding='utf-8')
    print(f"\nSaved → {OUT_PATH}")


if __name__ == '__main__':
    main()
