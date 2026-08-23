// Entering the DEFCON-1 branch swaps the page to "In the Bunker", and unwinding
// hands it back — driven against the REAL Code 1 theme registry and the REAL
// Code 2 census/reset functions, since the whole point is that the two files
// talk to each other through window._acopApplyTheme.
//
//   node tests/nuketheme_check.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const ROOT = path.join(__dirname, '..');
const c1 = fs.readFileSync(path.join(ROOT, 'A Cancer on the Presidency_init (draft).txt'), 'utf8');
const c2 = fs.readFileSync(path.join(ROOT, 'ACOP Nixon_Agnew.txt'), 'utf8');
// The theme registry + picker, from the low-fx state block it depends on.
const themeBlock = c1.slice(c1.indexOf('var _LOWFX_STATIC_BG'), c1.indexOf('// ── END THEME SELECTOR'));
const cfg = c2.slice(c2.indexOf('var _NUKE_THEME'), c2.indexOf('// Pristine per-state elector counts'));
function fn(src, name) {
  const s = src.indexOf('function ' + name + '(');
  if (s < 0) return '';
  let i = src.indexOf('{', s), d = 0;
  for (let j = i; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(s, j + 1); } }
  return '';
}

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

console.log('WIRING:');
ck('the census names the theme it switches to, and the one it hands back to',
   /var _NUKE_THEME = 'In the Bunker';/.test(c2) && /var _ACOP_DEFAULT_THEME = 'A Cancer on the Presidency';/.test(c2));
ck('the swap goes through the registry, from inside _nukeApplyCensus',
   /_nukeApplyCensus\(\)[\s\S]{0,1400}themeSwap\(_NUKE_THEME\)/.test(c2));
ck('"In the Bunker" exists in Code 1, so the swap cannot fail safe-but-silent',
   /'In the Bunker': function \(\) \{/.test(c1));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await p.setContent(`<!DOCTYPE html><body><img id="header" src="about:blank">
    <div class="container"><div id="game_window"><div class="game_header"></div></div></div>
    <select id="themePicker"><option>host</option></select></body>`);
  await p.addScriptTag({ content: `
    var corrr = '<div>ACOP</div>';
    var nct_stuff = { selectedTheme: 'x', themes: { x: {} } };
    var campaignTrail_temp = { candidate_json: [], states_json: [], election_json: [{ fields: {} }] };
    ${themeBlock}
    ${fn(c2, 'themeSwap')}
    var _gameTheme = '';
    ${cfg}
    var _NUKE_CENSUS = [], _NUKE_TURNOUT_ORIG = new Map(), _NUKE_EV_ORIG = new Map();
    var _NUKE_TURNOUT_MULT = 1, _NUKE_ELECTION_POPUP = 'x', _NUKE_POPUP_ORIG = 'y';
    var _NUKE_CAND_ORIG = [], _NUKE_VISITS_ORIG = 1, _nukeWar = 0, _lengthInstalled = null;
    function _installCampaignLength() {}
    ${fn(c2, '_nukeApplyCensus')}
    ${fn(c2, '_nukeRestoreCandidates')}
    ${fn(c2, '_nukeReset')}
    window.__look = () => ({ theme: _acopTheme, gameTheme: _gameTheme,
      bg: document.body.getAttribute('background'), bgColor: document.body.getAttribute('bgcolor'),
      repeat: getComputedStyle(document.body).backgroundRepeat,
      picker: document.querySelector('.acop-theme-select').value });
  `});

  console.log('\nTHROUGH THE BRANCH:');
  let s = await p.evaluate(() => window.__look());
  ck('starts on the shipped look, with the Watergate page background',
     s.theme === 'A Cancer on the Presidency' && /backgroundv69/.test(s.bg || ''));

  s = await p.evaluate(() => { _nukeApplyCensus(); _nukeWar = 2; return window.__look(); });
  ck('the census puts the page on the bunker theme — the hallway, once, on black',
     s.theme === 'In the Bunker' && /Bunker-hallway/.test(s.bg || '')
     && s.repeat === 'no-repeat' && s.bgColor === '#000000');
  ck('…the picker follows, so the dropdown is not lying about the look',
     s.picker === 'In the Bunker');
  ck('…and it is recorded as an EVENT swap, so a save reloads black',
     s.gameTheme === 'In the Bunker');

  s = await p.evaluate(() => { _nukeReset(); return window.__look(); });
  ck('unwinding the branch hands the look back and clears the event swap',
     s.theme === 'A Cancer on the Presidency' && /backgroundv69/.test(s.bg || '')
     && s.bgColor === '' && s.gameTheme === '');
  ck('…including no-repeat, which would otherwise leak onto the default gif',
     s.repeat === 'repeat');

  // The one that is easy to get wrong: a player who CHOSE the bunker theme
  // themselves must keep it, because a manual pick is a session preference.
  s = await p.evaluate(() => {
    _applyTheme('In the Bunker');
    _nukeWar = 1; _nukeReset();
    return window.__look();
  });
  ck('a manual pick of the same theme survives the unwind',
     s.theme === 'In the Bunker' && s.bgColor === '#000000' && s.gameTheme === '');

  // …and turning the feature off must leave the theme entirely alone.
  s = await p.evaluate(() => {
    _applyTheme('A Cancer on the Presidency');
    _NUKE_THEME = '';
    _nukeApplyCensus();
    const after = window.__look();
    _NUKE_THEME = 'In the Bunker';
    return after;
  });
  ck('_NUKE_THEME = \'\' leaves the theme untouched', s.theme === 'A Cancer on the Presidency');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})();
