// 1974 MIDTERMS — drives the REAL _MIDTERM engine: model maths, the verdict
// ladder, the two-thirds warnings, the broadcast skin, and the opening titles.
// Run: node tests/midterm_check.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const src = fs.readFileSync(path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt'), 'utf8');
const s = src.indexOf('var _MIDTERM = {');
const e = src.indexOf('\n};', src.indexOf('return R;\n  }\n};', s)) + 3;
const block = src.slice(s, e);

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

// ── model maths, headless ──
const M = new Function(block.replace(/^var _MIDTERM = /, 'return ').replace(/;\s*$/, ';'))();
const C = M.CFG;
const dlt = x => x > 0 ? '+' + x : (x < 0 ? '' + x : 'NC');
const tier = hg => { const l = -hg; return hg > 0 ? 'verdictGain' : l <= C.HELD_RLOSS ? 'verdictHeld'
                                    : l < C.WAVE_RLOSS ? 'verdictBruised' : 'verdictWave'; };

console.log('MODEL:');
ck('House baseline is the two-party split of all 435 (no 434 off-by-one)', C.HBASE.dem + C.HBASE.rep === 435);
{
  const held = Object.values(C.SEN).reduce((a, r) => (a[r[4]]++, a), { D: 0, R: 0 });
  ck('Senate baseline reconciles: seed + seats up = 56D/42R + 2 ind',
     C.SEED.D + held.D === C.SBASE.dem && C.SEED.R + held.R === C.SBASE.rep
     && C.SEED.D + C.SEED.R + C.SEED.I + Object.keys(C.SEN).length === 100);
}
ck('the swing is always pro-Democrat, even at 100 approval / no Watergate',
   M.swing(100, 0) > 0 && Math.abs(M.swing(100, 0) - C.SWING.MID) < 1e-9);
{
  const runs = [[100, 0], [70, 0.05], [50, 0.05], [47, 0.75], [30, 0.9], [0, 1]]
    .map(([a, w]) => { const R = M.run({ approval: a, watergate: w, noise: false });
                       return { R, hg: R.house.rep - C.HBASE.rep, sg: R.senate.rep - C.SBASE.rep }; });
  ck('worse approval / more Watergate => strictly worse for the President',
     runs.every((r, i) => i === 0 || r.hg <= runs[i - 1].hg));
  ck('the Democrats hold both chambers at every reachable swing (so control cannot key the verdict)',
     runs.every(r => r.R.house.dem >= 218 && r.R.senate.dem >= 51));
  ck('historic Ford 1974 lands on the bloodbath tier', tier(runs[3].hg) === 'verdictWave');
  ck('a strong presidency actually GAINS seats', runs[0].hg > 0 && tier(runs[0].hg) === 'verdictGain');
}
{
  const seen = {};
  for (let a = 0; a <= 100; a++) for (const w of [0, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1]) {
    const R = M.run({ approval: a, watergate: w, noise: false });
    seen[tier(R.house.rep - C.HBASE.rep)] = (seen[tier(R.house.rep - C.HBASE.rep)] || 0) + 1;
  }
  ck('all four verdict tiers are reachable across the approval x watergate range',
     ['verdictGain', 'verdictHeld', 'verdictBruised', 'verdictWave'].every(k => seen[k] > 0));
}
console.log('\nVERDICT COPY:');
ck('no verdict glues a direction word onto a signed delta (the old "down +4")',
   ['verdictGain', 'verdictHeld', 'verdictBruised', 'verdictWave']
     .every(k => !/\b(down|up|lost|gained)\s*\{[HS]G\}/i.test(C.TEXT[k])));
ck('a net gain reads as a win', /gained ground/i.test(C.TEXT.verdictGain));
ck('two-thirds thresholds are the real ones (House 290, Senate 67)',
   C.SUPER.HOUSE === 290 && C.SUPER.SENATE === 67);
