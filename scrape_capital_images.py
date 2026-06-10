#!/usr/bin/env python3
"""
Scrape 1970s-era flavour images for world map capitals.

Sources (in order):
  1. Library of Congress API — USIA photograph collection (free, no key)
  2. Wikimedia Commons — fallback

Outputs:
  capital_images_candidates.json   — all candidates per capital for manual review
  capital_images.js                — best-pick JS snippet ready to paste into CAPITAL_IMAGES

Usage:
  pip install requests
  python scrape_capital_images.py
  python scrape_capital_images.py --codes US,GB,VN,CL,EG,JP
  python scrape_capital_images.py --skip-loc        # Wikimedia only
  python scrape_capital_images.py --out ./results
"""

import requests
import json
import time
import argparse
import sys
from pathlib import Path

# All entries from CAPITAL_DATA in the mod
CAPITALS = {
    # North America
    'US': 'Washington D.C.', 'CA': 'Ottawa',          'MX': 'Mexico City',
    'GT': 'Guatemala City',  'BZ': 'Belmopan',         'SV': 'San Salvador',
    'HN': 'Tegucigalpa',     'NI': 'Managua',          'CR': 'San José',
    'PA': 'Panama City',     'CU': 'Havana',            'JM': 'Kingston',
    'HT': 'Port-au-Prince',  'DO': 'Santo Domingo',    'TT': 'Port of Spain',
    'BS': 'Nassau',          'BB': 'Bridgetown',        'GY': 'Georgetown',
    'SR': 'Paramaribo',
    # South America
    'CO': 'Bogotá',          'VE': 'Caracas',           'EC': 'Quito',
    'PE': 'Lima',            'BO': 'La Paz',            'CL': 'Santiago',
    'AR': 'Buenos Aires',    'UY': 'Montevideo',        'PY': 'Asunción',
    'BR': 'Brasília',
    # Europe
    'GB': 'London',          'IE': 'Dublin',            'FR': 'Paris',
    'ES': 'Madrid',          'PT': 'Lisbon',            'DE': 'Bonn',
    'DD': 'East Berlin',     'NL': 'Amsterdam',         'BE': 'Brussels',
    'LU': 'Luxembourg City', 'CH': 'Bern',              'AT': 'Vienna',
    'IT': 'Rome',            'GR': 'Athens',            'TR': 'Ankara',
    'AL': 'Tirana',          'YU': 'Belgrade',          'CS': 'Prague',
    'HU': 'Budapest',        'RO': 'Bucharest',         'BG': 'Sofia',
    'PL': 'Warsaw',          'SE': 'Stockholm',         'NO': 'Oslo',
    'DK': 'Copenhagen',      'FI': 'Helsinki',          'IS': 'Reykjavik',
    # Soviet Union
    'SU': 'Moscow',
    # Middle East
    'SY': 'Damascus',        'LB': 'Beirut',            'IL': 'Tel Aviv',
    'JO': 'Amman',           'IQ': 'Baghdad',           'IR': 'Tehran',
    'SA': 'Riyadh',          'YE': 'Sanaa',             'KW': 'Kuwait City',
    # Africa
    'EG': 'Cairo',           'LY': 'Tripoli',           'TN': 'Tunis',
    'DZ': 'Algiers',         'MA': 'Rabat',             'MR': 'Nouakchott',
    'SN': 'Dakar',           'ML': 'Bamako',            'NE': 'Niamey',
    'NG': 'Lagos',           'GH': 'Accra',             'CI': 'Abidjan',
    'ET': 'Addis Ababa',     'KE': 'Nairobi',           'TZ': 'Dar es Salaam',
    'ZA': 'Pretoria',        'ZM': 'Lusaka',            'ZW': 'Salisbury',
    'MZ': 'Lourenço Marques','AO': 'Luanda',            'CD': 'Kinshasa',
    # Asia
    'AF': 'Kabul',           'PK': 'Islamabad',         'IN': 'New Delhi',
    'BD': 'Dhaka',           'LK': 'Colombo',           'NP': 'Kathmandu',
    'MM': 'Rangoon',         'TH': 'Bangkok',           'KH': 'Phnom Penh',
    'VN': 'Saigon',          'LA': 'Vientiane',         'MY': 'Kuala Lumpur',
    'SG': 'Singapore',       'ID': 'Jakarta',           'PH': 'Manila',
    'TW': 'Taipei',          'KR': 'Seoul',             'KP': 'Pyongyang',
    'JP': 'Tokyo',           'MN': 'Ulaanbaatar',       'CN': 'Beijing',
    # Oceania
    'AU': 'Canberra',        'NZ': 'Wellington',        'PG': 'Port Moresby',
    'FJ': 'Suva',
}

LOC_SEARCH  = 'https://www.loc.gov/search/'
COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

# Both APIs require a descriptive User-Agent
HEADERS = {
    'User-Agent': 'ACOP-capital-scraper/1.0 (Campaign Trail Nixon mod; '
                  'github.com/evil-knevil69/ACOTP)'
}

IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.gif')


def _get(url: str, params: dict, timeout: int = 15) -> requests.Response:
    """GET with automatic retry on 429 (back off 8 s then 20 s before giving up)."""
    for wait in (0, 8, 20):
        if wait:
            print(f'    rate-limited, waiting {wait}s…', file=sys.stderr)
            time.sleep(wait)
        r = requests.get(url, params=params, headers=HEADERS, timeout=timeout)
        if r.status_code != 429:
            r.raise_for_status()
            return r
    raise requests.HTTPError(f'429 persists after retries: {url}')


