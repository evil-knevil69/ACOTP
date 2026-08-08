// Run every harness in tests/, plus the host-style execution check on both mod
// files (which catches the runtime throws a parse check cannot — a stray backtick
// in a CSS comment inside a template literal, most notoriously).
//
//   node tests/run_all.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const run = (label, file, args) => {
  const started = Date.now();
  try {
    const out = execFileSync('node', [file, ...(args || [])], { cwd: ROOT, encoding: 'utf8' });
    const m = out.match(/(\d+) passed, (\d+) failed/);
    const clean = /EXECUTED CLEAN/.test(out);
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log('  PASS  ' + label.padEnd(26) + (m ? m[1] + '/' + (+m[1] + +m[2]) : clean ? 'clean' : 'ok').padEnd(9) + secs + 's');
    return true;
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    console.log('  FAIL  ' + label);
    out.split('\n').filter(l => /FAIL|THROWS|Error/.test(l)).slice(0, 8).forEach(l => console.log('        ' + l.trim()));
    return false;
  }
};

console.log('EXECUTION (host-style eval — parse checks are NOT enough):');
let ok = true;
ok = run('Code 1 executes', 'mod_exec_check.js', ['A Cancer on the Presidency_init (draft).txt']) && ok;
ok = run('Code 2 executes', 'mod_exec_check.js', ['ACOP Nixon_Agnew.txt']) && ok;

console.log('\nHARNESSES:');
fs.readdirSync(__dirname)
  .filter(f => f.endsWith('_check.js'))
  .sort()
  .forEach(f => { ok = run(f.replace('_check.js', ''), path.join('tests', f)) && ok; });

console.log('\n' + (ok ? 'ALL GREEN' : 'SOMETHING FAILED'));
process.exit(ok ? 0 : 1);
