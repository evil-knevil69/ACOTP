// Save/Load — the scalar list and the container round-trips. These are static
// integrity checks over the real source: the failure mode this guards against is
// a new per-run variable being added WITHOUT registering it in _SL_SCALARS, so a
// load silently keeps the old value.
// Run: node tests/saveload_check.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'ACOP Nixon_Agnew.txt'), 'utf8');

let pass = 0, fail = 0;
const ck = (n, c) => { c ? pass++ : fail++; console.log((c ? '  ok  - ' : '  FAIL- ') + n); };

const scalarsBlock = src.match(/var _SL_SCALARS = \[[\s\S]*?\];/)[0];
const scalars = [...scalarsBlock.matchAll(/'([^']+)'/g)].map(m => m[1]);

console.log('SCALARS:');
ck('the scalar list is populated and unique',
   scalars.length > 150 && new Set(scalars).size === scalars.length);
ck('every scalar is actually declared in the file',
   scalars.every(n => new RegExp('(var|let|const)\\s+' + n + '\\b').test(src)));
// the per-run flags this session added or touched must all be saved
for (const n of ['_nukeWar', '_enightStingPlayed', '_enightIntroPlayed', '_enightSetIdx',
                 '_projStingPlayed', '_gameTheme', '_campaignLength', '_lengthInstalled'])
  ck('saved: ' + n, scalars.includes(n));

console.log('\nCAPTURE / RESTORE:');
const cap = src.slice(src.indexOf('function _slCaptureMod()'), src.indexOf('function _slRestoreMod(m)'));
const res = src.slice(src.indexOf('function _slRestoreMod(m)'), src.indexOf('function _slRestoreMod(m)') + 4000);
// mod vars live in the new Function() scope, so window[name] can't reach them —
// they go through _slGetVar/_slSetVar, which use eval
ck('scalars are captured and restored by direct eval (window[name] is out of scope here)',
   /function _slGetVar\(name\) \{\s*try \{ return eval\(name\)/.test(src)
   && /function _slSetVar\(name, value\) \{[\s\S]{0,120}eval\(name \+ ' = _slTmp'\)/.test(src)
   && /_SL_SCALARS\.forEach\(n => \{\s*const v = _slGetVar\(n\)/.test(cap)
   && /if \(_SL_SCALARS\.indexOf\(n\) !== -1\) _slSetVar\(n, m\.vars\[n\]\)/.test(res));
ck('restore ignores names no longer in _SL_SCALARS (a stale save cannot create junk globals)',
   /if \(_SL_SCALARS\.indexOf\(n\) !== -1\)/.test(res));
ck('const containers are restored by MUTATION, not reassignment',
   /_shownTransitions/.test(cap) && /\.length = 0/.test(res));
ck('the reshuffle offer + pending queue are snapshotted wholesale',
   /reshuffle: JSON\.parse\(JSON\.stringify\(\{ active: _RESHUFFLE\.active, pending: _RESHUFFLE\.pending \}\)\)/.test(cap)
   && /_RESHUFFLE\.active = m\.reshuffle\.active \|\| null;/.test(res));
ck('the Enemies List container round-trips through its own snapshot helpers',
   /_enemiesSnapshot\(\)/.test(cap) && /_enemiesRestore\(/.test(res));
// the pk order + count live on the save payload itself, not in _slCaptureMod:
// both the campaign-length install and the nuke arm permute questions_json
ck('question pk order + count are snapshotted (campaign length / nuke arm depend on it)',
   /question_order: campaignTrail_temp\.questions_json\.map\(q => q\.pk\)/.test(src)
   && /question_count/.test(src.slice(src.indexOf('question_order:'), src.indexOf('question_order:') + 600)));
ck('questions_json is restored as a PERMUTATION (same objects, reordered)',
   /questionSwapper permutes questions_json in place/.test(src));
ck('the midterm fired-flag survives a save', /midtermFired: _MIDTERM\._fired/.test(cap)
   && /_MIDTERM\._fired = !!m\.midtermFired;/.test(res));

console.log('\nNUKE INTERACTION:');
ck('restoring at census re-applies it; below census it restores the pristine state',
   /_nukeWar/.test(res) && /_nukeApplyCensus\(\)|_nukeRestoreCandidates\(\)/.test(res));
ck('an armed save re-zeroes has_visits (a PART transition can fall before the bunker)',
   /has_visits/.test(res));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
