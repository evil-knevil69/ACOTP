// News on the desk: a story an EARLIER answer sets up, thrown onto the desk at a
// LATER question (ported from 1976: Year Zero's thrownObjectsByQ + openModal).
// Stories hang on questionData[pk].news, gated by ifAnswered: [answer pks].
//
// Drives the REAL block (sliced out of Code 2) against a stub question screen:
// the engine's <g> portrait strip inside #game_window, and #question_form.
//
//   node tests/news_check.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const SRC = process.env.ACOP_CODE2 || path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt');
const src = fs.readFileSync(SRC, 'utf8');

function slice(a, b) {
  const i = src.indexOf(a);
  const j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor not found: ' + (i < 0 ? a : b));
  return src.slice(i, j + b.length);
}
function extractFn(name) {
  const s = src.indexOf('function ' + name + '(');
  if (s < 0) throw new Error('no such function: ' + name);
  let d = 0;
  for (let j = src.indexOf('{', s); j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) return src.slice(s, j + 1); }
  }
}
// The whole system, from its banner comment to the end of the console helper.
const NEWS = slice('// ── NEWS ON THE DESK', '    get current() { return _news; },\n};');
const CODE = NEWS.replace(/^\s*\/\/.*$/gm, '');   // without the comments

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

console.log('STATIC WIRING:');
ck('stories are keyed by question PK — nothing here reads question_number',
   !/question_number/.test(CODE) && /questionData\[pk\]/.test(extractFn('_newsList')));
ck('decided as the question arrives, AFTER onShow',
   /if \(qd\.onShow\) qd\.onShow\(\);[\s\S]{0,200}_newsCompose\(currentPK\);/.test(src));
ck('re-mounted on every game-window mutation, alongside the other chrome',
   /addInnerCircleButton\(\);\s*\n\s*_newsMount\(\);/.test(src));
ck('New Game clears the story and any open popup', /_news = null; _newsCloseAll\(\);/.test(src));
ck('the save carries the current story, and a load restores it',
   /news: _news \? JSON\.parse\(JSON\.stringify\(_news\)\) : null,/.test(extractFn('_slCaptureMod'))
   && /_news = m\.news \|\| null;/.test(extractFn('_slRestoreMod')));
ck('the old brief is gone: no PDB_ITEMS, no foreign-events diff, no World Affairs tie-in',
   !/PDB_ITEMS|_pdbCompose|_evLastState|ACOPPdb/.test(src) && !/_EVENT_DEFS|_markEventNew/.test(CODE));
ck('it is listed in the authoring index', /questionData\[pk\]\.news  story thrown on the desk/.test(src));
ck('Year Zero, verbatim: the throw (rest angle, mirror, buffer, spin, delay, 520ms ease)',
   /364 - Math\.random\(\) \* 8/.test(CODE)
   && /const mirrorUx = -ux;\s*const mirrorUy = Math\.abs\(uy\) \+ 0\.85;/.test(CODE)
   && /const buffer = 90;/.test(CODE)
   && /const startRot = \(-angleRel\) \+ \(angleRel >= 0 \? -10 : 10\);\s*const endRot {3}= \(-angleRel\) \* 3;/.test(CODE)
   && /const delayMs = 100;/.test(CODE)
   && /duration: 520,\s*easing: "cubic-bezier\(0\.22, 1, 0\.36, 1\)",\s*fill: "forwards"/.test(CODE));
