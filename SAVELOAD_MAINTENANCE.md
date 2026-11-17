# Save/Load and New Game — Maintenance Note

**When you add a new per-run variable to the mod, add its name to `_SL_SCALARS`
in `ACOP Nixon_Agnew.txt` (Code 2, grep `var _SL_SCALARS`).** That one
registration does two jobs:

- it is **saved and loaded** (`_slCaptureMod` / `_slRestoreMod`), and
- it is **reset on New Game** (`_resetRunState`, at the very end of the file),
  back to the value it was declared with.

The second job used to be a separate hand-kept list, and the two drifted: by
Nov 2026 New Game reset about thirty variables while 168 were saved, so a second
run without a page reload inherited the last run's loyalty, exposure, approval,
cabinet, world events and country relations. The reset is now derived from the
save list, so they cannot drift again.

## What counts as a "per-run variable"

Anything that changes during a playthrough: stats, flags set by question
outcomes, world-event triggers, stacks, counters, officials. If a fresh run
should not inherit it, it is per-run.

## Where things go

| Kind of state | What to do |
|---|---|
| Scalar `var`/`let` (number, string, boolean) | Add the name to `_SL_SCALARS`. Done — capture and restore are automatic (via direct `eval`, because mod vars live inside the `new Function()` scope, not on `window`). |
| `const` container (Set / array / object) | Cannot be handled by `_SL_SCALARS` (assignment to a `const` throws). THREE lines: snapshot it in `_slCaptureMod()`, restore it in `_slRestoreMod()`, empty it in `_resetRunState()`. Restore **by mutation**, never by reassigning — use the helpers `_refillObj(o, src)`, `_refillArr(a, src)`, `_refillSet(set, src)` (a missing `src` empties the container, which is what an older save should do). |
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

```bash
node tests/runstate_check.js
```

It runs the whole of Code 2 and checks three things: New Game puts everything
back, a save/load round trip loses nothing, and **every module-level mutable is
classified**. The last one is the guard: declare a new `var _something = 0;`
without registering it and the suite fails, naming the variable and telling you
the two ways out — add it to `_SL_SCALARS` (per-run), or to the `NOT_RUN_STATE`
list in that test file with a reason (a cache, a UI toggle, a session
preference). ALL_CAPS names are treated as config and need neither.

Console access in-game: `window.ACOPSaveLoad` (`.open()`, `.save(name)`,
`.load(id)`, `.del(id)`, `.list()`).
