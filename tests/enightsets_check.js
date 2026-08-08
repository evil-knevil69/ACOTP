// Election Night OPENING SETS — drives the REAL config + the intro observer from
// Code 2 (set roll, sting/gif pairing, the map hold, click-to-skip).
//
// Lives in the repo deliberately: the scratchpad is wiped when the container is
// recycled, and this suite is worth keeping. Run:  node tests/enightsets_check.js
const fs = require('fs');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const SRC = require('path').join(__dirname, '..', 'ACOP Nixon_Agnew.txt');
const src = fs.readFileSync(SRC, 'utf8');
function extractFn(name){const s=src.indexOf('function '+name+'(');let i=src.indexOf('{',s),d=0;
  for(let j=i;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0)return src.slice(s,j+1);}}}
const introTail='killTimer = setTimeout(kill, Math.max(500, intro.durationMs || 4000));';
const blockEnd=src.indexOf('});', src.indexOf(introTail)+introTail.length)+3;
const block=src.slice(src.indexOf('// ── OPENING SETS'), blockEnd);

let pass=0,fail=0;const ck=(n,c)=>{c?pass++:fail++;console.log((c?'  ok  - ':'  FAIL- ')+n);};

// ── static wiring ──
ck('New Game resets the roll', /_enightIntroArmed = false;\s*\n\s*_enightSetIdx = -1;/.test(src));
ck('_enightSetIdx registered in _SL_SCALARS', /'_enightSetIdx'/.test(src.match(/var _SL_SCALARS = \[[\s\S]*?\];/)[0]));
ck('the sting no longer fires on the opener popup (no popup-sting observer left)',
   !/if \(_enightStingPlayed\) return;[\s\S]{0,300}election_night_window/.test(src));
ck('the sting fires in the INTRO block, before the url check so sting-only still plays',
   /if \(set\.sting && !_enightStingPlayed\) \{ _enightStingPlayed = true; _playEggAudio\(set\.sting\); \}[\s\S]{0,400}if \(!intro\.url\) return;/.test(src));
ck('CBS set carries a map hold; the other set does not', /mapDelayMs: 10000/.test(src));
{
  const blk = src.slice(src.indexOf('window.ACOPNight = {'), src.indexOf('};', src.indexOf('window.ACOPNight = {'))+2);
  ck('ACOPNight.demo: engine jump (A(1) -> electionNight), no census call',
     /final_state_results = A\(1\);/.test(blk) && /electionNight\(\);/.test(blk) && !/_nukeApplyCensus/.test(blk));
  ck('ACOPNight.demo: re-arms sting/intro + re-rolls the set + clears a stale overlay',
     /_enightStingPlayed = false;/.test(blk) && /_enightIntroPlayed = false;/.test(blk)
     && /_enightSetIdx = -1;/.test(blk) && /enight-intro-anim/.test(blk));
  ck('ACOPNight.demo: refuses while the nuke census is live',
     /if \(_nukeWar >= 2\) \{ console\.warn[\s\S]{0,90}return; \}/.test(blk));
}

