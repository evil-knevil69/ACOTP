// The President's Daily Brief: a classified folder that lands in the portrait
// strip on the questions that have something to report, opening to a typed
// bullet-point brief of scheduled consequences, flavour headlines, and foreign
// events that began or ended since the last question.
//
// Drives the REAL PDB block (sliced out of Code 2) against a stub question
// screen: the engine's <g> portrait strip, #question_form, _EVENT_DEFS.
//
//   node tests/pdb_check.js
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
const PDB = slice("// ── PRESIDENT'S DAILY BRIEF", "    get current() { return _pdb; },\n};");

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

console.log('STATIC WIRING:');
ck('headlines are authored in ordinary case and CAPITALISED BY CSS — the tooltip matcher is case-sensitive',
   /\.pdb-head \{[^}]*text-transform:uppercase/.test(PDB) && /\.pdb-head \.mytooltiptext \{ text-transform:none/.test(PDB)
   && !/head:\s*'[^'a-z]*[A-Z]{4}[^'a-z]*',/.test(PDB.replace(/^\s*\/\/.*$/gm, '')));
ck('stories are keyed by PK — the compose step never reads question_number',
   !/question_number/.test(extractFn('_pdbCompose')) && /it\.pks\.map\(Number\)\.indexOf\(Number\(pk\)\)/.test(src));
ck('compose runs at the question boundary AFTER onShow, so its flag flips count this question',
   /if \(qd\.onShow\) qd\.onShow\(\);[\s\S]{0,200}_pdbCompose\(currentPK, qd\);/.test(src));
ck('the folder is re-mounted on every game-window mutation, alongside the other chrome',
   /addInnerCircleButton\(\);\s*\n\s*_pdbMount\(\);/.test(src));
ck('New Game clears the done-set, the ABROAD snapshot and the current brief',
   /_pdbDone\.clear\(\); Object\.keys\(_evLastState\)\.forEach\(k => \{ delete _evLastState\[k\]; \}\);\s*\n\s*_pdb = null; _pdbClose\(true\);/.test(src));
ck('the save carries the done-set, the ABROAD snapshot and the current brief',
   /pdb: \{\s*\n\s*done: Array\.from\(_pdbDone\),\s*\n\s*evLast: Object\.assign\(\{\}, _evLastState\),\s*\n\s*cur: _pdb/.test(src)
   && /if \(m\.pdb\) \{[\s\S]{0,200}_pdbDone\.add\(id\)[\s\S]{0,120}Object\.assign\(_evLastState/.test(extractFn('_slRestoreMod')));
ck('the shipped examples are inert (pks: []) until authored',
   (PDB.match(/pks: \[\],\s*\/\/ FILL ME IN/g) || []).length === 2);
ck('it is listed in the authoring index', /PDB_ITEMS ………………… President's Daily Brief stories/.test(src));
ck('the document bakes tooltips into every authored string',
   /const bake = \(t\) => \(typeof applyTooltipsMarked === 'function'/.test(extractFn('_pdbHTML')));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
  p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await p.setContent('<!DOCTYPE html><body style="margin:0">' +
    '<div id="game_window" style="position:relative;width:1050px;height:640px">' +
    '<div id="question_form"></div></div></body>');

  await p.addScriptTag({ content: `
    // ---- stubs
    var campaignTrail_temp = { player_answers: [], question_number: 0 };
    let _lastQuestionPK = null;
    const _newEvents = new Set();
    function _markEventNew(id) { _newEvents.add(id); }
    var chile = 0, andes = 1, troubles = 1;
    var FBI = 'Gray';
    const _EVENT_DEFS = [
      { id: 'ni-troubles',  continent: 'Europe',        label: 'The Troubles',  state: () => troubles },
      { id: 'chilean-coup', continent: 'South America', label: 'Chilean Coup',  state: () => chile },
      { id: 'andes-thing',  continent: 'South America', label: 'Andes Thing',   state: () => andes },
      { id: 'broken',       continent: 'Asia',          label: 'Broken',        state: () => { throw new Error('x'); } },
    ];
    const questionData = { 500: { date: '14 February 1973' } };
    var __lowfx = false;
    function _lowFx() { return __lowfx; }
    var __mapOpened = 0;
    function _openWorldMapViaTunnel() { __mapOpened++; }
    // tooltip baking stand-in: marks what went through it
    function applyTooltipsMarked(t) { return String(t).replace(/Kissinger/g, "<span class='mytooltip'>Kissinger</span>"); }

    // ---- the real code
    ${PDB}

    // ---- harness helpers
    window.__strip = () => {
      document.querySelector('#game_window > g')?.remove();
      const g = document.createElement('g');
      g.style.cssText = 'display:block;position:absolute;bottom:0;left:0;width:100%;height:175px;pointer-events:none';
      document.getElementById('game_window').appendChild(g);
      return g;
    };
    // One question boundary, as the observer runs it.
    window.__arrive = (pk) => { _lastQuestionPK = pk; _newEvents.clear(); _pdbCompose(pk, questionData[pk] || {}); };
    window.__set = (items) => { PDB_ITEMS.length = 0; items.forEach(x => PDB_ITEMS.push(x)); };
  `});

  const ev = fn => p.evaluate(fn);
  let r;

  console.log('\nFOREIGN EVENTS (the ABROAD section):');
  r = await ev(() => { __set([]); __arrive(400); return { pdb: _pdb, snap: Object.keys(_evLastState).length }; });
  ck('the first question of a run only SEEDS the snapshot — running events are not "news"',
     r.pdb === null && r.snap === 4);
  r = await ev(() => { chile = 1; __arrive(401); return _pdb && { abroad: _pdb.abroad.map(a => a.id), items: _pdb.items.length }; });
  ck('an event going live brings a brief on its own, listing it ABROAD',
     r && JSON.stringify(r.abroad) === '["chilean-coup"]' && r.items === 0);
  r = await ev(() => _newEvents.has('chilean-coup'));
  ck('…and marks it new for the World Affairs tab (whose red highlight had no feed before)', r === true);
  r = await ev(() => { __arrive(402); return _pdb; });
  ck('a still-running event is not repeated next question', r === null);
  r = await ev(() => { andes = 3; __arrive(403); return _pdb && _pdb.ended.map(a => a.id); });
  ck('an event ending is reported as ended', JSON.stringify(r) === '["andes-thing"]');
  r = await ev(() => { _PDB_FOREIGN_ALONE = false; chile = 0; __arrive(404); chile = 1; __arrive(405);
                       const out = _pdb; _PDB_FOREIGN_ALONE = true; return out; });
  ck('with _PDB_FOREIGN_ALONE off, foreign news alone does not summon a brief', r === null);
  r = await ev(() => { try { troubles = 3; __arrive(406); }
                       catch (e) { return 'threw: ' + e.message; }
                       return _pdb && { ended: _pdb.ended.map(a => a.id),
                                        all: _pdb.abroad.concat(_pdb.ended).map(a => a.id) }; });
  ck('a state() that throws is read as inactive rather than breaking the brief',
     r && typeof r === 'object' && JSON.stringify(r.ended) === '["ni-troubles"]' && !r.all.includes('broken'));

  console.log('\nSCHEDULED STORIES:');
  r = await ev(() => {
    __set([{ id: 'felt', pks: [500], when: () => FBI !== 'Felt', head: 'KISSINGER TAPS LEAK', body: 'b' }]);
    __arrive(499);
    const before = _pdb;
    __arrive(500);
    return { before, items: _pdb && _pdb.items.map(i => i.id), done: _pdbDone.has('felt') };
  });
  ck('a story appears at its pk and not before', r.before === null && JSON.stringify(r.items) === '["felt"]');
  ck('…and is recorded as having run', r.done === true);
  r = await ev(() => { campaignTrail_temp.question_number = 17; __arrive(500); return _pdb; });
  ck('a once-story does not run twice — and the slot (question_number) is irrelevant', r === null);
  r = await ev(() => {
    __set([{ id: 'win', pks: [510, 511, 512], when: () => FBI === 'Felt', head: 'H' }]);
    const seen = [];
    __arrive(510); seen.push(!!_pdb);
    FBI = 'Felt';
    __arrive(511); seen.push(!!_pdb);
    __arrive(512); seen.push(!!_pdb);
    FBI = 'Gray';
    return seen;
  });
  ck('a pk WINDOW: runs at the first listed pk where when() holds, then never again',
     JSON.stringify(r) === '[false,true,false]');
  r = await ev(() => {
    __set([{ id: 'saga', pks: [520, 521], once: false, head: 'H' }]);
    const seen = [];
    __arrive(520); seen.push(!!_pdb);
    __arrive(521); seen.push(!!_pdb);
    return seen;
  });
  ck('once:false runs at every listed pk — a developing story', JSON.stringify(r) === '[true,true]');
  r = await ev(() => {
    __set([{ id: 'ans', pks: [530, 531], when: () => _answered(9001, 9002), head: 'H' }]);
    __arrive(530); const a = !!_pdb;
    campaignTrail_temp.player_answers.push(9002);
    __arrive(531); const b = !!_pdb;
    return [a, b];
  });
  ck('_answered(…) gates on whether the player gave ANY of those answers', JSON.stringify(r) === '[false,true]');
  r = await ev(() => {
    __set([{ id: 'bad', pks: [540], when: () => { throw new Error('authoring slip'); }, head: 'H' }]);
    __arrive(540); return { pdb: _pdb, done: _pdbDone.has('bad') };
  });
  ck('a when() that throws is treated as false — no crash, and no story burned', r.pdb === null && r.done === false);
  r = await ev(() => {
    __set([
      { id: 'f1', pks: [550], kind: 'flavour', head: 'FLAVOUR' },
      { id: 'c1', pks: [550], head: 'CONSEQUENCE' },
    ]);
    __arrive(550); return _pdb.items.map(i => i.kind);
  });
  ck('consequences lead, flavour follows', JSON.stringify(r) === '["consequence","flavour"]');

  console.log('\nTHE FOLDER:');
  r = await ev(() => {
    __set([{ id: 'desk', pks: [560], head: 'Kissinger talks', body: 'more' }]);
    __strip();
    __arrive(560);
    _pdbMount();
    const f = document.getElementById('pdb-folder');
    return { inStrip: f && f.parentNode === document.querySelector('#game_window > g'),
             pe: f && getComputedStyle(f).pointerEvents, anims: f ? f.getAnimations().length : -1,
             landed: _pdb.landed };
  });
  ck('it lands inside the engine portrait strip (#game_window > g)', r.inStrip === true);
  ck('…and is clickable, though the strip itself is pointer-events:none', r.pe === 'auto');
  ck('…thrown in on arrival', r.anims === 1 && r.landed === true);
  r = await ev(() => { __strip(); _pdbMount(); const f = document.getElementById('pdb-folder');
                       return { back: !!f, anims: f ? f.getAnimations().length : -1 }; });
  ck('an engine rebuild of the strip puts it back without throwing it in again', r.back && r.anims === 0);
  r = await ev(() => { document.getElementById('question_form').remove(); _pdbMount();
                       const gone = !document.getElementById('pdb-folder');
                       const qf = document.createElement('div'); qf.id = 'question_form';
                       document.getElementById('game_window').appendChild(qf); _pdbMount();
                       return { gone, back: !!document.getElementById('pdb-folder') }; });
  ck('it leaves the desk when the question screen does, and returns with it', r.gone && r.back);
  r = await ev(() => { _lastQuestionPK = 561; _pdbMount(); const gone = !document.getElementById('pdb-folder');
                       _lastQuestionPK = 560; return gone; });
  ck('a brief never shows on a question other than its own', r === true);
  r = await ev(() => { __lowfx = true; __set([{ id: 'lfx', pks: [562], head: 'H' }]); __strip(); __arrive(562); _pdbMount();
                       const n = document.getElementById('pdb-folder').getAnimations().length; __lowfx = false; return n; });
  ck('low demand mode: it simply appears, no throw', r === 0);

  console.log('\nTHE DOCUMENT:');
  r = await ev(() => {
    __set([{ id: 'doc', pks: [570], head: 'Kissinger talks', body: 'A <i>Post</i> story.' },
           { id: 'fl',  pks: [570], kind: 'flavour', head: 'Andes' }]);
    chile = 0; __arrive(569); chile = 1;
    __strip(); __arrive(570); _pdbMount();
    document.getElementById('pdb-folder').click();
    const d = document.getElementById('pdb-doc');
    return { open: !!d, role: d && d.getAttribute('role'), modal: d && d.getAttribute('aria-modal'),
             head: d && d.querySelector('.pdb-head').textContent,
             baked: !!(d && d.querySelector('.pdb-head .mytooltip')),
             abroad: d && d.querySelector('.pdb-abroad') && d.querySelector('.pdb-abroad').textContent,
             date: d && d.querySelector('.pdb-sub').textContent,
             read: _pdb.read, folderRead: document.getElementById('pdb-folder').classList.contains('pdb-read'),
             focus: document.activeElement && document.activeElement.className };
  });
  ck('clicking the folder opens the brief as a modal dialog', r.open && r.role === 'dialog' && r.modal === 'true');
  ck('…headlines as typed text, with tooltips baked in', r.head === 'Kissinger talks' && r.baked);
  ck('…the ABROAD section listing what went live', /Chilean Coup/.test(r.abroad));
  ck('…dated from the question', /FOR THE PRESIDENT ONLY/.test(r.date));
  ck('…marked read, and focus moves into it', r.read && r.folderRead && r.focus === 'pdb-close');
  r = await ev(() => { document.querySelector('#pdb-doc .pdb-head').click(); return !!document.getElementById('pdb-doc'); });
  ck('clicking inside the document does not close it', r === true);
  r = await ev(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                       return new Promise(res => setTimeout(() => res(!document.getElementById('pdb-backdrop')), 260)); });
  ck('Escape closes it', r === true);
  r = await ev(() => { document.getElementById('pdb-folder').click();
                       const back = document.getElementById('pdb-backdrop');
                       back.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                       return new Promise(res => setTimeout(() => res(!document.getElementById('pdb-backdrop')), 260)); });
  ck('clicking the backdrop closes it', r === true);
  r = await ev(() => { document.getElementById('pdb-folder').click();
                       document.querySelector('#pdb-doc .pdb-map').click();
                       return { map: __mapOpened, closed: !document.getElementById('pdb-backdrop') }; });
  ck('"Open the World Map" closes the brief and opens the map', r.map === 1 && r.closed);
  r = await ev(() => { document.getElementById('pdb-folder').click(); return !!document.getElementById('pdb-doc'); });
  ck('it can be re-read for as long as the question is up', r === true);
  r = await ev(() => { _pdbClose(true); __arrive(571); _pdbMount();
                       return { folder: !!document.getElementById('pdb-folder'), doc: !!document.getElementById('pdb-doc') }; });
  ck('a question with nothing to report has no folder on the desk', !r.folder && !r.doc);

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
