// Re-run guard — the host executing Code 2 again in the same page.
//
// The host can run Code 2 more than once without a reload (New Game, Play
// twice, preview then play). Every execution leaves hooks on the page, so this
// harness does exactly that: Code 1 once, then Code 2 several times into ONE
// page, against the same campaignTrail_temp. It checks that:
//   1. the previous execution hands the shared engine data back PRISTINE
//      (question count, candidate names, has_visits, theme), so the next one
//      doesn't snapshot a finished run's changes as its "originals";
//   2. only the newest execution acts — onShow, the eggs, the shortcuts, the
//      buttons, the engine wrappers;
//   3. nothing grows: observer subscribers, page-level listeners, injected
//      stylesheets and singleton elements stay flat however many re-runs.
//
// Run: node tests/rerun_check.js   (ACOP_CODE1 / ACOP_CODE2 = <path> to test a copy)
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const C1 = fs.readFileSync(process.env.ACOP_CODE1 || path.join(__dirname, '..', 'A Cancer on the Presidency_init (draft).txt'), 'utf8');
const C2 = fs.readFileSync(process.env.ACOP_CODE2 || path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt'), 'utf8');

let pass = 0, fail = 0;
const ck = (n, c, extra) => {
  c ? pass++ : fail++;
  console.log((c ? '  ok  - ' : '  FAIL- ') + n + (!c && extra ? '\n        ' + extra : ''));
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.abort());   // no network: every remote asset just fails to load
  await p.setContent(`<!DOCTYPE html><body>
    <div class="center"><img id="header" src="data:,"></div>
    <div class="container"><div id="game_window"><div class="game_header">HDR</div>
      <div id="inner_window_1"><div>a</div><div>b</div></div></div></div>
    <div id="difficulty_level"></div><div class="content_single"></div></body>`);

  const boot = await p.evaluate(({ C1, C2 }) => {
    // Page-level listener ledger: document, body and window only — the targets
    // that outlive a screen. `once` listeners remove themselves, so skip them.
    const reg = [];
    const cap = o => typeof o === 'boolean' ? o : !!(o && o.capture);
    const tracked = t => t === document || t === document.body || t === window;
    const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, o) {
      if (tracked(this) && fn && !(o && o.once)) reg.push({ t: this, type, fn, c: cap(o) });
      return add.call(this, type, fn, o);
    };
    EventTarget.prototype.removeEventListener = function (type, fn, o) {
      const i = reg.findIndex(r => r.t === this && r.type === type && r.fn === fn && r.c === cap(o));
      if (i >= 0) reg.splice(i, 1);
      return rem.call(this, type, fn, o);
    };
    window.__listeners = () => reg.length;

    // The host page, as far as the mods touch it at load.
    window.campaignTrail_temp = {};
    window.e = window.campaignTrail_temp;
    window.nct_stuff = { selectedTheme: 0, themes: [{ coloring_title: 'x', coloring_window: 'x' }] };
    window.corrr = '';
    // The two engine functions Code 2 wraps.
    window.__engine = { A: 0, en: 0 };
    window.__stubA = function () {
      window.__engine.A++;
      return [{ abbr: 'CA', result: [
        { candidate: 10701, votes: 600, percent: 0.6, electoral_votes: 45 },
        { candidate: 50000, votes: 400, percent: 0.4, electoral_votes: 0 }] }];
    };
    window.__stubEN = function () { window.__engine.en++; };
    window.A = window.__stubA;
    window.electionNight = window.__stubEN;
    const f$ = sel => {
      let els = [];
      try {
        if (typeof sel === 'string' && sel.trim()[0] !== '<') els = [...document.querySelectorAll(sel)];
        else if (sel && sel.nodeType) els = [sel];
      } catch (e) {}
      const o = { length: els.length, html: () => o, click: () => o, val: () => '', each: () => o, append: () => o,
                  remove: () => o, css: () => o, on: () => o, ready: () => o, data: () => null, find: () => f$(''),
                  attr: () => o, text: () => o, hide: () => o, show: () => o, change: () => o, prop: () => o,
                  addClass: () => o, removeClass: () => o };
      els.forEach((el, i) => { o[i] = el; });
      return o;
    };
    f$.fn = {};
    try {
      new Function('campaignTrail_temp', 'window', 'document', '$', 'jQuery', C1)(window.campaignTrail_temp, window, document, f$, f$);
    } catch (err) { return { ok: false, msg: 'Code 1: ' + err.message }; }
    // Each execution of Code 2 leaves a hook into ITS OWN scope, by generation.
    window.__runCode2 = () => {
      new Function('campaignTrail_temp', 'window', 'document', '$', 'jQuery',
        C2 + '\n;(window.__TG = window.__TG || {})[_ACOP_GEN] = function (s) { return eval(s); };')
        (window.campaignTrail_temp, window, document, f$, f$);
    };
    // A question screen, roughly as the engine builds it.
    window.__question = (q) => {
      window.campaignTrail_temp.question_number = q;
      document.getElementById('game_window').innerHTML = `<div class="game_header">H</div>
        <div class="inner_window_question"><div class="inner_inner_window"><h3>Q</h3>
        <form id="question_form"><div class="game_answer_row"><input type="radio" name="game_answers" value="1"><label>a</label></div></form></div>
        <p><button id="answer_select_button">Continue</button><button id="view_electoral_map">Map</button></p></div>
        <g><img id="candidate_pic"><img id="running_mate_pic"><div id="progress_bar"><h3>Question ${q + 1}</h3></div></g>`;
    };
    window.__shared = () => {
      const t = window.campaignTrail_temp;
      return {
        names: t.candidate_json.map(c => c.fields.first_name + ' ' + c.fields.last_name).join('|'),
        count: t.global_parameter_json[0].fields.question_count,
        visits: t.election_json[0].fields.has_visits,
        popup: String(t.ElectionPopup),
        bunker: document.body.classList.contains('acop-theme-bunker'),
        nuke: document.body.classList.contains('acop-nuke'),
      };
    };
    window.__singletons = () => ['tooltip-portal', 'honk', 'game-manual-button', 'inner_circle_button']
      .map(id => id + ':' + document.querySelectorAll('[id="' + id + '"]').length).join(' ');
    window.__styles = () => document.querySelectorAll('style').length;
    window.__styleIdDupes = () => {
      const ids = [...document.querySelectorAll('style[id]')].map(s => s.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    };
    // Every screen this harness drives, once: two questions and the chart
    // opened and closed. Stylesheets made on FIRST USE (the chart's glow, the
    // news CSS) exist from then on, so growth is measured after this.
    window.__exercise = async () => {
      const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))));
      window.__question(0); await frame();
      window.__question(1); await frame();
      document.getElementById('inner_circle_button')?.click(); await frame();
      document.getElementById('inner_circle_panel')?.remove();
      window.__question(0); await frame();
    };
    try { window.__runCode2(); } catch (err) { return { ok: false, msg: 'Code 2: ' + (err.stack || err) }; }
    return { ok: true };
  }, { C1, C2 });

  const settle = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30)))));
  const T = (g, s) => p.evaluate(([g, s]) => window.__TG[g](s), [g, s]);

  console.log('BOOT:');
  ck('Code 1 and the first execution of Code 2 load', boot.ok, boot.msg);
  if (!boot.ok) { await b.close(); console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(1); }
  await p.evaluate(() => window.__question(0));
  await settle();
  ck('the first execution is generation 1, and live', await T(1, '_ACOP_GEN === 1 && _acopLive()'));

  // The clean baseline every later execution must come back to.
  const base = await p.evaluate(() => ({
    shared: window.__shared(), size: window.__onGameWindowMutation.size(),
    listeners: window.__listeners(), styles: window.__styles(), singletons: window.__singletons() }));

  // ── A run that changed everything it can on the shared objects ──
  const stab = (await T(1, 'Object.keys(COUNTRY_LOYAL)'))[0];
  await T(1, `CAMPAIGN_LENGTHS.short.pks = campaignTrail_temp.questions_json.slice(0, 5).map(q => q.pk);
              _campaignLength = 'short'; _installCampaignLength();
              _nukeApplyCensus(); _nukeWar = 2;
              campaignTrail_temp.election_json[0].fields.has_visits = 0;
              window['${stab}_STAB'] = 4;
              HushMoneyStack = 3;`);
  await p.evaluate(() => document.getElementById('inner_circle_button').click());   // gen 1's panel open
  await settle();
  const dirty = await p.evaluate(() => window.__shared());
  ck('the fixture really dirtied the shared data (count, names, visits, theme)',
     dirty.count === 5 && dirty.names !== base.shared.names && dirty.visits === 0 && dirty.bunker,
     JSON.stringify(dirty));
  const w1 = await p.evaluate(() => { window.__w1A = window.A; window.__w1EN = window.electionNight; return true; });

  // ── The host runs Code 2 again: a New Game ──
  const rerun = await p.evaluate(() => { try { window.__runCode2(); return 'ok'; } catch (e) { return String(e.stack || e); } });
  ck('a second execution loads cleanly', rerun === 'ok', rerun);
  await p.evaluate(() => window.__question(0));
  await settle();

  console.log('\nTHE PREVIOUS RUN HANDS BACK THE SHARED DATA:');
  const after = await p.evaluate(() => window.__shared());
  ck('the question count is the pristine one again (a short run used to leave it short for good)',
     after.count === base.shared.count, after.count + ' vs ' + base.shared.count);
  ck('candidate names are back from the casualty census', after.names === base.shared.names);
  ck('has_visits and the election popup are restored', after.visits === base.shared.visits && after.popup === base.shared.popup);
  ck('the war theme is unwound', !after.bunker && !after.nuke);
  ck('destabilisation counters are back to 0', (await p.evaluate(k => window[k + '_STAB'], stab)) === 0);
  ck('…so the new execution snapshotted clean originals',
     await T(2, '_LENGTH_ORIG.count') === base.shared.count
     && JSON.stringify(await T(2, '_NUKE_CAND_ORIG')) === JSON.stringify(await T(1, '_NUKE_CAND_ORIG'))
     && await T(2, '_NUKE_VISITS_ORIG') === await T(1, '_NUKE_VISITS_ORIG'));

  console.log('\nLOADING WHILE A QUESTION IS ON SCREEN:');
  // Generation 2 loaded with question 0 already up. The observer calls a new
  // subscriber at once; had that first turn run mid-load, the New Game snapshot
  // would have recorded turn 1 as pristine, and every in-place New Game would
  // open on "Question 2".
  ck('the New Game snapshot was taken before any turn ran', await T(2, '_RUN_PRISTINE.vars._questionCount') === 0,
     String(await T(2, '_RUN_PRISTINE.vars._questionCount')));
  ck('…and the first question was still counted once the load finished', await T(2, '_questionCount') === 1,
     String(await T(2, '_questionCount')));

  console.log('\nONLY THE NEWEST EXECUTION ACTS:');
  ck('generation 2 is live, generation 1 is not', await T(2, '_acopLive()') && !(await T(1, '_acopLive()')));
  ck('the old run\'s open panel and singletons are gone, one of each remains',
     !(await p.evaluate(() => document.getElementById('inner_circle_panel')))
     && (await p.evaluate(() => window.__singletons())) === base.singletons,
     await p.evaluate(() => window.__singletons()));
  ck('the tooltip portal and the egg target in the page are generation 2\'s',
     await p.evaluate(() => window.__TG[2]('_tooltipPortal') === document.getElementById('tooltip-portal')
                         && window.__TG[2]('honk') === document.getElementById('honk')));

  // onShow: spy on the same question in both scopes, then show it.
  const pk1 = await p.evaluate(() => window.campaignTrail_temp.questions_json[1].pk);
  for (const g of [1, 2]) {
    await T(g, `questionData[${pk1}] = Object.assign({}, questionData[${pk1}] || {},
                { onShow: () => { window.__os${g} = (window.__os${g} || 0) + 1; } })`);
  }
  const qcBefore = { g1: await T(1, '_questionCount'), g2: await T(2, '_questionCount') };
  await p.evaluate(() => window.__question(1));
  await settle();
  const os = await p.evaluate(() => [window.__os1 || 0, window.__os2 || 0]);
  ck('a question\'s onShow fires once — from the new execution only', os[0] === 0 && os[1] === 1, JSON.stringify(os));
  ck('…and only the new execution counts the turn',
     await T(1, '_questionCount') === qcBefore.g1 && await T(2, '_questionCount') === qcBefore.g2 + 1);

  // The eggs: three clicks on Nixon's portrait play one clip, from generation 2.
  for (const g of [1, 2]) await T(g, `_playEggAudio = () => { (window.__eggs = window.__eggs || []).push(${g}); }`);
  await p.evaluate(() => { for (let i = 0; i < 3; i++) document.getElementById('candidate_pic').click(); });
  ck('an easter egg plays once, not once per execution',
     JSON.stringify(await p.evaluate(() => window.__eggs || [])) === '[2]', JSON.stringify(await p.evaluate(() => window.__eggs)));

  // The manual: button + 'M' both reach generation 2's opener.
  for (const g of [1, 2]) await T(g, `openGameManual = () => { (window.__man = window.__man || []).push(${g}); }`);
  await p.evaluate(() => {
    document.getElementById('game-manual-button').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    window.dispatchEvent(new Event('resize'));
  });
  ck('the Manual button and the M key open the new execution\'s manual',
     JSON.stringify(await p.evaluate(() => window.__man || [])) === '[2,2]', JSON.stringify(await p.evaluate(() => window.__man)));

  // The President's Men: different charges in each scope; what does the panel show?
  await T(1, 'HushMoneyStack = 3');
  await T(2, 'HushMoneyStack = 5');
  await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true })));
  const viaKey = await p.evaluate(() => {
    const c = document.querySelector('#nw-team-actions .nw-ta-btn[data-action="hush"] .nw-ta-count');
    const n = document.querySelectorAll('#inner_circle_panel').length;
    document.getElementById('inner_circle_panel')?.remove();
    return { count: c && c.textContent, panels: n };
  });
  ck('the A shortcut opens ONE panel, showing the new run\'s charges', viaKey.panels === 1 && viaKey.count === '5', JSON.stringify(viaKey));
  await p.evaluate(() => window.__question(1));
  await settle();
  const viaBtn = await p.evaluate(() => {
    document.getElementById('inner_circle_button').click();
    const c = document.querySelector('#nw-team-actions .nw-ta-btn[data-action="hush"] .nw-ta-count');
    const out = c && c.textContent;
    document.getElementById('inner_circle_panel')?.remove();
    return out;
  });
  ck('the Enemies/Friends button opens the new run\'s chart', viaBtn === '5', viaBtn);

  console.log('\nTHE ENGINE WRAPPERS:');
  const depth = await p.evaluate(() => {
    const d = f => { let n = 0; while (f && f.__acopWrapOf) { f = f.__acopWrapOf; n++; } return [n, f]; };
    const [a, aBase] = d(window.A), [en, enBase] = d(window.electionNight);
    return { a, en, aIsStub: aBase === window.__stubA, enIsStub: enBase === window.__stubEN };
  });
  ck('A() and electionNight are wrapped once, around the engine\'s own functions',
     depth.a === 1 && depth.en === 1 && depth.aIsStub && depth.enIsStub, JSON.stringify(depth));
  await T(1, '_nukeWar = 2');   // the OLD run believes the war is on
  const old = await p.evaluate(() => {
    window.__nukeSchedule = 'untouched';
    const before = { A: window.__engine.A, en: window.__engine.en };
    const out = window.__w1A(1);
    window.__w1EN();
    return { schedule: window.__nukeSchedule, pct: out[0].result[0].percent,
             calledA: window.__engine.A - before.A, calledEN: window.__engine.en - before.en };
  });
  ck('the old run\'s wrappers, even called directly, pass straight through',
     old.schedule === 'untouched' && old.pct === 0.6 && old.calledA === 1 && old.calledEN === 1, JSON.stringify(old));

  console.log('\nA STALE EXECUTION CAN\'T REGISTER ANYTHING NEW:');
  await T(1, `_acopObserve(() => { window.__late = (window.__late || 0) + 1; });
              _acopOn(document, 'acop-test', () => { window.__lateOn = 1; });`);
  await p.evaluate(() => { document.dispatchEvent(new Event('acop-test')); document.getElementById('game_window').appendChild(document.createElement('i')); });
  await settle();
  ck('a subscriber or listener it adds after being replaced never fires',
     await p.evaluate(() => !window.__late && !window.__lateOn));

  console.log('\nNOTHING GROWS:');
  const snap = () => p.evaluate(() => ({ size: window.__onGameWindowMutation.size(), listeners: window.__listeners(),
                                         styles: window.__styles(), singletons: window.__singletons(),
                                         dupes: window.__styleIdDupes(), gen: window.__acopGen }));
  await p.evaluate(() => window.__exercise());
  const mid = await snap();
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => window.__runCode2());
    await p.evaluate(() => window.__exercise());
  }
  const end = await snap();
  ck('five executions in, the observer has the same subscribers as after one',
     end.size === base.size && mid.size === base.size, base.size + ' / ' + mid.size + ' / ' + end.size);
  ck('…the page has the same document/body/window listeners',
     end.listeners === base.listeners && mid.listeners === base.listeners, base.listeners + ' / ' + mid.listeners + ' / ' + end.listeners);
  ck('…the same stylesheets, and no id twice', end.styles === mid.styles && !end.dupes.length,
     mid.styles + ' vs ' + end.styles + ' ' + JSON.stringify(end.dupes));
  ck('…and one of each singleton element', end.singletons === base.singletons, end.singletons);
  const pk2 = await p.evaluate(() => window.campaignTrail_temp.questions_json[2].pk);
  await T(5, `questionData[${pk2}] = Object.assign({}, questionData[${pk2}] || {},
              { onShow: () => { window.__os5 = (window.__os5 || 0) + 1; } })`);
  const qc5 = await T(5, '_questionCount');
  await p.evaluate(() => window.__question(2));
  await settle();
  ck('…while the newest execution still works (generation 5 counts the turn and runs onShow)',
     end.gen === 5 && await T(5, '_questionCount') === qc5 + 1 && (await p.evaluate(() => window.__os5)) === 1);
  ck('no page errors along the way', errs.length === 0, errs.join(' | '));

  await b.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
