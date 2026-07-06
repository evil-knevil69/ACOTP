# Save/Load — Maintenance Note

**When you add a new per-run variable to the mod, add its name to `_SL_SCALARS`
in `ACOP Nixon_Agnew.txt` (Code 2, just before `showSectionTransition`) — or it
will NOT be included in saves,** and loading an older save will leave it at
whatever value the current session happens to have.

## What counts as a "per-run variable"

Anything that changes during a playthrough and should be restored when a save
is loaded: stats, flags set by question outcomes, world-event triggers, stacks,
counters, officials. Rule of thumb: if it belongs in the New Game reset block,
it belongs in the save system too.

## Where things go

| Kind of state | What to do |
|---|---|
| Scalar `var`/`let` (number, string, boolean) | Add the name to `_SL_SCALARS`. Done — capture and restore are automatic (via direct `eval`, because mod vars live inside the `new Function()` scope, not on `window`). |
| `const` container (Set / array / object) | Cannot be handled by `_SL_SCALARS` (assignment to a `const` throws). Add an entry to BOTH `_slCaptureMod()` (snapshot it) and `_slRestoreMod()` (restore **by mutation**: clear it, then refill — never reassign). See `_shownTransitions`, `_clemencies`, `_pausedUntil` for the pattern. |
| `window`-global state (e.g. the per-country `*_STAB` counters) | Same as containers: extend `_slCaptureMod()` / `_slRestoreMod()`. |
| State inside an object (e.g. `_MIDTERM._fired`, `_RESHUFFLE.active/.pending`) | Same: explicit capture/restore in the two functions. |

## Known gaps (extend if these features go live)

- `answerSwapper(…, takeEffects = true)` also swaps `fields.answer` inside the
  four effect jsons (`answer_score_global/issue/state_json`,
  `answer_feedback_json`). The snapshot covers question order and the
  answers→question assignment, but **not** effect-json swaps. If effect-swapping
  is ever used at runtime, extend `_slSave` / `_slLoad` the same way
  (snapshot the `fields.answer` sequence per json, restore by index).
- Saves store no schema version. If the question bank changes shape, the
  order/assignment restore fails safe (keeps current order), but old saves'
  mod vars still apply — sanity-check old saves after big content changes.

## Quick self-check

The session harness validates that every `_SL_SCALARS` name is actually
declared (catches typos):

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('ACOP Nixon_Agnew.txt', 'utf8');
const m = src.match(/var _SL_SCALARS = \[([\s\S]*?)\];/);
const names = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
const missing = names.filter(n => !new RegExp('(var|let)\\\\s+' + n + '\\\\s*=').test(src));
console.log(missing.length ? 'MISSING: ' + missing.join(', ') : 'all ' + names.length + ' names declared');
"
```

Console access in-game: `window.ACOPSaveLoad` (`.open()`, `.save(name)`,
`.load(id)`, `.del(id)`, `.list()`).
