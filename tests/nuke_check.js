// DEFCON-1 nuclear-war branch — the big one. Static wiring over both mod files
// plus runtime checks that drive the REAL Code 1 strike/TV block against a stub
// election-night DOM, and the REAL Code 2 census maths.
//
// Rebuilt into the repo after the scratchpad was wiped (see CLAUDE.md). Run:
//   node tests/nuke_check.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const ROOT = path.join(__dirname, '..');
const c1 = fs.readFileSync(path.join(ROOT, 'A Cancer on the Presidency_init (draft).txt'), 'utf8');
const c2 = fs.readFileSync(path.join(ROOT, 'ACOP Nixon_Agnew.txt'), 'utf8');

function extractFn(src, name) {
  const s = src.indexOf('function ' + name + '(');
  if (s < 0) return '';
  let i = src.indexOf('{', s), d = 0;
  for (let j = i; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(s, j + 1); } }
  return '';
}
// Code 1 carries TWO stylesheets, both template literals: the main one (fonts,
// layout, the final-results footer) and `customStyling` (the map/TV package).
const mainStart = c1.indexOf('style.innerHTML = `') + 'style.innerHTML = `'.length;
const mainCss = c1.slice(mainStart, c1.indexOf('`;', mainStart));
const cssStart = c1.indexOf('customStyling.innerHTML = `') + 'customStyling.innerHTML = `'.length;
const noiseCss = c1.slice(cssStart, c1.indexOf('`;', cssStart));
const strikeBlock = c1.slice(c1.indexOf('function __nukeTvTick'), c1.indexOf('function __mapVisitTick'));
const detectors = ['__isFinalElectionMapRaw', '__isFinalElectionMap', '__isElectionNightRaw', '__isElectionNight']
  .map(n => extractFn(c1, n)).join('\n');

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };
const has = (s, re) => re.test(s);

// ══════════════════ 1 · CONFIG + STATIC WIRING ══════════════════
console.log('CONFIG + WIRING:');
ck('ships INERT until the bunker question is authored (_NUKE_Q_PK null)', /var _NUKE_Q_PK\s*=\s*null/.test(c2));
ck('census is four BALLOT pks (10701/50000/70000/80000), The Media not among them',
   /pk: 10701[\s\S]{0,120}pk: 50000[\s\S]{0,120}pk: 70000[\s\S]{0,140}pk: 80000/.test(c2)
   && !/pk: 60000/.test(c2.slice(c2.indexOf('var _NUKE_CENSUS'), c2.indexOf('var _NUKE_SAFE_STATES'))));
ck('census targets: Dead 31M urban, Injured 62M, Irradiated 60M fallout, Survivors balance',
   /last: 'Dead',\s*color: '#4a4a4a', target: 31000000, urban: true/.test(c2)
   && /last: 'Injured',\s*color: '#8a2f1e', target: 62000000/.test(c2)
   && /last: 'Irradiated',\s*color: '#5a7d2a', target: 60000000, fallout: true/.test(c2)
   && /last: 'Survivors',\s*color: '#41505c', target: null/.test(c2));
ck('turnout crank counts everyone (210M) from a pristine baseline that cannot compound',
   /_NUKE_TOTAL_POP = 210000000/.test(c2) && /var _NUKE_TURNOUT_ORIG = new Map/.test(c2)
   && /base \* _NUKE_TURNOUT_MULT/.test(c2));
