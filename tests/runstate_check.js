// Run state — New Game reset + save/load, driven against the WHOLE of Code 2.
//
// The other save/load harness (saveload_check.js) is static: it greps the
// source. This one EXECUTES the real file the way the host does and asks three
// questions of the live state:
//   1. Does New Game put EVERYTHING back?      (it used to reset ~30 of 168)
//   2. Does a save carry everything a load needs? (the pressure timers did not)
//   3. Is every module-level mutable CLASSIFIED — saved, or knowingly not?
// Question 3 is the one that keeps the first two true: a new per-run variable
// that is neither registered nor allow-listed here fails the suite by name.
//
// Run: node tests/runstate_check.js     (ACOP_CODE2=<path> to test a copy)
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const FILE = process.env.ACOP_CODE2 || path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt');
const src = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ck = (n, c, extra) => {
  c ? pass++ : fail++;
  console.log((c ? '  ok  - ' : '  FAIL- ') + n + (!c && extra ? '\n        ' + extra : ''));
};

// ── 3. CLASSIFICATION (static) ───────────────────────────────────────────────
// Per-run CONTAINERS: saved in _slCaptureMod and emptied in _resetRunState.
const CONTAINERS = ['_shownTransitions', '_pausedUntil', '_diploCooldown', '_clemencies', '_actionCrimes',
  '_wmEventDebutPk', '_smeared', '_interrogated', '_orgNews', '_crackWarned', '_flipped',
  '_edgeClocks', '_expDecayClocks', '_loyDecayClocks', '_flipDanger', '_innerCircleFlips', '_news'];
// Knowingly NOT saved. Each needs a reason — that is the point of the list.
const NOT_RUN_STATE = {
  // caches, rebuilt on demand
  _questionIdxByPk: 'cache', _songCache: 'cache', _tooltipRegexCache: 'cache', _svgTextCache: 'cache',
  _wmBBoxCache: 'cache', _wmOceanMaskEl: 'cache', _nukeShares: 'cache', _manBtnW: 'cache', _manRO: 'observer handle',
  _slTmp: 'eval scratch',
  // the observer's own trackers: a load syncs them, New Game clears the pk
  _lastQuestionPK: 'tracker (synced by _slLoad)', _lastQNum: 'tracker (synced by _slLoad)',
  _newEvents: 'per-question, cleared every question', _turnTicks: 'registered callbacks',
  // transient UI: what is open or being dragged right now
  activeSign: 'drag', isDraggingSign: 'drag', signDragStartX: 'drag', signDragStartY: 'drag',
  signStartLeft: 'drag', signStartTop: 'drag', savedSignLeft: 'sign position, session', savedSignTop: 'sign position, session',
  _legalPadScreen: 'which tab is open', _taMode: 'target-select mode, cleared on New Game',
  _initAwayHandler: 'listener handle', _diploMode: 'target-select mode, cleared on New Game',
  _hoveredTooltip: 'hover', _ttW: 'hover', _ttH: 'hover', _ttDirty: 'hover',
  _enightIntroArmed: 'Election Night cannot be saved into; cleared on New Game',
  _musicSectionPending: 'set by _slLoad, cleared on New Game',
  _wmPrevLoyal: 'map delta baseline: nulled on load and New Game',
  // easter-egg click counters
  nixonClickCount: 'egg', nixonClickTimer: 'egg', agnewClickCount: 'egg', agnewClickTimer: 'egg',
  honkClickCount: 'egg', honkClickTimer: 'egg', bannerClickCount: 'egg', bannerClickTimer: 'egg',
  _bannerDownX: 'egg', _bannerDownY: 'egg', konamiIndex: 'egg',
  // session preferences: deliberately survive New Game, like the theme picker
  _wmFlagsOn: 'map toggle', _wmEventsOn: 'map toggle', _wmCapitalsOn: 'map toggle', _wmAllegiance: 'map toggle',
  _wmNightOn: 'map toggle', _wmSigintOn: 'map toggle', _wmNosOn: 'map toggle',
  // the reset's own bookkeeping
  _RUN_KEEP: 'config', _RUN_PRISTINE: 'the pristine snapshot itself',
  _acopTeardown: 're-run guard plumbing (undo steps for this execution)',
  _acopLoaded: 're-run guard plumbing (load complete)', _acopFirstRuns: 're-run guard plumbing (held first runs)',
};