(async()=>{
  const b=await chromium.launch();const p=await b.newPage();
  p.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await p.setContent('<!DOCTYPE html><div id="game_window"><audio id="audio"></audio>'
    +'<div id="map_container" style="position:relative;width:600px;height:400px"></div></div>');
  await p.addScriptTag({content:`
    window.__plays=[];
    var _nukeWar = 0;
    var campaignTrail_temp = { final_state_results: [] };
    window.__seedStates=(times)=>{ campaignTrail_temp.final_state_results =
      times.map((t,i)=>({abbr:'S'+i, result_time:t})); };
    window.__times=()=>campaignTrail_temp.final_state_results.map(f=>f.result_time);
    window.__setClock=(pct)=>{
      let q=document.querySelector('#overall_result > p');
      if(!q){ const w=document.createElement('div'); w.id='overall_result';
              q=document.createElement('p'); w.appendChild(q); document.body.appendChild(w); }
      q.textContent=pct+'% complete';
    };
    window.Audio=class{constructor(u){this.url=u;this._h={};window.__lastClip=this;}
      addEventListener(t,f){this._h[t]=f;} play(){window.__plays.push(this.url);return Promise.resolve();}};
    const subs=[]; window.__onGameWindowMutation=cb=>subs.push(cb);
    window.__tick=()=>subs.forEach(f=>f());
    ${extractFn('_playEggAudio')}
    ${block}
    window.__cfg=_ENIGHT_SETS;
    window.__idx=()=>_enightSetIdx;
    window.__resetRun=()=>{ _enightStingPlayed=false; _enightIntroPlayed=false; _enightIntroArmed=false; _enightSetIdx=-1;
      document.getElementById('enight-intro-anim')?.remove(); window.__plays.length=0;
      _enightHold.reset(); window.__setClock(0); };
    window.__popupUp=()=>{
      const gw=document.getElementById('game_window');
      if(!document.getElementById('final_result_button')){const f=document.createElement('button');f.id='final_result_button';gw.appendChild(f);}
      if(!document.getElementById('election_night_window')){const w=document.createElement('div');w.id='election_night_window';gw.appendChild(w);}
    };
    window.__dismiss=()=>document.getElementById('election_night_window')?.remove();
    window.__teardown=()=>{document.getElementById('final_result_button')?.remove();window.__dismiss();};
  `});
  await p.evaluate(()=>{
    __cfg[0].sting='setA-sting.mp3'; __cfg[0].intro={url:'setA.gif',durationMs:1000};
    __cfg[1].sting='setB-sting.mp3'; __cfg[1].intro={url:'setB.gif',durationMs:1000};
  });

  // 1) sting + gif fire TOGETHER, on the dismiss tick — not while the popup is up
  let r=await p.evaluate(async()=>{
    window.__resetRun(); window.__popupUp(); window.__tick(); window.__tick();
    const duringPopup={plays:window.__plays.length, img:!!document.getElementById('enight-intro-anim')};
    window.__dismiss(); window.__tick();
    await new Promise(z=>setTimeout(z,60));
    const img=document.getElementById('enight-intro-anim');
    return {duringPopup, after:{plays:window.__plays.slice(), img:!!img, idx:window.__idx()}};
  });
  ck('nothing fires while the opener popup is up (no early sting)',
     r.duringPopup.plays===0 && !r.duringPopup.img);
  ck('OK fires the sting AND the animation on the same tick',
     r.after.plays.length===1 && r.after.img);
  ck('sting and animation come from the SAME rolled set',
     r.after.plays[0]==='set'+String.fromCharCode(65+r.after.idx)+'-sting.mp3');
  // 2) no replay on a re-render
  r=await p.evaluate(()=>{ window.__tick(); window.__tick(); return window.__plays.length; });
  ck('no replay on a re-render (flags hold)', r===1);
  // 3) the roll reaches both sets
  r=await p.evaluate(async()=>{
    const seen=new Set();
    for(let i=0;i<60;i++){ window.__teardown(); window.__resetRun();
      window.__popupUp(); window.__tick(); window.__dismiss(); window.__tick(); seen.add(window.__idx()); }
    return [...seen].sort();
  });
  ck('random roll hits both sets across runs', JSON.stringify(r)==='[0,1]');
  // 4) per-half fail-safes
  r=await p.evaluate(async()=>{
    __cfg[0].sting=''; __cfg[1].sting='';
    window.__teardown(); window.__resetRun();
    window.__popupUp(); window.__tick(); window.__dismiss(); window.__tick();
    await new Promise(z=>setTimeout(z,60));
    return {plays:window.__plays.length, img:!!document.getElementById('enight-intro-anim')};
  });
  ck('empty sting: silent, but the set\'s animation still plays', r.plays===0 && r.img);
  r=await p.evaluate(async()=>{
    __cfg[0].sting='s.mp3'; __cfg[0].intro={url:'',durationMs:1000};
    __cfg[1].sting='s.mp3'; __cfg[1].intro={url:'',durationMs:1000};
    window.__teardown(); window.__resetRun();
    window.__popupUp(); window.__tick(); window.__dismiss(); window.__tick();
    await new Promise(z=>setTimeout(z,60));
    return {plays:window.__plays.length, img:!!document.getElementById('enight-intro-anim')};
  });
  ck('empty gif: no animation, but the sting still plays', r.plays===1 && !r.img);
  r=await p.evaluate(async()=>{
    __cfg[0].sting=''; __cfg[0].intro={url:'',durationMs:1000};
    __cfg[1].sting=''; __cfg[1].intro={url:'',durationMs:1000};
    window.__teardown(); window.__resetRun();
    window.__popupUp(); window.__tick(); window.__dismiss(); window.__tick();
    await new Promise(z=>setTimeout(z,60));
    return {plays:window.__plays.length, img:!!document.getElementById('enight-intro-anim')};
  });
  ck('a wholly empty set is inert', r.plays===0 && !r.img);

  // 5) overlay geometry + behaviour
  r=await p.evaluate(async()=>{
    __cfg[0].sting='a.mp3'; __cfg[0].intro={url:'a.gif',durationMs:600};
    __cfg[1].sting='a.mp3'; __cfg[1].intro={url:'a.gif',durationMs:600};
    window.__teardown(); window.__resetRun();
    window.__popupUp(); window.__tick(); window.__dismiss(); window.__tick();
    await new Promise(z=>setTimeout(z,80));
    const img=document.getElementById('enight-intro-anim'), cs=getComputedStyle(img);
    const mc=document.getElementById('map_container').getBoundingClientRect(), ir=img.getBoundingClientRect();
    const out={ covers:Math.round(ir.width)===Math.round(mc.width)&&Math.round(ir.height)===Math.round(mc.height),
                fit:cs.objectFit, opacity:cs.opacity, pe:cs.pointerEvents };
    await new Promise(z=>setTimeout(z,900));
    out.gone=!document.getElementById('enight-intro-anim');
    return out;
  });
  ck('overlay covers #map_container exactly, object-fit cover, no fade',
     r.covers && r.fit==='cover' && r.opacity==='1');
  ck('overlay is click-to-skip (pointer-events auto)', r.pe==='auto');
  ck('overlay self-removes after its durationMs', r.gone);

  // 6) the map hold
  r=await p.evaluate(async()=>{
    __cfg[0].sting=''; __cfg[0].intro={url:'a.gif',durationMs:60000,mapDelayMs:10000};
    __cfg[1].sting=''; __cfg[1].intro={url:'a.gif',durationMs:60000,mapDelayMs:10000};
    window.__teardown(); window.__resetRun();
    window.__setClock(0); window.__seedStates([20,90,300,470]);
    const before=window.__times();
    window.__popupUp(); window.__tick(); window.__dismiss(); window.__tick();
    return {before, after:window.__times()};
  });
  ck('map hold: 10s pushes every state 50 ticks down the engine clock (5/sec)',
     JSON.stringify(r.after)===JSON.stringify(r.before.map(t=>t+50)));
  r=await p.evaluate(async()=>{
    window.__teardown(); window.__resetRun();
    window.__setClock(25); window.__seedStates([20,90,300,470]);
    window.__popupUp(); window.__tick(); window.__dismiss(); window.__tick();
    return window.__times();
  });
  ck('map hold: only states still to report are moved (called ones left alone)',
     r[0]===20 && r[1]===90 && r[2]===350 && r[3]===520);
  r=await p.evaluate(async()=>{
    window.__teardown(); window.__resetRun();
    window.__setClock(0); window.__seedStates([100,200]);
    window.__popupUp(); window.__tick(); window.__dismiss(); window.__tick();
    const held=window.__times();
    await new Promise(z=>setTimeout(z,400));
    document.getElementById('enight-intro-anim').click();
    return {held, released:window.__times()};
  });
  ck('map hold: skipping gives back the unused delay (count starts, not frozen)',
     r.held[0]===150 && r.released[0]>=100 && r.released[0]<=105);
  r=await p.evaluate(async()=>{
    __cfg[0].intro={url:'a.gif',durationMs:1000}; __cfg[1].intro={url:'a.gif',durationMs:1000};
    window.__teardown(); window.__resetRun();
    window.__setClock(0); window.__seedStates([100,200]);
    window.__popupUp(); window.__tick(); window.__dismiss(); window.__tick();
    return window.__times();
  });
  ck('no mapDelayMs: the engine clock is left exactly as it was', JSON.stringify(r)==='[100,200]');

  console.log('\n'+pass+' passed, '+fail+' failed');
  await b.close();process.exit(fail?1:0);
})();
