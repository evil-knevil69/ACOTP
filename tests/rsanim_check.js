// Cabinet reshuffle — the filing-card animations on the Officials screen.
// Drives the REAL helpers (_rsAnimOk / _rsDealDeck / _rsFileSwap / _rsSettle)
// against a stub panel, plus static checks on the picker call sites.
// Run: node tests/rsanim_check.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const src = fs.readFileSync(path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt'), 'utf8');
function extractFn(name) {
  const s = src.indexOf('function ' + name + '(');
  let i = src.indexOf('{', s), d = 0;
  for (let j = i; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(s, j + 1); } }
}
const fns = ['_lowFx', '_rsAnimOk', '_rsDealDeck', '_rsFileSwap', '_rsSettle'].map(extractFn).join('\n');

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

console.log('CALL SITES:');
ck('picker open: drawer slide + deck deal, both behind the _rsAnimOk gate',
   /if \(_rsAnimOk\(\)\) \{[\s\S]{0,220}pick\.animate\(\[\{ transform: 'translateY\(14px\)'[\s\S]{0,160}_rsDealDeck\(cands\);/.test(src));
ck('appoint: instant path under the gate, animated path otherwise',
   /if \(!_rsAnimOk\(\)\) \{ commit\(\); return; \}/.test(src)
   && /_rsFileSwap\(cell, cands, grid\.querySelector\('\.oc-flip\[data-var-name="' \+ varName \+ '"\]'\), commit\)/.test(src));
ck('commit still chooses + re-renders, then settles the new card',
   /const commit = \(\) => \{[\s\S]{0,260}_RESHUFFLE\.choose\(varName, person\);[\s\S]{0,200}openOfficialsPanel\(questions\);[\s\S]{0,120}_rsSettle\(varName\);/.test(src));
ck('the picker locks while a card is in flight (one appointment only)',
   /if \(b\.disabled\) return;/.test(src)
   && /pick\.querySelectorAll\('button'\)\.forEach\(x => \{ x\.disabled = true; \}\);/.test(src));
ck('the flying clone is styled property-by-property, never via style.cssText',
   /Object\.keys\(fs\)\.forEach\(k => \{ fly\.style\[k\] = fs\[k\]; \}\);/.test(src)
   && !/fly\.style\.cssText/.test(src));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await p.setContent(`<!DOCTYPE html><body style="margin:0">
    <div id="officials_panel" style="position:relative">
      <div class="oc-grid">
        <div class="oc-flip" data-var-name="SOS" style="position:absolute;left:600px;top:40px;width:210px;height:120px;background:#eee">holder</div>
      </div>
      <div id="rs-picker" style="position:absolute;left:20px;top:400px">
        <div class="rs-cands" style="display:flex;gap:10px">
          <div class="rs-cand"><div class="oc-flip" style="width:210px;height:120px;background:#ddd">A</div><button>Appoint A</button></div>
          <div class="rs-cand"><div class="oc-flip" style="width:210px;height:120px;background:#ddd">B</div><button>Appoint B</button></div>
          <div class="rs-cand"><div class="oc-flip" style="width:210px;height:120px;background:#ddd">C</div><button>Appoint C</button></div>
        </div>
      </div>
    </div></body>`);
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  await p.addScriptTag({ content: fns });

  console.log('\nGATE:');
  let r = await p.evaluate(() => {
    const on = _rsAnimOk();
    document.body.classList.add('low-fx-on'); const low = _rsAnimOk();
    document.body.classList.remove('low-fx-on');
    return { on, low };
  });
  ck('_rsAnimOk: true with motion allowed, false under low demand mode', r.on === true && r.low === false);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  ck('_rsAnimOk: false under prefers-reduced-motion', (await p.evaluate(() => _rsAnimOk())) === false);
  await p.emulateMedia({ reducedMotion: 'no-preference' });

  console.log('\nDECK DEAL:');
  r = await p.evaluate(() => {
    _rsDealDeck(document.querySelector('.rs-cands'));
    const cells = [...document.querySelectorAll('.rs-cand')];
    const anims = cells.map(c => c.getAnimations()[0]);
    const kf = anims.map(a => a.effect.getKeyframes()[0].transform);
    return { count: anims.filter(Boolean).length, delays: anims.map(a => a.effect.getTiming().delay),
             firstFromDeck: /translate\(0px/.test(kf[0]),
             laterFromLeft: kf.slice(1).every(t => /translate\(-\d+(\.\d+)?px/.test(t)),
             fill: anims[0].effect.getTiming().fill };
  });
  ck('every candidate card flicks out, staggered 0/95/190ms',
     r.count === 3 && r.delays[0] === 0 && r.delays[1] === 95 && r.delays[2] === 190);
  ck('cards start stacked at the deck (first dx 0, the rest offset left)', r.firstFromDeck && r.laterFromLeft);
  ck('fill:backwards so a card sits in the deck during its delay', r.fill === 'backwards');

  console.log('\nTHE CHANGEOVER:');
  r = await p.evaluate(async () => {
    const cands = document.querySelector('.rs-cands');
    const cell = document.querySelectorAll('.rs-cand')[1];
    const target = document.querySelector('.oc-flip[data-var-name="SOS"]');
    let calls = 0;
    _rsFileSwap(cell, cands, target, () => { calls++; });
    await new Promise(z => setTimeout(z, 60));
    const fly = document.getElementById('rs-fly');
    const src2 = cell.querySelector('.oc-flip');
    const mid = { flying: !!fly, fixed: fly ? getComputedStyle(fly).position : null,
                  srcHidden: src2.style.visibility === 'hidden',
                  targetLeaving: target.getAnimations().length >= 1,
                  othersFiled: [...document.querySelectorAll('.rs-cand')].filter(c => c !== cell && c.getAnimations().length >= 1).length,
                  callsMid: calls };
    await new Promise(z => setTimeout(z, 900));
    return Object.assign(mid, { flyGone: !document.getElementById('rs-fly'), callsEnd: calls });
  });
  ck('a fixed-position clone of the chosen card flies to the slot', r.flying && r.fixed === 'fixed' && r.srcHidden);
  ck('the outgoing holder is filed away; unpicked cards go back in the deck',
     r.targetLeaving && r.othersFiled === 2);
  ck('the appointment commits only on landing, and the clone is cleaned up',
     r.callsMid === 0 && r.callsEnd === 1 && r.flyGone);
  r = await p.evaluate(async () => {
    let calls = 0;
    _rsFileSwap(document.querySelectorAll('.rs-cand')[0], document.querySelector('.rs-cands'), null, () => { calls++; });
    await new Promise(z => setTimeout(z, 400));
    return calls;
  });
  ck('fail-safe: a missing target card still commits the appointment', r === 1);

  console.log('\nSETTLE:');
  r = await p.evaluate(() => {
    document.getElementById('rs-picker').remove();
    const f = document.querySelector('.oc-flip[data-var-name="SOS"]');
    f.getAnimations().forEach(a => a.cancel());
    _rsSettle('SOS');
    return f.getAnimations().length;
  });
  ck('the newly seated card drops into its slot after the re-render', r >= 1);
  r = await p.evaluate(() => {
    const f = document.querySelector('.oc-flip[data-var-name="SOS"]');
    f.getAnimations().forEach(a => a.cancel());
    document.body.classList.add('low-fx-on');
    _rsSettle('SOS');
    const n = f.getAnimations().length;
    document.body.classList.remove('low-fx-on');
    return n;
  });
  ck('settle skipped under low demand mode', r === 0);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})();