const scalars = [...src.match(/var _SL_SCALARS = \[[\s\S]*?\];/)[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
const declRe = /^(?:var|let|const) ((?:[A-Za-z_$][\w$]*(?: *= *[^,;]+)?, *)*[A-Za-z_$][\w$]*) *= *(\{\}|\[\]|new (?:Set|Map)\b|null|-?\d+(?:\.\d+)?|false|true|''|"")/gm;
const unclassified = [];
let dm;
while ((dm = declRe.exec(src))) {
  // `let _ttW = 0, _ttH = 0, …` declares several names on one line
  const line = src.slice(dm.index, src.indexOf('\n', dm.index));
  const names = [...line.replace(/^(var|let|const) /, '').matchAll(/(?:^|, *)([A-Za-z_$][\w$]*) *=/g)].map(m => m[1]);
  names.forEach(n => {
    if (scalars.includes(n) || CONTAINERS.includes(n) || n in NOT_RUN_STATE) return;
    if (/^_?[A-Z][A-Z0-9_]*$/.test(n)) return;   // ALL_CAPS = config / constant
    unclassified.push(n);
  });
}
console.log('CLASSIFICATION:');
ck('every module-level mutable is saved, a known container, or knowingly not run state',
   unclassified.length === 0,
   'UNCLASSIFIED: ' + unclassified.join(', ')
   + '\n        -> per-run? add it to _SL_SCALARS (scalar) or to capture/restore/_resetRunState (container)'
   + '\n        -> not per-run? add it to NOT_RUN_STATE in this file, with the reason');
ck('the reset is DERIVED from the save list (one list, not two)',
   /_SL_SCALARS\.forEach\(n => \{ if \(_RUN_KEEP\.indexOf\(n\) === -1\) _slSetVar\(n, _RUN_PRISTINE\.vars\[n\]\); \}\);/.test(src));
ck('the observer hands New Game to _resetRunState',
   /if \(_lastQNum != null && _gs\.question_number < _lastQNum\) _resetRunState\(\);/.test(src));
ck('the pristine snapshot is the last thing in the file (every initialiser has run)',
   src.lastIndexOf('\nvar ') < src.indexOf('function _resetRunState()')
   && src.indexOf('var _RUN_PRISTINE') > src.lastIndexOf('\nfunction openWorldMap'));
ck('each container is captured, restored and reset',
   CONTAINERS.filter(n => n !== '_flipped').every(n => {   // _flipped is DERIVED from STATUS on restore
     const cap = src.slice(src.indexOf('function _slCaptureMod()'), src.indexOf('function _refillObj'));
     const res = src.slice(src.indexOf('function _slRestoreMod(m)'), src.indexOf('function _slRestoreQuestionOrder'));
     const rst = src.slice(src.indexOf('function _resetRunState()'));
     return cap.includes(n) && res.includes(n) && rst.includes(n);
   }));

// ── runtime ──────────────────────────────────────────────────────────────────
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.setContent(`<!DOCTYPE html><body>
    <div class="center"><img id="header" src="data:,"></div>
    <div class="container"><div id="game_window"><div class="game_header">HDR</div></div></div>
  </body>`);
  const boot = await p.evaluate(({ code, scalars, CONTAINERS }) => {
    // What Code 1 has already put on the engine object by the time Code 2 runs.
    window.campaignTrail_temp = { global_parameter_json: [{ fields: { question_count: 25 } }],
                                  election_json: [{ fields: { has_visits: 1 } }] };
    window.e = window.campaignTrail_temp;
    window.nct_stuff = { selectedTheme: 0, themes: [{}] };
    const fake$ = sel => {
      const o = { length: 0, html: () => o, click: () => o, val: () => '', each: () => o, append: () => o, remove: () => o,
                  css: () => o, on: () => o, ready: () => o, data: () => null, find: () => o, attr: () => o, text: () => o,
                  hide: () => o, show: () => o, change: () => o, prop: () => o, addClass: () => o, removeClass: () => o };
      return o;
    };
    fake$.fn = {};
    // The hook: an eval that closes over the mod's own scope.
    const hooked = code + '\n;window.__T = function (s) { return eval(s); };';
    try {
      new Function('campaignTrail_temp', 'window', 'document', '$', 'jQuery', hooked)(window.campaignTrail_temp, window, document, fake$, fake$);
    } catch (err) { return { ok: false, msg: String(err.stack || err) }; }
    const T = window.__T;
    // Everything a run can change, as plain data.
    window.__fp = () => {
      const o = { vars: {} };
      scalars.forEach(n => { o.vars[n] = T(n); });
      CONTAINERS.forEach(n => {
        const v = T(n);
        o[n] = v instanceof Set ? Array.from(v).sort() : JSON.parse(JSON.stringify(v));
      });
      o.countryLoyal = Object.assign({}, T('COUNTRY_LOYAL'));
      o.stab = Object.fromEntries(Object.keys(o.countryLoyal).map(c => [c, window[c + '_STAB']]));
      o.reshuffle = JSON.parse(JSON.stringify({ a: T('_RESHUFFLE.active'), p: T('_RESHUFFLE.pending') }));
      o.midterm = T('_MIDTERM._fired');
      o.enemies = JSON.parse(JSON.stringify(T('_ENEMIES')));
      o.eventClocks = T('_eventClocksSnapshot()');
      o.order = window.campaignTrail_temp.questions_json.map(q => q.pk);
      o.count = window.campaignTrail_temp.global_parameter_json[0].fields.question_count;
      o.assign = window.campaignTrail_temp.answers_json.map(a => a.fields.question);
      return o;
    };
    return { ok: true, types: scalars.map(n => [n, T(n) === null ? 'null' : typeof T(n)]) };
  }, { code: src, scalars, CONTAINERS });

  console.log('\nBOOT:');
  ck('Code 2 executes whole, with the test hook appended', boot.ok && !errs.length, boot.msg || errs.join(' | '));
  if (!boot.ok) { console.log('\n' + pass + ' passed, ' + (fail) + ' failed'); await b.close(); process.exit(1); }
  const bad = boot.types.filter(([, t]) => !['number', 'string', 'boolean', 'null'].includes(t));
  ck('every saved scalar really is a scalar (the pristine copy is by value)', bad.length === 0, JSON.stringify(bad));

  const diff = (a, c, skip) => {
    const out = [];
    const walk = (x, y, at) => {
      if (skip && skip.includes(at)) return;
      if (x && y && typeof x === 'object' && typeof y === 'object') {
        new Set([...Object.keys(x), ...Object.keys(y)]).forEach(k => walk(x[k], y[k], at ? at + '.' + k : k));
      } else if (x !== y && !(Number.isNaN(x) && Number.isNaN(y))) out.push(at + ': ' + JSON.stringify(x) + ' vs ' + JSON.stringify(y));
    };
    walk(a, c, '');
    return out;
  };

  const P0 = await p.evaluate(() => window.__fp());

  // Dirty EVERYTHING a run can touch.
  const D = await p.evaluate(({ scalars }) => {
    const T = window.__T;
    // length: owned by the re-read; nuke: own harness; the two legacy stacks are
    // FOLDED into the Initiative pool on restore by design (initiative_check).
    const LEAVE = ['_campaignLength', '_lengthInstalled', '_nukeWar', 'CutThemLooseStack', 'PinTheBlameStack'];
    scalars.forEach(n => {
      if (LEAVE.includes(n)) return;
      const v = T(n);
      window.__v = typeof v === 'number' ? v + 7 : typeof v === 'boolean' ? !v : typeof v === 'string' ? v + '~' : 'x';
      T(n + ' = window.__v');
    });
    T(`DeanSTATUS = 1; _flipped.add('Dean');
       _shownTransitions.add(999); _pausedUntil.Hunt = 9; _diploCooldown.SU = 3;
       _clemencies.push({ key: 'Hunt', boost: 2, expiresTurn: 99, statusAtGrant: 5 });
       _actionCrimes.push({ id: 'x', label: 'y' });
       COUNTRY_LOYAL.SU = 99; window.SU_STAB = 4; _wmPrevLoyal = { SU: 1 };
       _RESHUFFLE.active = { slots: { SOS: { candidates: ['Rockefeller'], delay: 0 } }, turn: 1, grace: 1 };
       _RESHUFFLE.pending.push({ varName: 'FBI', person: 'Felt', dueTurn: 9 });
       _MIDTERM._fired = true; _wmEventDebutPk.x = 5;
       _ENEMIES.traitors.Dean = 3; _ENEMIES.media.push('Dan Rather'); _ENEMIES.closed = true;
       _smeared.add('Hunt'); _interrogated.add('Liddy'); _crackWarned.add('Hunt');
       _orgNews.push({ kind: 'cracking', name: 'Hunt', line: 'x', turn: 3 });
       _edgeClocks['Hunt>Colson'] = 1; _expDecayClocks.Hunt = 2; _loyDecayClocks.Hunt = 1; _flipDanger.Hunt = 2;
       _innerCircleFlips.push('Dean');
       _EVENT_DEFS.find(d => d.duration)._activatedAt = 4;
       _news = { pk: 402, idxs: [0], angleAbs: 360, landed: true, opened: false };
       _taMode = 'hush'; _diploMode = 'improve'; _enightIntroArmed = true; _musicSectionPending = 2;`);
    // a questionSwapper / answerSwapper having run
    const q = window.campaignTrail_temp.questions_json; [q[1], q[2]] = [q[2], q[1]];
    const a = window.campaignTrail_temp.answers_json; a[0].fields.question = a[5].fields.question;
    return window.__fp();
  }, { scalars });

  console.log('\nTHE FIXTURE:');
  const untouched = scalars.filter(n => !['_campaignLength', '_lengthInstalled', '_nukeWar', 'CutThemLooseStack', 'PinTheBlameStack'].includes(n) && D.vars[n] === P0.vars[n]);
  ck('the dirtying pass really changed every scalar', untouched.length === 0, untouched.join(', '));
  ck('…and every container', CONTAINERS.every(n => JSON.stringify(D[n]) !== JSON.stringify(P0[n])),
     CONTAINERS.filter(n => JSON.stringify(D[n]) === JSON.stringify(P0[n])).join(', '));
  ck('there is a timed world event to carry a clock', Object.keys(D.eventClocks).length === 1);

  // Save (through JSON, as IndexedDB's structured clone would), then New Game.
  const R = await p.evaluate(() => {
    window.__snap = JSON.parse(JSON.stringify(window.__T('_slCaptureMod()')));
    window.__T('_resetRunState()');
    return Object.assign(window.__fp(), { ui: window.__T('[_taMode, _diploMode, _enightIntroArmed, _musicSectionPending, _wmPrevLoyal, _lastQuestionPK]') });
  });
  console.log('\nNEW GAME:');
  let d = diff(R, P0, ['ui']);
  ck('New Game puts every scalar, container, country and the question bank back', d.length === 0,
     d.length + ' difference(s): ' + d.slice(0, 12).join(' ; '));
  ck('the men are back to their starting loyalty, exposure and status',
     ['Huntloyalty', 'Deanexposure', 'DeanSTATUS', 'MentalState', 'ApprovalRating', 'SOS', 'defcon'].every(n => R.vars[n] === P0.vars[n]));
  ck('a witness from the last run is no longer a witness', R._flipped.length === 0 && R._innerCircleFlips.length === 0);
  ck('the pressure timers start cold', [R._edgeClocks, R._expDecayClocks, R._loyDecayClocks, R._flipDanger].every(o => !Object.keys(o).length));
  ck('relations and destabilisation are the starting ones', R.countryLoyal.SU === P0.countryLoyal.SU && R.stab.SU === 0);
  ck('a swapped question order and answer assignment are undone',
     JSON.stringify(R.order) === JSON.stringify(P0.order) && JSON.stringify(R.assign) === JSON.stringify(P0.assign));
  ck('transient modes do not outlive the run', JSON.stringify(R.ui) === '[null,null,false,0,null,null]', JSON.stringify(R.ui));

  // …and load the save back over the fresh game.
  const S = await p.evaluate(() => { window.__T('_slRestoreMod(window.__snap)'); return window.__fp(); });
  console.log('\nSAVE -> LOAD:');
  // order/count/assign travel on the save payload beside the mod block, not in it
  d = diff(S, D, ['order', 'count', 'assign']);
  ck('a load brings back everything the save was taken with', d.length === 0,
     d.length + ' difference(s): ' + d.slice(0, 12).join(' ; '));
  ck('the breaking-point countdown survives a load (it used to restart)', S._flipDanger.Hunt === 2);
  ck('…as do the radiation and decay clocks',
     S._edgeClocks['Hunt>Colson'] === 1 && S._expDecayClocks.Hunt === 2 && S._loyDecayClocks.Hunt === 1);
  ck('…the inner-circle witness list, and the timed-event clock',
     S._innerCircleFlips[0] === 'Dean' && Object.values(S.eventClocks)[0] === 4);
  ck('the witness set is rebuilt from STATUS', S._flipped.join() === 'Dean');
  const old = await p.evaluate(() => {
    const m = JSON.parse(JSON.stringify(window.__snap));
    ['edgeClocks', 'expDecayClocks', 'loyDecayClocks', 'flipDanger', 'innerCircleFlips', 'eventClocks'].forEach(k => { delete m[k]; });
    window.__T('_flipDanger.Liddy = 3');
    try { window.__T('_slRestoreMod')(m); } catch (err) { return String(err); }
    return window.__fp()._flipDanger;
  });
  ck('a save from before the timers were captured still loads (clocks start cold)',
     old && typeof old === 'object' && !Object.keys(old).length, JSON.stringify(old));

  // The engine pieces fixed alongside.
  console.log('\nTURN ENGINE:');
  await p.evaluate(() => window.__T('_resetRunState()'));
  let r = await p.evaluate(() => {
    const T = window.__T;
    const before = T('WatergateExposure');
    T(`_flipWitness('Dean')`);
    const once = T('WatergateExposure');
    T(`_flipWitness('Dean')`);
    T(`_flipWitness('Nobody')`);
    return { before, once, twice: T('WatergateExposure'), n: T('_innerCircleFlips.length') };
  });
  ck('a second _flipWitness on the same man does nothing (no double contagion), nor an unknown name',
     r.once > r.before && r.twice === r.once && r.n === 1, JSON.stringify(r));
  r = await p.evaluate(() => {
    const T = window.__T;
    T('_resetRunState()');
    const def = T('_EVENT_DEFS.find(d => d.duration && d.set)');
    def.set(1);
    T('_questionCount = 5; _runTurnTicks()');
    const started = def._activatedAt;
    def.set(0);
    T('_questionCount = 6; _runTurnTicks()');
    const cleared = def._activatedAt;
    def.set(1);
    T('_questionCount = 20; _runTurnTicks()');
    return { started, cleared, restarted: def._activatedAt, state: def.state() };
  });
  ck('an event switched off mid-life drops its clock, and a later one starts fresh',
     r.started === 5 && r.cleared === null && r.restarted === 20 && r.state === 1, JSON.stringify(r));
  r = await p.evaluate(() => {
    const T = window.__T;
    const warns = [];
    const w = console.warn; console.warn = (...a) => { warns.push(a.join(' ')); };
    T('_everyTurn(() => { throw new Error("boom-tick"); })');
    let ran = false;
    window.__after = () => { ran = true; };
    T('_everyTurn(() => window.__after())');
    T('_runTurnTicks()');
    console.warn = w;
    return { warned: warns.some(x => /boom-tick/.test(x)), ran };
  });
  ck('a throwing turn tick is reported, and the ticks after it still run', r.warned && r.ran, JSON.stringify(r));

  console.log('\nPANELS:');
  r = await p.evaluate(() => {
    const T = window.__T;
    T('_resetRunState(); InitiativeStack = 4; openInnerCircle(); _openInitiativePicker()');
    const had = T('!!_initAwayHandler');
    // The engine re-renders the window: the panel goes, and nothing closes the dropdown.
    document.getElementById('inner_circle_panel').remove();
    let removed = 0;
    const orig = document.removeEventListener;
    document.removeEventListener = function (t, f, c) { if (t === 'mousedown' && c === true) removed++; return orig.apply(this, arguments); };
    T('openInnerCircle()');
    document.removeEventListener = orig;
    const out = { had, removed, now: T('_initAwayHandler') };
    document.getElementById('inner_circle_panel').remove();
    return out;
  });
  ck('reopening the men panel releases a dropdown click-away listener left behind by a re-render',
     r.had && r.removed === 1 && r.now === null, JSON.stringify(r));
  r = await p.evaluate(() => {
    const T = window.__T;
    const warn = () => {
      T('openOfficialsPanel()');
      document.querySelector('.oc-flip[data-var-name="SOS"]').click();
      const t = document.querySelector('#rs-picker .rs-warn').textContent;
      document.getElementById('officials_panel')?.remove();
      document.querySelectorAll('#game_window > div').forEach(d => { if (d.querySelector('#rs-picker')) d.remove(); });
      return t;
    };
    T(`_questionCount = 3; _RESHUFFLE.offer({ SOS: { candidates: ['Rockefeller', 'Connally'], delay: 0 } })`);
    const first = warn();
    T('_questionCount = 4');
    const last = warn();
    T('_RESHUFFLE.reset()');
    return { first, last };
  });
  ck('the reshuffle picker says what really happens when the offer lapses (a random pick, not a vacancy)',
     /next turn/.test(r.first) && /at random/.test(r.first) && /Last turn/.test(r.last) && !/vacant/.test(r.first + r.last),
     JSON.stringify(r));

  // End to end: the engine dropping question_number is what triggers the reset.
  console.log('\nTHROUGH THE OBSERVER:');
  r = await p.evaluate(async () => {
    const T = window.__T;
    const gs = window.campaignTrail_temp;
    T('Huntloyalty = 1; _flipped.add("Hunt"); _questionCount = 14; _lastQNum = 14;');
    gs.question_number = 0;
    document.getElementById('game_window').appendChild(document.createElement('i'));
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 30))));
    return { loy: T('Huntloyalty'), flipped: T('_flipped.size'), qc: T('_questionCount'), lastQ: T('_lastQNum') };
  });
  ck('question_number falling back to 0 resets the run and starts turn 1',
     r.loy === P0.vars.Huntloyalty && r.flipped === 0 && r.qc === 1 && r.lastQ === 0, JSON.stringify(r));
  ck('no page errors along the way', errs.length === 0, errs.join(' | '));

  await b.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
