// The Initiative button: Cut Them Loose and Pin the Blame moved off the
// President's Men row and behind one button, paid for out of ONE shared pool.
// Hush Money and Offer Clemency keep their own charges and stay in the row.
//
// Drives the REAL row build (sliced out of openInnerCircle) and the real
// picker/targeting functions against a stub org chart.
//
//   node tests/initiative_check.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const SRC = path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt');
const src = fs.readFileSync(SRC, 'utf8');

function extractFn(name) {
  const s = src.indexOf('function ' + name + '(');
  if (s < 0) throw new Error('no such function: ' + name);
  let d = 0;
  for (let j = src.indexOf('{', s); j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) return src.slice(s, j + 1); }
  }
}
// Inclusive source slice between two literal anchors — used for the const
// blocks and for the button-row build inside openInnerCircle, so the harness
// exercises the shipped code rather than a paraphrase of it.
function slice(a, b) {
  const i = src.indexOf(a);
  const j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor not found: ' + (i < 0 ? a : b));
  return src.slice(i, j + b.length);
}

// The whole pressure-engine _everyTurn registration, verbatim.
const PRESSURE_TICK = slice(
  "_everyTurn(() => {\n    if (!_pressureOn || !_lengthAllows('pressure')) return;",
  "if (typeof window._syncOrgStates === 'function') window._syncOrgStates();\n});");