ck('the Senate warning names impeachment conviction', /convict/i.test(C.TEXT.superSenate));
{
  const R = M.run({ approval: 47, watergate: 0.75, noise: false });
  ck('historic 1974 crosses the veto-proof House line exactly', R.house.dem >= C.SUPER.HOUSE);
  const W = M.run({ approval: 0, watergate: 1, noise: false });
  ck('a full collapse hands the Democrats the votes to convict', W.senate.dem >= C.SUPER.SENATE);
  const G = M.run({ approval: 100, watergate: 0, noise: false });
  ck('a good night crosses neither two-thirds line',
     G.house.dem < C.SUPER.HOUSE && G.senate.dem < C.SUPER.SENATE);
}
console.log('\nOPENING TITLES (config):');
ck('INTRO ships inert (both halves FILL ME IN)', C.INTRO.sting === '' && C.INTRO.url === '');
ck('the reveal roll is latched behind the titles',
   /var rollStarted=false;/.test(src) && /var beginRoll=function\(\)\{ if\(rollStarted\) return;/.test(src));

// ── runtime: the broadcast skin + the titles ──
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 820 } });
  p.on('pageerror', ev => console.log('PAGE ERROR:', ev.message));
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  await p.setContent('<!DOCTYPE html><body style="margin:0"></body>');
  await p.addScriptTag({ content: block + '\nwindow._MT=_MIDTERM;\nwindow.__stings=[];\nwindow._playEggAudio=u=>{window.__stings.push(u);return{};};' });

  console.log('\nBROADCAST SKIN:');
  await p.evaluate(() => window._MT.open({ approval: 47, watergate: 0.75, noise: false }));
  let r = await p.evaluate(() => {
    const ov = document.getElementById('_mt_ov'), cs = getComputedStyle(ov);
    return { bg: cs.backgroundImage, font: cs.fontFamily,
             scan: getComputedStyle(ov, '::after').backgroundImage,
             h2: getComputedStyle(ov.querySelector('h2')).textShadow };
  });
  ck('tube-black studio + broadcast type + CRT scanlines + embossed headline',
     /radial-gradient/.test(r.bg) && /Arial Rounded/.test(r.font)
     && /repeating-linear-gradient/.test(r.scan) && r.h2.length > 10);
  await p.waitForTimeout(6200);                      // let the roll finish
  r = await p.evaluate(() => {
    const ov = document.getElementById('_mt_ov');
    const d = ov.querySelectorAll('.mttile.D'), rr = ov.querySelectorAll('.mttile.R');
    const px = el => getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number);
    return { called: ov.querySelectorAll('.mttile.called').length,
             dRed: px(d[0])[0] > px(d[0])[2], rBlue: px(rr[0])[2] > px(rr[0])[0],
             gold: getComputedStyle(ov.querySelector('.mttile.called')).boxShadow.includes('rgb(237, 188, 98)'),
             tally: +ov.querySelector('#_mt_tD').textContent + +ov.querySelector('#_mt_tR').textContent,
             adv: ov.querySelector('#_mt_adv').textContent, sup: ov.querySelector('#_mt_sup').textContent,
             btns: !document.getElementById('_mt_cont').disabled };
  });
  ck('all 34 seats called, tally sums to 98 (2 independents not up)', r.called === 34 && r.tally === 98);
  ck('1976 convention on the tiles: D reads red, R reads blue, gold rims', r.dRed && r.rBlue && r.gold);
  ck('verdict chyron written and the buttons arm', r.adv.length > 20 && r.btns);
  ck('historic 1974 prints the bloodbath verdict + the veto-proof warning',
     /bloodbath/i.test(r.adv) && /Two thirds of the House/.test(r.sup));
  r = await p.evaluate(() => {
    document.getElementById('_mt_score').click();
    const card = document.getElementById('_mt_card');
    const mk = document.getElementById('_mt_chMk');
    return { shown: card.classList.contains('show'),
             chBar: parseFloat(document.getElementById('_mt_chBar').style.width),
             houseMk: parseFloat(mk.style.left), senMk: parseFloat(document.getElementById('_mt_csMk').style.left),
             flick: getComputedStyle(card.querySelector('.card')).animationName };
  });
  ck('balance-of-power card opens with the bars filled', r.shown && r.chBar > 50);
  ck('control markers sit on 218/435 and 51%, not the bar midpoint',
     Math.abs(r.houseMk - 218 / 435 * 100) < 0.2 && r.senMk === 51);
  ck('the card carries the gentle tube flicker', r.flick === '_mtFlicker');
  await p.emulateMedia({ reducedMotion: 'reduce' });
  ck('reduced motion: the card holds steady',
     await p.evaluate(() => getComputedStyle(document.querySelector('#_mt_card .card')).animationName === 'none'));
  await p.emulateMedia({ reducedMotion: 'no-preference' });

  console.log('\nOPENING TITLES (runtime):');
  await p.evaluate(() => { document.getElementById('_mt_ov')?.remove(); document.getElementById('_mt_card')?.remove(); });
  r = await p.evaluate(async () => {
    window._MT.CFG.INTRO = { sting: '', url: '', durationMs: 8000 };
    window.__stings.length = 0;
    window._MT.open({ approval: 47, watergate: 0.75, noise: false });
    await new Promise(z => setTimeout(z, 900));
    const ov = document.getElementById('_mt_ov');
    const out = { img: !!document.getElementById('_mt_intro'), called: ov.querySelectorAll('.mttile.called').length,
                  stings: window.__stings.length };
    ov.remove(); document.getElementById('_mt_card').remove();
    return out;
  });
  ck('titles ship inert: no animation, no sting, the reveal starts as before',
     !r.img && r.stings === 0 && r.called > 0);
  r = await p.evaluate(async () => {
    window._MT.CFG.INTRO = { sting: 'theme.mp3', url: 'titles.gif', durationMs: 2500 };
    window.__stings.length = 0;
    window._MT.open({ approval: 47, watergate: 0.75, noise: false });
    await new Promise(z => setTimeout(z, 900));
    const ov = document.getElementById('_mt_ov'), im = document.getElementById('_mt_intro');
    const cs = im ? getComputedStyle(im) : null;
    return { img: !!im, sting: window.__stings[0], during: ov.querySelectorAll('.mttile.called').length,
             fixed: cs && cs.position === 'fixed', fit: cs && cs.objectFit, z: cs && +cs.zIndex,
             cursor: cs && cs.cursor };
  });
  ck('titles: the sting fires and the animation covers the studio',
     r.img && r.sting === 'theme.mp3' && r.fixed && r.fit === 'cover');
  ck('titles sit UNDER the CRT scanlines (z 4 < 5) and invite a click', r.z === 4 && r.cursor === 'pointer');
  ck('the seat reveal WAITS for the titles', r.during === 0);
  r = await p.evaluate(async () => {
    await new Promise(z => setTimeout(z, 2600));
    const ov = document.getElementById('_mt_ov');
    const out = { img: !!document.getElementById('_mt_intro'), called: ov.querySelectorAll('.mttile.called').length };
    ov.remove(); document.getElementById('_mt_card').remove();
    return out;
  });
  ck('titles self-clear after durationMs and the reveal then runs', !r.img && r.called > 0);
  r = await p.evaluate(async () => {
    window._MT.CFG.INTRO = { sting: '', url: 'titles.gif', durationMs: 60000 };
    window._MT.open({ approval: 47, watergate: 0.75, noise: false });
    await new Promise(z => setTimeout(z, 120));
    document.getElementById('_mt_intro').click();
    await new Promise(z => setTimeout(z, 900));
    const ov = document.getElementById('_mt_ov');
    const out = { img: !!document.getElementById('_mt_intro'), called: ov.querySelectorAll('.mttile.called').length };
    ov.remove(); document.getElementById('_mt_card').remove();
    window._MT.CFG.INTRO = { sting: '', url: '', durationMs: 8000 };
    return out;
  });
  ck('clicking the titles skips them and starts the reveal early', !r.img && r.called > 0);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})();
