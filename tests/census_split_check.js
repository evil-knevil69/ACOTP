// Nuke casualty census — the authored split, run over the REAL 51-state data.
// Checks the national totals land on their targets and that the right category
// tops the right kind of state (Injured most, Irradiated the big/struck ones,
// Survivors the sheltered rural list, the Dead never).
// Run: node tests/census_split_check.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt'), 'utf8');

function sliceBracket(s, i, open, close) {
  let d = 0;
  for (let j = i; j < s.length; j++) { if (s[j] === open) d++; else if (s[j] === close) { d--; if (d === 0) return s.slice(i, j + 1); } }
}
const sjText = sliceBracket(src, src.indexOf('[', src.indexOf('campaignTrail_temp.states_json =')), '[', ']');
const campaignTrail_temp = { states_json: JSON.parse(sjText) };
const cfg = src.slice(src.indexOf('var _NUKE_CENSUS = ['), src.indexOf('var _NUKE_TOTAL_POP'));
const totp = (src.match(/var _NUKE_TOTAL_POP = [^;]+;/) || [''])[0];
const fns = src.slice(src.indexOf('function _nukeSplitShares()'), src.indexOf('(function () {\n    const origA'));
const api = new Function('campaignTrail_temp', `${cfg}\n${totp}\n${fns}\n` +
  'return { _NUKE_CENSUS, _nukeStateShares, _NUKE_TOTAL_POP, _NUKE_SAFE_STATES };')(campaignTrail_temp);
const { _NUKE_CENSUS: CEN, _nukeStateShares, _NUKE_TOTAL_POP: POP, _NUKE_SAFE_STATES: SAFE } = api;

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };
const label = pk => (CEN.find(c => c.pk === pk) || {}).last;

const sj = campaignTrail_temp.states_json;
let totPV = 0; sj.forEach(s => totPV += s.fields.popular_votes || 0);
const mult = POP / totPV;
const natl = {}, tops = {};
CEN.forEach(c => { natl[c.pk] = 0; tops[c.pk] = 0; });
const rows = [];
sj.forEach(s => {
  const abbr = s.fields.abbr, pv = (s.fields.popular_votes || 0) * mult;
  const sh = _nukeStateShares(abbr);
  let topPk = null, topV = -1, sum = 0;
  CEN.forEach(c => { const v = sh.get(c.pk) || 0; sum += v; natl[c.pk] += pv * v; if (v > topV) { topV = v; topPk = c.pk; } });
  tops[topPk]++;
  rows.push({ abbr, pv: s.fields.popular_votes || 0, top: topPk, sum });
});

console.log('NATIONAL TOTALS:');
CEN.forEach(c => {
  const tgt = c.target == null ? POP - CEN.reduce((a, x) => a + (x.target || 0), 0) : c.target;
  const got = natl[c.pk];
  console.log('  ' + label(c.pk).padEnd(11) + (tgt / 1e6).toFixed(0).padStart(4) + 'M target → '
              + (got / 1e6).toFixed(1).padStart(6) + 'M actual');
  ck(label(c.pk) + ' lands within 12% of its authored national total', Math.abs(got - tgt) / tgt <= 0.12);
});

console.log('\nWHO TOPS WHAT:');
CEN.forEach(c => console.log('  ' + label(c.pk).padEnd(11) + tops[c.pk] + ' states'));
rows.sort((a, b) => a.pv - b.pv);
const safeInData = SAFE.filter(a => rows.some(r => r.abbr === a));
ck('every state\'s shares still sum to 1', rows.every(r => Math.abs(r.sum - 1) < 1e-9));
ck('Survivors top EXACTLY the sheltered rural list',
   tops[80000] === safeInData.length
   && safeInData.every(a => rows.find(r => r.abbr === a).top === 80000));
ck('Injured top the bulk of the map', tops[50000] > 25);
ck('Irradiated (fallout-weighted) top the biggest, most-struck states',
   rows.slice(-5).filter(r => r.top === 70000).length >= 3);
ck('the Dead never top a state (they concentrate, but never lead)', tops[10701] === 0);
{
  const ca = _nukeStateShares('CA'), wy = _nukeStateShares('WY');
  ck('urban skew: the big city state carries a far higher Dead share than the rural one',
     ca.get(10701) > wy.get(10701) * 1.5);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
