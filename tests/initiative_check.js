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

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

console.log('STATIC WIRING:');
ck('InitiativeStack is declared and saved in _SL_SCALARS',
   /var InitiativeStack\s*=\s*0;/.test(src) && /'InitiativeStack',/.test(src));
ck('New Game resets the pool',
   /InitiativeStack = 0;/.test(slice('HushMoneyStack = 0; CutThemLooseStack = 0;', 'InitiativeStack = 0;')));
ck('a pre-Initiative save folds its cut/blame charges into the pool',
   /_enightRestoreNothing|_foldLegacyInitiative\(\);/.test(src)
   && /_enemiesRestore\(m\.enemies\);[\s\S]{0,300}_foldLegacyInitiative\(\);/.test(src));
ck('the row is built from _TA_MAIN_ROW, not the full action list',
   /_TA_MAIN_ROW\.forEach\(key =>/.test(src) && !/_TEAM_ACTIONS\.forEach\(a => \{\s*const btn = document\.createElement/.test(src));
ck('the picker has its own stylesheet block',
   /#nw-init-pick \{/.test(src) && /#nw-init-pick \.nw-init-btn \{/.test(src));
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

  await p.addScriptTag({ content: `
    // ---- stubs for everything the actions touch but this harness isn't testing
    var WatergateExposure = 4, _questionCount = 10;
    const _pausedUntil = {}, _clemencies = [];
    const _flipped = new Set();
    const mk = (loy, exp, st) => { let l = loy, e = exp, s = st;
      return { loy: () => l, setLoy: v => { l = v; }, exp: () => e, setExp: v => { e = v; },
               st: () => s, setSt: v => { s = v; }, inner: false }; };
    const _ORG_PRESSURE = { Hunt: mk(6, 5, 5), Magruder: mk(2, 4, 5), Haldeman: mk(8, 3, 5) };
    function _payOff(name) { const q = _ORG_PRESSURE[name]; if (q) q.setLoy(Math.min(10, q.loy() + 1)); }
    function _recordActionCrime() {}
    function _crimeName(k) { return k; }
    function _lengthAllows() { return true; }
    function _syncTeamActionGlow() {}
    var _taUnseen = false;

    // ---- the real code under test
    ${slice('var HushMoneyStack     = 0;', 'function _taIsPooled(key) { const a = _teamAction(key); return !!(a && a.pool); }')}
    ${extractFn('_teamAction')}
    ${extractFn('_addTeamAction')}
    ${extractFn('_spendTeamAction')}
    ${slice('const _TA_EXCLUDED =', 'function _taEligible(person) {')}
    ${extractFn('_taEligible').replace(/^function _taEligible\(person\) \{/, '')}
    ${slice('const _TA_WIRED = {', '\n};')}
    ${slice('var _taMode = null;', 'var _taMode = null;')}
    ${extractFn('_taHint')}
    ${extractFn('_taExitMode')}
    ${extractFn('_teamActionClicked')}
    ${extractFn('_closeInitiativePicker')}
    ${extractFn('_initiativePickerOpen')}
    ${extractFn('_openInitiativePicker')}
    ${extractFn('_initiativeClicked')}
    ${extractFn('_taHandleNodeClick')}
    ${extractFn('_syncTeamActionBtns')}
    ${extractFn('_foldLegacyInitiative')}

    // ---- the REAL row build, lifted out of openInnerCircle
    window.__buildRow = () => {
      document.getElementById('nw-team-actions')?.remove();
      const panel = document.getElementById('panel');
      ${slice('const taBox = document.createElement(\'div\');', 'panel.appendChild(taBox);')}
    };
    window.__rowKeys = () => [...document.querySelectorAll('#nw-team-actions .nw-ta-btn')]
      .map(x => x.dataset.action);
    window.__btn = k => document.querySelector('#nw-team-actions .nw-ta-btn[data-action="' + k + '"]');
    window.__count = k => window.__btn(k).querySelector('.nw-ta-count').textContent;
    window.__pickKeys = () => [...document.querySelectorAll('#nw-init-pick .nw-init-btn')]
      .map(x => x.dataset.action);
    window.__click = node => _taHandleNodeClick(document.querySelector('.nw-node[data-person="' + node + '"]'));
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
    return { keys: window.__pickKeys(), head: document.querySelector('#nw-init-pick .nw-init-head').textContent };
  });
  ck('clicking Initiative opens a picker offering both pooled actions',
     JSON.stringify(r.keys) === JSON.stringify(['cut', 'blame']));
  ck('the picker headlines the shared pool', /2 initiative points/.test(r.head));
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
    return document.querySelector('#nw-init-pick .nw-init-head').textContent;
  });
  ck('a charge arriving while the picker is open redraws its headline', /4 initiative points/.test(r));
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
    window.__btn('initiative').click();
    document.querySelector('#nw-init-pick .nw-init-cancel').click();
    return { open: _initiativePickerOpen(), mode: _taMode };
  });
  ck('"Never mind" closes the picker without arming anything', r.open === false && r.mode === null);

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

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
