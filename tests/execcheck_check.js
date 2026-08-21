// Does the execution check actually FAIL on a broken file?
//
// It once didn't: a stray backtick in a CSS comment shipped to the browser
// (SyntaxError: Unexpected identifier '#game_window') even though
// mod_exec_check had printed its THROWS dump — because it exited 0, and the
// runner read that as a pass. A check that cannot fail is worse than no check,
// so this poisons a COPY of each mod file in the four ways that have actually
// bitten, and asserts the checker rejects every one.
//
//   node tests/execcheck_check.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const C1 = 'A Cancer on the Presidency_init (draft).txt';
const C2 = 'ACOP Nixon_Agnew.txt';

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'acop-exec-'));
// Run the checker and report BOTH signals the runner relies on.
const check = (file) => {
  try {
    const out = execFileSync('node', [path.join(ROOT, 'mod_exec_check.js'), file],
      { cwd: ROOT, encoding: 'utf8' });
    return { code: 0, out: out };
  } catch (err) {
    return { code: err.status == null ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
};
// Write a poisoned copy of a real mod file and check it.
const poison = (src, edit) => {
  const s = fs.readFileSync(path.join(ROOT, src), 'utf8');
  const out = edit(s);
  if (out === s) throw new Error('poison anchor not found in ' + src);
  const f = path.join(tmp, 'poisoned.txt');
  fs.writeFileSync(f, out);
  return check(f);
};

console.log('THE REAL FILES:');
for (const f of [C1, C2]) {
  const r = check(path.join(ROOT, f));
  ck(f.split(' ')[0] + ' passes, exits 0, and says so', r.code === 0 && /EXECUTED CLEAN/.test(r.out));
}

console.log('\nPOISONED COPIES (each must FAIL):');
// 1. The one that shipped: a backtick inside a CSS comment in a stylesheet
//    template literal. Caught by the pre-flight lint, which names the line.
let r = poison(C1, s => s.replace(
  '/* Host site banner OUTSIDE #game_window',
  '/* A `backticked` phrase. Host site banner OUTSIDE #game_window'));
ck('backtick in a CSS comment: non-zero exit, no CLEAN, names the line',
   r.code === 1 && !/EXECUTED CLEAN/.test(r.out) && /BACKTICK IN A BLOCK COMMENT/.test(r.out)
   && /line \d+:/.test(r.out));

// 2. A single stray backtick — terminates the literal with nothing to close it.
r = poison(C1, s => s.replace('body.acop-nuke-screen #header {', 'body.acop-nuke-screen ` #header {'));
ck('unbalanced backtick in the stylesheet: rejected', r.code !== 0 && !/EXECUTED CLEAN/.test(r.out));

// 3. A runtime throw at load — what the browser eval catches and a parse check
//    does not.
r = poison(C2, s => s.replace('function _enightInProgress() {',
  '(function(){ null.boom; })();\nfunction _enightInProgress() {'));
ck('runtime throw at load: rejected, and reports THROWS',
   r.code !== 0 && !/EXECUTED CLEAN/.test(r.out) && /THROWS/.test(r.out));

// 4. A duplicate const in the same scope — the other parse-time trap CLAUDE.md
//    warns about.
r = poison(C1, s => s.replace('var ACOP_DEFAULT_CORRR = corrr;',
  'const __dupe = 1; const __dupe = 2;\nvar ACOP_DEFAULT_CORRR = corrr;'));
ck('duplicate const declaration: rejected', r.code !== 0 && !/EXECUTED CLEAN/.test(r.out));

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
