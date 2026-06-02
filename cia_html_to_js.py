#!/usr/bin/env python3
"""
cia_html_to_js.py  —  Convert CIA HTML factfiles to CIA_FACTBOOK JS object.

Reads all CIA/*.html, parses the structured sections (Land, People, etc.)
and dt/dd field pairs, maps filenames to 1972 ISO codes, and writes
CIA_FACTBOOK as a JS variable.

Usage:
    python3 cia_html_to_js.py          # writes cia_factbook.js
"""
import html, json, os, re
from html.parser import HTMLParser
from pathlib import Path

CIA_DIR  = Path(__file__).parent / 'CIA'
OUT_PATH = Path(__file__).parent / 'cia_factbook.js'

# ── Filename → ISO code ───────────────────────────────────────────────────────
FILENAME_TO_CODE = {
    'afghanistan':                      'AF',
    'albania':                          'AL',
    'algeria':                          'DZ',
    'andorra':                          'AD',
    'angola':                           'AO',
    'antigua':                          'AG',
    'argentina':                        'AR',
    'austria':                          'AT',
    'bahamas':                          'BS',
    'bahrain':                          'BH',
    'bangladesh':                       'BD',
    'barbados':                         'BB',
    'belgium':                          'BE',
    'bermuda':                          'BM',
    'bhutan':                           'BT',
    'bolivia':                          'BO',
    'botswana':                         'BW',
    'brazil':                           'BR',
    'british-solomon-islands':          'SB',
    'brunei':                           'BN',
    'bulgaria':                         'BG',
    'burma':                            'BU',
    'burundi':                          'BI',
    'cambodia':                         'KH',
    'cameroon':                         'CM',
    'canada':                           'CA',
    'central-african-republic':         'CF',
    'chad':                             'TD',
    'chile':                            'CL',
    'china-people-s-republic-of':       'CN',
    'china-republic-of':                'TW',
    'colombia':                         'CO',
    'comoro-islands':                   'KM',
    'congo':                            'CG',
    'cook-islands':                     'CK',
    'costa-rica':                       'CR',
    'cuba':                             'CU',
    'cyprus':                           'CY',
    'czechoslovakia':                   'CS',
    'dahomey':                          'DY',
    'denmark':                          'DK',
    'dominica':                         'DM',
    'dominican-republic':               'DO',
    'ecuador':                          'EC',
    'egypt':                            'EG',
    'el-salvador':                      'SV',
    'equatorial-guinea':                'GQ',
    'ethiopia':                         'ET',
    'faeroe-islands':                   'FO',
    'falkland-islands-malvinas':        'FK',
    'fiji':                             'FJ',
    'finland':                          'FI',
    'france':                           'FR',
    'french-guiana':                    'GF',
    'french-polynesia':                 'PF',
    'french-territory-of-the-afars-and-issas': 'FTAI',
    'gabon':                            'GA',
    'gambia':                           'GM',
    'germany-east':                     'DD',
    'germany-west':                     'DE',
    'ghana':                            'GH',
    'gibraltar':                        'GI',
    'gilbert-and-ellice-islands':       'GE',
    'greece':                           'GR',
    'greenland':                        'GL',
    'grenada':                          'GD',
    'guadeloupe':                       'GP',
    'guatemala':                        'GT',
    'guinea':                           'GN',
    'guyana':                           'GY',
    'haiti':                            'HT',
    'honduras':                         'HN',
    'hong-kong':                        'HK',
    'hungary':                          'HU',
    'iceland':                          'IS',
    'india':                            'IN',
    'indonesia':                        'ID',
    'iran':                             'IR',
    'iraq':                             'IQ',
    'ireland':                          'IE',
    'italy':                            'IT',
    'ivory-coast':                      'CI',
    'jamaica':                          'JM',
    'japan':                            'JP',
    'jordan':                           'JO',
    'kenya':                            'KE',
    'korea-north':                      'KP',
    'korea-south':                      'KR',
    'kuwait':                           'KW',
    'laos':                             'LA',
    'lebanon':                          'LB',
    'lesotho':                          'LS',
    'liberia':                          'LR',
    'libya':                            'LY',
    'liechtenstein':                    'LI',
    'luxembourg':                       'LU',
    'macao':                            'MO',
    'madagascar':                       'MG',
    'malawi':                           'MW',
    'malaysia':                         'MY',
    'maldives':                         'MV',
    'mali':                             'ML',
    'malta':                            'MT',
    'martinique':                       'MQ',
    'mauritania':                       'MR',
    'mauritius':                        'MU',
    'mexico':                           'MX',
    'monaco':                           'MC',
    'mongolia':                         'MN',
    'morocco':                          'MA',
    'mozambique':                       'MZ',
    'nauru':                            'NR',
    'nepal':                            'NP',
    'netherlands':                      'NL',
    'netherlands-antilles':             'AN',
    'new-caledonia':                    'NC',
    'new-hebrides':                     'VU',
    'nicaragua':                        'NI',
    'niger':                            'NE',
    'nigeria':                          'NG',
    'norway':                           'NO',
    'oman':                             'OM',
    'pakistan':                         'PK',
    'panama':                           'PA',
    'papua-new-guinea':                 'PG',
    'paraguay':                         'PY',
    'peru':                             'PE',
    'philippines':                      'PH',
    'poland':                           'PL',
    'portugal':                         'PT',
    'portuguese-guinea':                'GW',
    'portuguese-timor':                 'TP',
    'qatar':                            'QA',
    'reunion':                          'RE',
    'rhodesia':                         'RH',
    'romania':                          'RO',
    'rwanda':                           'RW',
    'san-marino':                       'SM',
    'saudi-arabia':                     'SA',
    'senegal':                          'SN',
    'seychelles':                       'SC',
    'sierra-leone':                     'SL',
    'sikkim':                           'SK',
    'singapore':                        'SG',
    'somalia':                          'SO',
    'south-africa':                     'ZA',
    'south-west-africa':                'SWA',
    'spain':                            'ES',
    'spanish-sahara':                   'EH',
    'st-christopher-nevis-anguilla':    'KN',
    'st-lucia':                         'LC',
    'st-vincent':                       'VC',
    'sudan':                            'SD',
    'surinam':                          'SR',
    'swaziland':                        'SZ',
    'sweden':                           'SE',
    'switzerland':                      'CH',
    'syria':                            'SY',
    'tanzania':                         'TZ',
    'thailand':                         'TH',
    'togo':                             'TG',
    'tonga':                            'TO',
    'trinidad-and-tobago':              'TT',
    'tunisia':                          'TN',
    'turkey':                           'TR',
    'u-s-s-r':                          'SU',
    'uganda':                           'UG',
    'united-arab-emirates':             'AE',
    'united-states':                    'US',
    'upper-volta':                      'HV',
    'uruguay':                          'UY',
    'vatican-city':                     'VA',
    'venezuela':                        'VE',
    'vietnam-north':                    'VD',
    'vietnam-south':                    'VN',
    'wallis-and-futuna':                'WF',
    'western-samoa':                    'WS',
    'yemen-aden':                       'YD',
    'yemen-sana':                       'YE',
    'yugoslavia':                       'YU',
    'zaire':                            'ZR',
    'zambia':                           'ZM',
}


