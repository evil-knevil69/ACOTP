// Injected chrome (the Manual + World Map buttons) across screen changes.
// Election Night pulls both; the final results screens bring them back.
// Run: node tests/chrome_check.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const src = fs.readFileSync(path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt'), 'utf8');
function extractFn(name) {
  const s = src.indexOf('function ' + name + '(');
  let i = src.indexOf('{', s), d = 0;
  for (let j = i; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(s, j + 1); } }
}

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

console.log('WIRING:');
ck('election night is detected by #final_result_button (unique to that screen)',
   /function _enightInProgress\(\) \{\s*if \(document\.getElementById\('final_result_button'\)\) return true;/.test(src));
ck("…and by the state card during the 'Processing Results' beat, when the footer button is gone",
   /_enightInProgress[\s\S]{0,700}#overall_result ul[\s\S]{0,200}getElementById\('state_result'\)[\s\S]{0,200}#map_container svg[\s\S]{0,300}!document\.getElementById\('final_election_map_button'\)/.test(src));
ck('the manual button hides for the count, and skips its placement maths while hidden',
   /if \(_enightInProgress\(\)\) \{ btn\.style\.display = 'none'; return true; \}/.test(src));
ck('the world map button is pulled for the count as well as the nuclear attack',
   /const hide = \(_nukeWar >= 2\) \|\| _enightInProgress\(\);/.test(src));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
  p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await p.setContent(`<!DOCTYPE html><body style="margin:0">
    <div id="game_window" style="position:relative;width:1050px;height:600px;margin:10px">
      <div id="map_footer"></div>
    </div></body>`);
  await p.addScriptTag({ content: `
    var _nukeWar = 0;
    function openGameManual(){}
    function openWorldMap(){}
    var _manRO = null, _manBtnW = 0;
    ${extractFn('_enightInProgress')}
    ${extractFn('_placeManualButton')}
    ${extractFn('_addWorldMapBtn')}
    // the two screens, by the markers the real engine leaves behind
    window.__electionNight = () => {
      document.getElementById('final_election_map_button')?.remove();
      if (!document.getElementById('final_result_button')) {
        const q = document.createElement('button'); q.id = 'final_result_button';
        document.getElementById('game_window').appendChild(q);
      }
    };
    window.__finalResults = () => {
      document.getElementById('final_result_button')?.remove();
      if (!document.getElementById('final_election_map_button')) {
        const q = document.createElement('button'); q.id = 'final_election_map_button';
        document.getElementById('game_window').appendChild(q);
      }
    };
    window.__tick = () => { _placeManualButton(); _addWorldMapBtn(); };
    window.__state = () => {
      const m = document.getElementById('game-manual-button');
      const w = document.getElementById('world_map_button');
      return { manual: !!m && getComputedStyle(m).display !== 'none', worldMap: !!w };
    };
  `});

  console.log('\nACROSS THE SCREENS:');
  let r = await p.evaluate(() => { window.__tick(); return window.__state(); });
  ck('in-game: both buttons present', r.manual && r.worldMap);
  r = await p.evaluate(() => { window.__electionNight(); window.__tick(); return window.__state(); });
  ck('election night: BOTH pulled', !r.manual && !r.worldMap);
  r = await p.evaluate(() => { window.__tick(); window.__tick(); return window.__state(); });
  ck('…and they stay gone while the count runs (re-render safe)', !r.manual && !r.worldMap);
  // "Processing Results, wait one moment…": the engine swaps the footer out, so
  // #final_result_button is gone while the tally screen is still up. Without the
  // second branch of _enightInProgress both buttons flashed back for that beat.
  r = await p.evaluate(() => {
    document.getElementById('final_result_button').remove();
    const gw = document.getElementById('game_window');
    gw.insertAdjacentHTML('beforeend',
      '<div id="map_container"><svg></svg></div>' +
      '<div id="overall_result"><ul><li>Nixon: 0</li></ul></div><div id="state_result"></div>');
    window.__tick(); return window.__state();
  });
  ck('processing results (footer button gone): both STAY hidden', !r.manual && !r.worldMap);
  r = await p.evaluate(() => { window.__finalResults(); window.__tick(); return window.__state(); });
  ck('final results: BOTH come back', r.manual && r.worldMap);
  r = await p.evaluate(() => {
    const m = document.getElementById('game-manual-button');
    return { w: m.offsetWidth, top: m.style.top, left: m.style.left };
  });
  ck('the manual button is measured and re-pinned once it is visible again',
     r.w > 0 && /px$/.test(r.top) && /px$/.test(r.left));
  // the nuclear attack still pulls the world map even on the final screens
  r = await p.evaluate(() => { _nukeWar = 2; window.__tick(); const s = window.__state(); _nukeWar = 0; return s; });
  ck('the nuclear attack still pulls the world map button on its own', !r.worldMap);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})();
