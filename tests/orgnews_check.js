// The President's Men chart reporting on itself: the breaking-point warning
// (built from the 3-turn grace the engine already counts) and the announcement
// when a man actually turns state's witness.
//
// Drives the REAL pressure tick, the real _flipWitness, the real news helpers
// and the real panel/button surfaces against a stub chart.
//
//   node tests/orgnews_check.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const SRC = path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt');
const INIT = path.join(__dirname, '..', 'A Cancer on the Presidency_init (draft).txt');
const src = fs.readFileSync(SRC, 'utf8');
const init = fs.readFileSync(INIT, 'utf8');

function extractFn(name) {
  const s = src.indexOf('function ' + name + '(');
  if (s < 0) throw new Error('no such function: ' + name);
  let d = 0;
  for (let j = src.indexOf('{', s); j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) return src.slice(s, j + 1); }
  }
}
function slice(a, b) {
  const i = src.indexOf(a);
  const j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor not found: ' + (i < 0 ? a : b));
  return src.slice(i, j + b.length);
}
// The pressure-engine tick, verbatim.
const PRESSURE_TICK = slice(
  "_everyTurn(() => {\n    if (!_pressureOn || !_lengthAllows('pressure')) return;",
  "if (typeof window._syncOrgStates === 'function') window._syncOrgStates();\n});");
// The ungated upkeep tick (prune + glow), verbatim. Anchored on the marker
// comment, not on the tick's first statement, so a change inside it surfaces as
// a failed assertion rather than a slice that cannot be found.
const UPKEEP_TICK = slice("// \u2500\u2500 ORG NEWS UPKEEP \u2500\u2500", "});");

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

console.log('STATIC WIRING:');
ck('the flip announces itself INSIDE _flipWitness, after the smear guard',
   /if \(_smeared\.has\(name\)\) return;\s*\n\s*_flipped\.add\(name\);\s*\n\s*_orgNewsAdd\('flipped', name\);/.test(src));
ck('the warning fires on entering the grace window, once per descent',
   /_flipDanger\[name\] === 1 && !_crackWarned\.has\(name\)/.test(src)
   && /_crackWarned\.add\(name\);\s*\n\s*_orgNewsAdd\('cracking', name\);/.test(src));
ck('…and re-arms when a man climbs back out of it',
   /_flipDanger\[name\] = 0;\s*\n\s*_crackWarned\.delete\(name\);/.test(src));
ck('pruning + glow upkeep is registered UNGATED, not inside the pressure tick',
   /_everyTurn\(\(\) => \{\s*\n\s*_orgNewsPrune\(\);\s*\n\s*_syncOrgNewsGlow\(\);\s*\n\}\);/.test(src));