# ── HTML parser ───────────────────────────────────────────────────────────────
class FactfileParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sections   = {}       # section_name → [{label, value}]
        self._in_section = False
        self._cur_section = None
        self._in_h2 = False
        self._in_dt = False
        self._in_dd = False
        self._cur_dt = ''
        self._cur_dd = ''
        self._buf = ''
        self._depth = 0            # nesting depth inside <dl>

    def handle_starttag(self, tag, attrs):
        classes = dict(attrs).get('class', '')
        if tag == 'section' and 'profile' in classes:
            self._in_section = True
            self._cur_section = None
        elif tag == 'h2' and self._in_section:
            self._in_h2 = True
            self._buf = ''
        elif tag == 'dt':
            self._in_dt = True
            self._cur_dt = ''
        elif tag == 'dd':
            self._in_dd = True
            self._cur_dd = ''

    def handle_endtag(self, tag):
        if tag == 'section':
            self._in_section = False
        elif tag == 'h2':
            self._in_h2 = False
            sec = self._buf.strip()
            self._cur_section = sec
            if sec not in self.sections:
                self.sections[sec] = []
        elif tag == 'dt':
            self._in_dt = False
            self._cur_dt = self._cur_dt.strip()
        elif tag == 'dd':
            self._in_dd = False
            val = self._cur_dd.strip()
            if self._cur_section is not None and val:
                label = self._cur_dt if self._cur_dt and self._cur_dt != '—' else None
                self.sections[self._cur_section].append({
                    'label': label,
                    'value': val,
                })

    def handle_data(self, data):
        if self._in_h2:
            self._buf += data
        elif self._in_dt:
            self._cur_dt += data
        elif self._in_dd:
            self._cur_dd += data

    def handle_entityref(self, name):
        char = html.unescape(f'&{name};')
        self._append(char)

    def handle_charref(self, name):
        char = html.unescape(f'&#{name};')
        self._append(char)

    def _append(self, char):
        if self._in_h2:
            self._buf += char
        elif self._in_dt:
            self._cur_dt += char
        elif self._in_dd:
            self._cur_dd += char


def parse_factfile(path: Path) -> dict:
    """Parse a CIA HTML factfile, return {section: [{label, value}]}."""
    parser = FactfileParser()
    parser.feed(path.read_text(encoding='utf-8', errors='replace'))
    # Convert to simple {section: {label: value}} or {section: [value, ...]}
    result = {}
    for sec, fields in parser.sections.items():
        sec_key = sec.upper()
        if not fields:
            continue
        # If all entries have labels, store as dict; otherwise as list
        labeled = [f for f in fields if f['label']]
        if labeled:
            d = {}
            for f in fields:
                k = f['label'] or '—'
                # Append if duplicate label (e.g. repeated Elections)
                if k in d:
                    d[k] = d[k] + '; ' + f['value']
                else:
                    d[k] = f['value']
            result[sec_key] = d
        else:
            result[sec_key] = ' '.join(f['value'] for f in fields)
    return result


def main():
    if not CIA_DIR.exists():
        raise SystemExit(f'CIA directory not found: {CIA_DIR}')

    factbook = {}
    skipped  = []

    html_files = sorted(CIA_DIR.glob('*.html'))
    print(f'Parsing {len(html_files)} HTML files…')

    for path in html_files:
        stem = path.stem  # e.g. 'afghanistan'
        code = FILENAME_TO_CODE.get(stem)
        if not code:
            skipped.append(stem)
            continue
        data = parse_factfile(path)
        if data:
            factbook[code] = data

    print(f'Extracted {len(factbook)} country entries')
    if skipped:
        print(f'No ISO code mapping for: {", ".join(skipped)}')

    ordered = dict(sorted(factbook.items()))
    js = 'var CIA_FACTBOOK = \n' + json.dumps(ordered, indent=2, ensure_ascii=False) + ';\n'
    OUT_PATH.write_text(js, encoding='utf-8')
    print(f'Saved → {OUT_PATH}  ({OUT_PATH.stat().st_size:,} bytes)')
    print(f'Codes: {", ".join(sorted(ordered.keys()))}')


if __name__ == '__main__':
    main()