ck('Year Zero, verbatim: the popup (backdrop, 62% dark panel, fades, backdrop-click close, one-shot)',
   /backdrop\.style\.background = "rgba\(0,0,0,0\.28\)";\s*backdrop\.style\.backdropFilter = "blur\(1px\)";/.test(CODE)
   && /panel\.style\.width = "62%";\s*panel\.style\.maxWidth = "620px";\s*panel\.style\.minWidth = "360px";\s*panel\.style\.background = "rgba\(8, 12, 18, 0\.92\)";/.test(CODE)
   && /backdrop\.style\.transition = "opacity 180ms ease";/.test(CODE)
   && /if \(e\.target !== backdrop\) return;\s*closeModal\(backdrop\);/.test(CODE)
   && /openModal\(\);\s*thrown\.remove\(\)/.test(CODE));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await p.setContent('<!DOCTYPE html><body style="margin:0">' +
    '<div id="game_window" style="position:relative;width:1050px;height:640px;' +
    '-webkit-mask-image:linear-gradient(black,black);mask-image:linear-gradient(black,black)">' +
    '<div id="question_form"></div></div></body>');

  await p.addScriptTag({ content: `
    // ---- stubs
    var campaignTrail_temp = { player_answers: [], question_number: 0 };
    let _lastQuestionPK = null;
    var FBI = 'Gray';
    const questionData = {
      8:  { date: '8 January 1973', news: { ifAnswered: [72], html: '<p>Kissinger has been talking.</p>' } },
      9:  { news: [
              { ifAnswered: [90], html: 'NINETY' },
              { ifAnswered: [91], html: 'NINETY-ONE' },
              { html: 'FALLBACK' } ] },
      10: { news: { when: () => FBI !== 'Felt', html: 'FELT LEAKS' } },
      11: { news: { when: () => { throw new Error('slip'); }, html: 'X' } },
      12: { news: { ifAnswered: [72], src: 'data:image/png;base64,bm90IGFuIGltYWdl', html: 'dead' } },
      13: { news: { src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', html: 'custom' } },
      14: { date: '1 Feb 1973' },
    };
    var __lowfx = false;
    function _lowFx() { return __lowfx; }
    // tooltip baking stand-in: marks what went through it
    function applyTooltipsMarked(t) { return String(t).replace(/Kissinger/g, "<span class='mytooltip'>Kissinger</span>"); }

    // ---- the real code
    ${NEWS}

    // ---- harness helpers
    window.__strip = () => {
      document.querySelector('#game_window > g')?.remove();
      const g = document.createElement('g');
      g.style.cssText = 'display:block;position:absolute;bottom:0;left:0;width:100%;height:175px;overflow:visible;pointer-events:none';
      document.getElementById('game_window').appendChild(g);
      return g;
    };
    // One question boundary, as the observer runs it, then the chrome tick.
    window.__arrive = (pk) => { _lastQuestionPK = pk; _newsCompose(pk); __strip(); _newsMount(); };
    window.__desk = () => document.querySelector('#acop-news-desk .thrown_object_img');
    window.__wait = (ms) => new Promise(r => setTimeout(r, ms));
  `});

  const ev = fn => p.evaluate(fn);
  let r;

  console.log('\nAN EARLIER ANSWER, A LATER QUESTION:');
  r = await ev(() => { __arrive(8); return { news: _news, desk: !!__desk() }; });
  ck('without answer 72, question 8 carries nothing', r.news === null && !r.desk);
  r = await ev(() => { campaignTrail_temp.player_answers = [5, 72, 7]; campaignTrail_temp.question_number = 3;
                       __arrive(8); return { pk: _news && _news.pk, desk: !!__desk() }; });
  ck('with answer 72 given earlier, it lands on the desk at question 8 — whatever slot 8 sits in',
     r.pk === 8 && r.desk);
  r = await ev(() => { __arrive(14); return { news: _news, desk: !!__desk() }; });
  ck('a question with no news gets nothing', r.news === null && !r.desk);
  r = await ev(() => { campaignTrail_temp.player_answers = [91]; __arrive(9); return _newsObj().html; });
  ck('news as a list: the first story whose answers were given is the one thrown', r === 'NINETY-ONE');
  r = await ev(() => { campaignTrail_temp.player_answers = [90, 91]; __arrive(9); return _newsObj().html; });
  ck('…so the more specific story goes first', r === 'NINETY');
  r = await ev(() => { campaignTrail_temp.player_answers = []; __arrive(9); return _newsObj().html; });
  ck('…and a story with no ifAnswered is the fallback', r === 'FALLBACK');
  r = await ev(() => { __arrive(10); const a = !!_news; FBI = 'Felt'; __arrive(10); const b2 = !!_news; FBI = 'Gray'; return [a, b2]; });
  ck('when() gates on game state', r[0] === true && r[1] === false);
  r = await ev(() => { try { __arrive(11); } catch (e) { return 'threw'; } return _news; });
  ck('a when() that throws means no story, not a crash', r === null);

  console.log('\nTHE THROW:');
  r = await ev(async () => {
    campaignTrail_temp.player_answers = [72];
    const before = document.documentElement.scrollHeight;
    __arrive(8);
    const t = __desk();
    const early = t.getAnimations().length;
    await __wait(180);
    const mid = { anims: t.getAnimations().length, scroll: document.documentElement.scrollHeight };
    await __wait(600);
    return { before, early, mid, pe: getComputedStyle(t).pointerEvents,
             parent: t.parentNode.parentNode === document.querySelector('#game_window > g'),
             w: t.style.width, book: t.src.startsWith('data:image/webp'), tf: t.style.transform, op: t.style.opacity };
  });
  ck('it sits in Year Zero\'s 262x253 box, in the portrait strip, clickable though the strip is not',
     r.parent && r.pe === 'auto');
  ck('Year Zero\'s 100ms pause, then the flight', r.early === 0 && r.mid.anims === 1);
  ck('the flight never grows the page (it clips below the desk, as Year Zero\'s window did)',
     r.mid.scroll === r.before);
  ck('it comes to rest upright-ish at Year Zero\'s end rotation, fully visible',
     /^translate\(0(px)?, 0(px)?\) rotate\(-?\d+(\.\d+)?deg\)$/.test(r.tf) && r.op === '1');
  ck('with no src, the briefing book lands, 88px wide', r.book && r.w === '88px');
  r = await ev(async () => { __strip(); _newsMount(); const t = __desk(); await __wait(150);
                             return { back: !!t, anims: t ? t.getAnimations().length : -1 }; });
  ck('an engine re-render of the strip puts it straight back, without throwing it again', r.back && r.anims === 0);
  r = await ev(() => { _lastQuestionPK = 9; _newsMount(); const gone = !__desk(); _lastQuestionPK = 8; _newsMount();
                       return { gone, back: !!__desk() }; });
  ck('it never shows on a question other than its own', r.gone && r.back);
  r = await ev(async () => { __lowfx = true; __arrive(8); await __wait(150); const n = __desk().getAnimations().length;
                             __lowfx = false; return n; });
  ck('low demand mode: it simply lands, no flight', r === 0);
  r = await ev(async () => { __arrive(13); await __wait(20); return __desk().style.width; });
  ck('a custom src without a width gets Year Zero\'s 200px', r === '200px');
  r = await ev(async () => { campaignTrail_temp.player_answers = [72]; __arrive(12); await __wait(300); return __desk().src; });
  ck('a dead image URL falls back to the briefing book — never an invisible click target',
     r.startsWith('data:image/webp'));

  console.log('\nTHE POPUP:');
  r = await ev(async () => {
    campaignTrail_temp.player_answers = [72]; __arrive(8); await __wait(700);
    __desk().click(); await __wait(250);
    const bd = document.querySelector('#game_window > .thrown_object_modal_backdrop');
    const panel = bd && bd.querySelector('.thrown_object_modal_panel');
    return { bd: !!bd, op: bd && getComputedStyle(bd).opacity, html: panel && panel.innerHTML,
             desk: !!__desk(), opened: _news.opened };
  });
  ck('clicking it opens Year Zero\'s popup over the game window', r.bd && r.op === '1');
  ck('…with the story, tooltips baked in', /<span class="mytooltip">Kissinger<\/span> has been talking/.test(r.html || ''));
  ck('…and the object is gone from the desk (one-shot, as in Year Zero)', !r.desk && r.opened === true);
  r = await ev(() => { __strip(); _newsMount(); return !!__desk(); });
  ck('an opened story does not come back when the strip re-renders', r === false);
  r = await ev(async () => { document.querySelector('.thrown_object_modal_panel').click(); await __wait(260);
                             return !!document.querySelector('.thrown_object_modal_backdrop'); });
  ck('clicking inside the story does not close it', r === true);
  r = await ev(async () => { document.querySelector('.thrown_object_modal_backdrop').click(); await __wait(260);
                             return !!document.querySelector('.thrown_object_modal_backdrop'); });
  ck('clicking the backdrop closes it', r === false);
  r = await ev(async () => { __arrive(8); await __wait(700); __desk().click(); await __wait(50);
                             __arrive(14); return !!document.querySelector('.thrown_object_modal_backdrop'); });
  ck('the next question clears a popup left open', r === false);
  r = await ev(async () => { __arrive(14); ACOPNews.preview('<p>PREVIEW</p>'); await __wait(700); __desk().click(); await __wait(50);
                             return document.querySelector('.thrown_object_modal_panel').innerHTML; });
  ck('ACOPNews.preview() throws a sample onto any question', r === '<p>PREVIEW</p>');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => {
  // A behaviour broken badly enough to throw mid-run is a failure, not a crash:
  // report it in the same shape so the runner's tally still reads.
  console.log('  FAIL- harness threw: ' + String(e && e.message || e).split('\n')[0]);
  console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed');
  process.exit(1);
});