ck('safe rural states give Survivors the plurality', /var _NUKE_SAFE_STATES\s+= \[/.test(c2)
   && /var _NUKE_SAFE_CASUALTY = /.test(c2) && /if \(_NUKE_SAFE_STATES\.indexOf\(abbr\) !== -1\)/.test(c2));
ck('fallout weights auto-derived from turnout, urban weights hand-tiered',
   /var _NUKE_POP_W = \(function/.test(c2) && /function _nukeConcWeight\(c, abbr\)/.test(c2)
   && /if \(c\.fallout\) return \(_NUKE_POP_W\[abbr\]/.test(c2) && /var _NUKE_URBAN = \{/.test(c2));
ck('missiles: 32px, 1400ms flight, live scorch OFF but ground bursts still recorded',
   /_NUKE_MISSILE_SIZE = 32/.test(c1) && /_NUKE_FLIGHT_MS   = 1400/.test(c1)
   && /_NUKE_SCORCH      = false/.test(c1)
   && /if \(ground\) \{\s*\n\s*window\.__nukeScorches = window\.__nukeScorches/.test(c1));
ck('mushroom cloud scaled 1.5x through the keyframes',
   /_NUKE_CLOUD_SCALE = 1\.5/.test(c1) && /const _cs = _NUKE_CLOUD_SCALE;/.test(c1)
   && /scale\(' \+ \(1\.08 \* _cs\)/.test(c1));
ck('EBS tone + intro still wired; rumble still to author',
   /_NUKE_EBS_TONE_URL = 'https:/.test(c1) && /_NUKE_EBS_INTRO_IMG = 'https:/.test(c1)
   && /_NUKE_RUMBLE_URL   = ''/.test(c1));
ck('judder gap uniform in [5,15] impacts (floor 5, never chains)',
   /_NUKE_JUDDER_MIN = 5, _NUKE_JUDDER_MAX = 15/.test(c1)
   && /__nukeNextJudderAt = _NUKE_JUDDER_MIN \+ Math\.floor\(Math\.random\(\)/.test(c1));
ck('judder + flare fire together on the same impact', /__nukeRollJudder\(\); __nukeJudder\(\); __nukeStaticFlare\(\);/.test(c1));
ck('DC decapitation strike gets the BIG jolt at impact',
   /if \(abbr === 'DC'\) \{[\s\S]{0,160}__nukeJudder\(true\); __nukeStaticFlare\(true\);/.test(c1));
ck('static flare holds at peak then decays (950/1120ms, no screen blend)',
   /\{ opacity: peak, offset: 0\.5 \}/.test(c1) && /duration: big \? 1120 : 950/.test(c1)
   && !/#nuke-flare \{[^}]*mix-blend-mode/.test(noiseCss));
ck('gratuitous barrage: 20 warheads over the big states', /_NUKE_RESTRIKES = 20/.test(c1));
ck('world map button REMOVED (not disabled) while the attack runs',
   /const hide = \(_nukeWar >= 2\) \|\| _enightInProgress\(\);/.test(c2)
   && /if \(hide\) \{ if \(existing\) existing\.remove\(\); return; \}/.test(c2)
   && !/btn\.disabled = nukeAttack/.test(c2));
ck('_nukeWar is saved and the New Game reset unwinds the branch',
   /'_nukeWar'/.test(c2.match(/var _SL_SCALARS = \[[\s\S]*?\];/)[0]) && /function _nukeReset\(/.test(c2));
ck('both ACOP-News opener subscribers stand down under the census',
   (c2.match(/if \(_nukeWar >= 2\) return;/g) || []).length >= 1);

// ══════════════════ 2 · SCREEN CSS ══════════════════
console.log('\nSCREEN CSS:');
ck('map feather: sides/top feather, BOTTOM edge solid',
   /mask-image: linear-gradient\(to right, transparent 0%, black 3%, black 97%, transparent 100%\),\s*linear-gradient\(to bottom, transparent 0%, black 3%, black 100%\)/.test(noiseCss));
ck('map_container uniformly bigger on the nuke screen, svg untouched',
   /#game_window\.acop-nuke-tv #map_container \{[\s\S]{0,700}width: 791px !important;[\s\S]{0,40}height: 570px !important;[\s\S]{0,40}margin-left: 55px !important;[\s\S]{0,40}margin-top: 25px !important;/.test(noiseCss)
   && !/#game_window\.acop-nuke-tv #map_container svg \{[^}]*width: 7\d\dpx/.test(noiseCss));
ck('window paints black only BELOW the 90px header strip, so the banner area is clear',
   /#game_window\.acop-nuke-tv \{[\s\S]{0,900}background-color: transparent !important;[\s\S]{0,120}linear-gradient\(to bottom, rgba\(0,0,0,0\) 0, rgba\(0,0,0,0\) 90px, #000 90px\) !important;/.test(noiseCss));
ck('host site banner hidden across the whole post-election path',
   /document\.body\.classList\.toggle\('acop-nuke-screen', !!on\)/.test(c1)
   && /document\.body\.classList\.toggle\('acop-nuke-post',/.test(c1)
   // The selector must out-specify 'div.center img#header { display:block
   // !important }' in the main stylesheet — matching the full path is what does
   // it. A bare '#header' loses, which is how the banner stayed visible for a
   // month. The runtime probe below is the real check.
   && /body\.acop-nuke-screen div\.center img#header,\s*body\.acop-nuke-post div\.center img#header \{\s*display: none !important;/.test(noiseCss));
ck('fallout map drops the noise gif; election night keeps it',
   /gw\.classList\.toggle\('acop-nuke-final', !!\(on && __isFinalElectionMapRaw\(\)\)\)/.test(c1)
   && /#game_window\.acop-nuke-final #map_container \{[\s\S]{0,90}background-image: none !important;/.test(noiseCss));
ck('the offset moves the whole salvo, and follow-ups scatter around it on land',
   /const aimX = bb\.x \+ bb\.width \/ 2 \+ off\.x/.test(c1)
   && /__nukeScatter\(path, bb, aimX, aimY, _NUKE_SPREAD_MIRV\)/.test(c1)
   && /__nukeScatter\(path, bb2,[\s\S]{0,140}_NUKE_SPREAD_BARRAGE\)/.test(c1)
   && /_NUKE_SPREAD_ONLAND  = true/.test(c1));
ck('nuke post-election nav row sits 22px lower, via a taller window not a smaller gap',
   /body\.acop-nuke #game_window:has\(#map_footer \.final_menu_button\) \{\s*min-height: 647px !important;/.test(noiseCss)
   && !/body\.acop-nuke #game_window #map_footer:has\(\.final_menu_button\)/.test(noiseCss));
ck('hit points are authored: a well-formed table of real nudges, not an empty stub', (() => {
  const m = c1.match(/var _NUKE_HIT_OFFSET = (\{[\s\S]*?\n\});/);
  if (!m) return false;
  let o; try { o = eval('(' + m[1] + ')'); } catch (e) { return false; }
  const keys = Object.keys(o);
  return keys.length >= 20
    && keys.every(k => /^[A-Z]{2}$/.test(k) && typeof o[k].x === 'number' && typeof o[k].y === 'number')
    && keys.some(k => Math.abs(o[k].x) > 20 || Math.abs(o[k].y) > 20);   // the split/panhandle states
})());
ck('hit-point editor is on the ACOPNuke console object', /moveHits: function \(\) \{[\s\S]{0,200}window\.ACOPNukeHits\.toggle\(\)/.test(c2)
   && /window\.ACOPNukeHits = \{/.test(c1));
ck('panels and the Final Results button all at left:792', /#game_window\.acop-nuke-tv #map_footer \{[\s\S]{0,120}left: 792px !important/.test(noiseCss)
   && /#game_window\.acop-nuke-tv #overall_result_container \{[\s\S]{0,90}left: 792px/.test(noiseCss)
   && /#game_window\.acop-nuke-tv #state_result_container \{[\s\S]{0,90}left: 792px/.test(noiseCss));
ck('no sticky-note pushpins on either war-room terminal',
   /#game_window\.acop-nuke-tv #overall_result_container-pin,\s*#game_window\.acop-nuke-tv #state_result_container-pin \{ display: none !important; \}/.test(noiseCss));
ck('panels wear the CRT tube bezel (border-image 42px + housing shadow)',
   /border-image: radial-gradient\(#333, #000 10%, #666 10\.5% 12%, #0000 12\.5%\)\s*45\.5% fill \/ 42px \/ 42px;/.test(noiseCss)
   && /box-shadow: #8a8a8a 0 0 0 16px, #b0b0b0 -1px -1px 0 16px, #000 0 8px 22px 16px;/.test(noiseCss));
ck('readouts are phosphor green, no amber left in the reskin',
   /#game_window\.acop-nuke-tv #overall_result,[\s\S]{0,120}color: #8f8 !important;/.test(noiseCss)
   && !/color: #ffcf8a/.test(noiseCss.slice(noiseCss.indexOf('war-room / CRT terminal reskin'))));
ck('panel headers on dark phosphor INSIDE the tube; chyron deep maroon OUTSIDE it',
   /#game_window\.acop-nuke-tv #overall_result h3,[\s\S]{0,420}background: #0d1a0d !important;/.test(noiseCss)
   && /#nuke-chyron \{[\s\S]{0,460}background: rgba\(42, 10, 8, 0\.94\);/.test(noiseCss)
   && !/background: #600e08/.test(noiseCss) && !/rgba\(96, 14, 8/.test(noiseCss));
ck('chyron mounted in the HEADER strip (top, not the map bottom)',
   /#nuke-chyron \{[\s\S]{0,80}top: 30px;/.test(noiseCss) && !/#nuke-chyron \{[\s\S]{0,80}bottom: 0;/.test(noiseCss)
   && /const host = document\.getElementById\('game_window'\)/.test(c1));
ck('news ticker pinned top-left of the content area, left-justified',
   /#nuke-wire \{[\s\S]{0,80}top: 8px;/.test(noiseCss)
   && /#nuke-wire \{[\s\S]{0,420}text-align: left !important;/.test(noiseCss)
   && /getElementById\('main_content_area'\) \|\| document\.getElementById\('map_container'\)/.test(c1));
ck('final-results nav buttons: centred bottom row, bigger, incl. the fallout map',
   /#game_window:not\(\.acop-nuke-tv\) #map_footer:has\(\.final_menu_button\),\s*#game_window\.acop-nuke-final #map_footer:has\(\.final_menu_button\) \{[\s\S]{0,260}bottom: 40px !important;/.test(mainCss)
   && /#map_footer:has\(\.final_menu_button\) \.final_menu_button \{[\s\S]{0,120}font-size: 13\.5px !important;/.test(mainCss));
ck('fallout config: plumes on, state wash on, billow on',
   /_NUKE_FALLOUT_ON   = true/.test(c1) && /_NUKE_STATE_WASH_ON = true/.test(c1)
   && /_NUKE_FALLOUT_BILLOW = true/.test(c1));
ck('billow is gated off under low-fx and reduced motion',
   /const billow = _NUKE_FALLOUT_BILLOW[\s\S]{0,140}low-fx-on[\s\S]{0,140}prefers-reduced-motion: reduce/.test(c1));

// ══════════════════ 3 · CENSUS MATHS (real Code 2 functions) ══════════════════
console.log('\nCENSUS MATHS:');
{
  const states = [
    { pk: 1, fields: { abbr: 'CA', popular_votes: 600000 } },
    { pk: 2, fields: { abbr: 'WY', popular_votes: 20000 } },
    { pk: 3, fields: { abbr: 'VT', popular_votes: 30000 } },   // a SAFE state
  ];
  const cfg = c2.slice(c2.indexOf('var _NUKE_CENSUS = ['), c2.indexOf('var _NUKE_TOTAL_POP'));
  const totp = (c2.match(/var _NUKE_TOTAL_POP = [^;]+;/) || [''])[0];
  const fns = c2.slice(c2.indexOf('function _nukeSplitShares()'), c2.indexOf('(function () {\n    const origA'));
  const api = new Function('campaignTrail_temp', `${cfg}\n${totp}\n${fns}\n` +
    'return { _NUKE_CENSUS, _nukeSplitShares, _nukeStateShares, _NUKE_SAFE_STATES, _NUKE_TOTAL_POP };')
    ({ states_json: states });
  const sh = api._nukeSplitShares();
  const sum = m => [...m.values()].reduce((a, b) => a + b, 0);
  ck('national split = targets / 210M, balance row takes the rest',
     Math.abs(sh.get(10701) - 31 / 210) < 1e-9 && Math.abs(sh.get(50000) - 62 / 210) < 1e-9
     && Math.abs(sh.get(70000) - 60 / 210) < 1e-9 && Math.abs(sh.get(80000) - 57 / 210) < 1e-9);
  const ca = api._nukeStateShares('CA'), wy = api._nukeStateShares('WY'), vt = api._nukeStateShares('VT');
  ck('every state\'s shares still sum to 1', [ca, wy, vt].every(m => Math.abs(sum(m) - 1) < 1e-9));
  ck('urban Dead concentrate in the big city state over the rural one', ca.get(10701) > wy.get(10701));
  ck('fallout Irradiated concentrate in the bigger/more-struck state', ca.get(70000) > wy.get(70000));
  const top = m => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  ck('a SAFE state is topped by the Survivors', top(vt) === 80000);
  ck('the Dead never top a state', [ca, wy, vt].every(m => top(m) !== 10701));
}

// ══════════════════ 4 · RUNTIME ══════════════════
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 760 } });
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await p.setContent(`<!DOCTYPE html><body class="acop-nuke">
    <div id="game_window">
      <div class="game_header"><h2>ACOP</h2></div>
      <div id="main_content_area">
        <div id="map_container"><svg id="usmap"><path d="M0 0h10v10z"/></svg></div>
        <div id="menu_container">
          <div id="overall_result_container"><div id="overall_result"><h3>ELECTORAL VOTES</h3><ul></ul></div></div>
        </div>
      </div>
      <button id="final_election_map_button" disabled></button>
    </div></body>`);
  await p.addStyleTag({ content: noiseCss });
  await p.addScriptTag({ content: `
    window.__onGameWindowMutation = fn => {};
    var campaignTrail_temp = {
      global_parameter_json: [{ fields: { default_map_color_hex: '#c8a070' } }],
      states_json: [
        { fields: { abbr: 'CA', popular_votes: 600000 } },   // 60% -> 3-missile salvo
        { fields: { abbr: 'WY', popular_votes: 20000 } },    // 2%  -> 1
        { fields: { abbr: 'XX', popular_votes: 380000 } },
      ],
    };
    window.__nukeCensusColors = ['#4a4a4a','#8a2f1e','#5a7d2a','#41505c'];
    ${detectors}
    ${strikeBlock}
    _NUKE_RESTRIKES = 0;              // deterministic unless a test turns it on
    window.__T = { tick: () => __nukeTvTick() };
  `});

  console.log('\nTV CHROME:');
  await p.evaluate(() => window.__T.tick());
  let n = await p.evaluate(() => {
    const gw = document.getElementById('game_window'), mc = document.getElementById('map_container');
    const cs = getComputedStyle(mc);
    return { tv: gw.classList.contains('acop-nuke-tv'), fin: gw.classList.contains('acop-nuke-final'),
             screen: document.body.classList.contains('acop-nuke-screen'),
             guarded: __isFinalElectionMap(), raw: __isFinalElectionMapRaw(),
             h3: document.querySelector('#overall_result h3').textContent,
             scan: getComputedStyle(mc, '::after').backgroundImage,
             vig: getComputedStyle(mc, '::before').backgroundImage,
             filt: getComputedStyle(document.getElementById('usmap')).filter,
             bg: cs.backgroundImage };
  });
  ck('terminal screen stamps acop-nuke-tv + acop-nuke-final + body.acop-nuke-screen', n.tv && n.fin && n.screen);
  ck('the guarded detector stands down under nuke, the raw one still fires', n.guarded === false && n.raw === true);
  ck('EV panel retitled CASUALTY CENSUS', n.h3 === 'CASUALTY CENSUS');
  ck('CRT scanlines + tube vignette live on the map', /repeating-linear-gradient/.test(n.scan) && /radial-gradient/.test(n.vig));
  ck('the FALLOUT map drops the tube filter (the billowing plumes live inside the svg)',
     n.filt === 'none' && /#game_window\.acop-nuke-final #map_container svg \{\s*filter: none;/.test(noiseCss));
  ck('the fallout map drops the noise gif', !/tvnoise/.test(n.bg));
  n = await p.evaluate(() => { document.body.classList.remove('acop-nuke'); window.__T.tick();
    const gw = document.getElementById('game_window');
    return { tv: gw.classList.contains('acop-nuke-tv'), h3: document.querySelector('#overall_result h3').textContent,
             screen: document.body.classList.contains('acop-nuke-screen') }; });
  ck('war over: chrome unwinds and the panel title is restored',
     !n.tv && !n.screen && n.h3 === 'ELECTORAL VOTES');

  console.log('\nMISSILE STRIKES:');
  await p.evaluate(() => {
    _NUKE_SCORCH = true; _NUKE_FLIGHT_MS = 300;      // fast + visible for the timing checks
    document.body.classList.add('acop-nuke');
    document.getElementById('final_election_map_button').remove();
    const b2 = document.createElement('button'); b2.id = 'final_result_button';
    document.getElementById('game_window').appendChild(b2);
    const svg = document.querySelector('#map_container svg');
    for (const [id, d] of [['stA','M10 10h30v30h-30z'],['stB','M60 10h30v30h-30z'],['stC','M110 10h30v30h-30z']]) {
      const q = document.createElementNS('http://www.w3.org/2000/svg','path');
      q.id = id; q.setAttribute('d', d); q.setAttribute('fill', '#c8a070'); svg.appendChild(q);
    }
    window.__T.tick();                                // attaches the fill observer
  });
  let st = await p.evaluate(async () => {
    document.getElementById('stA').setAttribute('fill', '#41505c');
    await new Promise(r => setTimeout(r, 120));
    const layer = document.querySelector('#nuke-strike-layer');
    return { tracer: !!layer.querySelector('line'), missile: !!layer.querySelector('image'),
             scorch: !!layer.querySelector('circle') };
  });
  ck('a call launches a strike: tracer + missile + scorch', st.tracer && st.missile && st.scorch);
  ck('…and Election Night KEEPS the SIGINT wash minus the green (nothing billows there)',
     await p.evaluate(() => {
       const f = getComputedStyle(document.getElementById('usmap')).filter;
       return /sepia\(0\.3\)/.test(f) && /saturate\(1\.4\)/.test(f) && !/hue-rotate/.test(f);
     }));
  st = await p.evaluate(async () => {
    const svg = document.querySelector('#map_container svg');
    const dd = document.createElementNS('http://www.w3.org/2000/svg','path');
    dd.setAttribute('d','M360 10h30v30h-30z'); dd.setAttribute('data-abbr','DD'); dd.setAttribute('fill','#c8a070');
    svg.appendChild(dd); delete svg.__nukeMaps;
    const wire0 = (document.getElementById('nuke-wire') || { childElementCount: 0 }).childElementCount;
    dd.setAttribute('fill', '#8a2f1e');
    await new Promise(r => setTimeout(r, 120));
    const mid = { fill: dd.getAttribute('fill'),
                  wire: (document.getElementById('nuke-wire') || { childElementCount: 0 }).childElementCount - wire0 };
    await new Promise(r => setTimeout(r, 380));
    return { mid, endFill: dd.getAttribute('fill'),
             wireEnd: (document.getElementById('nuke-wire') || { childElementCount: 0 }).childElementCount - wire0 };
  });
  ck('the state holds its pre-call colour through the flight, turns census AT impact',
     /c8a070/i.test(st.mid.fill) && /8a2f1e/i.test(st.endFill));
  ck('the wire obituary lands WITH the impact, not at launch', st.mid.wire === 0 && st.wireEnd >= 1);
  st = await p.evaluate(async () => {
    const svg = document.querySelector('#map_container svg');
    const ca = document.createElementNS('http://www.w3.org/2000/svg','path');
    ca.setAttribute('d','M210 60h40v40h-40z'); ca.setAttribute('data-abbr','CA'); ca.setAttribute('fill','#c8a070');
    svg.appendChild(ca); delete svg.__nukeMaps;
    const layer = document.querySelector('#nuke-strike-layer'); layer.replaceChildren();
    const sc0 = (window.__nukeScorches || []).length;
    const real = Math.random; Math.random = () => 0.3;      // follow-ups air-burst
    ca.setAttribute('fill', '#4a4a4a');
    await new Promise(r => setTimeout(r, 700));
    Math.random = real;
    return { tracers: layer.querySelectorAll('line').length,
             scorches: (window.__nukeScorches || []).length - sc0 };
  });
  ck('MIRV: the big state eats a 3-warhead salvo', st.tracers === 3);
  ck('air bursts: only the lead warhead ground-bursts', st.scorches === 1);
  st = await p.evaluate(async () => {
    document.body.classList.add('low-fx-on');
    const svg = document.querySelector('#map_container svg');
    const zz = document.createElementNS('http://www.w3.org/2000/svg','path');
    zz.setAttribute('d','M300 10h30v30h-30z'); zz.setAttribute('data-abbr','ZZ'); zz.setAttribute('fill','#c8a070');
    svg.appendChild(zz); delete svg.__nukeMaps;
    const layer = document.querySelector('#nuke-strike-layer'); layer.replaceChildren();
    zz.setAttribute('fill', '#5a7d2a');
    await new Promise(r => setTimeout(r, 150));
    const out = { added: layer.querySelectorAll('line,image').length, fill: zz.getAttribute('fill') };
    document.body.classList.remove('low-fx-on');
    return out;
  });
  ck('low demand mode: no strike animation, but the state STILL recolours',
     st.added === 0 && /5a7d2a/i.test(st.fill));

  console.log('\nBROADCAST FURNITURE:');
  st = await p.evaluate(() => {
    const win = document.createElement('div'); win.id = 'election_night_window';
    win.innerHTML = '<h3>Advisor</h3><img src="x.png"><p>text</p>';
    document.body.appendChild(win);
    window.__T.tick(); window.__T.tick();               // second tick = idempotence
    const ch = document.getElementById('nuke-chyron');
    return { h3: win.querySelector('h3').textContent, bars: win.querySelectorAll('.nuke-ebs-bars').length,
             img: !!win.querySelector('img'), chyron: !!ch,
             chyronInHeader: ch && ch.parentElement.id === 'game_window',
             chyText: ch ? ch.textContent : '' };
  });
  ck('EBS takes the opener: header + colour bars replace the advisor photo (idempotent)',
     st.h3 === 'EMERGENCY BROADCAST SYSTEM' && st.bars === 1 && !st.img);
  ck('civil-defense chyron mounted in the header strip with its crawl text',
     st.chyron && st.chyronInHeader && /THIS IS NOT A TEST/.test(st.chyText));
  // The card is over the map but only as tall as its own content: it must end
  // just below the OK button, NOT cover the map the way it used to. The popup
  // lives inside #game_window in the real engine, so re-parent it here — the
  // placement is measured against the game window's box.
  let eb = await p.evaluate(() => {
    const win = document.getElementById('election_night_window');
    document.getElementById('game_window').appendChild(win);
    if (!win.querySelector('button')) {
      const okb = document.createElement('button'); okb.id = '__ok'; okb.textContent = 'OK';
      win.appendChild(okb);
    }
    delete win.dataset.nukeEbs;
    __nukeEbsTick(true);
    const mc = document.getElementById('map_container').getBoundingClientRect();
    const w = win.getBoundingClientRect();
    const ok = win.querySelector('button').getBoundingClientRect();
    return { belowOk: Math.round(w.bottom - ok.bottom), shorter: w.height < mc.height,
             sameLeft: Math.round(w.left) === Math.round(mc.left),
             sameWidth: Math.round(w.width) === Math.round(mc.width),
             insideMap: w.bottom <= mc.bottom + 1,
             h: win.style.height, maxH: win.style.maxHeight };
  });
  ck('EBS card is bounded by the OK button plus a margin, not by the map',
     eb.h === 'auto' && eb.belowOk > 8 && eb.belowOk < 60 && eb.shorter);
  ck('…while keeping the map\'s left edge and width, and staying inside it',
     eb.sameLeft && eb.sameWidth && eb.insideMap && /px$/.test(eb.maxH));
  st = await p.evaluate(() => {
    __nukeEbsIntroPlayed = false; __nukeEbsIntroArmed = false;
    document.getElementById('nuke-ebs-intro')?.remove();
    window.__T.tick();                                   // popup still up -> ARM only
    const armed = __nukeEbsIntroArmed, early = !!document.getElementById('nuke-ebs-intro');
    document.getElementById('election_night_window').remove();
    window.__T.tick();                                   // OK pressed -> FIRE
    const img = document.getElementById('nuke-ebs-intro');
    window.__T.tick();                                   // once per night
    return { armed, early, inMap: !!img && img.parentElement.id === 'map_container',
             count: document.querySelectorAll('#nuke-ebs-intro').length };
  });
  ck('EBS intro still: armed while the popup is up, no image yet', st.armed && !st.early);
  ck('EBS intro still: OK fires it into #map_container, once per night', st.inMap && st.count === 1);
  ck('EBS intro still fills the map container exactly (unlike the card above it)',
     await p.evaluate(() => {
       const img = document.getElementById('nuke-ebs-intro');
       const cs = getComputedStyle(img);
       return img.parentElement.id === 'map_container' && cs.position === 'absolute'
         && cs.objectFit === 'cover' && cs.inset === '0px';
     }));
  st = await p.evaluate(() => {
    window.__nukeSchedule = [{ abbr: 'ND', t: 30 }, { abbr: 'CA', t: 120 }];
    let q = document.querySelector('#overall_result > p');
    if (!q) { q = document.createElement('p'); document.getElementById('overall_result').appendChild(q); }
    q.textContent = '0% complete';
    const svg = document.querySelector('#map_container svg');
    const nd = document.createElementNS('http://www.w3.org/2000/svg','path');
    nd.setAttribute('d','M160 60h30v30h-30z'); nd.setAttribute('data-abbr','ND'); nd.setAttribute('fill','#c8a070');
    svg.appendChild(nd); delete svg.__nukeMaps;
    window.__T.tick();
    return { txt: document.getElementById('nuke-norad').textContent,
             blips: document.querySelectorAll('.nuke-blip').length };
  });
  ck('NORAD counts inbound tracks and pulses a blip on the threatened state',
     st.txt === 'INBOUND TRACKS: 01' && st.blips === 1);

  console.log('\nAFTERMATH (final damage map):');
  st = await p.evaluate(() => {
    // census-coloured states + a non-census ocean, so the state-only wash is testable
    document.getElementById('final_result_button').remove();
    const b3 = document.createElement('button'); b3.id = 'final_election_map_button'; b3.disabled = true;
    document.getElementById('game_window').appendChild(b3);
    const svg = document.querySelector('#map_container svg');
    [...svg.querySelectorAll('path')].forEach(x => x.remove());
    const NS = 'http://www.w3.org/2000/svg';
    [['#8a2f1e','M0 0h20v20z'],['#5a7d2a','M30 0h20v20z'],['#41505c','M60 0h20v20z'],['#123456','M0 40h80v20z']]
      .forEach(([f, d]) => { const q = document.createElementNS(NS,'path'); q.setAttribute('d', d); q.setAttribute('fill', f); svg.appendChild(q); });
    delete svg.__nukeMaps;
    window.__nukeScorches = [{ x: 10, y: 10, r: 8 }, { x: 40, y: 10, r: 7 }, { x: 70, y: 10, r: 9 }];
    window.__T.tick();
    const g = document.querySelector('#nuke-aftermath-layer');
    const kids = [...g.children];
    const wash = kids.filter(e => e.tagName.toLowerCase() === 'path' && /1[23][0-9], 1[23][0-9], 1[23][0-9]/.test(e.getAttribute('fill') || ''));
    const plumes = kids.filter(e => e.tagName.toLowerCase() === 'path' && !wash.includes(e));
    const xs = (plumes[0].getAttribute('d').match(/-?\d+\.?\d*/g) || []).filter((_, i) => i % 2 === 0).map(Number);
    return { total: kids.length, wash: wash.length, plumes: plumes.length,
             washFirst: wash.includes(g.firstElementChild), noRect: !g.querySelector('rect'),
             east: Math.max(...xs) > 15,
             animated: plumes.every(x => x.getAnimations().length >= 1),
             washStatic: wash.every(x => x.getAnimations().length === 0) };
  });
  ck('aftermath: fallout plume + smoke + char per burst, plus the per-state wash',
     st.total === 3 * 4 + st.wash && st.plumes === 6);
  ck('fallout plumes taper EAST (west-to-east prevailing winds)', st.east);
  ck('state-only wash: grey copies of the 3 census states, ocean untouched, no full rect',
     st.wash === 3 && st.noRect && st.washFirst);
  ck('plumes billow; the wash stays static', st.animated && st.washStatic);

  // ── The banner strip. Pixel-probed, not asserted from the CSS text: the
  // hide rule was present and correct-looking for a month while losing the
  // cascade to the main stylesheet's 'div.center img#header'.
  console.log('\nBANNER STRIP (pixels, not selectors):');
  const strip = await (async () => {
    const p2 = await b.newPage({ viewport: { width: 1120, height: 780 } });
    p2.on('pageerror', e => console.log('PAGE ERROR:', e.message));
    // magenta page background: anything showing through the strip is obvious
    await p2.setContent(`<!DOCTYPE html><body class="acop-nuke acop-nuke-screen acop-nuke-post" style="margin:0;background:#ff00ff">
      <div class="center"><img id="header" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></div>
      <div id="game_window" class="acop-nuke-tv" style="width:1050px;height:660px;margin:0 auto">
        <div class="game_header"><h2>ACOP</h2></div>
        <div id="main_content_area" style="height:520px"><div id="map_container"><svg width="721" height="400"></svg></div></div>
        <div id="nuke-chyron"><span>THIS IS NOT A TEST</span></div>
      </div></body>`);
    await p2.addStyleTag({ content: mainCss });
    await p2.addStyleTag({ content: noiseCss });
    const geo = await p2.evaluate(() => {
      const gw = document.getElementById('game_window').getBoundingClientRect();
      const ch = document.getElementById('nuke-chyron').getBoundingClientRect();
      return { top: Math.round(gw.top), left: Math.round(gw.left), w: Math.round(gw.width),
               chTop: Math.round(ch.top), chBot: Math.round(ch.bottom),
               banner: getComputedStyle(document.getElementById('header')).display };
    });
    const b64 = (await p2.screenshot()).toString('base64');
    const px = await p2.evaluate(async ({ b64, geo }) => {
      const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
      const at = (x, y) => { const d = cx.getImageData(x, y, 1, 1).data; return d[0] + ',' + d[1] + ',' + d[2]; };
      const mid = geo.left + Math.round(geo.w / 2);
      return { above: at(mid, geo.top + 10), below: at(mid, geo.chBot + 8),
               chyron: at(mid, Math.round((geo.chTop + geo.chBot) / 2)),
               room: at(mid, geo.top + 300) };
    }, { b64, geo });
    await p2.close();
    return { geo, px };
  })();
  ck('the site banner really is hidden (computed display, not just a rule)',
     strip.geo.banner === 'none');
  ck('the header strip is transparent — the page shows through, no black bar',
     strip.px.above === '255,0,255' && strip.px.below === '255,0,255');
  ck('…but the chyron is NOT occluded: it keeps its own opaque ground on top',
     strip.px.chyron !== '255,0,255' && /^\d+,\d+,\d+$/.test(strip.px.chyron)
     && Number(strip.px.chyron.split(',')[0]) < 120);
  ck('…and the war room below the strip is still solid black', strip.px.room === '0,0,0');

  // ── Skipping out early. The bug: "Go to Final Results" while warheads are
  // still in flight (or the barrage is still raining) left those states with no
  // recorded burst, so the damage map drew no plumes for them at all.
  console.log('\nSKIPPING OUT EARLY:');
  let sk = await p.evaluate(() => {
    const svg = document.querySelector('#map_container svg');
    [...svg.querySelectorAll('path')].forEach(x => x.remove());
    svg.querySelector('#nuke-aftermath-layer')?.remove();
    const NS = 'http://www.w3.org/2000/svg';
    ['AA', 'BB', 'CC', 'DD', 'EE'].forEach((ab, i) => {
      const q = document.createElementNS(NS, 'path');
      q.setAttribute('d', 'M' + (10 + i * 60) + ' 10h50v50z');
      q.setAttribute('data-abbr', ab); q.setAttribute('fill', '#8a2f1e');
      svg.appendChild(q);
    });
    delete svg.__nukeMaps;
    // only TWO states got as far as landing a warhead before the player skipped
    window.__nukeScorches = [{ x: 30, y: 30, r: 6, abbr: 'AA' }, { x: 90, y: 30, r: 6, abbr: 'BB' }];
    __nukeScorchesFilled = false;
    __nukeAftermath(true, svg);
    const g = svg.querySelector('#nuke-aftermath-layer');
    const byState = {};
    (window.__nukeScorches || []).forEach(x => { byState[x.abbr] = (byState[x.abbr] || 0) + 1; });
    return { states: Object.keys(byState).sort().join(','), total: window.__nukeScorches.length,
             layerKids: g ? g.childElementCount : 0 };
  });
  ck('states the count never reached still get bursts on the damage map',
     sk.states === 'AA,BB,CC,DD,EE' && sk.total >= 5);
  ck('…and they are drawn (plume + smoke + char per burst, plus the wash)',
     sk.layerKids >= sk.total * 4);

  sk = await p.evaluate(() => {
    const svg = document.querySelector('#map_container svg');
    const before = window.__nukeScorches.length;
    svg.querySelector('#nuke-aftermath-layer')?.remove();
    __nukeAftermath(true, svg);            // revisiting the map must not add more
    const mid = window.__nukeScorches.map(x => Math.round(x.x) + ',' + Math.round(x.y)).join('|');
    svg.querySelector('#nuke-aftermath-layer')?.remove();
    __nukeAftermath(true, svg);
    const after = window.__nukeScorches.map(x => Math.round(x.x) + ',' + Math.round(x.y)).join('|');
    return { grew: window.__nukeScorches.length !== before, stable: mid === after };
  });
  ck('the top-up happens once — revisiting does not pile on more craters',
     !sk.grew && sk.stable);

  sk = await p.evaluate(() => {
    // a full night watched to the end: every state already has its bursts, so
    // the top-up must add nothing
    const svg = document.querySelector('#map_container svg');
    window.__nukeScorches = [];
    ['AA', 'BB', 'CC', 'DD', 'EE'].forEach(ab => {
      for (let i = 0; i < __nukeExpectedBursts(ab); i++) window.__nukeScorches.push({ x: 20, y: 20, r: 5, abbr: ab });
    });
    const before = window.__nukeScorches.length;
    __nukeScorchesFilled = false;
    __nukeFillScorches(svg);
    return { before: before, after: window.__nukeScorches.length };
  });
  ck('a night watched to the end gets no synthetic bursts at all',
     sk.before === sk.after && sk.before > 0);

  sk = await p.evaluate(() => {
    const svg = document.querySelector('#map_container svg');
    const g = __nukeStrikeLayer(svg);
    window.__nukeScorches = [];
    const wasF = _NUKE_FLIGHT_MS; _NUKE_FLIGHT_MS = 5;
    __nukeOneMissile(svg, g, 30, 30, { x: 10, y: 10, width: 50, height: 50 }, true, null, 'ZZ');
    return new Promise(r => setTimeout(() => {
      _NUKE_FLIGHT_MS = wasF;
      r({ tagged: (window.__nukeScorches[0] || {}).abbr });
    }, 60));
  });
  ck('real impacts record which state they hit (what the top-up counts)', sk.tagged === 'ZZ');

  // ── Performance budgets. Both cap CONCURRENT work; neither may drop anything
  // from the picture, which is what these assert.
  console.log('\nPERFORMANCE BUDGETS:');
  let pf = await p.evaluate(() => {
    const svg = document.querySelector('#map_container svg');
    const scorches = [];
    for (let i = 0; i < 90; i++) scorches.push({ x: 20 + (i % 30) * 5, y: 20 + Math.floor(i / 30) * 7, r: 6 });
    window.__nukeScorches = scorches;
    const build = () => {
      svg.querySelector('#nuke-aftermath-layer')?.remove();
      __nukeAftermath(true, svg);
      const g = svg.querySelector('#nuke-aftermath-layer');
      const paths = [...g.children].filter(e => e.tagName.toLowerCase() === 'path');
      const wash = paths.filter(e => /1[23][0-9], 1[23][0-9], 1[23][0-9]/.test(e.getAttribute('fill') || ''));
      const plumes = paths.filter(e => !wash.includes(e));
      return { plumes: plumes.length, animated: plumes.filter(e => e.getAnimations().length > 0).length };
    };
    const capped = build();
    const was = _NUKE_FALLOUT_BILLOW_MAX; _NUKE_FALLOUT_BILLOW_MAX = 0;
    const uncapped = build();
    _NUKE_FALLOUT_BILLOW_MAX = was;
    const back = build();
    window.__nukeScorches = [];
    svg.querySelector('#nuke-aftermath-layer')?.remove();
    return { capped: capped, uncapped: uncapped, back: back };
  });
  ck('90 bursts: every plume is still DRAWN under the billow cap',
     pf.capped.plumes === 180 && pf.uncapped.plumes === 180);
  ck('…but only a capped subset animates (was 180 infinite animations)',
     pf.capped.animated === 90 && pf.capped.animated < pf.uncapped.animated);
  ck('cap 0 disables it — everything billows again', pf.uncapped.animated === 180);
  ck('the cap is deterministic across rebuilds', pf.back.animated === pf.capped.animated);

  pf = await p.evaluate(async () => {
    // Election night: rain impacts on one state and watch the live cloud count.
    const svg = document.querySelector('#map_container svg');
    document.getElementById('final_election_map_button')?.remove();
    const fb = document.createElement('button'); fb.id = 'final_result_button';
    document.getElementById('game_window').appendChild(fb);
    svg.querySelector('#nuke-strike-layer')?.remove();
    const g = __nukeStrikeLayer(svg);
    const bb = { x: 0, y: 0, width: 40, height: 40 };
    const was = _NUKE_MAX_CLOUDS, wasF = _NUKE_FLIGHT_MS; _NUKE_MAX_CLOUDS = 4; _NUKE_FLIGHT_MS = 10;
    window.__nukeScorches = [];
    for (let i = 0; i < 30; i++) __nukeOneMissile(svg, g, 10 + i, 10, bb, true, null);
    await new Promise(r => setTimeout(r, 120));
    const clouds = g.querySelectorAll('.nuke-cloud').length;
    const flashes = g.querySelectorAll('circle').length;
    const recorded = window.__nukeScorches.length;
    _NUKE_MAX_CLOUDS = was; _NUKE_FLIGHT_MS = wasF;
    return { clouds: clouds, flashes: flashes, recorded: recorded };
  });
  ck('election night: simultaneous mushroom clouds are capped', pf.clouds > 0 && pf.clouds <= 4);
  ck('…while over-budget impacts keep their flash + ring', pf.flashes >= 30);
  ck('…and are still RECORDED for the damage map', pf.recorded === 30);

  // ── Follow-up scatter. The point of the containment test is the shape a
  // bounding box cannot describe, so the fixture is a RING: the bbox centre —
  // where the aim point would sit untouched — is a hole.
  console.log('\nFOLLOW-UP SCATTER (MIRVs + barrage stay on the landmass):');
  let sc = await p.evaluate(() => {
    const svg = document.querySelector('#map_container svg');
    const NS = 'http://www.w3.org/2000/svg';
    const ring = document.createElementNS(NS, 'path');
    // 100x100 square with a 40x40 hole dead centre (even-odd via a reversed inner ring)
    ring.setAttribute('d', 'M400 100h100v100h-100z M430 130v40h40v-40z');
    ring.setAttribute('fill-rule', 'evenodd');
    ring.setAttribute('fill', '#c8a070');
    ring.setAttribute('data-abbr', 'RG');
    svg.appendChild(ring);
    const bb = ring.getBBox();
    const aimX = bb.x + bb.width / 2, aimY = bb.y + bb.height / 2;
    const inHole = (x, y) => x > 430 && x < 470 && y > 130 && y < 170;
    const sample = (spread, onland) => {
      const was = _NUKE_SPREAD_ONLAND; _NUKE_SPREAD_ONLAND = onland;
      let hole = 0, distinct = new Set();
      for (let i = 0; i < 400; i++) {
        // aim at a real point on the ring (as an author would), not the hole
        const r = __nukeScatter(ring, bb, 415, 115, spread);
        if (inHole(r.x, r.y)) hole++;
        distinct.add(Math.round(r.x) + ',' + Math.round(r.y));
      }
      _NUKE_SPREAD_ONLAND = was;
      return { hole: hole, distinct: distinct.size };
    };
    return { on: sample(0.35, true), off: sample(0.35, false),
             aimInHole: inHole(aimX, aimY),
             // a state whose aim point is off-fill must NOT collapse to one pixel
             uncalibrated: (() => {
               const was = _NUKE_SPREAD_ONLAND; _NUKE_SPREAD_ONLAND = true;
               const seen = new Set();
               for (let i = 0; i < 60; i++) {
                 const r = __nukeScatter(ring, bb, aimX, aimY, 0.35);   // aim IN the hole
                 seen.add(Math.round(r.x) + ',' + Math.round(r.y));
               }
               _NUKE_SPREAD_ONLAND = was;
               return seen.size;
             })() };
  });
  ck('the fixture is a real test: its bbox centre is a hole', sc.aimInHole);
  ck('with containment ON, no follow-up lands in the water', sc.on.hole === 0 && sc.on.distinct > 100);
  ck('…and it is doing work — the same scatter with it OFF does hit the hole', sc.off.hole > 0);
  ck('an unusable containment test falls back to plain scatter, never one pixel',
     sc.uncalibrated > 20);
  sc = await p.evaluate(() => {
    const svg = document.querySelector('#map_container svg');
    const ring = svg.querySelector('[data-abbr="RG"]');
    const bb = ring.getBBox();
    const was = _NUKE_SPREAD_MIRV; _NUKE_SPREAD_MIRV = 0;
    const r = __nukeScatter(ring, bb, 415, 115, _NUKE_SPREAD_MIRV);
    _NUKE_SPREAD_MIRV = was;
    ring.remove(); delete svg.__nukeMaps;
    return { x: Math.round(r.x), y: Math.round(r.y) };
  });
  ck('spread 0 puts every warhead on the aim point exactly', sc.x === 415 && sc.y === 115);

  // ── Hit-point editor. Drive it the way an author does: turn it on, drag a
  // crosshair, and check the offset it writes — not merely that it rendered.
  console.log('\nHIT-POINT EDITOR:');
  let he = await p.evaluate(() => {
    const svg = document.querySelector('#map_container svg');
    svg.setAttribute('viewBox', '0 0 400 200');
    svg.setAttribute('width', '400'); svg.setAttribute('height', '200');
    svg.style.position = 'absolute'; svg.style.left = '0px'; svg.style.top = '0px';
    [...svg.querySelectorAll('path')].forEach(x => x.remove());
    const NS = 'http://www.w3.org/2000/svg';
    // CA spans 20..80 x 20..60 -> centre (50, 40); FL 200..260 x 100..140 -> (230, 120)
    [['CA', 'M20 20h60v40z'], ['FL', 'M200 100h60v40z']].forEach(([ab, d]) => {
      const q = document.createElementNS(NS, 'path');
      q.setAttribute('d', d); q.setAttribute('data-abbr', ab); q.setAttribute('fill', '#c8a070');
      svg.appendChild(q);
    });
    delete svg.__nukeMaps;
    Object.keys(_NUKE_HIT_OFFSET).forEach(k => { delete _NUKE_HIT_OFFSET[k]; });
    const ok = __nukeHitsOn();
    const layer = document.getElementById('nuke-hit-edit-layer');
    const mk = ab => layer.querySelector('g[data-abbr="' + ab + '"]');
    const at = g => (g.getAttribute('transform').match(/translate\(([^,]+),\s*([^)]+)\)/) || [])
      .slice(1).map(Number);
    return { ok: ok, panel: !!document.getElementById('nuke-hit-edit-panel'),
             markers: layer.querySelectorAll('g[data-abbr]').length,
             ca: at(mk('CA')), fl: at(mk('FL')),
             label: mk('CA').querySelector('text').textContent,
             onTop: layer === svg.lastElementChild };
  });
  ck('editor mounts a crosshair per state, on the bbox centre, above the map',
     he.ok && he.panel && he.markers === 2 && he.label === 'CA' && he.onTop
     && he.ca[0] === 50 && he.ca[1] === 40 && he.fl[0] === 230 && he.fl[1] === 120);

  he = await p.evaluate(() => {
    const svg = document.querySelector('#map_container svg');
    const r = svg.getBoundingClientRect();
    const g = document.querySelector('#nuke-hit-edit-layer g[data-abbr="CA"]');
    const fire = (type, ux, uy, opts) => {
      const e = new MouseEvent(type, Object.assign(
        { bubbles: true, cancelable: true, clientX: r.left + ux, clientY: r.top + uy }, opts || {}));
      (type === 'mousedown' || type === 'dblclick' ? g : document).dispatchEvent(e);
    };
    fire('mousedown', 50, 40);      // grab the crosshair dead centre
    fire('mousemove', 38, 47);      // …drag it 12 left, 7 down
    fire('mouseup', 38, 47);
    const after = g.getAttribute('transform');
    const panel = document.getElementById('nuke-hit-edit-panel').textContent;
    return { off: JSON.parse(JSON.stringify(_NUKE_HIT_OFFSET)), after: after,
             panelHasCA: /CA: \{ x: -12, y: 7 \}/.test(panel),
             panelHasFL: /FL:/.test(panel) };
  });
  ck('dragging a crosshair writes the offset (svg units, rounded) and prints it',
     he.off.CA && he.off.CA.x === -12 && he.off.CA.y === 7 && he.panelHasCA
     && /translate\(38,\s*47\)/.test(he.after));
  ck('only the states you moved are listed — the rest stay on their centre', !he.panelHasFL);

  he = await p.evaluate(() => {
    // the strike/aftermath layers append themselves as the night runs — the tick
    // must lift the crosshairs back on top
    const svg = document.querySelector('#map_container svg');
    svg.appendChild(__nukeStrikeLayer(svg));   // as a re-appended strike/aftermath layer does
    const buried = svg.lastElementChild.id !== 'nuke-hit-edit-layer';
    window.__T.tick();
    return { buried: buried, lifted: svg.lastElementChild.id === 'nuke-hit-edit-layer' };
  });
  ck('the crosshairs are lifted back above layers that append themselves later',
     he.buried && he.lifted);

  he = await p.evaluate(() => {
    const g = document.querySelector('#nuke-hit-edit-layer g[data-abbr="CA"]');
    g.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    const reset = { off: JSON.parse(JSON.stringify(_NUKE_HIT_OFFSET)), at: g.getAttribute('transform') };
    __nukeHitsOff();
    return { reset: reset, layer: !!document.getElementById('nuke-hit-edit-layer'),
             panel: !!document.getElementById('nuke-hit-edit-panel'),
             reopen: (() => { const a = __nukeHitsOn(); const b = !!document.getElementById('nuke-hit-edit-layer'); __nukeHitsOff(); return a && b; })() };
  });
  ck('double-click resets that state to the centre and drops it from the config',
     !he.reset.off.CA && /translate\(50,\s*40\)/.test(he.reset.at));
  ck('Done tears the layer and panel down, and it can be reopened',
     !he.layer && !he.panel && he.reopen);

  // ── Panel stacking. The CRT bezel paints outside the layout box, so a check
  // that only compares the boxes would miss the collision the player sees. The
  // bleed constants below are the MEASURED painted extent at a perceptible
  // threshold (22 up / 38 down / 29 sideways) — see the spacing comment on the
  // panel rules in Code 1.
  console.log('\nPANEL STACKING (measured, incl. the bezel bleed):');
  const CENSUS = `<h3>CASUALTY CENSUS</h3><ul>
    <li><span style="background:#8a2f1e">--</span>The Injured: 62,441,902</li>
    <li><span style="background:#5a7d2a">--</span>The Irradiated: 59,880,431</li>
    <li><span style="background:#41505c">--</span>Short-term Survivors: 56,673,549</li>
    <li><span style="background:#4a4a4a">--</span>The Dead: 31,004,118</li></ul><p>62% complete</p>`;
  const DAMAGE = `<h3>DAMAGE ASSESSMENT</h3><p>Massachusetts</p><ul>
    <li><span style="background:#8a2f1e">--</span>The Injured: 3,204,113</li>
    <li><span style="background:#5a7d2a">--</span>The Irradiated: 2,988,902</li>
    <li><span style="background:#41505c">--</span>Short-term Survivors: 2,101,447</li>
    <li><span style="background:#4a4a4a">--</span>The Dead: 1,662,318</li></ul>`;
  const layout = async (finalMap) => {
    const p2 = await b.newPage({ viewport: { width: 1140, height: 820 } });
    const nav = finalMap
      ? ['Final Results','Election Map','State Results','Popular Vote','Electoral Vote','Main Menu']
          .map(t => '<button class="final_menu_button">' + t + '</button>').join('')
      : '<button id="final_result_button">Go to Final Results</button>';
    await p2.setContent(`<!DOCTYPE html><body class="acop-nuke acop-nuke-screen" style="margin:0">
      <div id="game_window" class="acop-nuke-tv ${finalMap ? 'acop-nuke-final' : ''}" style="width:1050px;height:660px">
        <div class="game_header"><h2>ACOP</h2></div>
        <div id="main_content_area" style="height:560px">
          <div id="map_container"><svg width="721" height="400"></svg></div>
          <div id="menu_container">
            <div id="overall_result_container"><div id="overall_result">${CENSUS}</div></div>
            <div id="state_result_container"><div id="state_result">${DAMAGE}</div></div>
          </div>
        </div>
        <div id="map_footer">${nav}</div>
        <div id="nuke-chyron"><span>CIVIL DEFENSE</span></div>
      </div></body>`);
    await p2.addStyleTag({ content:
      mainCss.slice(mainCss.indexOf('.game_header {'), mainCss.indexOf('#opponent_selection_id_button_p'))
      + mainCss.slice(mainCss.indexOf('#map_footer {'), mainCss.indexOf('.control-knob {'))
      + mainCss.slice(mainCss.indexOf('#overall_result_container,\n#state_result_container {'), mainCss.indexOf('.map-pin {'))
      + '\n' + noiseCss });
    const r = await p2.evaluate(() => {
      const gw = document.getElementById('game_window').getBoundingClientRect();
      const box = (id, up, dn) => { const q = document.getElementById(id).getBoundingClientRect();
        return { top: q.top - gw.top - up, bot: q.bottom - gw.top + dn,
                 l: q.left - gw.left, r: q.right - gw.left }; };
      return { win: gw.height, chy: box('nuke-chyron', 0, 0),
               ov: box('overall_result_container', 22, 38),
               st: box('state_result_container', 22, 38),
               ft: box('map_footer', 0, 0) };
    });
    await p2.close();
    return r;
  };
  for (const finalMap of [false, true]) {
    const g = await layout(finalMap);
    const label = finalMap ? 'final damage map' : 'election night';
    ck(label + ': the two cards do not touch', g.ov.bot < g.st.top - 8);
    ck(label + ': the census card clears the chyron', g.ov.top > g.chy.bot);
    const hOverlap = Math.min(g.st.r + 29, g.ft.r) - Math.max(g.st.l - 29, g.ft.l);
    ck(label + ': the nav footer sits clear BELOW the damage card',
       g.ft.top > g.st.bot && (hOverlap <= 0 || g.ft.top > g.st.bot));
    ck(label + ': the footer is still inside the game window', g.ft.bot <= g.win);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})();