// How many actions the submenu should offer, read off the shipped list.
const _TA_POOLED_LEN = (slice("const _TA_POOLED   = [", "];").match(/'/g) || []).length / 2;

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

console.log('STATIC WIRING:');
ck('InitiativeStack is declared and saved in _SL_SCALARS',
   /var InitiativeStack\s*=\s*0;/.test(src) && /'InitiativeStack',/.test(src));
ck('New Game resets the pool',
   /InitiativeStack = 0;/.test(slice('HushMoneyStack = 0; CutThemLooseStack = 0;', 'InitiativeStack = 0;')));
ck('a pre-Initiative save folds its cut/blame charges into the pool',
   /_foldLegacyInitiative\(\);/.test(extractFn('_slRestoreMod')));
ck('the row is built from _TA_MAIN_ROW, not the full action list',
   /_TA_MAIN_ROW\.forEach\(key =>/.test(src) && !/_TEAM_ACTIONS\.forEach\(a => \{\s*const btn = document\.createElement/.test(src));
ck('the submenu is a DROPDOWN — overlaid, with a caret on its button',
   /#nw-init-pick \{[^}]*position: absolute/.test(src)
   && /\[data-action="initiative"\]::after \{[^}]*content: ' \\\\25BE'/.test(src));
ck('…and its buttons are the row\'s own pills, with no extra furniture',
   /className = 'nw-ta-btn nw-init-btn'/.test(src)
   && /nw-ta-count">' \+ cost \+ '/.test(src)
   && !/nw-init-head|nw-init-cancel/.test(src));
ck('the dropdown closes on click-away, and takes its listener with it',
   /_initAwayHandler = \(e\) =>/.test(src)
   && /document\.addEventListener\('mousedown', _initAwayHandler, true\)/.test(src)
   && /removeEventListener\('mousedown', _initAwayHandler, true\)/.test(extractFn('_closeInitiativePicker')));
ck('Smear costs 2 and the others default to 1',
   /key: 'smear',[^}]*cost: 2/.test(src)
   && !/key: 'grace',[^}]*cost:/.test(src)
   && !/key: 'interrogate',[^}]*cost:/.test(src));
ck('spending takes the action price, not a flat one',
   /const cost = _taCost\(key\);\s*\n\s*if \(a\.get\(\) < cost\) return false;\s*\n\s*a\.set\(a\.get\(\) - cost\);/.test(src));
ck('Smear is guarded inside _flipWitness, the single choke point',
   /function _flipWitness\(name\) \{[\s\S]{0,400}if \(_smeared\.has\(name\)\) return;[\s\S]{0,40}_flipped\.add/.test(src));
ck('Grace stands the pressure tick down, and darkens the wire glow with it',
   /if \(_pressureFrozen\(\)\) return;\s*\/\/ Grace/.test(src)
   && /if \(_pressureFrozen\(\)\) return 0;\s*\/\/ Grace/.test(src));
ck('Interrogate routes both fog render sites through one shared helper',
   (src.match(/_loyaltyFogged\(id, loyalty\)/g) || []).length === 2
   && !/loyalty > 1 \? ' class="nw-fog"'/.test(src));
ck('Stonewall costs 2, is untargeted, and blocks ONLY the last rung',
   /key: 'stonewall',[^}]*cost: 2/.test(src)
   && /stonewall: \{[\s\S]{0,120}global: true/.test(src)
   && /if \(!_stonewalled\(\)\) \{\s*\n\s*\['Haldeman', 'Ehrlichman', 'Dean', 'Colson', 'Mitchell'\]/.test(src));
ck('…and it does NOT guard _flipWitness, so testimony still lands',
   !/_stonewalled/.test(extractFn('_flipWitness')));
ck('the wire glow darkens the Nixon rung only',
   /if \(tgt === 'Nixon'\) \{[\s\S]{0,600}if \(_stonewalled\(\)\) return 0;/.test(src));
ck('a locked-out reason may be a function, resolved at read time',
   /typeof h === 'function' \? h\(\) : h/.test(src)
   && /btn\.title = locked \? _taHintText\(wired\)/.test(src)
   && /if \(locked\) btn\.title = _taHintText\(wired\)/.test(src));
ck('the new per-run state is saved and cleared on New Game',
   /smeared: Array\.from\(_smeared\)/.test(src) && /interrogated: Array\.from\(_interrogated\)/.test(src)
   && /'_pressureFrozenUntil', '_stonewallUntil'/.test(src)
   && /_pressureFrozenUntil = -1; _stonewallUntil = -1;/.test(src));
ck('_flipped is rebuilt from the saved STATUS vars on restore (it is not stored)',
   /_flipped\.clear\(\);[\s\S]{0,200}_ORG_PRESSURE\[n\]\.st\(\) === 1\) _flipped\.add\(n\)/.test(src));
ck('the stale "three do nothing" comment on _TA_WIRED is gone',
   !/keep their charges and\s*\n\/\/ buttons but do nothing/.test(src));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await p.setContent('<!DOCTYPE html><body><div id="panel"></div>' +
    '<div id="nw-chart-wrapper">' +
    '<div class="nw-node" data-person="Hunt"><div class="nw-flip-area"></div></div>' +
    '<div class="nw-node" data-person="Magruder"><div class="nw-flip-area"></div></div>' +
    '<div class="nw-node" data-person="Haldeman"><div class="nw-flip-area"></div></div>' +
    '</div></body>');
  // The real panel stylesheet, so the dropdown's geometry is the shipped one.
  await p.addStyleTag({ content: slice('#nw-team-actions {', 'z-index: 20;\n        }') });

  await p.addScriptTag({ content: `
    // ---- stubs for everything the actions touch but this harness isn't testing
    var WatergateExposure = 4, _questionCount = 10;
    var _pressureOn = true;
    const _pausedUntil = {}, _clemencies = [];
    const _flipped = new Set(), _flipDanger = {}, _innerCircleFlips = [];
    const _edgeClocks = {}, _expDecayClocks = {}, _loyDecayClocks = {};
    const _turnTicks = [];
    function _everyTurn(fn) { _turnTicks.push(fn); }
    const mk = (loy, exp, st) => { let l = loy, e = exp, s = st;
      return { loy: () => l, setLoy: v => { l = v; }, exp: () => e, setExp: v => { e = v; },
               st: () => s, setSt: v => { s = v; }, inner: false }; };
    const _ORG_PRESSURE = { Hunt: mk(6, 5, 5), Magruder: mk(2, 4, 5), Haldeman: mk(8, 3, 5),
      Ehrlichman: mk(8, 1, 5), Dean: mk(7, 1, 5), Colson: mk(7, 1, 5), Mitchell: mk(8, 1, 5) };
    function _payOff(name) { const q = _ORG_PRESSURE[name]; if (q) q.setLoy(Math.min(10, q.loy() + 1)); }
    function _recordActionCrime() {}
    function _crimeName(k) { return k; }
    function _lengthAllows() { return true; }
    const _ORG_EDGES = { Hunt: ['Haldeman'], Magruder: ['Haldeman'] };
    function _syncTeamActionGlow() {}
    var _taUnseen = false;
    // The pressure tick and _flipWitness now report crack/flip news (change 78).
    // That is orgnews_check's subject, not this one's — stub the sink.
    const _crackWarned = new Set();
    function _orgNewsAdd() {}
    function _syncOrgNewsGlow() {}
    Math.random = () => 0;   // the flip roll always fires, so Smear is testable

    // ---- the real code under test
    ${slice('var HushMoneyStack     = 0;', 'function _taIsPooled(key) { const a = _teamAction(key); return !!(a && a.pool); }')}
    ${extractFn('_teamAction')}
    ${extractFn('_addTeamAction')}
    ${extractFn('_spendTeamAction')}
    ${slice('const _smeared        = new Set();', 'var _STONEWALL_TURNS = 3;')}
    ${extractFn('_pressureFrozen')}
    ${extractFn('_stonewalled')}
    ${extractFn('_stonewallLeft')}
    ${slice('const _TA_EXCLUDED =', 'function _taEligible(person) {')}
    ${extractFn('_taEligible').replace(/^function _taEligible\(person\) \{/, '')}
    ${slice('const _TA_WIRED = {', '\n};')}
    ${slice('var _taMode = null;', 'var _taMode = null;')}
    ${extractFn('_taHint')}
    ${extractFn('_taExitMode')}
    ${extractFn('_teamActionClicked')}
    ${slice('var _initAwayHandler = null;', 'var _initAwayHandler = null;')}
    ${extractFn('_closeInitiativePicker')}
    ${extractFn('_initiativePickerOpen')}
    ${extractFn('_openInitiativePicker')}
    ${extractFn('_initiativeClicked')}
    ${extractFn('_taHandleNodeClick')}
    ${extractFn('_syncTeamActionBtns')}
    ${extractFn('_foldLegacyInitiative')}
    ${extractFn('_taApplyGlobal')}
    ${extractFn('_taCost')}
    ${extractFn('_taMinPooledCost')}
    ${extractFn('_taHintText')}
    ${extractFn('_loyaltyFogged')}
    ${extractFn('_flipWitness')}
    // The wire-glow level function (nested inside _drawOrgLinks in the mod) —
    // Grace has to darken this too, or the frozen turn isn't visible.
    ${extractFn('_expFlowLevel')}
    // The REAL pressure tick, registered into the stub _everyTurn above — so
    // Grace and Smear are tested against the shipped engine, not a paraphrase.
    ${PRESSURE_TICK}
    window.__pressureTick = () => _turnTicks[0](_questionCount);

    // ---- the REAL row build, lifted out of openInnerCircle
    window.__buildRow = () => {
      document.getElementById('nw-team-actions')?.remove();
      const panel = document.getElementById('panel');
      ${slice('const taBox = document.createElement(\'div\');', 'panel.appendChild(taBox);')}
    };
    window.__rowKeys = () => [...document.querySelectorAll('#nw-team-actions > .nw-ta-btn')]
      .map(x => x.dataset.action);
    window.__btn = k => document.querySelector('#nw-team-actions > .nw-ta-btn[data-action="' + k + '"]');
    window.__count = k => window.__btn(k).querySelector('.nw-ta-count').textContent;
    window.__pickKeys = () => [...document.querySelectorAll('#nw-init-pick .nw-init-btn')]
      .map(x => x.dataset.action);
    window.__click = node => _taHandleNodeClick(document.querySelector('.nw-node[data-person="' + node + '"]'));
    window.__pickBtn = k => document.querySelector('#nw-init-pick [data-action="' + k + '"]');
    window.__pickCost = k => window.__pickBtn(k).querySelector('.nw-ta-count').textContent;
    window.__open = () => window.__btn('initiative').click();
    // Drive a man to the brink: loyalty 0, exposure 8, past the 3-turn grace,
    // so the next tick rolls for his flip every time (Math.random stubbed to 0).
    window.__brink = n => { const q = _ORG_PRESSURE[n]; q.setLoy(0); q.setExp(8); _flipDanger[n] = 9; };
  `});

  const ev = fn => p.evaluate(fn);

  console.log('\nTHE ROW:');
  let r = await ev(() => { window.__buildRow(); _syncTeamActionBtns(); return window.__rowKeys(); });
  ck('exactly three buttons: Hush Money, Offer Clemency, Initiative',
     JSON.stringify(r) === JSON.stringify(['hush', 'clemency', 'initiative']));
  ck('Cut Them Loose and Pin the Blame are NOT in the row',
     !r.includes('cut') && !r.includes('blame'));
  r = await ev(() => ({ n: window.__count('initiative'), dis: window.__btn('initiative').disabled }));
  ck('Initiative starts at 0 and is disabled', r.n === '0' && r.dis === true);

  console.log('\nTHE PICKER:');
  r = await ev(() => {
    _addTeamAction('initiative', 2);
    return { n: window.__count('initiative'), dis: window.__btn('initiative').disabled };
  });
  ck('granting points shows on the button and enables it', r.n === '2' && r.dis === false);
  r = await ev(() => {
    window.__btn('initiative').click();
    return { keys: window.__pickKeys(), pool: window.__count('initiative') };
  });
  ck('clicking Initiative opens a submenu, Cut Them Loose and Pin the Blame among its actions',
     r.keys.includes('cut') && r.keys.includes('blame') && r.keys.length === _TA_POOLED_LEN);
  ck('the pool is shown once, on the Initiative button itself', r.pool === '2');
  r = await ev(() => {
    const blame = document.querySelector('#nw-init-pick [data-action="blame"]');
    return { dis: blame.disabled, title: blame.title,
             cut: document.querySelector('#nw-init-pick [data-action="cut"]').disabled };
  });
  ck('Pin the Blame is locked below the exposure gate, with the reason, while Cut Them Loose is live',
     r.dis === true && /exposure/i.test(r.title) && r.cut === false);
  r = await ev(() => { window.__btn('initiative').click(); return _initiativePickerOpen(); });
  ck('clicking Initiative again closes the picker', r === false);

  console.log('\nSPENDING FROM ONE POOL:');
  r = await ev(() => {
    window.__btn('initiative').click();
    document.querySelector('#nw-init-pick [data-action="cut"]').click();
    return { open: _initiativePickerOpen(), mode: _taMode,
             armed: window.__btn('initiative').classList.contains('nw-ta-armed'),
             eligible: !!document.querySelector('.nw-node[data-person="Hunt"].nw-ta-eligible') };
  });
  ck('choosing an action closes the picker and arms target-select', r.open === false && r.mode === 'cut' && r.eligible);
  ck('the INITIATIVE button is what lights up for a pooled action', r.armed === true);
  r = await ev(() => {
    window.__click('Hunt');
    return { pool: InitiativeStack, st: _ORG_PRESSURE.Hunt.st(), n: window.__count('initiative'), mode: _taMode };
  });
  ck('applying it spends ONE point from the pool and lands the effect',
     r.pool === 1 && r.st === 4 && r.n === '1' && r.mode === null);
  r = await ev(() => {
    WatergateExposure = 14;                    // lift the Pin the Blame gate
    window.__btn('initiative').click();
    document.querySelector('#nw-init-pick [data-action="blame"]').click();
    window.__click('Magruder');
    return { pool: InitiativeStack, exp: _ORG_PRESSURE.Magruder.exp() };
  });
  ck('the OTHER pooled action draws from the same pool — 2 points bought one of each',
     r.pool === 0 && r.exp === 6);
  r = await ev(() => ({ dis: window.__btn('initiative').disabled, open: (window.__btn('initiative').click(), _initiativePickerOpen()) }));
  ck('an empty pool disables Initiative and refuses to open the picker', r.dis === true && r.open === false);

  console.log('\nCANCELLING, REDRAW, AND THE UNCHANGED HALF:');
  r = await ev(() => {
    _addTeamAction('initiative', 1);
    window.__btn('initiative').click();
    document.querySelector('#nw-init-pick [data-action="cut"]').click();
    window.__btn('initiative').click();        // second click while armed = cancel
    return { mode: _taMode, armed: window.__btn('initiative').classList.contains('nw-ta-armed'),
             pool: InitiativeStack, taMode: !!document.querySelector('#nw-chart-wrapper.ta-mode') };
  });
  ck('clicking Initiative while a pooled action is armed cancels it and refunds nothing spent',
     r.mode === null && r.armed === false && r.pool === 1 && r.taMode === false);
  r = await ev(() => {
    window.__btn('initiative').click();
    _addTeamAction('initiative', 3);           // a charge arrives with the picker open
    return { smear: window.__pickBtn('smear').disabled, pool: window.__count('initiative') };
  });
  ck('a charge arriving while the submenu is open redraws what it can afford',
     r.pool === '4' && r.smear === false);
  r = await ev(() => { _taExitMode(); return _initiativePickerOpen(); });
  ck('_taExitMode closes the picker — mode and picker never coexist', r === false);
  r = await ev(() => {
    document.querySelector('#nw-init-pick')?.remove();
    _addTeamAction('hush', 1);
    window.__btn('hush').click();
    const armed = window.__btn('hush').classList.contains('nw-ta-armed');
    window.__click('Hunt');
    return { armed, hush: HushMoneyStack, pool: InitiativeStack, loy: _ORG_PRESSURE.Hunt.loy() };
  });
  ck('Hush Money still arms from the row, spends its OWN charge, and leaves the pool alone',
     r.armed === true && r.hush === 0 && r.pool === 4 && r.loy === 7);
  r = await ev(() => {
    window.__open();
    window.__open();
    return { open: _initiativePickerOpen(), mode: _taMode };
  });
  ck('toggling the submenu shut arms nothing — there is no cancel button to need',
     r.open === false && r.mode === null);

  console.log('\nAUTHORING BACK-COMPAT:');
  r = await ev(() => {
    const before = InitiativeStack;
    _addTeamAction('cut', 1);
    return { gained: InitiativeStack - before, legacy: CutThemLooseStack };
  });
  ck("an authored _addTeamAction('cut', 1) grants a point and doesn't revive the old stack",
     r.gained === 1 && r.legacy === 0);
  r = await ev(() => {
    CutThemLooseStack = 2; PinTheBlameStack = 3;
    const before = InitiativeStack;
    _foldLegacyInitiative();
    return { gained: InitiativeStack - before, cut: CutThemLooseStack, blame: PinTheBlameStack };
  });
  ck('a direct bump of either legacy var folds into the pool and zeroes out',
     r.gained === 5 && r.cut === 0 && r.blame === 0);
  r = await ev(() => { const before = InitiativeStack; _foldLegacyInitiative(); return InitiativeStack - before; });
  ck('folding again is a no-op', r === 0);

  console.log('\nTHE SUBMENU CONTENTS:');
  r = await ev(() => {
    _taExitMode();
    InitiativeStack = 4; WatergateExposure = 14;
    document.body.classList.add('fog-of-war-on');
    _syncTeamActionBtns();
    window.__open();
    return { keys: window.__pickKeys(), costs: _TA_POOLED.map(k => window.__pickCost(k)) };
  });
  ck('all six pooled actions are offered',
     JSON.stringify(r.keys) === JSON.stringify(['cut', 'blame', 'smear', 'interrogate', 'grace', 'stonewall']));
  ck('each shows its price in the row pill — Smear and Stonewall 2, the rest 1',
     JSON.stringify(r.costs) === JSON.stringify(['1', '1', '2', '1', '1', '2']));
  r = await ev(() => {
    InitiativeStack = 1; _syncTeamActionBtns();
    return { smear: window.__pickBtn('smear').disabled, title: window.__pickBtn('smear').title,
             cut: window.__pickBtn('cut').disabled, open: _initiativePickerOpen() };
  });
  ck('one point cannot buy Smear (and says why) but still buys a 1-point action',
     r.smear === true && /Costs 2 — you have 1/.test(r.title) && r.cut === false && r.open === true);
  r = await ev(() => {
    document.body.classList.remove('fog-of-war-on');
    InitiativeStack = 4; _syncTeamActionBtns();
    const i = window.__pickBtn('interrogate');
    return { dis: i.disabled, title: i.title };
  });
  ck('Interrogate locks itself out when Fog of War is off, with the reason',
     r.dis === true && /Fog of War is off/.test(r.title));
  r = await ev(() => {
    _pressureOn = false; _syncTeamActionBtns();
    const g = window.__pickBtn('grace');
    const out = { dis: g.disabled, title: g.title };
    _pressureOn = true; document.body.classList.add('fog-of-war-on'); _syncTeamActionBtns();
    return out;
  });
  ck('Grace locks itself out before the pressure engine wakes', r.dis === true && /not begun to bite/.test(r.title));

  console.log('\nDROPDOWN BEHAVIOUR:');
  r = await ev(() => {
    _taExitMode();
    InitiativeStack = 4; _syncTeamActionBtns();
    const hint = document.getElementById('nw-ta-hint');
    const before = hint.getBoundingClientRect().top;
    window.__open();
    const pick = document.getElementById('nw-init-pick');
    const anchor = window.__btn('initiative');
    return { before, after: hint.getBoundingClientRect().top,
             pos: getComputedStyle(pick).position,
             below: pick.getBoundingClientRect().top >= anchor.getBoundingClientRect().bottom - 1,
             leftish: Math.abs(pick.getBoundingClientRect().left - anchor.getBoundingClientRect().left) < 40 };
  });
  ck('the dropdown overlays — opening it does not shift the hint or chart below',
     r.pos === 'absolute' && r.after === r.before);
  ck('…and it hangs directly under the Initiative button', r.below && r.leftish);
  r = await ev(() => {
    const open = _initiativePickerOpen();
    document.getElementById('nw-chart-wrapper')
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    return { open, nowOpen: _initiativePickerOpen() };
  });
  ck('clicking away closes it', r.open === true && r.nowOpen === false);
  r = await ev(() => {
    window.__open();
    window.__btn('initiative').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    return _initiativePickerOpen();
  });
  ck('…but a mousedown on the Initiative button itself does not (its click toggles)', r === true);

  console.log('\nSMEAR:');
  r = await ev(() => {
    window.__brink('Hunt');
    window.__pressureTick();
    return { flipped: _flipped.has('Hunt'), st: _ORG_PRESSURE.Hunt.st() };
  });
  ck('a man at the brink DOES flip without a smear — the control case',
     r.flipped === true && r.st === 1);
  r = await ev(() => {
    // fresh man, smeared before he reaches the brink
    _taExitMode();   // the previous section left the submenu open
    _flipped.clear(); _ORG_PRESSURE.Hunt = mk(6, 5, 5);
    InitiativeStack = 4; _syncTeamActionBtns();
    window.__open();
    window.__pickBtn('smear').click();
    const armed = window.__btn('initiative').classList.contains('nw-ta-armed');
    window.__click('Magruder');
    return { armed, pool: InitiativeStack, smeared: _smeared.has('Magruder') };
  });
  ck('Smear arms and targets like the others, and costs TWO points',
     r.armed === true && r.pool === 2 && r.smeared === true);
  r = await ev(() => {
    window.__brink('Magruder');
    window.__pressureTick();
    return { flipped: _flipped.has('Magruder'), st: _ORG_PRESSURE.Magruder.st(),
             danger: _flipDanger.Magruder };
  });
  ck('a smeared man at the brink can no longer turn state\'s witness',
     r.flipped === false && r.st !== 1);
  ck('…and his breaking-point counter stops climbing', r.danger === 0);
  // The tick can't reach _flipWitness for a smeared man (the counter guard
  // above stops it first), so the choke-point guard needs its own test: a
  // question effect calling _flipWitness directly must also be refused.
  r = await ev(() => {
    _flipWitness('Magruder');
    return { flipped: _flipped.has('Magruder'), st: _ORG_PRESSURE.Magruder.st() };
  });
  ck('a direct _flipWitness call on a smeared man is refused too',
     r.flipped === false && r.st !== 1);
  r = await ev(() => {
    window.__open();
    const before = window.__pickBtn('smear').disabled;
    _taExitMode(); window.__open();
    return { before, canRetarget: _TA_WIRED.smear.canTarget('Magruder') };
  });
  ck('the same man cannot be smeared twice', r.canRetarget === false);

  console.log('\nGRACE:');
  r = await ev(() => {
    _taExitMode();
    InitiativeStack = 3; _syncTeamActionBtns();
    _ORG_PRESSURE.Hunt = mk(6, 9, 5);          // exposure 9 -> radiates every 2 turns
    _edgeClocks['Hunt>Haldeman'] = 1;          // one tick short of passing it on
    window.__open();
    window.__pickBtn('grace').click();
    return { pool: InitiativeStack, open: _initiativePickerOpen(), mode: _taMode,
             frozenUntil: _pressureFrozenUntil, qc: _questionCount,
             hint: document.getElementById('nw-ta-hint').textContent };
  });
  ck('Grace resolves on the spot — no target, no arming, one point spent',
     r.pool === 2 && r.open === false && r.mode === null);
  ck('…and reports what it bought', /quiet turn/.test(r.hint));
  ck('it freezes exactly the NEXT turn', r.frozenUntil === r.qc + 1);
  r = await ev(() => {
    _questionCount++;                          // the frozen turn
    const before = _ORG_PRESSURE.Haldeman.exp();
    window.__pressureTick();
    return { before, after: _ORG_PRESSURE.Haldeman.exp(), frozen: _pressureFrozen(),
             glow: _expFlowLevel('Hunt', 'Haldeman') };
  });
  ck('nothing climbs the chart on the frozen turn', r.frozen === true && r.after === r.before);
  ck('and the wire glow goes dark with it, so the quiet turn is visible', r.glow === 0);
  r = await ev(() => {
    _questionCount++;                          // the turn after
    const before = _ORG_PRESSURE.Haldeman.exp();
    window.__pressureTick();
    return { before, after: _ORG_PRESSURE.Haldeman.exp(), frozen: _pressureFrozen() };
  });
  ck('the freeze is over the turn after — exposure climbs again',
     r.frozen === false && r.after === r.before + 1);

  console.log('\nINTERROGATE:');
  r = await ev(() => {
    _taExitMode();
    InitiativeStack = 2; _syncTeamActionBtns();
    _ORG_PRESSURE.Hunt = mk(7, 5, 5);
    return { fogged: _loyaltyFogged('Hunt', 7) };
  });
  ck('an un-interrogated man\'s loyalty is fogged', r.fogged === true);
  r = await ev(() => {
    window.__open();
    window.__pickBtn('interrogate').click();
    window.__click('Hunt');
    return { pool: InitiativeStack, revealed: _interrogated.has('Hunt'),
             fogged: _loyaltyFogged('Hunt', 7),
             hint: document.getElementById('nw-ta-hint').textContent };
  });
  ck('Interrogate costs one point and clears the fog on that man for good',
     r.pool === 1 && r.revealed === true && r.fogged === false);
  ck('…and the hint states the number it found', /7 \/ 10/.test(r.hint));
  r = await ev(() => ({ other: _loyaltyFogged('Magruder', 6),
                        low: _loyaltyFogged('Liddy', 1) }));
  ck('nobody else is revealed by it', r.other === true);
  ck('the about-to-crack reveal (loyalty <=1) still works on its own', r.low === false);
  r = await ev(() => {
    // the burglars are the one person whose chart id differs from the stat key
    _interrogated.add('Burglars');
    return _loyaltyFogged('WatergateBurglars', 5);
  });
  ck('the burglars resolve through _taKeyFor, so their card un-fogs too', r === false);

  console.log('\nSTONEWALL:');
  r = await ev(() => {
    _taExitMode();
    _questionCount = 40; _stonewallUntil = -1; _pressureFrozenUntil = -1;
    _flipped.clear(); _smeared.clear();
    WatergateExposure = 8;                  // above the <=2 firewall on Nixon
    _ORG_PRESSURE.Haldeman = mk(8, 5, 5);   // exp 5 -> interval 4 up to Nixon
    _ORG_PRESSURE.Hunt = mk(6, 9, 5);       // exp 9 -> interval 2 up to Haldeman
    InitiativeStack = 4; _syncTeamActionBtns();
    window.__open();
    return window.__pickCost('stonewall');
  });
  ck('Stonewall is offered at 2 points', r === '2');
  r = await ev(() => {
    _taExitMode();
    _edgeClocks['Haldeman>Nixon'] = 3;      // one tick short of the interval
    const before = WatergateExposure;
    _questionCount++; window.__pressureTick();
    return { before, after: WatergateExposure };
  });
  ck('without it, the drip reaches the President — the control case',
     r.after === r.before + 1);
  r = await ev(() => {
    window.__open();
    window.__pickBtn('stonewall').click();
    return { pool: InitiativeStack, open: _initiativePickerOpen(), mode: _taMode,
             until: _stonewallUntil, qc: _questionCount, left: _stonewallLeft(),
             hint: document.getElementById('nw-ta-hint').textContent };
  });
  ck('it resolves untargeted and costs two points',
     r.pool === 2 && r.open === false && r.mode === null);
  ck('…and buys _STONEWALL_TURNS of FUTURE turns, not counting the tick already run',
     r.until === r.qc + 3 && r.left === 3);
  ck('…and says what it does and does not do',
     /Executive privilege/.test(r.hint) && /does not stop a man testifying/i.test(r.hint));
  r = await ev(() => {
    _edgeClocks['Haldeman>Nixon'] = 3;      // primed to reach Nixon…
    _edgeClocks['Hunt>Haldeman'] = 1;       // …and to reach Haldeman
    const nixonBefore = WatergateExposure;
    const haldBefore = _ORG_PRESSURE.Haldeman.exp();
    _questionCount++; window.__pressureTick();
    return { nixonBefore, nixonAfter: WatergateExposure,
             haldBefore, haldAfter: _ORG_PRESSURE.Haldeman.exp(),
             glowTop: _expFlowLevel('Haldeman', 'Nixon'),
             glowBelow: _expFlowLevel('Hunt', 'Haldeman') };
  });
  ck('the drip no longer reaches the President', r.nixonAfter === r.nixonBefore);
  ck('…but the men below go on heating up — it is a firewall, not a freeze',
     r.haldAfter === r.haldBefore + 1);
  ck('the last rung of the wire glow goes dark', r.glowTop === 0);
  ck('…while the chart below keeps burning (unlike Grace)', r.glowBelow > 0);
  r = await ev(() => {
    window.__open();
    const b = window.__pickBtn('stonewall');
    return { dis: b.disabled, title: b.title };
  });
  ck('it cannot be bought twice over, and says how long is left',
     r.dis === true && /Already stonewalling/.test(r.title) && /turn\(s\) of cover left/.test(r.title));
  r = await ev(() => {
    _taExitMode();
    // Testimony pierces it: an inner-circle man flipping hits Nixon directly,
    // which is the hole the action's own hint warns about.
    const before = WatergateExposure;
    _ORG_PRESSURE.Colson = mk(0, 9, 5); _ORG_PRESSURE.Colson.inner = true;
    _flipWitness('Colson');
    return { before, after: WatergateExposure, stonewalled: _stonewalled() };
  });
  ck('a man testifying still lands on the President THROUGH the stonewall',
     r.stonewalled === true && r.after >= r.before + 2);
  r = await ev(() => {
    _questionCount = _stonewallUntil + 1;   // cover has run out
    _edgeClocks['Haldeman>Nixon'] = 3;
    const before = WatergateExposure;
    window.__pressureTick();
    return { before, after: WatergateExposure, left: _stonewallLeft(),
             available: _TA_WIRED.stonewall.available() };
  });
  ck('the cover expires and the drip resumes',
     r.left === 0 && r.after === r.before + 1);
  ck('…and it can be bought again once it has', r.available === true);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