ck('the line is chosen once and STORED, so it cannot reshuffle or drift on a save',
   /line: tpl\.replace\('\{N\}', who\)/.test(src) && /_orgNews\.push\(\{ kind, name, line/.test(src));
ck('opening the panel is what marks the news read',
   /_orgNewsUnseen = false;[\s\S]{0,200}if \(_orgNews\.length\) \{/.test(src));
ck('the button re-applies its glow on every engine re-render',
   /if \(_orgNewsUnseen\) btn\.classList\.add\('news-glow'\);/.test(extractFn('addInnerCircleButton')));
ck('the cracking ring is painted from _syncOrgStates, skipping smeared and flipped men',
   /classList\.toggle\('nw-cracking',\s*\n\s*\(_flipDanger\[k\] \|\| 0\) > 0 && !_smeared\.has\(k\) && !_flipped\.has\(k\)\)/.test(src));
ck('the glow colour is distinct from the amber reshuffle and green charge glows',
   /\.news-glow \{[^}]*news-pulse/.test(src)
   && /@keyframes news-pulse[\s\S]{0,200}rgba\(183, 28, 28/.test(src));
ck('state is saved and cleared on New Game',
   /orgNews: _orgNews\.slice\(\)/.test(src) && /crackWarned: Array\.from\(_crackWarned\)/.test(src)
   && /'_orgNewsUnseen'/.test(src)
   && /_orgNews\.length = 0; _crackWarned\.clear\(\); _orgNewsUnseen = false;/.test(src));
ck('low demand mode keeps both signals as STATIC halos (motion only goes)',
   /body\.low-fx-on \.news-glow,/.test(init)
   && /body\.low-fx-on \.news-glow \{ box-shadow[^}]*important/.test(init)
   && /body\.low-fx-on #nw-chart-wrapper \.nw-node\.nw-cracking/.test(init));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await p.setContent('<!DOCTYPE html><body>' +
    '<div id="panel"></div><button id="inner_circle_button">Enemies/Friends</button>' +
    '<div id="nw-chart-wrapper">' +
    '<div class="nw-node" data-person="Hunt"><div class="nw-flip-area"></div></div>' +
    '<div class="nw-node" data-person="Magruder"><div class="nw-flip-area"></div></div>' +
    '<div class="nw-node" data-person="Dean"><div class="nw-flip-area"></div></div>' +
    '</div></body>');

  await p.addScriptTag({ content: `
    // ---- stubs
    var WatergateExposure = 8, _questionCount = 20, _pressureOn = true;
    const _pausedUntil = {}, _clemencies = [];
    const _flipped = new Set(), _flipDanger = {}, _innerCircleFlips = [];
    const _edgeClocks = {}, _expDecayClocks = {}, _loyDecayClocks = {};
    const _turnTicks = [];
    function _everyTurn(fn) { _turnTicks.push(fn); }
    const mk = (loy, exp, st, inner) => { let l = loy, e = exp, s = st;
      return { loy: () => l, setLoy: v => { l = v; }, exp: () => e, setExp: v => { e = v; },
               st: () => s, setSt: v => { s = v; }, inner: !!inner }; };
    const _ORG_PRESSURE = {
      Hunt: mk(6, 5, 5), Magruder: mk(6, 5, 5), Haldeman: mk(8, 1, 5),
      Ehrlichman: mk(8, 1, 5), Dean: mk(8, 1, 5, true), Colson: mk(8, 1, 5, true),
      Mitchell: mk(8, 1, 5, true) };
    const _ORG_EDGES = { Hunt: ['Haldeman'], Magruder: ['Mitchell'] };
    function _lengthAllows() { return true; }
    const _CRIME_NAMES = { Hunt: 'Howard Hunt', Magruder: 'Jeb Magruder', Dean: 'John Dean' };
    const _TA_KEYMAP = { WatergateBurglars: 'Burglars' };
    function _taKeyFor(person) { return _TA_KEYMAP[person] || person; }
    const _smeared = new Set(), _interrogated = new Set();
    var _pressureFrozenUntil = -1, _stonewallUntil = -1;
    function _pressureFrozen() { return _questionCount <= _pressureFrozenUntil; }
    function _stonewalled() { return _questionCount <= _stonewallUntil; }
    var _taUnseen = false;
    var _RESHUFFLE = { isActive: () => false, turnsLeft: () => null };
    function openInnerCircle_stub() {}
    Math.random = () => 0;   // deterministic: the flip roll always fires, line index 0

    // ---- the real code
    ${extractFn('_crimeName')}
    ${slice('const _orgNews    = [];', 'function _orgNewsPrune() {').replace(/function _orgNewsPrune\(\) \{$/, '')}
    ${extractFn('_orgNewsAdd')}
    ${extractFn('_syncOrgNewsGlow')}
    ${extractFn('_orgNewsPrune')}
    ${extractFn('_flipWitness')}
    ${PRESSURE_TICK}
    ${UPKEEP_TICK}
    window.__tick = () => { _questionCount++; _turnTicks.forEach(f => f(_questionCount)); };

    // The REAL news chip build, lifted out of openInnerCircle.
    window.__openPanel = () => {
      document.getElementById('nw-news')?.remove();
      const panel = document.getElementById('panel');
      ${slice("    _orgNewsUnseen = false;\n    if (_orgNews.length) {", "        panel.appendChild(news);\n    }")}
      // the real button-glow re-apply, as addInnerCircleButton does it
      const btn = document.getElementById('inner_circle_button');
      btn.classList.remove('news-glow');
      if (_orgNewsUnseen) btn.classList.add('news-glow');
    };
    // The REAL cracking-ring pass, lifted out of _syncOrgStates.
    window.__syncRings = () => {
      ${slice("        document.querySelectorAll('#nw-chart-wrapper .nw-node[data-person]').forEach(n => {", "        });")}
    };
    // Every news item as it is MADE — the live list is pruned after
    // _ORG_NEWS_TURNS, so anything spanning more turns than that has to be
    // observed at the moment it happens, not read off the survivors.
    window.__seen = [];
    const __origAdd = _orgNewsAdd;
    _orgNewsAdd = function (kind, name) { window.__seen.push(kind + ':' + name); return __origAdd(kind, name); };
    window.__glow = () => document.getElementById('inner_circle_button').classList.contains('news-glow');
    window.__lines = () => [...document.querySelectorAll('#nw-news .nw-news-line')].map(n => n.textContent);
    window.__ringed = () => [...document.querySelectorAll('.nw-node.nw-cracking')].map(n => n.dataset.person);
    // Put a man at the brink: loyalty 0, exposure 8.
    window.__brink = n => { const q = _ORG_PRESSURE[n]; q.setLoy(0); q.setExp(8); };
  `});

  const ev = fn => p.evaluate(fn);

  console.log('\nTHE WARNING:');
  let r = await ev(() => {
    window.__brink('Hunt');
    window.__tick();
    return { lines: _orgNews.map(n => n.line), kinds: _orgNews.map(n => n.kind),
             danger: _flipDanger.Hunt, glow: window.__glow(), flipped: _flipped.has('Hunt') };
  });
  ck('entering the window announces it, on the FIRST turn of the grace',
     r.kinds.length === 1 && r.kinds[0] === 'cracking' && r.danger === 1);
  ck('…naming the man', /Howard Hunt/.test(r.lines[0]));
  ck('…and he has NOT flipped yet — there are turns left to act', r.flipped === false);
  ck('the Enemies/Friends button glows', r.glow === true);
  r = await ev(() => { window.__syncRings(); return window.__ringed(); });
  ck('his card is ringed on the chart', JSON.stringify(r) === JSON.stringify(['Hunt']));
  r = await ev(() => {
    window.__tick();
    return { count: _orgNews.filter(n => n.name === 'Hunt' && n.kind === 'cracking').length,
             danger: _flipDanger.Hunt };
  });
  ck('it does not repeat every turn he stays in the window', r.count === 1 && r.danger === 2);
  r = await ev(() => {
    _ORG_PRESSURE.Hunt.setLoy(4);                 // he steadies
    window.__tick();
    const out = { danger: _flipDanger.Hunt, warned: _crackWarned.has('Hunt') };
    window.__syncRings();
    out.ringed = window.__ringed();
    return out;
  });
  ck('recovering clears the window, the ring and the re-arm guard',
     r.danger === 0 && r.warned === false && r.ringed.length === 0);
  r = await ev(() => {
    const before = window.__seen.filter(x => x === 'cracking:Hunt').length;
    window.__brink('Hunt');
    window.__tick();
    return { before, after: window.__seen.filter(x => x === 'cracking:Hunt').length };
  });
  ck('…so a SECOND descent warns again', r.before === 1 && r.after === 2);

  console.log('\nTHE PANEL:');
  r = await ev(() => {
    window.__openPanel();
    return { lines: window.__lines(), glow: window.__glow(), unseen: _orgNewsUnseen };
  });
  ck('the chip lists the news', r.lines.length >= 1 && /Howard Hunt/.test(r.lines.join(' ')));
  ck('…and reading it clears the glow', r.glow === false && r.unseen === false);
  // Through the TICK, not by calling _orgNewsPrune() directly — the point is
  // that upkeep is actually wired into the turn, not merely that it exists.
  r = await ev(() => {
    for (let i = 0; i < 4; i++) window.__tick();   // well past _ORG_NEWS_TURNS
    window.__openPanel();
    return { stale: _orgNews.filter(n => _questionCount - n.turn > _ORG_NEWS_TURNS).length,
             chip: window.__lines() };
  });
  ck('stale lines age out on the turn tick, so the chip stays current and bounded',
     r.stale === 0);

  console.log('\nTHE FLIP:');
  r = await ev(() => {
    _flipped.clear(); _orgNews.length = 0; _crackWarned.clear(); _orgNewsUnseen = false;
    _flipWitness('Magruder');
    return { kinds: _orgNews.map(n => n.kind), line: _orgNews[0] && _orgNews[0].line,
             glow: window.__glow(), flipped: _flipped.has('Magruder') };
  });
  ck('a man turning announces it', r.flipped === true && JSON.stringify(r.kinds) === JSON.stringify(['flipped']));
  ck('…in its own emphatic line', /HAS TURNED/.test(r.line) && /Jeb Magruder/.test(r.line));
  ck('…and glows for attention', r.glow === true);
  r = await ev(() => {
    window.__openPanel();
    return [...document.querySelectorAll('#nw-news .nw-news-flip')].length;
  });
  ck('the chip renders a flip distinctly from a warning', r === 1);
  r = await ev(() => {
    _orgNews.length = 0; _smeared.add('Dean');
    _flipWitness('Dean');
    return { news: _orgNews.length, flipped: _flipped.has('Dean') };
  });
  ck('a SMEARED man refused by _flipWitness announces nothing',
     r.flipped === false && r.news === 0);
  r = await ev(() => {
    _smeared.clear(); _flipped.clear(); _orgNews.length = 0;
    window.__seen.length = 0;
    // the whole way: brink -> grace -> flip, through the real tick. Observed via
    // __seen because the warning is pruned from the panel before the flip lands.
    _ORG_PRESSURE.Dean = mk(0, 9, 5, true);
    const turns = [];
    for (let i = 0; i < 5; i++) { window.__tick(); turns.push(window.__seen.slice()); }
    return { seen: window.__seen.slice(), flipped: _flipped.has('Dean'),
             warnTurn: turns.findIndex(x => x.includes('cracking:Dean')),
             flipTurn: turns.findIndex(x => x.includes('flipped:Dean')) };
  });
  // Scoped to Dean: other men left at the brink by earlier cases flip in the
  // same ticks, which is the engine working, not noise to assert against.
  ck('end to end: the same man is warned about, THEN reported as turned',
     r.flipped === true
     && JSON.stringify(r.seen.filter(x => /Dean$/.test(x)))
        === JSON.stringify(['cracking:Dean', 'flipped:Dean']));
  ck('…with real turns of grace in between to act on the warning',
     r.warnTurn === 0 && r.flipTurn >= 3);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
