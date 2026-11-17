// Signal badges — the glows on Enemies/Friends (and Officials), named in text.
//
// Three signals share one button: a reshuffle offer (amber, red on its last
// turn), new action charges (green) and news from the chart (crimson). The
// glows animate the same box-shadow, so only one colour ever shows, and amber
// against green is the commonest colour-blind confusion. Each live signal is
// therefore also named in a badge on the button's top edge.
//
// Runs Code 1 (the real button styling, with its ::before/::after bevel) and the
// whole of Code 2, and drives the signals through the code that really raises
// them: _addTeamAction, _orgNewsAdd, _RESHUFFLE.offer / clear, the panel opening.
//
// Run: node tests/signals_check.js   (ACOP_CODE2=<path> to test a copy)
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const C1 = fs.readFileSync(path.join(__dirname, '..', 'A Cancer on the Presidency_init (draft).txt'), 'utf8');
const C2 = fs.readFileSync(process.env.ACOP_CODE2 || path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt'), 'utf8');

let pass = 0, fail = 0;
const ck = (n, c, extra) => {
  c ? pass++ : fail++;
  console.log((c ? '  ok  - ' : '  FAIL- ') + n + (!c && extra ? '\n        ' + extra : ''));
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => r.abort());
  await p.setContent(`<!DOCTYPE html><body>
    <div class="center"><img id="header" src="data:,"></div>
    <div class="container"><div id="game_window"><div class="game_header">HDR</div>
      <div id="inner_window_1"><div>a</div><div>b</div></div></div></div>
    <div id="difficulty_level"></div><div class="content_single"></div></body>`);
  const boot = await p.evaluate(({ C1, C2 }) => {
    window.campaignTrail_temp = {};
    window.e = window.campaignTrail_temp;
    window.nct_stuff = { selectedTheme: 0, themes: [{ coloring_title: 'x', coloring_window: 'x' }] };
    window.corrr = '';
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
      new Function('campaignTrail_temp', 'window', 'document', '$', 'jQuery', C2 + '\n;window.__T = function (s) { return eval(s); };')
        (window.campaignTrail_temp, window, document, f$, f$);
    } catch (err) { return String(err.stack || err); }
    window.__question = (q) => {
      window.campaignTrail_temp.question_number = q;
      document.getElementById('game_window').innerHTML = `<div class="game_header">H</div>
        <div class="inner_window_question"><div class="inner_inner_window"><h3>Q</h3>
        <form id="question_form"><div class="game_answer_row"><input type="radio" name="game_answers" value="1"><label>a</label></div></form></div>
        <p style="margin-top:40px"><button id="answer_select_button">Continue</button><button id="view_electoral_map">Map</button></p></div>
        <g><img id="candidate_pic"><img id="running_mate_pic"><div id="progress_bar"><h3>Question ${q + 1}</h3></div></g>`;
    };
    const R = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    // Everything a check needs about a badged button, in one read.
    window.__read = (sel) => {
      const btn = document.querySelector(sel);
      if (!btn) return null;
      const badge = btn.querySelector(':scope > .sig-badge');
      const row = [...btn.parentElement.children].filter(x => x.tagName === 'BUTTON').map(x => R(x));
      const out = { btn: R(btn), row, label: btn.getAttribute('aria-label'),
                    bevel: getComputedStyle(btn, '::after').content, classes: btn.className };
      if (badge) {
        const cs = getComputedStyle(badge);
        Object.assign(out, { text: badge.textContent, box: R(badge), transform: cs.textTransform,
                             bg: cs.backgroundColor, pos: cs.position, urgent: badge.classList.contains('sig-urgent'),
                             hidden: badge.getAttribute('aria-hidden') });
      }
      return out;
    };
    return 'ok';
  }, { C1, C2 });
  const settle = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30)))));
  const T = s => p.evaluate(s => window.__T(s), s);
  const read = sel => p.evaluate(sel => window.__read(sel), sel || '#inner_circle_button');

  console.log('BOOT:');
  ck('Code 1 and Code 2 load', boot === 'ok', boot);
  if (boot !== 'ok') { await b.close(); process.exit(1); }
  await p.evaluate(() => window.__question(0));
  await settle();

  console.log('\nNO SIGNAL, NO BADGE:');
  const quiet = await read();
  ck('the Enemies/Friends button is up, with nothing pending and no badge', quiet && !quiet.text && !quiet.label, JSON.stringify(quiet));

  console.log('\nEACH SIGNAL IS NAMED:');
  await T("_addTeamAction('hush', 1)");   // panel closed: the charge arrives unseen
  await settle();
  let r = await read();
  ck('a new charge (green glow) is named: "New actions"', /ta-glow/.test(r.classes) && r.text === 'New actions', JSON.stringify(r));
  ck('…shown in capitals by the CSS (authored in ordinary case)', r.transform === 'uppercase');
  ck('…on the button\'s top edge, centred over it',
     r.box.b > r.btn.t && r.box.t < r.btn.t && Math.abs((r.box.l + r.box.r) / 2 - (r.btn.l + r.btn.r) / 2) < 1.5, JSON.stringify(r));
  ck('…and neither the button nor its row moved an inch',
     JSON.stringify(r.btn) === JSON.stringify(quiet.btn) && JSON.stringify(r.row) === JSON.stringify(quiet.row));
  ck('…with Code 1\'s bevel layer (::after) untouched', r.bevel === quiet.bevel && r.bevel !== 'none', r.bevel);
  ck('…and the button\'s accessible name says it (the badge itself is aria-hidden)',
     r.label === 'Enemies/Friends: New actions' && r.hidden === 'true', r.label);

  await T("_orgNewsAdd('cracking', 'Hunt')");
  await settle();
  r = await read();
  ck('news from the chart is added beside it: "New actions · News"', r.text === 'New actions · News', r.text);

  await T("_RESHUFFLE.offer({ SOS: { candidates: ['Rockefeller', 'Connally'], delay: 0 } })");
  await settle();
  r = await read();
  ck('a reshuffle offer joins them, all three named at once (the glow can only show one colour)',
     r.text === 'Reshuffle · New actions · News' && !r.urgent, r.text);
  ck('…the accessible name lists all three', r.label === 'Enemies/Friends: Reshuffle, New actions, News', r.label);

  console.log('\nTHE LAST TURN:');
  // The next question advances the turn by one, onto the offer's last turn
  // (turnsLeft() === 0); its new screen rebuilds the button.
  await T('_questionCount = _RESHUFFLE.active.turn + _RESHUFFLE.active.grace - 1');
  await p.evaluate(() => window.__question(1));
  await settle();
  ck('(fixture) the offer is on its last turn', await T('_RESHUFFLE.turnsLeft()') === 0);
  r = await read();
  ck('on the offer\'s last turn the badge says so', r.text.startsWith('Reshuffle: last turn'), r.text);
  ck('…and turns red, matching the red glow', r.urgent && r.bg === 'rgb(142, 26, 16)', r.bg);

  console.log('\nTHE OFFICIALS BUTTON:');
  await p.evaluate(() => document.getElementById('inner_circle_button').click());
  await settle();
  r = await p.evaluate(() => {
    const b = [...document.querySelectorAll('#inner_circle_panel button')].find(x => x.dataset.sigBase === 'Officials');
    return b ? window.__read('#inner_circle_panel [data-sig-base="Officials"]') : null;
  });
  ck('inside the panel, the Officials button names the reshuffle it leads to',
     r && r.text === 'Reshuffle: last turn' && r.urgent && r.label === 'Officials: Reshuffle: last turn', JSON.stringify(r));
  await p.evaluate(() => document.getElementById('inner_circle_panel')?.remove());

  console.log('\nBADGES FOLLOW THE GLOWS:');
  await p.evaluate(() => window.__question(1));
  await settle();
  r = await read();
  ck('back on the question, the charges and news have been seen: only the reshuffle remains',
     r.text === 'Reshuffle: last turn', r.text);
  await T('_RESHUFFLE.clear()');
  await settle();
  r = await read();
  ck('clearing the offer clears the badge and the accessible name with it', !r.text && !r.label, JSON.stringify(r));
  await T("_addTeamAction('clemency', 1)");
  await settle();
  r = await read();
  ck('a glow switched on later, on the button already on screen, is named straight away', r.text === 'New actions', r.text);

  console.log('\nLOW DEMAND MODE:');
  await p.evaluate(() => document.body.classList.add('low-fx-on'));
  r = await read();
  ck('the badge stays when motion goes (signals stay, per the low demand rule)', r.text === 'New actions' && r.box.w > 0);
  ck('no page errors', errs.length === 0, errs.join(' | '));

  await b.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
