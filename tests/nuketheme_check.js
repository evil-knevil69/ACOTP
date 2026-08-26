// Entering the DEFCON-1 branch swaps the page to "In the Bunker", and unwinding
// hands it back — driven against the REAL Code 1 theme registry and the REAL
// Code 2 census/reset functions, since the whole point is that the two files
// talk to each other through window._acopApplyTheme.
//
// Also covers the bunker theme's own surfaces (the page background and the
// banner), since that theme exists to dress this branch.
//
//   node tests/nuketheme_check.js
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const ROOT = path.join(__dirname, '..');
const c1 = fs.readFileSync(path.join(ROOT, 'A Cancer on the Presidency_init (draft).txt'), 'utf8');
const c2 = fs.readFileSync(path.join(ROOT, 'ACOP Nixon_Agnew.txt'), 'utf8');
// The theme registry + picker, from the low-fx state block it depends on.
const themeBlock = c1.slice(c1.indexOf('var _LOWFX_STATIC_BG'), c1.indexOf('// ── END THEME SELECTOR'));
const cfg = c2.slice(c2.indexOf('var _NUKE_THEME'), c2.indexOf('// Pristine per-state elector counts'));
const mainStart = c1.indexOf('style.innerHTML = `') + 'style.innerHTML = `'.length;
const mainCss = c1.slice(mainStart, c1.indexOf('`;', mainStart));
function fn(src, name) {
  const s = src.indexOf('function ' + name + '(');
  if (s < 0) return '';
  let i = src.indexOf('{', s), d = 0;
  for (let j = i; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(s, j + 1); } }
  return '';
}

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

console.log('WIRING:');
ck('the census names the theme it switches to, and the one it hands back to',
   /var _NUKE_THEME = 'In the Bunker';/.test(c2) && /var _ACOP_DEFAULT_THEME = 'A Cancer on the Presidency';/.test(c2));
ck('the swap goes through the registry, from inside _nukeApplyCensus',
   /_nukeApplyCensus\(\)[\s\S]{0,1400}themeSwap\(_NUKE_THEME\)/.test(c2));