def search_loc(city: str, n: int = 5) -> list[dict]:
    """Search LoC for USIA photographs of a capital city."""
    queries = [f'USIA "{city}"', f'USIA {city}']
    for q in queries:
        try:
            r = _get(LOC_SEARCH, {'q': q, 'fo': 'json', 'c': n,
                                  'fa': 'online-format:image'})
            results = []
            for item in r.json().get('results', []):
                img_urls = item.get('image_url') or []
                img = img_urls[-1] if img_urls else None
                if not img or not any(img.lower().endswith(e) for e in IMAGE_EXTS):
                    continue
                title = item.get('title', '')
                if isinstance(title, list):
                    title = title[0] if title else ''
                results.append({
                    'url':    img,
                    'title':  title,
                    'date':   item.get('date', ''),
                    'page':   item.get('url', ''),
                    'source': 'loc',
                })
            if results:
                return results[:n]
            time.sleep(1.0)
        except Exception as e:
            print(f'    LoC error: {e}', file=sys.stderr)
    return []


def get_commons_thumb(title: str) -> str | None:
    """Resolve a Wikimedia Commons File: title to a ~500px thumbnail URL."""
    try:
        r = _get(COMMONS_API, {
            'action': 'query', 'titles': title,
            'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': 500,
            'format': 'json',
        }, timeout=10)
        for page in r.json().get('query', {}).get('pages', {}).values():
            ii = (page.get('imageinfo') or [{}])[0]
            return ii.get('thumburl') or ii.get('url')
    except Exception as e:
        print(f'    Commons thumb error: {e}', file=sys.stderr)
    return None


def search_wikimedia(city: str, n: int = 3) -> list[dict]:
    """Search Wikimedia Commons for historical photos of a capital city."""
    queries = [f'{city} 1970s', f'{city} monument 1960s', f'{city} historical']
    results = []
    for query in queries:
        try:
            r = _get(COMMONS_API, {
                'action': 'query', 'list': 'search', 'srsearch': query,
                'srnamespace': 6, 'srlimit': n * 2, 'format': 'json',
            }, timeout=10)
            time.sleep(1.5)   # Wikimedia asks for ≥1s between requests
            for hit in r.json().get('query', {}).get('search', []):
                title = hit['title']
                if not any(title.lower().endswith(e) for e in IMAGE_EXTS):
                    continue
                url = get_commons_thumb(title)
                if url:
                    results.append({
                        'url':    url,
                        'title':  title.replace('File:', '').strip(),
                        'date':   '',
                        'page':   'https://commons.wikimedia.org/wiki/' + title.replace(' ', '_'),
                        'source': 'wikimedia',
                    })
                time.sleep(1.5)
                if len(results) >= n:
                    return results
        except Exception as e:
            print(f'    Wikimedia error: {e}', file=sys.stderr)
            time.sleep(3.0)
    return results


def scrape(codes: list[str], skip_loc: bool) -> dict:
    all_results = {}
    for i, code in enumerate(codes):
        city = CAPITALS[code]
        print(f'[{i+1}/{len(codes)}] {code} — {city}')
        candidates = []

        if not skip_loc:
            loc = search_loc(city)
            print(f'  LoC:       {len(loc)} result(s)' if loc else '  LoC:       none')
            candidates.extend(loc)
            time.sleep(1.5)   # be polite to loc.gov

        if len(candidates) < 2:
            wiki = search_wikimedia(city)
            print(f'  Wikimedia: {len(wiki)} result(s)' if wiki else '  Wikimedia: none')
            candidates.extend(wiki)

        all_results[code] = {
            'city':       city,
            'candidates': candidates,
            'best':       candidates[0]['url'] if candidates else None,
        }
        time.sleep(1.0)
    return all_results


def write_outputs(results: dict, out_dir: Path) -> None:
    candidates_path = out_dir / 'capital_images_candidates.json'
    with open(candidates_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f'\nCandidates → {candidates_path}')

    js_lines, missing = [], []
    for code, data in sorted(results.items()):
        if data['best']:
            js_lines.append(f"    '{code}': '{data['best']}',  // {data['city']}")
        else:
            missing.append(f"{code} ({data['city']})")

    js_path = out_dir / 'capital_images.js'
    with open(js_path, 'w') as f:
        f.write('// Paste into CAPITAL_IMAGES in ACOP Nixon_Agnew.txt\n')
        f.write('// Review capital_images_candidates.json and swap URLs as needed\n')
        f.write('const CAPITAL_IMAGES = {\n')
        f.write('\n'.join(js_lines))
        f.write('\n};\n')
    print(f'JS snippet  → {js_path}')

    print(f'\n{len(results) - len(missing)}/{len(results)} capitals matched.')
    if missing:
        print('No image found for:')
        for m in missing:
            print(f'  {m}')


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--codes',    metavar='US,GB,...',
                   help='Comma-separated country codes (default: all)')
    p.add_argument('--skip-loc', action='store_true',
                   help='Skip Library of Congress, use Wikimedia only')
    p.add_argument('--out',      metavar='DIR', default='.',
                   help='Output directory (default: current)')
    args = p.parse_args()

    codes = [c.strip().upper() for c in args.codes.split(',')] if args.codes else list(CAPITALS.keys())
    unknown = [c for c in codes if c not in CAPITALS]
    if unknown:
        print(f'Unknown codes (skipped): {unknown}', file=sys.stderr)
        codes = [c for c in codes if c in CAPITALS]

    Path(args.out).mkdir(parents=True, exist_ok=True)
    print(f'Scraping {len(codes)} capital(s) — LoC USIA + Wikimedia Commons\n')
    results = scrape(codes, args.skip_loc)
    write_outputs(results, Path(args.out))


if __name__ == '__main__':
    main()
