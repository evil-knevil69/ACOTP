#!/usr/bin/env python3
"""
Scrape 1970s-era flavour images for world map capitals.

Sources (in order):
  1. Flickr — Library of Congress / USIA collection (public domain)
  2. Wikimedia Commons — fallback

Outputs:
  capital_images_candidates.json   — all candidates per capital for review
  capital_images.js                — best-pick JS snippet ready to paste into CAPITAL_IMAGES

Usage:
  pip install requests
  python scrape_capital_images.py --flickr-key YOUR_KEY
  python scrape_capital_images.py --flickr-key YOUR_KEY --codes US,GB,FR,DE
  python scrape_capital_images.py --flickr-key YOUR_KEY --skip-flickr  # Wikimedia only

Get a free Flickr API key at: https://www.flickr.com/services/apps/create/
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
    # Soviet Union / Eastern Europe
    'SU': 'Moscow',
    # Middle East
    'TR': 'Ankara',          'SY': 'Damascus',          'LB': 'Beirut',
    'IL': 'Tel Aviv',        'JO': 'Amman',             'IQ': 'Baghdad',
    'IR': 'Tehran',          'SA': 'Riyadh',            'YE': 'Sanaa',
    'KW': 'Kuwait City',
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
    'BT': 'Thimphu',         'MM': 'Rangoon',           'TH': 'Bangkok',
    'KH': 'Phnom Penh',      'VN': 'Saigon',            'LA': 'Vientiane',
    'MY': 'Kuala Lumpur',    'SG': 'Singapore',         'ID': 'Jakarta',
    'PH': 'Manila',          'TW': 'Taipei',            'KR': 'Seoul',
    'KP': 'Pyongyang',       'JP': 'Tokyo',             'MN': 'Ulaanbaatar',
    'CN': 'Beijing',
    # Oceania
    'AU': 'Canberra',        'NZ': 'Wellington',        'PG': 'Port Moresby',
    'FJ': 'Suva',
}

FLICKR_API   = 'https://api.flickr.com/services/rest/'
LOC_USER_ID  = '8623220@N02'   # Library of Congress Flickr account
COMMONS_API  = 'https://commons.wikimedia.org/w/api.php'

# Wikimedia blocks requests without a descriptive User-Agent
HEADERS = {'User-Agent': 'ACOP-capital-scraper/1.0 (Campaign Trail mod; contact via GitHub)'}


def search_flickr(city: str, api_key: str, n: int = 5) -> list[dict]:
    """Search LoC Flickr for USIA photos of a capital city."""
    # Try progressively broader queries
    queries = [
        f'USIA "{city}"',
        f'"{city}" 1970',
        f'"{city}"',
    ]
    for query in queries:
        try:
            r = requests.get(FLICKR_API, params={
                'method':        'flickr.photos.search',
                'api_key':       api_key,
                'user_id':       LOC_USER_ID,
                'text':          query,
                'extras':        'url_m,url_s,date_taken',
                'format':        'json',
                'nojsoncallback': 1,
                'per_page':      n,
                'sort':          'relevance',
            }, timeout=10)
            r.raise_for_status()
            photos = r.json().get('photos', {}).get('photo', [])
            results = []
            for p in photos:
                url = p.get('url_m') or p.get('url_s')
                if not url:
                    continue
                results.append({
                    'url':    url,
                    'title':  p.get('title', '').strip(),
                    'date':   (p.get('datetaken') or '')[:10],
                    'page':   f"https://www.flickr.com/photos/{p['owner']}/{p['id']}",
                    'source': 'flickr',
                })
            if results:
                return results
        except Exception as e:
            print(f'    Flickr error ({query}): {e}', file=sys.stderr)
    return []


def get_commons_url(title: str) -> str | None:
    """Resolve a Commons File: title to a thumbnail URL (~500px wide)."""
    try:
        r = requests.get(COMMONS_API, params={
            'action':     'query',
            'titles':     title,
            'prop':       'imageinfo',
            'iiprop':     'url',
            'iiurlwidth': 500,
            'format':     'json',
        }, headers=HEADERS, timeout=10)
        r.raise_for_status()
        for page in r.json().get('query', {}).get('pages', {}).values():
            ii = (page.get('imageinfo') or [{}])[0]
            return ii.get('thumburl') or ii.get('url')
    except Exception as e:
        print(f'    Commons URL error ({title}): {e}', file=sys.stderr)
    return None


def search_wikimedia(city: str, n: int = 3) -> list[dict]:
    """Search Wikimedia Commons for historical photos of a capital city."""
    queries = [
        f'{city} 1970s monument',
        f'{city} 1960s landmark',
        f'{city} historical photograph',
    ]
    results = []
    for query in queries:
        try:
            r = requests.get(COMMONS_API, params={
                'action':      'query',
                'list':        'search',
                'srsearch':    query,
                'srnamespace': 6,        # File: namespace only
                'srlimit':     n * 2,
                'format':      'json',
            }, headers=HEADERS, timeout=10)
            r.raise_for_status()
            hits = r.json().get('query', {}).get('search', [])
            for hit in hits:
                title = hit['title']
                # Only JPEG/PNG
                if not any(title.lower().endswith(ext) for ext in ('.jpg', '.jpeg', '.png')):
                    continue
                url = get_commons_url(title)
                if url:
                    results.append({
                        'url':    url,
                        'title':  title.replace('File:', '').strip(),
                        'date':   '',
                        'page':   'https://commons.wikimedia.org/wiki/' + title.replace(' ', '_'),
                        'source': 'wikimedia',
                    })
                    time.sleep(0.15)
                if len(results) >= n:
                    return results
        except Exception as e:
            print(f'    Wikimedia error ({query}): {e}', file=sys.stderr)
    return results


def scrape(codes: list[str], flickr_key: str | None, skip_flickr: bool) -> dict:
    all_results = {}

    for i, code in enumerate(codes):
        city = CAPITALS[code]
        print(f'[{i+1}/{len(codes)}] {code} — {city}')

        candidates = []

        if flickr_key and not skip_flickr:
            flickr = search_flickr(city, flickr_key)
            if flickr:
                print(f'  Flickr: {len(flickr)} result(s)')
            else:
                print(f'  Flickr: none')
            candidates.extend(flickr)
            time.sleep(0.3)

        if len(candidates) < 2:
            wiki = search_wikimedia(city)
            if wiki:
                print(f'  Wikimedia: {len(wiki)} result(s)')
            else:
                print(f'  Wikimedia: none')
            candidates.extend(wiki)

        all_results[code] = {
            'city':       city,
            'candidates': candidates,
            'best':       candidates[0]['url'] if candidates else None,
        }

        time.sleep(0.2)

    return all_results


def write_outputs(results: dict, out_dir: Path) -> None:
    # Full candidates JSON for review
    candidates_path = out_dir / 'capital_images_candidates.json'
    with open(candidates_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f'\nCandidates saved → {candidates_path}')

    # JS snippet — only entries where we found something
    js_lines = []
    missing = []
    for code, data in sorted(results.items()):
        if data['best']:
            city_pad = f"'{code}'"
            js_lines.append(f"    {city_pad}: '{data['best']}',  // {data['city']}")
        else:
            missing.append(f"{code} ({data['city']})")

    js_path = out_dir / 'capital_images.js'
    with open(js_path, 'w') as f:
        f.write('// Paste this into CAPITAL_IMAGES in ACOP Nixon_Agnew.txt\n')
        f.write('// Review candidates in capital_images_candidates.json and swap URLs as needed\n')
        f.write('const CAPITAL_IMAGES = {\n')
        f.write('\n'.join(js_lines))
        f.write('\n};\n')
    print(f'JS snippet saved  → {js_path}')

    if missing:
        print(f'\nNo image found for {len(missing)} capital(s):')
        for m in missing:
            print(f'  {m}')


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--flickr-key',  metavar='KEY',
                        help='Flickr API key (free at flickr.com/services/apps/create)')
    parser.add_argument('--codes', metavar='US,GB,...',
                        help='Comma-separated country codes to process (default: all)')
    parser.add_argument('--skip-flickr', action='store_true',
                        help='Skip Flickr, use Wikimedia only')
    parser.add_argument('--out', metavar='DIR', default='.',
                        help='Output directory (default: current)')
    args = parser.parse_args()

    if not args.flickr_key and not args.skip_flickr:
        print('Warning: no --flickr-key provided; falling back to Wikimedia only', file=sys.stderr)

    codes = [c.strip().upper() for c in args.codes.split(',')] if args.codes else list(CAPITALS.keys())
    unknown = [c for c in codes if c not in CAPITALS]
    if unknown:
        print(f'Unknown codes (skipped): {unknown}', file=sys.stderr)
        codes = [c for c in codes if c in CAPITALS]

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f'Scraping {len(codes)} capital(s)...\n')
    results = scrape(codes, args.flickr_key, args.skip_flickr)
    write_outputs(results, out_dir)


if __name__ == '__main__':
    main()
