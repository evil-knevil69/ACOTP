// Executes Code 1 EXACTLY like the host's executeMod does:
//   new Function('campaignTrail_temp','window','document','$','jQuery', code)
// against a stub host DOM. Reports the first uncaught error with its VM line
// (VM line - 2 = file line, from the Function wrapper prologue).
const fs=require('fs');
const {chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
const file=process.argv[2]||'/home/user/ACOTP/A Cancer on the Presidency_init (draft).txt';
const code=fs.readFileSync(file,'utf8');

// PRE-FLIGHT LINT — the one failure mode a SyntaxError cannot locate for you.
// A backtick inside a /* */ comment terminates the enclosing template literal;
// the file still parses far enough that the engine reports a bewildering
// "Unexpected identifier '#game_window'" hundreds of lines later. Both
// stylesheets in Code 1 are template literals, so every CSS comment is inside
// one. There are none in either file today, so flagging all of them costs
// nothing and names the exact line.
const blockComments=[];
{
  const re=/\/\*[\s\S]*?\*\//g;
  let m;
  while ((m=re.exec(code))) {
    if (m[0].indexOf('`') === -1) continue;
    blockComments.push({ line: code.slice(0, m.index).split('\n').length,
                         text: m[0].split('\n')[0].slice(0, 100) });
  }
}
if (blockComments.length) {
  console.log('BACKTICK IN A BLOCK COMMENT — this terminates the template literal it sits in:');
  blockComments.forEach(c => console.log('  line ' + c.line + ': ' + c.text));
  console.log('Use apostrophes instead. (CLAUDE.md, the rule that keeps biting.)');
  process.exit(1);
}

(async()=>{
  const b=await chromium.launch();const p=await b.newPage();
  p.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  p.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE ERROR:',m.text().slice(0,300)); });
  // minimal host DOM: the anchors Code 1 touches at load
  await p.setContent(`<!DOCTYPE html><body>
    <div class="center"><img id="header" src="old.png"></div>
    <div class="container">
      <div id="game_window">
        <div class="game_header">HDR</div>
        <div id="inner_window_1"><div>a</div><div>b</div></div>
      </div>
    </div>
    <div id="difficulty_level"></div>
    <div class="content_single"></div>
  </body>`);
  const result=await p.evaluate(src=>{
    // host globals the engine provides before executeMod
    window.campaignTrail_temp = {};
    window.nct_stuff = { selectedTheme: 0, themes: [{ coloring_title:'x', coloring_window:'x' }] };
    window.corrr = '<img src="x.png">';
    window.e = window.campaignTrail_temp;
    // minimal jQuery-ish: enough to not explode at load; records selectors used
    const jqCalls=[];
    const fake$=sel=>{ jqCalls.push(String(sel).slice(0,60));
      let els=[];
      try {
        if (typeof sel==='string' && sel.trim()[0]!=='<') els=[...document.querySelectorAll(sel)];
        else if (sel && sel.nodeType) els=[sel];
        else if (typeof sel==='function') { try{sel();}catch(e){} }
      } catch(e) {}
      const o={length:els.length, html:()=>o, click:()=>o, val:()=>'', each:f=>{els.forEach((el,i)=>f.call(el,i,el));return o;},
               append:()=>o, remove:()=>o, css:()=>o, on:()=>o, ready:f=>{try{f&&f();}catch(e){}return o;},
               data:()=>null, find:()=>fake$(''), attr:()=>o, text:()=>o, hide:()=>o, show:()=>o,
               change:()=>o, prop:()=>o, addClass:()=>o, removeClass:()=>o };
      els.forEach((el,i)=>{o[i]=el;});
      return o; };
    fake$.fn={};
    try {
      const fn=new Function('campaignTrail_temp','window','document','$','jQuery',src);
      fn(window.campaignTrail_temp, window, document, fake$, fake$);
      return { ok:true, jq:jqCalls.slice(0,20) };
    } catch (err) {
      const m=(err.stack||'').match(/<anonymous>:(\d+):(\d+)/);
      return { ok:false, msg:String(err.message), vmLine:m?+m[1]:null, col:m?+m[2]:null,
               stack:(err.stack||'').split('\n').slice(0,4).join(' | ') };
    }
  }, code);
  if (result.ok) console.log('CODE 1 EXECUTED CLEAN under host-style eval. First jQuery calls:', result.jq);
  else {
    console.log('THROWS:', result.msg);
    console.log('VM line', result.vmLine, 'col', result.col, '→ file line ≈', result.vmLine-2);
    console.log(result.stack);
    const lines=code.split('\n');
    const fl=result.vmLine-2;
    for(let i=Math.max(0,fl-4);i<Math.min(lines.length,fl+3);i++)
      console.log(String(i+1).padStart(6), (i+1===fl?'>> ':'   ')+lines[i]);
  }
  await b.close();
  // Non-zero on failure — without this the runner read a printed THROWS as a pass.
  process.exit(result.ok ? 0 : 1);
})();