ck('"In the Bunker" exists in Code 1, so the swap cannot fail safe-but-silent',
   /'In the Bunker': function \(\) \{/.test(c1));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await p.setContent(`<!DOCTYPE html><body><img id="header" src="about:blank">
    <div class="container"><div id="game_window"><div class="game_header"></div></div></div>
    <select id="themePicker"><option>host</option></select></body>`);
  await p.addScriptTag({ content: `
    var corrr = '<div>ACOP</div>';
    var nct_stuff = { selectedTheme: 'x', themes: { x: {} } };
    var campaignTrail_temp = { candidate_json: [], states_json: [], election_json: [{ fields: {} }] };
    ${themeBlock}
    ${fn(c2, 'themeSwap')}
    var _gameTheme = '';
    ${cfg}
    var _NUKE_CENSUS = [], _NUKE_TURNOUT_ORIG = new Map(), _NUKE_EV_ORIG = new Map();
    var _NUKE_TURNOUT_MULT = 1, _NUKE_ELECTION_POPUP = 'x', _NUKE_POPUP_ORIG = 'y';
    var _NUKE_CAND_ORIG = [], _NUKE_VISITS_ORIG = 1, _nukeWar = 0, _lengthInstalled = null;
    function _installCampaignLength() {}
    ${fn(c2, '_nukeApplyCensus')}
    ${fn(c2, '_nukeRestoreCandidates')}
    ${fn(c2, '_nukeReset')}
    window.__look = () => ({ theme: _acopTheme, gameTheme: _gameTheme,
      bg: document.body.getAttribute('background'), bgColor: document.body.getAttribute('bgcolor'),
      repeat: getComputedStyle(document.body).backgroundRepeat,
      size: getComputedStyle(document.body).backgroundSize,
      pos: getComputedStyle(document.body).backgroundPosition,
      attach: getComputedStyle(document.body).backgroundAttachment,
      minH: document.body.style.minHeight,
      picker: document.querySelector('.acop-theme-select').value });
  `});

  console.log('\nTHROUGH THE BRANCH:');
  let s = await p.evaluate(() => window.__look());
  ck('starts on the shipped look, with the Watergate page background',
     s.theme === 'A Cancer on the Presidency' && /backgroundv69/.test(s.bg || ''));

  s = await p.evaluate(() => { _nukeApplyCensus(); _nukeWar = 2; return window.__look(); });
  ck('the census puts the page on the bunker theme — the hallway, on black',
     s.theme === 'In the Bunker' && /Bunker-hallway/.test(s.bg || '') && s.bgColor === '#000000');
  ck('…at natural size, tiling to cover a screen bigger than the image',
     s.size === 'auto' && s.repeat === 'repeat' && s.pos === '0% 0%' && s.attach === 'scroll');
  // …and it must HOLD that against the host's own stylesheet. Clearing the
  // inline value hands the property to the host, not to the browser default —
  // the host has a body background-size rule, which stretched the hallway.
  ck('…and a host background-size rule cannot stretch it, even with !important',
     await p.evaluate(() => {
       const st = document.createElement('style');
       st.textContent = 'body { background-size: 100% 100% !important; }';
       document.head.appendChild(st);
       _applyTheme('In the Bunker');
       const held = getComputedStyle(document.body).backgroundSize;
       st.remove();
       return held === 'auto';
     }));
  ck('…and body covers the viewport, so the host page colour never shows through',
     s.minH === '100vh');
  ck('…the picker follows, so the dropdown is not lying about the look',
     s.picker === 'In the Bunker');
  ck('…and it is recorded as an EVENT swap, so a save reloads black',
     s.gameTheme === 'In the Bunker');

  s = await p.evaluate(() => { _nukeReset(); return window.__look(); });
  ck('unwinding the branch hands the look back and clears the event swap',
     s.theme === 'A Cancer on the Presidency' && /backgroundv69/.test(s.bg || '')
     && s.bgColor === '' && s.gameTheme === '');
  ck('…including the min-height, which would otherwise leak onto the default look',
     s.repeat === 'repeat' && s.pos === '0% 0%' && s.attach === 'scroll' && s.minH === '');

  // The one that is easy to get wrong: a player who CHOSE the bunker theme
  // themselves must keep it, because a manual pick is a session preference.
  s = await p.evaluate(() => {
    _applyTheme('In the Bunker');
    _nukeWar = 1; _nukeReset();
    return window.__look();
  });
  ck('a manual pick of the same theme survives the unwind',
     s.theme === 'In the Bunker' && s.bgColor === '#000000' && s.gameTheme === '');

  // …and turning the feature off must leave the theme entirely alone.
  s = await p.evaluate(() => {
    _applyTheme('A Cancer on the Presidency');
    _NUKE_THEME = '';
    _nukeApplyCensus();
    const after = window.__look();
    _NUKE_THEME = 'In the Bunker';
    return after;
  });
  ck('_NUKE_THEME = \'\' leaves the theme untouched', s.theme === 'A Cancer on the Presidency');

  // ── The banner. The shipped stylesheet stretches #header to fill div.center
  // (width AND height 100% !important), so the bunker entry has to beat that
  // rule to show the logo at its own size. Real assets are unreachable from the
  // sandbox, so these are stand-ins at known pixel sizes — the point is that the
  // rendered box matches the file, whatever the division measures.
  console.log('\nTHE BANNER:');
  const stub = (w, h) => 'data:image/svg+xml;base64,' + Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
    '<rect width="' + w + '" height="' + h + '" fill="#654"/></svg>').toString('base64');
  const centreCss = mainCss.slice(mainCss.indexOf('div.center {'), mainCss.indexOf('.inner_inner_window h3 {'));
  await p.addStyleTag({ content: centreCss });
  await p.evaluate(({ wide, square }) => {
    const host = document.createElement('div');
    // The host's banner division starts with a solid colour FROM A STYLESHEET —
    // as the real host's would. That matters: the theme clears the seating with
    // removeProperty, which drops an inline value and lets the stylesheet back
    // through, so an inline fixture colour would test the wrong thing.
    host.id = 'banner_host';
    host.style.cssText = 'width:1100px;height:120px;margin:0 auto';
    const st = document.createElement('style');
    st.textContent = '#banner_host { background: #123456; }';
    document.head.appendChild(st);
    const c = document.createElement('div'); c.className = 'center';
    document.getElementById('header').remove();
    const img = document.createElement('img'); img.id = 'header'; img.src = wide;
    c.appendChild(img); host.appendChild(c); document.body.insertBefore(host, document.body.firstChild);
    window.__BANNER = wide; window.__LOGO = square;
  }, { wide: stub(1900, 200), square: stub(300, 90) });   // a logo SMALLER than the division
  const banner = async (theme, src) => p.evaluate(async ({ theme, src }) => {
    _applyTheme(theme);
    const h = document.getElementById('header');
    h.src = src;                                  // stand in for the blocked asset
    await h.decode().catch(() => {});
    const c = document.getElementsByClassName('center')[0].getBoundingClientRect();
    const r = h.getBoundingClientRect();
    const seat = document.getElementsByClassName('center')[0];
    return { divH: Math.round(c.height), imgH: Math.round(r.height), imgW: Math.round(r.width),
             divW: Math.round(c.width),
             aspectOk: Math.abs((r.width / r.height) - (h.naturalWidth / h.naturalHeight)) < 0.02,
             inlineH: h.style.height,
             imgBg: getComputedStyle(h).backgroundColor,
             seatBg: getComputedStyle(seat).backgroundColor,
             hostBg: getComputedStyle(seat.parentElement).backgroundColor,
             centred: Math.abs((r.left + r.right) / 2 - (c.left + c.right) / 2) < 2 };
  }, { theme, src });
  let bn = await banner('In the Bunker', await p.evaluate(() => window.__LOGO));
  ck('bunker logo renders at its NATURAL size — not stretched to the division',
     bn.imgW === 300 && bn.imgH === 90);
  ck('…centred, with nothing painted behind it or its seating',
     bn.centred && bn.imgBg === 'rgba(0, 0, 0, 0)' && bn.seatBg === 'rgba(0, 0, 0, 0)'
     && bn.hostBg === 'rgba(0, 0, 0, 0)');
  ck('the bunker theme names the nuke logo', /nukelogo\.png/.test(c1));
  bn = await banner('A Cancer on the Presidency', await p.evaluate(() => window.__BANNER));
  ck('the shipped banner gets its full-width stretch back, with no inline leak',
     bn.imgW === bn.divW && bn.imgH === bn.divH && bn.inlineH === '');
  ck('…and the seating gets its own colour back — the transparency does not leak',
     bn.hostBg === 'rgb(18, 52, 86)');

  // ── The .game_header strip. Two requirements that pull against each other:
  // nothing of the shipped header survives under this theme (no logo image, no
  // ground), but the nuke map still needs a black ground behind the chyron.
  // The bug this section exists for: the theme used to force the seating
  // transparent with INLINE styles and undo it with removeProperty, which
  // deletes whatever inline value the HOST had there. Applying the default theme
  // — which happens on every load, when the picker mounts — then wiped the page
  // wrapper's background and the whole page went white.
  ck('applying the default theme leaves the host\'s own inline background alone',
     await p.evaluate(() => {
       const host = document.getElementById('banner_host');
       host.style.background = '#0b0b0b';          // as a host page may well do
       _applyTheme('In the Bunker');
       const duringInline = host.style.background;
       const duringComputed = getComputedStyle(host).backgroundColor;
       _applyTheme('A Cancer on the Presidency');
       const after = host.style.background;
       host.style.removeProperty('background');
       return duringInline === 'rgb(11, 11, 11)'          // untouched while themed
         && duringComputed === 'rgba(0, 0, 0, 0)'         // …but overridden visually
         && after === 'rgb(11, 11, 11)';                  // and still there afterwards
     }));
  // The logo has to bleed into the hallway, which means EVERY wrapper between it
  // and body goes transparent — not just the immediate parent. The host nests
  // the banner a few levels deep and paints the OUTER one.
  ck('every seat above the logo goes transparent, so it bleeds into the page',
     await p.evaluate(() => {
       const host = document.getElementById('banner_host');
       const outer = document.createElement('div');
       outer.id = 'outer_seat';
       outer.style.background = '#000';                 // opaque, inline, as the host's is
       host.parentElement.insertBefore(outer, host);
       outer.appendChild(host);                          // banner now two levels deep
       _applyTheme('In the Bunker');
       const during = getComputedStyle(outer).backgroundColor;
       const inlineKept = outer.style.background;
       _applyTheme('A Cancer on the Presidency');
       const after = getComputedStyle(outer).backgroundColor;
       host.parentElement.parentElement.insertBefore(host, outer);
       outer.remove();
       return during === 'rgba(0, 0, 0, 0)'        // see-through while themed
         && inlineKept === 'rgb(0, 0, 0)'          // …without destroying the host's value
         && after === 'rgb(0, 0, 0)';              // and opaque again afterwards
     }));
  ck('the overrides are a body class, not writes into host elements',
     /document\.body\.classList\.add\('acop-theme-bunker'\)/.test(c1)
     && /document\.body\.classList\.remove\('acop-theme-bunker'\)/.test(c1)
     && !/centre\.parentElement\.style/.test(c1));

  console.log('\nTHE HEADER STRIP:');
  const noiseStart = c1.indexOf('customStyling.innerHTML = `') + 'customStyling.innerHTML = `'.length;
  const noiseCss = c1.slice(noiseStart, c1.indexOf('`;', noiseStart));
  const PAPER = 'data:image/svg+xml;base64,' + Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#00c000"/></svg>').toString('base64');
  const stripAt = async (nuke) => {
    const p2 = await b.newPage({ viewport: { width: 1120, height: 700 } });
    p2.on('pageerror', e => console.log('PAGE ERROR:', e.message));
    await p2.setContent(`<!DOCTYPE html><body class="${nuke ? 'acop-nuke acop-nuke-screen' : ''}" style="margin:0">
      <div class="container"><div id="game_window" class="${nuke ? 'acop-nuke-tv' : ''}" style="width:1050px;height:600px;margin:0 auto">
        <div class="game_header"><h2>ACOP</h2><img src="${PAPER}" width="40" height="40"></div>
        <div id="main_content_area" style="height:400px"><div id="map_container"><svg width="721" height="400"></svg></div></div>
        ${nuke ? '<div id="nuke-chyron"><span>THIS IS NOT A TEST</span></div>' : ''}
      </div></div></body>`);
    await p2.addStyleTag({ content: mainCss });
    await p2.addStyleTag({ content: noiseCss });
    // the host's own paper on #game_window, and a loud page behind everything
    await p2.addStyleTag({ content: `#game_window { background-image: url(${PAPER}); background-color: #eee; }
                                     body { background: #ff00ff; }` });
    await p2.addScriptTag({ content: `
      var corrr = '<h2>ACOP</h2><img src="${PAPER}" width="40" height="40">';
      var nct_stuff = { selectedTheme: 'x', themes: { x: {} } };
      var campaignTrail_temp = {};
      ${themeBlock}
      _applyTheme('In the Bunker');
      document.body.removeAttribute('background');
    `});
    const geo = await p2.evaluate(() => {
      const gh = document.getElementsByClassName('game_header')[0];
      const r = gh.getBoundingClientRect();
      return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width),
               imgs: document.querySelectorAll('.game_header img').length,
               html: gh.innerHTML.length, title: nct_stuff.themes.x.coloring_title };
    });
    const b64 = (await p2.screenshot()).toString('base64');
    const px = await p2.evaluate(async ({ b64, geo }) => {
      const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
      const d = cx.getImageData(geo.left + Math.round(geo.w / 2), geo.top + 8, 1, 1).data;
      return d[0] + ',' + d[1] + ',' + d[2];
    }, { b64, geo });
    await p2.close();
    return { geo, px };
  };
  const plainStrip = await stripAt(false), nukeStrip = await stripAt(true);
  ck('the shipped header content is gone entirely — no logo image, nothing',
     plainStrip.geo.imgs === 0 && plainStrip.geo.html === 0 && nukeStrip.geo.imgs === 0);
  ck('…and future renders stay clear too (coloring_title, not just the live element)',
     plainStrip.geo.title === 'transparent');
  ck('the strip is transparent: the PAGE shows through, not the paper image',
     plainStrip.px === '255,0,255');
  ck('…except on the nuke map, where it stays black behind the news ticker',
     nukeStrip.px === '0,0,0');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); process.exit(fail ? 1 : 0);
})();
